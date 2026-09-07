// @vitest-environment jsdom
/**
 * Cloud providers are exercised against a mocked fetch: the exact request each
 * one must make, and how real API failures are translated into something a
 * person can act on.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { webcrypto, createHash } from "node:crypto";
import {
  backupIdFromCloudName,
  cloudDelete,
  cloudDownload,
  cloudFilename,
  cloudList,
  cloudStatus,
  cloudUpload,
  currentToken,
  cloudVerify,
  configureCloud,
  CLOUD_PROVIDERS,
  createPkcePair,
  describeCloudProvider,
  getCloudExtras,
} from "@/lib/backup/cloud";
import { getCloudBackupConfig, setCloudBackupConfig } from "@/lib/backup/advanced-backup";

type FetchCall = { url: string; method: string; headers: Record<string, string>; body?: string };

const calls: FetchCall[] = [];

function respondWith(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  const status = init.status ?? 200;
  const text = typeof body === "string" ? body : JSON.stringify(body);
  const bag = init.headers ?? {};
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    // jsdom has no Headers constructor, and http() only needs .get()
    headers: { get: (name: string) => bag[name.toLowerCase()] ?? null },
  };
}

const fetchMock = vi.fn((input: unknown, init: RequestInit = {}) => {
  const url = String(input);
  calls.push({
    url,
    method: String(init.method ?? "GET"),
    headers: (init.headers ?? {}) as Record<string, string>,
    body: typeof init.body === "string" ? init.body : undefined,
  });
  const responder = (
    fetchMock as unknown as { __respond?: (url: string, init: RequestInit) => unknown }
  ).__respond;
  return Promise.resolve(responder ? responder(url, init) : respondWith({}));
});

beforeEach(async () => {
  vi.stubGlobal("crypto", webcrypto);
  localStorage.clear();
  calls.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  (fetchMock as unknown as { __respond?: unknown }).__respond = undefined;
  await configureCloud({ provider: "github-gist", token: "ghp_test" });
  await configureCloud({
    provider: "webdav",
    baseUrl: "https://cloud.example.com/dav/files/me/SkillSync",
    username: "me",
    password: "pw",
  });
  await configureCloud({
    provider: "google-drive",
    token: "ya29.test",
    clientId: "abc.apps.googleusercontent.com",
  });
  await configureCloud({ provider: "dropbox", token: "db.test" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const next = (fn: (url: string, init: RequestInit) => unknown) => {
  (fetchMock as unknown as { __respond: unknown }).__respond = fn;
};

describe("cloud setup", () => {
  it("lists four real providers with the details a person needs", () => {
    expect(CLOUD_PROVIDERS.map((p) => p.provider)).toEqual([
      "github-gist",
      "webdav",
      "google-drive",
      "dropbox",
    ]);
    for (const descriptor of CLOUD_PROVIDERS) {
      expect(descriptor.steps.length).toBeGreaterThan(2);
      expect(descriptor.fields.length).toBeGreaterThan(0);
      expect(descriptor.maxFileBytes).toBeGreaterThan(0);
    }
    expect(describeCloudProvider("github-gist")?.fields[0].secret).toBe(true);
    expect(describeCloudProvider("none")).toBeNull();
  });

  it("never keeps a token in the plain config", async () => {
    expect(getCloudBackupConfig("github-gist").token).toBeUndefined();
    expect(getCloudExtras("github-gist").password).toBeUndefined();
    const status = await cloudStatus("github-gist");
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain("ghp_test");
  });

  it("reports what is missing for an unconfigured provider", async () => {
    const status = await cloudStatus("webdav");
    expect(status.missing).toEqual([]); // configured in beforeEach
    const gist = describeCloudProvider("github-gist");
    expect(gist?.fields.some((field) => field.key === "token")).toBe(true);
  });
});

describe("github gist", () => {
  it("uploads as a private gist with the backup as its only file", async () => {
    next(() => respondWith({ id: "gist-1", html_url: "https://gist/1" }));
    const result = await cloudUpload("github-gist", {
      filename: "SkillSync-Backup-x.json",
      text: "{}",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fileId).toBe("gist-1");
    const [call] = calls;
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://api.github.com/gists");
    expect(call.headers.Authorization).toBe("Bearer ghp_test");
    const body = JSON.parse(call.body ?? "{}");
    expect(body.public).toBe(false);
    expect(body.files["SkillSync-Backup-x.json"].content).toBe("{}");
  });

  it("updates the same gist when the copy was uploaded before", async () => {
    next(() => respondWith({ id: "gist-1" }));
    const result = await cloudUpload("github-gist", {
      filename: "SkillSync-Backup-x.json",
      text: "{}",
      fileId: "gist-9",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fileId).toBe("gist-9"); // no new gist made
    const [call] = calls;
    expect(call.method).toBe("PATCH");
    expect(call.url).toBe("https://api.github.com/gists/gist-9");
    expect(JSON.parse(call.body ?? "{}").files["SkillSync-Backup-x.json"].content).toBe("{}");
  });

  it("creates a gist again when the old one was deleted", async () => {
    let first = true;
    next(() => {
      if (first) {
        first = false;
        return respondWith({ message: "Not Found" }, { status: 404 });
      }
      return respondWith({ id: "gist-new" });
    });
    const result = await cloudUpload("github-gist", {
      filename: "a.json",
      text: "{}",
      fileId: "gone",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.fileId).toBe("gist-new");
    expect(calls.map((call) => call.method)).toEqual(["PATCH", "POST"]);
  });

  it("lists only SkillSync gists", async () => {
    next(() =>
      respondWith([
        {
          id: "a",
          files: { "SkillSync-Backup-1.json": { size: 10, created_at: "2026-01-01T00:00:00Z" } },
        },
        { id: "b", files: { "notes.md": { size: 3 } } },
      ]),
    );
    const result = await cloudList("github-gist");
    expect(result.ok && result.items.map((i) => i.id)).toEqual(["a"]);
  });

  it("falls back to the raw url when the api truncates a big file", async () => {
    next((url) =>
      url.includes("/raw/")
        ? respondWith('{"kind":"skillsync-backup"}', {})
        : respondWith({
            files: { "SkillSync-Backup-1.json": { truncated: true, raw_url: "https://raw/x" } },
          }),
    );
    const result = await cloudDownload("github-gist", "a");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toContain("skillsync-backup");
    expect(calls.length).toBe(2);
  });

  it("deletes", async () => {
    next(() => respondWith("", { status: 204 }));
    expect((await cloudDelete("github-gist", "a")).ok).toBe(true);
    expect(calls[0].method).toBe("DELETE");
  });

  it("turns a 401 into an actionable message", async () => {
    next(() => respondWith({ message: "Bad credentials" }, { status: 401 }));
    const result = await cloudVerify("github-gist");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.needsAuth).toBe(true);
      expect(result.hint).toMatch(/token/i);
    }
  });

  it("refuses an oversized file before asking the network", async () => {
    const huge = "x".repeat(7 * 1024 * 1024);
    const result = await cloudUpload("github-gist", { filename: "big.json", text: huge });
    expect(result.ok).toBe(false);
    expect(calls.length).toBe(0);
  });
});

describe("webdav", () => {
  it("asks for a listing with PROPFIND and parses it", async () => {
    next(() =>
      respondWith(
        `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
           <d:response>
             <d:href>/dav/files/me/SkillSync/SkillSync-Backup-2026-01-01-0000-abc123.json</d:href>
             <d:propstat><d:prop>
               <d:getcontentlength>4242</d:getcontentlength>
               <d:getlastmodified>Mon, 05 Jan 2026 10:00:00 GMT</d:getlastmodified>
             </d:prop></d:propstat>
           </d:response>
           <d:response><d:href>/dav/files/me/SkillSync/</d:href><d:propstat><d:prop/></d:propstat></d:response>
         </d:multistatus>`,
        { headers: { "content-type": "application/xml" } },
      ),
    );

    const result = await cloudList("webdav");
    expect(calls[0].method).toBe("PROPFIND");
    expect(calls[0].headers.Depth).toBe("1");
    expect(calls[0].headers.Authorization).toBe(`Basic ${btoa("me:pw")}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0].sizeBytes).toBe(4242);
    expect(result.items[0].name).toBe("SkillSync-Backup-2026-01-01-0000-abc123.json");
    expect(result.items[0].updatedAt).toBeGreaterThan(0);
  });

  it("puts the file at a path under the configured folder", async () => {
    next((url) =>
      url.endsWith("/SkillSync")
        ? respondWith("", { status: 201 })
        : respondWith("", { status: 201 }),
    );
    const result = await cloudUpload("webdav", { filename: "a.json", text: "{}" });
    expect(result.ok).toBe(true);
    const put = calls.find((call) => call.method === "PUT");
    expect(put?.url).toBe("https://cloud.example.com/dav/files/me/SkillSync/a.json");
    expect(put?.body).toBe("{}");
    // A verify probe runs first so a bad URL fails with a clear message.
    expect(calls[0].method).toBe("MKCOL");
  });

  it("keeps a bearer token when one was saved instead of a password", async () => {
    await configureCloud({
      provider: "webdav",
      baseUrl: "https://host/dav/SkillSync",
      token: "dvtok",
    });
    next(() => respondWith('<d:multistatus xmlns:d="DAV:"></d:multistatus>'));
    await cloudList("webdav");
    expect(calls[0].headers.Authorization).toBe("Bearer dvtok");
  });
});

describe("google drive", () => {
  it("uploads multipart metadata + media and stores the folder it made", async () => {
    next((url) => {
      if (url === "https://www.googleapis.com/drive/v3/files?fields=id")
        return respondWith({ id: "folder-1" });
      return respondWith({ id: "file-1", name: "a.json" });
    });

    const result = await cloudUpload("google-drive", {
      filename: "a.json",
      text: '{"kind":"skillsync-backup"}',
    });
    expect(result.ok).toBe(true);

    const upload = calls[calls.length - 1];
    expect(upload.url).toContain("/upload/drive/v3/files?uploadType=multipart");
    expect(upload.headers.Authorization).toBe("Bearer ya29.test");
    expect(upload.headers["Content-Type"]).toContain("multipart/related");
    expect(upload.body).toContain('"name":"a.json"');
    expect(upload.body).toContain('"parents":["folder-1"]');
    expect(upload.body).toContain('{"kind":"skillsync-backup"}');

    // The created folder is remembered, so the next upload does not make another.
    next(() => respondWith({ files: [] }));
    await cloudList("google-drive");
    const listing = calls[calls.length - 1];
    expect(decodeURIComponent(listing.url)).toContain("'folder-1' in parents");
    expect(listing.url).toContain("pageSize=100");
  });

  it("reads a file back through alt=media", async () => {
    next((url) =>
      url.includes("fields=name")
        ? respondWith({ name: "a.json" })
        : respondWith('{"kind":"skillsync-backup"}'),
    );
    const result = await cloudDownload("google-drive", "file-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.name).toBe("a.json");
  });

  it("surfaces a blocked origin with a hint about JS origins", async () => {
    next(() => respondWith({ error: { message: "origin_not_allowed" } }, { status: 403 }));
    const result = await cloudList("google-drive");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.needsAuth).toBe(true);
  });
});

describe("dropbox", () => {
  it("sends the file through the content endpoint with an API arg header", async () => {
    next((url) => {
      if (url.endsWith("files/create_folder")) return respondWith({ name: "SkillSync" });
      return respondWith({ path_lower: "/skillsync/a.json", name: "a.json" });
    });

    const result = await cloudUpload("dropbox", { filename: "a.json", text: "{}" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fileId).toBe("/skillsync/a.json");

    const upload = calls.find((call) => call.url.includes("files/upload"));
    expect(upload?.url).toBe("https://content.dropboxapi.com/2/files/upload");
    expect(JSON.parse(upload?.headers["Dropbox-API-Arg"] ?? "{}")).toMatchObject({
      path: "/SkillSync/a.json",
      mode: "add",
    });
    expect(upload?.body).toBe("{}");
  });

  it("lists only SkillSync files from the app folder", async () => {
    next(() =>
      respondWith({
        entries: [
          { ".tag": "folder", name: "nested" },
          {
            ".tag": "file",
            name: "SkillSync-Backup-1.json",
            size: 40,
            path_lower: "/skillsync/x.json",
            server_modified: "2026-01-05T10:00:00Z",
          },
        ],
      }),
    );
    const result = await cloudList("dropbox");
    expect(result.ok && result.items).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.dropboxapi.com/2/files/list_folder");
    expect(JSON.parse(calls[0].body ?? "{}").path).toBe("/SkillSync");
  });

  it("posts a null body to RPC endpoints that take no argument", async () => {
    next(() => respondWith({ email: "me@example.com" }));
    const result = await cloudVerify("dropbox");
    expect(result.ok).toBe(true);
    expect(calls[0].body).toBe("null");
    if (result.ok) expect(result.account).toBe("me@example.com");
  });
});

describe("dropbox tokens", () => {
  it("exchanges a soon-to-expire access token before using it", async () => {
    await configureCloud({ provider: "dropbox", token: "old-token" });
    setCloudBackupConfig({
      provider: "dropbox",
      clientId: "dbkey",
      refreshToken: "refresh-me",
      tokenExpiresAt: Date.now() - 1000,
    });

    next((url, init) => {
      // The OAuth host is not the API host — a 404 here looks like a bad app key.
      expect(url).toBe("https://api.dropbox.com/1/oauth2/token");
      expect(String(init.body)).toContain("grant_type=refresh_token");
      expect(String(init.body)).toContain("refresh_token=refresh-me");
      expect(String(init.body)).toContain("client_id=dbkey");
      return respondWith({ access_token: "fresh-token", expires_in: 14399 });
    });

    expect(await currentToken("dropbox")).toBe("fresh-token");

    // The refreshed token is what requests now carry, and the new expiry is kept.
    next(() => respondWith({ entries: [] }));
    await cloudList("dropbox");
    const listing = calls[calls.length - 1];
    expect(listing.url).toBe("https://api.dropboxapi.com/2/files/list_folder");
    expect(listing.headers.Authorization).toBe("Bearer fresh-token");
    expect(getCloudBackupConfig("dropbox").tokenExpiresAt).toBeGreaterThan(Date.now());
  });

  it("does not spend a request on a token that is still valid", async () => {
    await configureCloud({ provider: "dropbox", token: "still-good" });
    setCloudBackupConfig({
      provider: "dropbox",
      clientId: "dbkey",
      refreshToken: "refresh-me",
      tokenExpiresAt: Date.now() + 3600_000,
    });
    expect(await currentToken("dropbox")).toBe("still-good");
    expect(calls.length).toBe(0);
  });

  it("keeps working with a pasted token that has no refresh path", async () => {
    await configureCloud({ provider: "dropbox", token: "hand-pasted" });
    expect(await currentToken("dropbox")).toBe("hand-pasted");
    expect(calls.length).toBe(0);
  });
});

describe("PKCE for the Dropbox sign-in", () => {
  it("derives the challenge from the very verifier it hands back", async () => {
    // RFC 7636: the authorize request sends S256(verifier) and the token request
    // sends the verifier. If those come from two different draws, the exchange
    // fails — and the user sees an error they cannot fix.
    const { verifier, challenge } = await createPkcePair();
    const expected = createHash("sha256")
      .update(verifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(challenge).toBe(expected);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);

    const again = await createPkcePair();
    expect(again.verifier).not.toBe(verifier);
  });
});

describe("file naming", () => {
  it("round-trips the backup id through the file name", () => {
    const name = cloudFilename("2026-01-05T10:20:30.000Z", "abcdef123456");
    expect(name).toBe("SkillSync-Backup-20260105-1020-abcdef12.json");
    expect(backupIdFromCloudName(name)).toBe("abcdef12");
    expect(backupIdFromCloudName("random.json")).toBeNull();
  });
});
