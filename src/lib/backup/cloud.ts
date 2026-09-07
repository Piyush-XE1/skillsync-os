/**
 * Cloud backup providers — real HTTP, no stubs.
 *
 * Every provider below performs actual network calls against the provider's
 * own REST API from the browser. What each one needs from you is described in
 * `CLOUD_PROVIDERS[*].needs` and rendered as a setup checklist in the UI, plus
 * `BACKUP_SYSTEM.md`.
 *
 * Auth models, in order of how little setup they need:
 * - github-gist : a personal access token with the `gist` scope. No app, no
 *                 redirect URI, GitHub's API is CORS-enabled. Works anywhere.
 * - webdav      : any WebDAV server you already run (Nextcloud, Synology,
 *                 OwnCloud). Username + password or a bearer token.
 * - google-drive: a Google OAuth *Web* client id + Google Identity Services to
 *                 mint an access token, or a pasted access token.
 * - dropbox     : a Dropbox app with PKCE enabled (no app secret needed), or a
 *                 pasted access token.
 *
 * Tokens live in IndexedDB (`loadCloudToken`) rather than localStorage, and are
 * never written into a backup file.
 */

import {
  type CloudProvider,
  type CloudBackupConfig,
  getCloudBackupConfig,
  setCloudBackupConfig,
} from "./advanced-backup";
import { loadCloudToken, saveCloudToken } from "./vault";

// ============================================================================
// TYPES
// ============================================================================

export type CloudFieldKey = "token" | "baseUrl" | "username" | "password" | "clientId" | "folderId";

export type CloudField = {
  key: CloudFieldKey;
  label: string;
  placeholder?: string;
  help?: string;
  secret?: boolean;
  required?: boolean;
};

export type CloudItem = {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
  url?: string;
};

export type CloudFailure = { ok: false; error: string; hint?: string; needsAuth?: boolean };

/** Empty-object default so a bare `return { ok: true }` stays assignable. */
export type CloudResult<T extends Record<string, unknown> = Record<never, never>> =
  | ({ ok: true } & T)
  | CloudFailure;

export type CloudVerifyInfo = { account?: string; user?: string; scopes?: string };

export type CloudDescriptor = {
  provider: CloudProvider;
  name: string;
  blurb: string;
  /** Free-text folder / path label, when the provider supports one. */
  folderLabel?: string;
  fields: CloudField[];
  /** True when an OAuth "Connect" button can be offered (needs `clientId`). */
  oauth?: { authorize(): Promise<string | null>; label: string };
  steps: string[];
  notes?: string[];
  maxFileBytes: number;
};

type Extra = Record<string, string | undefined>;

type Call = {
  config: CloudBackupConfig;
  token: string | null;
  extra: Extra;
};

// ============================================================================
// CONFIG EXTRAS (non-secret settings live next to the config)
// ============================================================================

const EXTRA_KEY = "skillsync:backup:cloudExtra";

/** True when a token/secret is already saved on this device. */
export async function hasCloudSecret(provider: CloudProvider): Promise<boolean> {
  return Boolean(await currentToken(provider));
}

export function getCloudExtras(provider: CloudProvider): Extra {
  try {
    const raw = (globalThis as { localStorage?: Storage }).localStorage?.getItem(EXTRA_KEY) ?? null;
    const all = raw ? (JSON.parse(raw) as Record<string, Extra>) : {};
    return all[provider] ?? {};
  } catch {
    return {};
  }
}

function setCloudExtras(provider: CloudProvider, patch: Extra): void {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    if (!storage) return;
    const raw = storage.getItem(EXTRA_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, Extra>) : {};
    all[provider] = { ...(all[provider] ?? {}), ...patch };
    storage.setItem(EXTRA_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable */
  }
}

function dropEmpty<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (v !== "" && v != null) out[k] = v;
  return out as T;
}

// ============================================================================
// HTTP HELPER
// ============================================================================

const REQUEST_TIMEOUT_MS = 45_000;

type HttpRequest = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  accept?: string;
};

async function http({
  method,
  url,
  headers = {},
  body,
  accept = "application/json",
}: HttpRequest): Promise<
  | { ok: true; status: number; text: string; json: unknown; headers: Headers }
  | { ok: false; status: number; text: string }
> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const response = await fetch(url, {
      method,
      headers: dropEmpty({ Accept: accept, ...headers }),
      body,
      signal: controller?.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      return { ok: false, status: response.status, text: text.slice(0, 400) };
    }
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { ok: true, status: response.status, text, json, headers: response.headers };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      text: aborted
        ? "The request timed out."
        : "The browser blocked or could not reach that address (offline, CORS, or a wrong URL).",
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function describeStatus(
  status: number,
  body: string,
): { error: string; hint?: string; needsAuth?: boolean } {
  if (status === 0)
    return { error: body || "Network request failed.", hint: "Check your connection and the URL." };
  if (status === 401 || status === 403) {
    return {
      error: "The provider rejected your credentials.",
      hint: "Re-create the token, make sure it has not expired, and paste it without extra spaces.",
      needsAuth: true,
    };
  }
  if (status === 404)
    return { error: "Not found (404).", hint: "Wrong folder/path, or the file was deleted." };
  if (status === 409 || status === 412)
    return { error: `Conflict (${status}).`, hint: body.slice(0, 160) };
  if (status === 413) return { error: "The provider refused the file: it is too large (413)." };
  if (status === 429) return { error: "Rate limited (429). Try again in a minute." };
  return {
    error: `Request failed (${status || "offline"}).`,
    hint: body.slice(0, 160) || undefined,
  };
}

// ============================================================================
// PKCE + OAUTH (Google via Identity Services, Dropbox via code+PKCE)
// ============================================================================

/**
 * One PKCE pair: the verifier that goes to the token endpoint and the S256
 * challenge that goes to the authorize endpoint. They must come from the *same*
 * random value — hashing a second draw is how every Dropbox sign-in used to die
 * at the exchange with an opaque `invalid_grant`.
 */
export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const value = verifier();
  return { verifier: value, challenge: await sha256Base64Url(value) };
}

