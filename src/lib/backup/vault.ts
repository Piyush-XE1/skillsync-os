/**
 * The backup vault: where SkillSync keeps its own copies of backups.
 *
 * One home, one format. IndexedDB when it is available (megabyte-sized
 * payloads, per-origin quota), and an explicitly-flagged in-memory fallback
 * when it is not (private mode, SSR, unit tests) so the UI degrades with an
 * honest message instead of throwing.
 *
 * Records are written as `{ summary, text, meta }` where `summary` is stored
 * inline: listing the vault never has to parse a payload, which is what made
 * the old implementation stutter on every screen.
 */

import type { BackupMeta, CloudProvider } from "./advanced-backup";

const DB_NAME = "skillsync-vault";
const DB_VERSION = 1;
const RECORDS = "records";
const KV = "kv";

export type VaultKind = "manual" | "auto" | "safety" | "cloud";

export type CloudMark = {
  provider: CloudProvider;
  fileId: string;
  uploadedAt: number;
  url?: string;
  name?: string;
};

export type VaultSummary = {
  id: string;
  createdAt: number;
  kind: VaultKind;
  sizeBytes: number;
  compressed: boolean;
  encrypted: boolean;
  records: number;
  recordCounts: Record<string, number>;
  label: string;
  appVersion: string;
  backupVersion: number;
  cloud?: CloudMark;
};

export type VaultRecord = VaultSummary & { text: string; meta: BackupMeta };

type DbState = {
  db: IDBDatabase | null;
  open: boolean;
  failed: boolean;
  memory: Map<string, VaultRecord>;
  memoryKv: Map<string, unknown>;
};

const state: DbState = {
  db: null,
  open: false,
  failed: false,
  memory: new Map(),
  memoryKv: new Map(),
};

export function vaultIsPersistent(): boolean {
  return state.db !== null;
}

export function vaultBackendName(): "IndexedDB" | "in-memory" {
  return state.db ? "IndexedDB" : "in-memory";
}

function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined" && indexedDB !== null;
}