const verifier = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes).replace(/=+$/, "");
};

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_");
}

async function sha256Base64Url(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return base64Url(new Uint8Array(digest)).replace(/=+$/, "");
}

const PENDING_KEY = "skillsync:backup:oauthPending";

type PendingOAuth = { provider: CloudProvider; verifier: string; state: string; redirect: string };

function local(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function rememberPending(value: PendingOAuth | null) {
  try {
    const store = local();
    if (!store) return;
    if (value) store.setItem(PENDING_KEY, JSON.stringify(value));
    else store.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function readPending(): PendingOAuth | null {
  try {
    const raw = local()?.getItem(PENDING_KEY) ?? null;
    return raw ? (JSON.parse(raw) as PendingOAuth) : null;
  } catch {
    return null;
  }
}

export function cloudRedirectTarget(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

/**
 * Called once on app start: if the browser just came back from an OAuth
 * redirect, finish the exchange and clean the URL. Returns the provider that
 * was connected, or null when nothing was pending.
 */
export async function consumeCloudRedirect(): Promise<CloudProvider | null> {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const failed = params.get("error");
  if (!code && !failed) return null;

  const pending = readPending();
  rememberPending(null);

  // Scrub the code out of the address bar so it cannot be re-used or shared.
  const clean = new URL(window.location.href);
  clean.search = "";
  window.history.replaceState({}, document.title, clean.toString());

  if (failed) return pending?.provider ?? null;
  if (!code || !pending || !state || state !== pending.state) return null;

  try {
    if (pending.provider === "dropbox") {
      const token = await dropboxExchange(code, pending.verifier, pending.redirect);
      if (token) {
        await saveCloudToken("dropbox", token.access_token);
        if (token.refresh_token) {
          setCloudBackupConfig({
            provider: "dropbox",
            refreshToken: token.refresh_token,
            tokenExpiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
          });
        }
      }
      return "dropbox";
    }
  } catch {
    return pending.provider;
  }
  return null;
}

/**
 * OAuth lives on api.dropbox.com; only the API and content endpoints are on
 * api.dropboxapi.com. Sending the token exchange to the wrong host is answered
 * with a 404 that looks like a broken app key.
 */
const DROPBOX_TOKEN_URL = "https://api.dropbox.com/1/oauth2/token";
const TOKEN_FORM = { "Content-Type": "application/x-www-form-urlencoded" };

async function dropboxExchange(code: string, codeVerifier: string, redirect: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getCloudBackupConfig("dropbox").clientId ?? "",
    code_verifier: codeVerifier,
    redirect_uri: redirect,
  });
  const result = await http({
    method: "POST",
    url: DROPBOX_TOKEN_URL,
    headers: TOKEN_FORM,
    body: body.toString(),
    accept: "application/json",
  });
  if (!result.ok) return null;
  return result.json as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

/**
 * Dropbox access tokens expire after about four hours. Without a refresh the
 * connection would silently die overnight and every later sync would fail with
 * a 401 that the person cannot act on, so a soon-to-expire token is exchanged
 * for a fresh one on the way out.
 */
async function refreshDropboxToken(): Promise<string | null> {
  const config = getCloudBackupConfig("dropbox");
  if (!config.refreshToken || !config.clientId) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: config.refreshToken,
    client_id: config.clientId,
  });
  const result = await http({
    method: "POST",
    url: DROPBOX_TOKEN_URL,
    headers: TOKEN_FORM,
    body: body.toString(),
    accept: "application/json",
  });
  if (!result.ok) return null;
  const json = result.json as { access_token?: string; expires_in?: number } | null;
  if (!json?.access_token) return null;
  await saveCloudToken("dropbox", json.access_token);
  setCloudBackupConfig({
    provider: "dropbox",
    tokenExpiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
  });
  return json.access_token;
}

/** Start a Dropbox PKCE sign-in. Resolves after the browser navigates away. */
export async function startDropboxSignIn(clientId: string): Promise<CloudResult> {
  if (!clientId) return { ok: false, error: "Add your Dropbox app key first.", needsAuth: true };
  const { verifier: codeVerifier, challenge } = await createPkcePair();
  const state = base64Url(crypto.getRandomValues(new Uint8Array(12)));
  const redirect = cloudRedirectTarget();
  rememberPending({ provider: "dropbox", verifier: codeVerifier, state, redirect });

  const url = new URL("https://www.dropbox.com/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("token_access_type", "offline");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("state", state);
  if (typeof window !== "undefined") window.location.assign(url.toString());
  return { ok: true };
}

// Google Identity Services: token minting without a client secret.
type GoogleTokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (error: unknown) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

const GIS_URL = "https://accounts.google.com/gsi/client";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function loadGis(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src^="${GIS_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(!!window.google?.accounts?.oauth2), {
        once: true,
      });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_URL;
    script.async = true;
    script.onload = () => resolve(!!window.google?.accounts?.oauth2);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/** Ask Google for an access token in a popup. Needs a Web-application client id. */
export async function requestGoogleToken(
  clientId: string,
): Promise<CloudResult<{ token: string }>> {
  if (!clientId)
    return { ok: false, error: "Add your Google OAuth client id first.", needsAuth: true };
  if (!(await loadGis())) {
    return {
      ok: false,
      error: "Google's sign-in library could not be loaded.",
      hint: "Check that accounts.google.com is reachable (ad blockers sometimes block it).",
    };
  }
  const client = window.google?.accounts?.oauth2?.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: () => {},
  });
  if (!client) return { ok: false, error: "Google sign-in is unavailable in this browser." };

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CloudResult<{ token: string }>) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const timeout = setTimeout(
      () =>
        finish({
          ok: false,
          error: "Sign-in was cancelled or timed out.",
          hint: "The Google popup must be allowed to finish.",
        }),
      120_000,
    );
    try {
      window
        .google!.accounts!.oauth2!.initTokenClient({
          client_id: clientId,
          scope: DRIVE_SCOPE,
          callback: (response) => {
            clearTimeout(timeout);
            if (response.access_token) finish({ ok: true, token: response.access_token });
            else finish({ ok: false, error: response.error || "Google did not return a token." });
          },
          error_callback: () => {
            clearTimeout(timeout);
            finish({
              ok: false,
              error: "Google rejected the request.",
              hint: "This origin must be listed under “Authorized JavaScript origins” for your client id.",
            });
          },
        })
        .requestAccessToken({ prompt: "" });
    } catch (error) {
      clearTimeout(timeout);
      finish({
        ok: false,
        error: error instanceof Error ? error.message : "Google sign-in failed.",
      });
    }
  });
}