function openDb(): Promise<IDBDatabase | null> {
  if (state.db) return Promise.resolve(state.db);
  if (state.failed || !idbAvailable()) return Promise.resolve(null);

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      state.failed = true;
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS)) {
        db.createObjectStore(RECORDS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(KV)) {
        db.createObjectStore(KV, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      state.db = request.result;
      state.open = true;
      state.db.onversionchange = () => {
        state.db?.close();
        state.db = null;
      };
      state.db.onabort = () => {
        state.db = null;
      };
      resolve(state.db);
    };
    request.onerror = () => {
      state.failed = true;
      resolve(null);
    };
    request.onblocked = () => {
      state.failed = true;
      resolve(null);
    };
  });
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  return openDb().then((db) => {
    if (!db) return null;
    return new Promise<T | null>((resolve) => {
      try {
        const transaction = db.transaction(storeName, mode);
        const request = run(transaction.objectStore(storeName));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => resolve(null);
        transaction.onabort = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

function countOf(text: string): number {
  return text.length;
}

function summarize(meta: BackupMeta, kind: VaultKind, text: string, label?: string): VaultSummary {
  const records = Object.values(meta.recordCounts ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
  return {
    id: meta.backupId,
    createdAt: meta.createdAt,
    kind,
    sizeBytes: meta.sizeBytes || countOf(text),
    compressed: meta.compressed === true,
    encrypted: meta.encrypted === true,
    records,
    recordCounts: meta.recordCounts ?? {},
    label: label ?? defaultLabel(kind, meta.createdAt),
    appVersion: String(meta.appVersion ?? "unknown"),
    backupVersion: meta.backupVersion,
  };
}

export function defaultLabel(kind: VaultKind, createdAt: number): string {
  const when = new Date(createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return kind === "auto"
    ? `Auto · ${when}`
    : kind === "safety"
      ? `Before restore · ${when}`
      : `Backup · ${when}`;
}

/** Save a record. Returns the stored summary. */
export async function putVaultRecord(input: {
  text: string;
  meta: BackupMeta;
  kind?: VaultKind;
  label?: string;
  cloud?: CloudMark;
}): Promise<VaultSummary> {
  const kind = input.kind ?? "manual";
  const summary = summarize(input.meta, kind, input.text, input.label);
  if (input.cloud) summary.cloud = input.cloud;
  const record: VaultRecord = { ...summary, id: summary.id, text: input.text, meta: input.meta };

  state.memory.set(summary.id, record);

  if (idbAvailable()) {
    const wrote = await tx<IDBValidKey>(RECORDS, "readwrite", (store) => store.put(record));
    if (wrote === null && !state.failed) {
      // Write failed (quota / private mode): keep it in memory only.
      state.open = false;
    }
  }
  return summary;
}

export async function listVaultRecords(
  options: { kind?: VaultKind; limit?: number } = {},
): Promise<VaultSummary[]> {
  const { kind, limit = 50 } = options;
  const fromDb =
    idbAvailable() && !state.failed
      ? await tx<VaultRecord[]>(RECORDS, "readonly", (store) => store.getAll())
      : null;

  const pool = new Map<string, VaultRecord>();
  // Memory first: it always holds the freshest write of this session.
  for (const record of state.memory.values()) pool.set(record.id, record);
  for (const record of fromDb ?? []) if (!pool.has(record.id)) pool.set(record.id, record);

  return Array.from(pool.values())
    .filter((r) => (kind ? r.kind === kind : true))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map(({ text: _text, meta: _meta, ...summary }) => summary);
}

export async function getVaultRecord(id: string): Promise<VaultRecord | null> {
  const inMemory = state.memory.get(id);
  if (inMemory) return inMemory;
  if (!idbAvailable() || state.failed) return null;
  const found = await tx<VaultRecord>(RECORDS, "readonly", (store) => store.get(id));
  return found ?? null;
}

export async function deleteVaultRecord(id: string): Promise<boolean> {
  const existed = state.memory.delete(id);
  if (idbAvailable() && !state.failed) {
    const ok = await tx<undefined>(RECORDS, "readwrite", (store) => store.delete(id));
    return ok !== null || existed;
  }
  return existed;
}

/** Attach (or clear) cloud metadata on a local record. */
export async function markVaultRecord(id: string, cloud?: CloudMark): Promise<void> {
  const record = await getVaultRecord(id);
  if (!record) return;
  record.cloud = cloud;
  state.memory.set(id, record);
  if (idbAvailable() && !state.failed) {
    await tx<undefined>(RECORDS, "readwrite", (store) => store.put(record));
  }
}

/** Keep the newest `keep` records of a kind; delete the rest. */
export async function pruneVaultKind(kind: VaultKind, keep: number): Promise<number> {
  const all = await listVaultRecords({ kind, limit: 500 });
  const doomed = all.slice(Math.max(0, keep));
  let removed = 0;
  for (const summary of doomed) {
    if (await deleteVaultRecord(summary.id)) removed += 1;
  }
  return removed;
}

export type VaultStats = {
  count: number;
  bytes: number;
  persistent: boolean;
  backend: "IndexedDB" | "in-memory";
  usageBytes?: number;
  quotaBytes?: number;
};

export async function vaultStats(): Promise<VaultStats> {
  const all = await listVaultRecords({ limit: 500 });
  const bytes = all.reduce((sum, r) => sum + r.sizeBytes, 0);
  const stats: VaultStats = {
    count: all.length,
    bytes,
    persistent: vaultIsPersistent(),
    backend: vaultBackendName(),
  };
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (typeof estimate.usage === "number") stats.usageBytes = estimate.usage;
      if (typeof estimate.quota === "number") stats.quotaBytes = estimate.quota;
    } catch {
      /* permission or unsupported */
    }
  }
  return stats;
}

/** Wipe every SkillSync backup copy (local vault only; cloud is untouched). */
export async function clearVault(): Promise<number> {
  const all = await listVaultRecords({ limit: 500 });
  let removed = 0;
  for (const summary of all) if (await deleteVaultRecord(summary.id)) removed += 1;
  state.memory.clear();
  return removed;
}

// ============================================================================
// KEY / VALUE SIDE-CAR (secrets belong here, not in localStorage)
// ============================================================================

export async function kvGet<T>(key: string): Promise<T | null> {
  if (state.memoryKv.has(key)) return (state.memoryKv.get(key) as T) ?? null;
  if (!idbAvailable() || state.failed) return null;
  const found = await tx<{ key: string; value: T }>(KV, "readonly", (store) => store.get(key));
  if (found) state.memoryKv.set(key, found.value);
  return found?.value ?? null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  state.memoryKv.set(key, value === null ? (undefined as never) : value);
  if (!idbAvailable() || state.failed) return;
  await tx<undefined>(KV, "readwrite", (store) => store.put({ key, value }));
}

export async function kvDelete(key: string): Promise<void> {
  state.memoryKv.delete(key);
  if (!idbAvailable() || state.failed) return;
  await tx<undefined>(KV, "readwrite", (store) => store.delete(key));
}

export const CLOUD_TOKEN_KEYS = {
  "github-gist": "cloud.token.github-gist",
  webdav: "cloud.token.webdav",
  "google-drive": "cloud.token.google-drive",
  dropbox: "cloud.token.dropbox",
} as const;

export async function loadCloudToken(provider: CloudProvider): Promise<string | null> {
  const key = CLOUD_TOKEN_KEYS[provider as keyof typeof CLOUD_TOKEN_KEYS];
  if (!key) return null;
  return (await kvGet<string>(key)) ?? null;
}

export async function saveCloudToken(provider: CloudProvider, token: string | null): Promise<void> {
  const key = CLOUD_TOKEN_KEYS[provider as keyof typeof CLOUD_TOKEN_KEYS];
  if (!key) return;
  if (token) await kvSet(key, token);
  else await kvDelete(key);
}

// ============================================================================
// ONE-TIME CLEANUP OF THE OLD BACKUP LAYOUT
// ============================================================================

/**
 * Earlier builds wrote backup payloads straight into localStorage
 * (`skillsync:backup:<id>`, `skillsync:backup:autoSnapshots`), which is a
 * ~5 MB budget shared with the whole app. Anything found there is moved into
 * the vault once, then deleted, so old data survives and quota is released.
 */
export async function migrateLegacyLocalStorageBackups(): Promise<number> {
  let store: Storage | null = null;
  try {
    store = (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return 0;
  }
  if (!store) return 0;

  const moved = new Set<string>();

  try {
    const rawSnapshots = store.getItem("skillsync:backup:autoSnapshots");
    if (rawSnapshots) {
      const parsed = JSON.parse(rawSnapshots) as unknown;
      const list = Array.isArray(parsed) ? parsed : [];
      for (const entry of list) {
        const text =
          typeof entry === "string"
            ? entry
            : typeof (entry as { text?: unknown })?.text === "string"
              ? (entry as { text: string }).text
              : null;
        if (!text) continue;
        if (await importIntoVault(text, "auto")) moved.add(text);
      }
      store.removeItem("skillsync:backup:autoSnapshots");
    }
  } catch {
    /* unreadable legacy snapshot list */
  }

  try {
    const payloadKeys: string[] = [];
    for (let i = 0; i < (store.length ?? 0); i++) {
      const key = store.key(i);
      if (
        key &&
        /^skillsync:backup:(meta:)?.+$/.test(key) &&
        !key.includes("lastMeta") &&
        !key.includes("autoSettings") &&
        !key.includes("history") &&
        !key.includes("cloudSync") &&
        !key.includes("deviceId") &&
        !key.includes("syncState") &&
        !key.includes("health")
      ) {
        const value = store.getItem(key);
        if (value && value.length > 512) payloadKeys.push(key);
      }
    }
    for (const key of payloadKeys) {
      const value = store.getItem(key);
      if (value && (await importIntoVault(value, "manual"))) moved.add(value);
      store.removeItem(key);
      store.removeItem(key.replace("skillsync:backup:", "skillsync:backup:meta:"));
    }
  } catch {
    /* legacy scan is best-effort */
  }

  return moved.size;
}

async function importIntoVault(text: string, kind: VaultKind): Promise<boolean> {
  try {
    const parsed = JSON.parse(text) as { backupId?: string; createdAt?: string; kind?: string };
    if (!parsed || typeof parsed !== "object" || parsed.kind !== "skillsync-backup") return false;
    const id = parsed.backupId ?? `legacy-${Date.now()}`;
    if (await getVaultRecord(id)) return true; // already migrated

    const { validateAdvancedBackup } = await import("./advanced-backup");
    const result = await validateAdvancedBackup(text);
    if (!result.ok) return false;

    await putVaultRecord({
      text,
      meta: { ...result.backup.meta, backupId: id },
      kind,
      label: `Recovered from old storage · ${new Date(result.backup.meta.createdAt).toLocaleDateString()}`,
    });
    return true;
  } catch {
    return false;
  }
}