// ============================================================================
// PROVIDER: GITHUB GIST (personal access token)
// ============================================================================

const GIST_FILE_PREFIX = "SkillSync-Backup";
const GIST_API = "https://api.github.com";

function gistHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

const gistProvider: {
  list: (call: Call) => Promise<CloudResult<{ items: CloudItem[] }>>;
  upload: (
    call: Call,
    input: { filename: string; text: string; description?: string; fileId?: string },
  ) => Promise<CloudResult<{ fileId: string; url?: string }>>;
  download: (call: Call, fileId: string) => Promise<CloudResult<{ text: string; name: string }>>;
  remove: (call: Call, fileId: string) => Promise<CloudResult>;
  verify: (call: Call) => Promise<CloudResult<CloudVerifyInfo>>;
} = {
  async list({ token }: Call): Promise<CloudResult<{ items: CloudItem[] }>> {
    if (!token) return { ok: false, error: "Add a GitHub token first.", needsAuth: true };
    const result = await http({
      method: "GET",
      url: `${GIST_API}/gists?per_page=100`,
      headers: gistHeaders(token),
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    const gists = Array.isArray(result.json) ? (result.json as unknown[]) : [];
    const items: CloudItem[] = [];
    for (const gist of gists as Array<Record<string, unknown>>) {
      const files = (gist.files ?? {}) as Record<string, Record<string, unknown>>;
      const name = Object.keys(files).find((key) => key.startsWith(GIST_FILE_PREFIX));
      if (!name) continue;
      const id = String(gist.id ?? "");
      const file = files[name];
      items.push({
        id,
        name,
        sizeBytes: Number(file.size ?? 0),
        createdAt: Date.parse(String(file.created_at ?? gist.created_at ?? "")) || 0,
        updatedAt: Date.parse(String(file.updated_at ?? gist.updated_at ?? "")) || 0,
        url: typeof gist.html_url === "string" ? gist.html_url : undefined,
      });
    }
    return { ok: true, items };
  },

  async upload(
    { token }: Call,
    input: { filename: string; text: string; description?: string; fileId?: string },
  ): Promise<CloudResult<{ fileId: string; url?: string }>> {
    if (!token) return { ok: false, error: "Add a GitHub token first.", needsAuth: true };
    if (new Blob([input.text]).size > 6 * 1024 * 1024) {
      return {
        ok: false,
        error: "This backup is too big for the Gist API (about a 6 MB limit).",
        hint: "Turn on compression, or use WebDAV / Google Drive / Dropbox for large workspaces.",
      };
    }
    // This copy already has a gist: update it instead of leaving a near-identical
    // one behind every time someone presses Upload twice.
    if (input.fileId) {
      const patched = await http({
        method: "PATCH",
        url: `${GIST_API}/gists/${encodeURIComponent(input.fileId)}`,
        headers: gistHeaders(token),
        body: JSON.stringify({ files: { [input.filename]: { content: input.text } } }),
      });
      if (patched.ok) return { ok: true, fileId: input.fileId };
      // Deleted on GitHub since then? Creating a fresh gist is the friendly
      // answer, not an error the user has to think about.
    }
    const result = await http({
      method: "POST",
      url: `${GIST_API}/gists`,
      headers: gistHeaders(token),
      body: JSON.stringify({
        description: input.description ?? "SkillSync backup",
        public: false,
        files: { [input.filename]: { content: input.text } },
      }),
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    const json = (result.json ?? {}) as { id?: string; html_url?: string };
    if (!json.id) return { ok: false, error: "GitHub did not return a gist id." };
    return { ok: true, fileId: String(json.id), url: json.html_url };
  },

  async download(
    { token }: Call,
    fileId: string,
  ): Promise<CloudResult<{ text: string; name: string }>> {
    if (!token) return { ok: false, error: "Add a GitHub token first.", needsAuth: true };
    const result = await http({
      method: "GET",
      url: `${GIST_API}/gists/${encodeURIComponent(fileId)}`,
      headers: gistHeaders(token),
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    const files =
      (
        result.json as {
          files?: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
        } | null
      )?.files ?? {};
    const name =
      Object.keys(files).find((key) => key.startsWith(GIST_FILE_PREFIX)) ?? Object.keys(files)[0];
    if (!name) return { ok: false, error: "That gist has no SkillSync file in it." };
    const file = files[name];
    if (file.content && !file.truncated) return { ok: true, text: file.content, name };
    if (!file.raw_url)
      return { ok: false, error: "GitHub returned neither content nor a raw URL for that gist." };
    // Large files are not inlined by the API; fetch the raw copy instead.
    const raw = await http({ method: "GET", url: file.raw_url, accept: "text/plain" });
    if (!raw.ok) return { ok: false, ...describeStatus(raw.status, raw.text) };
    return { ok: true, text: raw.text, name };
  },

  async remove({ token }: Call, fileId: string): Promise<CloudResult> {
    if (!token) return { ok: false, error: "Add a GitHub token first.", needsAuth: true };
    const result = await http({
      method: "DELETE",
      url: `${GIST_API}/gists/${encodeURIComponent(fileId)}`,
      headers: gistHeaders(token),
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true };
  },

  async verify({ token }: Call): Promise<CloudResult<{ user?: string; scopes?: string }>> {
    if (!token) return { ok: false, error: "Add a GitHub token first.", needsAuth: true };
    const result = await http({
      method: "GET",
      url: `${GIST_API}/gists?per_page=1`,
      headers: gistHeaders(token),
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true, scopes: result.headers.get("x-oauth-scopes") ?? undefined };
  },
};

// ============================================================================
// PROVIDER: WEBDAV
// ============================================================================

function joinUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}

function davHeaders(call: Call): Record<string, string> {
  const headers: Record<string, string> = {};
  if (call.token) headers.Authorization = `Bearer ${call.token}`;
  else if (call.extra.username) {
    const raw = `${call.extra.username}:${call.extra.password ?? ""}`;
    headers.Authorization = `Basic ${btoa(raw)}`;
  }
  return headers;
}

function parseDavListing(xml: string, baseUrl: string): CloudItem[] {
  const items: CloudItem[] = [];
  // Regex-based on purpose: DOMParser exists in browsers but the shape of a
  // PROPFIND response is simple enough that a parser dependency is not worth it.
  const responses = xml.match(/<d?:?response[^>]*>[\s\S]*?<\/d?:?response>/g) ?? [];
  for (const block of responses) {
    const href = /<d?:?href[^>]*>([\s\S]*?)<\/d?:?href>/.exec(block)?.[1];
    if (!href) continue;
    const decoded = decodeURIComponent(href.trim());
    const name = decoded.split("/").filter(Boolean).pop() ?? "";
    if (!name.startsWith(GIST_FILE_PREFIX) && !name.endsWith(".json")) continue;
    const length = Number(/<d?:?getcontentlength[^>]*>(\d+)/.exec(block)?.[1] ?? 0);
    const modifiedText = /<d?:?getlastmodified[^>]*>([\s\S]*?)<\/d?:?getlastmodified>/.exec(
      block,
    )?.[1];
    const modified = modifiedText ? Date.parse(modifiedText.trim()) : 0;
    const path = decoded.replace(/^\/+/, "");
    items.push({
      id: path,
      name,
      sizeBytes: Number.isFinite(length) ? length : 0,
      createdAt: Number.isFinite(modified) ? modified : 0,
      updatedAt: Number.isFinite(modified) ? modified : 0,
      url: joinUrl(baseUrl.replace(/\/+$/, ""), path),
    });
  }
  return items;
}

const webdavProvider = {
  async list(call: Call): Promise<CloudResult<{ items: CloudItem[] }>> {
    const base = call.extra.baseUrl;
    if (!base) return { ok: false, error: "Add the WebDAV folder URL first." };
    const result = await http({
      method: "PROPFIND",
      url: base,
      headers: {
        ...davHeaders(call),
        Depth: "1",
        "Content-Type": "application/xml; charset=utf-8",
      },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/><d:getlastmodified/><d:resourcetype/></d:prop></d:propfind>',
      accept: "application/xml, text/xml, */*",
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true, items: parseDavListing(result.text, base) };
  },

  async upload(
    call: Call,
    input: { filename: string; text: string },
  ): Promise<CloudResult<{ fileId: string; url?: string }>> {
    const base = call.extra.baseUrl;
    if (!base) return { ok: false, error: "Add the WebDAV folder URL first." };
    const url = joinUrl(base, input.filename);
    const result = await http({
      method: "PUT",
      url,
      headers: { ...davHeaders(call), "Content-Type": "application/json" },
      body: input.text,
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true, fileId: input.filename, url };
  },

  async download(call: Call, fileId: string): Promise<CloudResult<{ text: string; name: string }>> {
    const base = call.extra.baseUrl;
    if (!base) return { ok: false, error: "Add the WebDAV folder URL first." };
    const result = await http({
      method: "GET",
      url: joinUrl(base, fileId),
      accept: "application/json, text/plain",
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true, text: result.text, name: fileId.split("/").pop() ?? fileId };
  },

  async remove(call: Call, fileId: string): Promise<CloudResult> {
    const base = call.extra.baseUrl;
    if (!base) return { ok: false, error: "Add the WebDAV folder URL first." };
    const result = await http({
      method: "DELETE",
      url: joinUrl(base, fileId),
      headers: davHeaders(call),
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true };
  },

  async verify(call: Call): Promise<CloudResult<CloudVerifyInfo>> {
    const base = call.extra.baseUrl;
    if (!base) return { ok: false, error: "Add the WebDAV folder URL first." };
    // MKCOL is a cheap "can I write here" probe; 405 means it already exists.
    const mkcol = await http({
      method: "MKCOL",
      url: base.replace(/\/+$/, ""),
      headers: davHeaders(call),
      body: "",
    });
    if (!mkcol.ok && mkcol.status !== 405 && mkcol.status !== 403 && mkcol.status !== 409) {
      return { ok: false, ...describeStatus(mkcol.status, mkcol.text) };
    }
    const listing = await webdavProvider.list(call);
    if (!listing.ok) return listing;
    return { ok: true };
  },
};

// ============================================================================
// PROVIDER: GOOGLE DRIVE
// ============================================================================

const DRIVE_ROOT = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_NAME = "SkillSync Backups";

const driveProvider = {
  async folderId(call: Call): Promise<string | null> {
    const configured = call.config.folderId || call.extra.folderId;
    if (configured) return configured;
    return null;
  },

  async ensureFolder(call: Call): Promise<CloudResult<{ folderId?: string }>> {
    const existing = await driveProvider.folderId(call);
    if (existing) return { ok: true, folderId: existing };
    const boundary = "skillsync-boundary";
    const metadata = { name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}--\r\n`;
    const created = await http({
      method: "POST",
      url: `${DRIVE_ROOT}/files?fields=id`,
      headers: {
        Authorization: `Bearer ${call.token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!created.ok) return { ok: false, ...describeStatus(created.status, created.text) };
    const id = (created.json as { id?: string } | null)?.id ?? null;
    if (id) {
      setCloudExtras("google-drive", { folderId: id });
      setCloudBackupConfig({ provider: "google-drive", folderId: id });
    }
    return { ok: true, folderId: id ?? undefined };
  },

  async list(call: Call): Promise<CloudResult<{ items: CloudItem[] }>> {
    if (!call.token) return { ok: false, error: "Connect to Google first.", needsAuth: true };
    const folder = await driveProvider.folderId(call);
    const parts = [`name contains '${GIST_FILE_PREFIX}'`, "trashed = false"];
    if (folder) parts.push(`'${folder}' in parents`);
    const query = encodeURIComponent(parts.join(" and "));
    const url = `${DRIVE_ROOT}/files?q=${query}&pageSize=100&fields=files(id,name,size,createdTime,modifiedTime,webContentLink)`;
    const result = await http({
      method: "GET",
      url,
      headers: { Authorization: `Bearer ${call.token}` },
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    const files = (result.json as { files?: unknown[] } | null)?.files ?? [];
    const items: CloudItem[] = (files as Array<Record<string, unknown>>).map((file) => ({
      id: String(file.id ?? ""),
      name: String(file.name ?? "backup.json"),
      sizeBytes: Number(file.size ?? 0),
      createdAt: Date.parse(String(file.createdTime ?? "")) || 0,
      updatedAt: Date.parse(String(file.modifiedTime ?? "")) || 0,
      url: typeof file.webContentLink === "string" ? file.webContentLink : undefined,
    }));
    return { ok: true, items };
  },

  async upload(
    call: Call,
    input: { filename: string; text: string; fileId?: string },
  ): Promise<CloudResult<{ fileId: string }>> {
    if (!call.token) return { ok: false, error: "Connect to Google first.", needsAuth: true };
    const folder = await driveProvider.ensureFolder(call);
    if (!folder.ok) return folder;
    const boundary = "skillsync-boundary";
    const metadata: Record<string, unknown> = {
      name: input.filename,
      mimeType: "application/json",
    };
    if (folder.folderId) metadata.parents = [folder.folderId];
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${input.text}\r\n--${boundary}--\r\n`;
    const endpoint = input.fileId
      ? `${DRIVE_UPLOAD}/files/${encodeURIComponent(input.fileId)}?uploadType=multipart`
      : `${DRIVE_UPLOAD}/files?uploadType=multipart`;
    const result = await http({
      method: input.fileId ? "PATCH" : "POST",
      url: endpoint,
      headers: {
        Authorization: `Bearer ${call.token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    const id = (result.json as { id?: string } | null)?.id;
    if (!id) return { ok: false, error: "Google Drive did not return a file id." };
    return { ok: true, fileId: id };
  },

  async download(call: Call, fileId: string): Promise<CloudResult<{ text: string; name: string }>> {
    if (!call.token) return { ok: false, error: "Connect to Google first.", needsAuth: true };
    const meta = await http({
      method: "GET",
      url: `${DRIVE_ROOT}/files/${encodeURIComponent(fileId)}?fields=name`,
      headers: { Authorization: `Bearer ${call.token}` },
    });
    const name = meta.ok
      ? String((meta.json as { name?: string } | null)?.name ?? "backup.json")
      : "backup.json";
    const result = await http({
      method: "GET",
      url: `${DRIVE_ROOT}/files/${encodeURIComponent(fileId)}?alt=media`,
      headers: { Authorization: `Bearer ${call.token}` },
      accept: "application/json, text/plain",
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true, text: result.text, name };
  },

  async remove(call: Call, fileId: string): Promise<CloudResult> {
    if (!call.token) return { ok: false, error: "Connect to Google first.", needsAuth: true };
    const result = await http({
      method: "DELETE",
      url: `${DRIVE_ROOT}/files/${encodeURIComponent(fileId)}`,
      headers: { Authorization: `Bearer ${call.token}` },
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true };
  },

  async verify(call: Call): Promise<CloudResult<CloudVerifyInfo>> {
    if (!call.token) return { ok: false, error: "Connect to Google first.", needsAuth: true };
    const result = await http({
      method: "GET",
      url: `${DRIVE_ROOT}/about?fields=user,storageQuota`,
      headers: { Authorization: `Bearer ${call.token}` },
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    const about = result.json as {
      user?: { emailAddress?: string };
      storageQuota?: { usage?: string };
    } | null;
    return { ok: true, account: about?.user?.emailAddress };
  },
};

// ============================================================================
// PROVIDER: DROPBOX
// ============================================================================

const DROPBOX_API = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT = "https://content.dropboxapi.com/2";
const DROPBOX_FOLDER = "/SkillSync";

const dropboxProvider = {
  async call<T = unknown>(
    method: string,
    body: unknown,
    args?: Record<string, unknown>,
  ): Promise<{ ok: true; json: T; text: string } | { ok: false; status: number; text: string }> {
    const token = await currentToken("dropbox");
    if (!token) return { ok: false, status: 0, text: "Connect to Dropbox first." };
    if (args !== undefined) {
      const result = await http({
        method: "POST",
        url: `${DROPBOX_CONTENT}/${method}`,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify(args),
        },
        body: (body as string | undefined) ?? "",
        accept: "*/*",
      });
      if (!result.ok) return { ok: false, status: result.status, text: result.text };
      return { ok: true, json: result.text as T, text: result.text };
    }
    const result = await http({
      method: "POST",
      url: `${DROPBOX_API}/${method}`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === null ? "null" : JSON.stringify(body),
    });
    if (!result.ok) return { ok: false, status: result.status, text: result.text };
    return { ok: true, json: result.json as T, text: result.text };
  },

  async list(): Promise<CloudResult<{ items: CloudItem[] }>> {
    const result = await dropboxProvider.call<{ entries?: Array<Record<string, unknown>> }>(
      "files/list_folder",
      {
        path: DROPBOX_FOLDER,
        limit: 100,
        include_deleted: false,
      },
    );
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    const entries = result.json?.entries ?? [];
    const items: CloudItem[] = entries
      .filter(
        (entry) =>
          entry[".tag"] === "file" && String(entry.name ?? "").startsWith(GIST_FILE_PREFIX),
      )
      .map((entry) => ({
        id: String(entry.path_lower ?? entry.name ?? ""),
        name: String(entry.name ?? ""),
        sizeBytes: Number(entry.size ?? 0),
        createdAt: Date.parse(String(entry.client_modified ?? entry.server_modified ?? "")) || 0,
        updatedAt: Date.parse(String(entry.server_modified ?? "")) || 0,
      }));
    return { ok: true, items };
  },

  async upload(input: {
    filename: string;
    text: string;
  }): Promise<CloudResult<{ fileId: string }>> {
    const result = await dropboxProvider.call<{ path?: string }>("files/upload", input.text, {
      path: `${DROPBOX_FOLDER}/${input.filename}`,
      mode: "add",
      autorename: true,
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    const parsed = safeParse<{ path_lower?: string }>(result.text);
    return { ok: true, fileId: parsed?.path_lower ?? `${DROPBOX_FOLDER}/${input.filename}` };
  },

  async download(fileId: string): Promise<CloudResult<{ text: string; name: string }>> {
    const result = await dropboxProvider.call<string>("files/download", undefined, {
      path: fileId,
    });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true, text: result.text, name: fileId.split("/").pop() ?? fileId };
  },

  async remove(fileId: string): Promise<CloudResult> {
    const result = await dropboxProvider.call("files/delete_v2", { path: fileId });
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true };
  },

  async verify(): Promise<CloudResult<CloudVerifyInfo>> {
    const result = await dropboxProvider.call<{ email?: string; name?: { display_name?: string } }>(
      "users/get_current_account",
      null,
    );
    if (!result.ok) return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true, account: result.json?.email ?? result.json?.name?.display_name };
  },

  async ensureFolder(): Promise<CloudResult> {
    const result = await dropboxProvider.call("files/create_folder", {
      path: DROPBOX_FOLDER,
      autorename: false,
    });
    if (!result.ok && result.status !== 409)
      return { ok: false, ...describeStatus(result.status, result.text) };
    return { ok: true };
  },
};

function safeParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ============================================================================
// DESCRIPTORS + UNIFIED API
// ============================================================================

export const CLOUD_PROVIDERS: CloudDescriptor[] = [
  {
    provider: "github-gist",
    name: "GitHub Gist",
    blurb: "A private gist per backup. Simplest to set up — no app registration, no redirect URL.",
    fields: [
      {
        key: "token",
        label: "Personal access token",
        placeholder: "ghp_… or github_pat_…",
        help: "Needs only the `gist` scope. Stored on this device.",
        secret: true,
        required: true,
      },
    ],
    steps: [
      "GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic).",
      "Generate a new token with the single `gist` scope checked.",
      "Paste it here and press Test connection.",
      "Each upload creates a private gist named SkillSync-Backup-…; restore lists them.",
    ],
    notes: ["Gist files are private but are not encrypted — a password-protected backup is safer."],
    maxFileBytes: 6 * 1024 * 1024,
  },
  {
    provider: "webdav",
    name: "WebDAV folder",
    blurb:
      "Any Nextcloud, ownCloud, Synology or other WebDAV share you already run. Your files stay yours.",
    fields: [
      {
        key: "baseUrl",
        label: "Folder URL",
        placeholder: "https://cloud.example.com/remote.php/dav/files/me/SkillSync",
        help: "Point it at the folder SkillSync may use; it will be created if missing.",
        required: true,
      },
      { key: "username", label: "Username", placeholder: "nextcloud" },
      { key: "password", label: "Password or app token", placeholder: "••••••••", secret: true },
    ],
    steps: [
      "Create (or reuse) a folder for SkillSync on your WebDAV server.",
      "Copy its full URL — for Nextcloud that is usually /remote.php/dav/files/<user>/SkillSync.",
      "Prefer an app password over your real one if the server supports it.",
      "The server must allow this origin in its CORS settings, otherwise the browser blocks the request.",
    ],
    notes: ["WebDAV over http:// works only from http origins; use https on a hosted site."],
    maxFileBytes: 512 * 1024 * 1024,
  },
  {
    provider: "google-drive",
    name: "Google Drive",
    blurb:
      "Backups live in a “SkillSync Backups” folder in your Drive, signed in with your Google account.",
    fields: [
      {
        key: "clientId",
        label: "OAuth client id",
        placeholder: "1234-abc.apps.googleusercontent.com",
        help: "A “Web application” OAuth client from your Google Cloud project.",
        required: true,
      },
    ],
    steps: [
      "console.cloud.google.com → APIs & Services → enable the Google Drive API.",
      "OAuth consent screen → External, add the scope …/auth/drive.file and publish.",
      "Credentials → Create credentials → OAuth client ID → Web application.",
      "Under Authorized JavaScript origins add the exact origin you open SkillSync on (including the port).",
      "Paste the client id here, then press Connect with Google.",
    ],
    notes: ["No client secret is needed: tokens are minted in-browser by Google's own library."],
    maxFileBytes: 30 * 1024 * 1024,
  },
  {
    provider: "dropbox",
    name: "Dropbox",
    blurb:
      "A /SkillSync folder in your Dropbox, connected with Dropbox sign-in (PKCE, no app secret).",
    fields: [
      {
        key: "clientId",
        label: "App key",
        placeholder: "abcd1234efgh567",
        help: "From the Dropbox App Console. Enable PKCE and add your redirect URL.",
        required: true,
      },
    ],
    steps: [
      "dropbox.com/developers/apps → Create app → Dropbox API → App folder or Full Dropbox.",
      "In the app's “OAuth” tab enable PKCE (so no app secret is required).",
      "Add your SkillSync origin + /profile/backup to “Redirect URIs”.",
      "Paste the app key here and press Connect with Dropbox.",
    ],
    notes: ["You can also paste a short-lived access token instead, if you only want to test."],
    maxFileBytes: 150 * 1024 * 1024,
  },
];

export function describeCloudProvider(provider: CloudProvider): CloudDescriptor | null {
  return CLOUD_PROVIDERS.find((entry) => entry.provider === provider) ?? null;
}

export type CloudSetup = {
  provider: CloudProvider;
  token?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  clientId?: string;
  folderId?: string;
  enabled?: boolean;
  autoUpload?: boolean;
};

/** Persist a provider setup: secrets to IndexedDB, settings to localStorage. */
export async function configureCloud(setup: CloudSetup): Promise<void> {
  const { provider, token, ...rest } = setup;
  if (token !== undefined) await saveCloudToken(provider, token || null);
  setCloudBackupConfig({
    provider,
    ...(rest.clientId !== undefined ? { clientId: rest.clientId } : {}),
    ...(rest.folderId !== undefined ? { folderId: rest.folderId } : {}),
    ...(rest.enabled !== undefined ? { enabled: rest.enabled } : {}),
    ...(rest.autoUpload !== undefined ? { autoUpload: rest.autoUpload } : {}),
  });
  setCloudExtras(
    provider,
    dropEmpty({
      baseUrl: rest.baseUrl,
      username: rest.username,
      password: rest.password,
    }),
  );
}

/** Records that a cloud round-trip succeeded, for the "synced 2h ago" line. */
export function markCloudSync(provider: CloudProvider, opts: { enabled?: boolean } = {}): void {
  setCloudBackupConfig({
    provider,
    lastSyncAt: Date.now(),
    ...(opts.enabled === undefined ? {} : { enabled: opts.enabled }),
  });
}

export async function disconnectCloud(
  provider: CloudProvider,
  opts: { forget?: boolean } = {},
): Promise<void> {
  if (opts.forget !== false) await saveCloudToken(provider, null);
  setCloudBackupConfig({ provider, enabled: false, lastSyncAt: undefined });
}

export async function currentToken(provider: CloudProvider): Promise<string | null> {
  if (provider === "dropbox") {
    const { tokenExpiresAt } = getCloudBackupConfig("dropbox");
    if (tokenExpiresAt && tokenExpiresAt - Date.now() < 60_000) {
      const refreshed = await refreshDropboxToken();
      if (refreshed) return refreshed;
    }
  }
  const stored = await loadCloudToken(provider);
  if (stored) return stored;
  return getCloudBackupConfig(provider).token ?? null;
}

/** What the UI needs to know before offering a provider. */
export type CloudProviderStatus = {
  configured: boolean;
  connected: boolean;
  enabled: boolean;
  autoUpload: boolean;
  missing: CloudFieldKey[];
  lastSyncAt?: number;
};

export async function cloudStatus(provider: CloudProvider): Promise<CloudProviderStatus> {
  const config = getCloudBackupConfig(provider);
  const extras = getCloudExtras(provider);
  const descriptor = describeCloudProvider(provider);
  const token = await currentToken(provider);
  const missing: CloudFieldKey[] = [];
  for (const field of descriptor?.fields ?? []) {
    if (!field.required) continue;
    const value =
      field.key === "token"
        ? token
        : field.key === "clientId"
          ? config.clientId
          : extras[field.key];
    if (!value) missing.push(field.key);
  }
  return {
    configured: missing.length === 0,
    connected: Boolean(token) || missing.length === 0,
    enabled: config.enabled,
    autoUpload: config.autoUpload,
    missing,
    lastSyncAt: config.lastSyncAt,
  };
}

type ProviderOps = {
  list: (call: Call) => Promise<CloudResult<{ items: CloudItem[] }>>;
  upload: (
    call: Call,
    input: { filename: string; text: string; fileId?: string },
  ) => Promise<CloudResult<{ fileId: string; url?: string }>>;
  download: (call: Call, fileId: string) => Promise<CloudResult<{ text: string; name: string }>>;
  remove: (call: Call, fileId: string) => Promise<CloudResult>;
  verify: (call: Call) => Promise<CloudResult<CloudVerifyInfo>>;
};

async function call(provider: CloudProvider): Promise<Call> {
  return {
    config: getCloudBackupConfig(provider),
    token: await currentToken(provider),
    extra: getCloudExtras(provider),
  };
}

function bind(
  provider: CloudProvider,
  ops: ProviderOps,
): ProviderOps & { provider: CloudProvider } {
  return { provider, ...ops };
}

const gistOps = bind("github-gist", {
  list: (c) => gistProvider.list(c),
  upload: (c, input) => gistProvider.upload(c, input),
  download: (c, id) => gistProvider.download(c, id),
  remove: (c, id) => gistProvider.remove(c, id),
  verify: (c) => gistProvider.verify(c),
});

const webdavOps = bind("webdav", {
  list: (c) => webdavProvider.list(c),
  upload: async (c, input) => {
    const checked = await webdavProvider.verify(c);
    if (!checked.ok) return checked;
    return webdavProvider.upload(c, input);
  },
  download: (c, id) => webdavProvider.download(c, id),
  remove: (c, id) => webdavProvider.remove(c, id),
  verify: (c) => webdavProvider.verify(c),
});

const driveOps = bind("google-drive", {
  list: (c) => driveProvider.list(c),
  upload: (c, input) => driveProvider.upload(c, input),
  download: (c, id) => driveProvider.download(c, id),
  remove: (c, id) => driveProvider.remove(c, id),
  verify: (c) => driveProvider.verify(c),
});

const dropboxOps: ProviderOps & { provider: CloudProvider } = {
  provider: "dropbox",
  list: () => dropboxProvider.list(),
  upload: async (_c, input) => {
    const folder = await dropboxProvider.ensureFolder();
    if (!folder.ok) return folder;
    return dropboxProvider.upload(input);
  },
  download: (_c, id) => dropboxProvider.download(id),
  remove: (_c, id) => dropboxProvider.remove(id),
  verify: () => dropboxProvider.verify(),
};

const OPS: Partial<Record<CloudProvider, ProviderOps & { provider: CloudProvider }>> = {
  "github-gist": gistOps,
  webdav: webdavOps,
  "google-drive": driveOps,
  dropbox: dropboxOps,
};

export function providerOps(
  provider: CloudProvider,
): (ProviderOps & { provider: CloudProvider }) | null {
  return OPS[provider] ?? null;
}

export async function cloudList(
  provider: CloudProvider,
): Promise<CloudResult<{ items: CloudItem[] }>> {
  const ops = providerOps(provider);
  if (!ops) return { ok: false, error: "That cloud provider is not available." };
  return ops.list(await call(provider));
}

export async function cloudUpload(
  provider: CloudProvider,
  input: { filename: string; text: string; fileId?: string },
): Promise<CloudResult<{ fileId: string; url?: string }>> {
  const ops = providerOps(provider);
  if (!ops) return { ok: false, error: "That cloud provider is not available." };
  return ops.upload(await call(provider), input);
}

export async function cloudDownload(
  provider: CloudProvider,
  fileId: string,
): Promise<CloudResult<{ text: string; name: string }>> {
  const ops = providerOps(provider);
  if (!ops) return { ok: false, error: "That cloud provider is not available." };
  return ops.download(await call(provider), fileId);
}

export async function cloudDelete(provider: CloudProvider, fileId: string): Promise<CloudResult> {
  const ops = providerOps(provider);
  if (!ops) return { ok: false, error: "That cloud provider is not available." };
  return ops.remove(await call(provider), fileId);
}

export async function cloudVerify(provider: CloudProvider): Promise<CloudResult<CloudVerifyInfo>> {
  const ops = providerOps(provider);
  if (!ops) return { ok: false, error: "That cloud provider is not available." };
  return ops.verify(await call(provider));
}

/**
 * A file-name scheme that keeps the local id and the timestamp together, so a
 * download from any device can be matched back to the vault.
 */
export function cloudFilename(createdAtISO: string, backupId: string): string {
  return `${GIST_FILE_PREFIX}-${createdAtISO.replace(/[-:]/g, "").slice(0, 13).replace("T", "-")}-${backupId.slice(0, 8)}.json`;
}

export function backupIdFromCloudName(name: string): string | null {
  const match = /-([0-9a-f]{8,})\.json$/i.exec(name);
  return match ? match[1] : null;
}
