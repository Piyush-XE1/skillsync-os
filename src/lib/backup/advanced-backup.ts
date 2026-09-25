/**
 * SkillSync backup engine — the format, not the UI and not the storage.
 *
 * Responsibilities:
 * - Build a portable backup envelope from AppData (optionally compressed and
 *   password-encrypted).
 * - Validate + decode an envelope back into AppData, verifying integrity.
 * - Hold the small pieces of backup *state* that belong in localStorage
 *   (last-backup pointer, auto-backup settings, device id, cloud config).
 *
 * Deliberate design rules, learned the hard way:
 * - The payload is always encoded as `data` on the envelope. Compression
 *   happens first, encryption second, and validation reverses exactly that
 *   order, so an encrypted backup can genuinely be restored.
 * - The checksum covers a *canonical* (key-sorted) serialization of the data,
 *   so a JSON round trip can never produce a false "corrupted" verdict.
 * - No encryption, hashing or full-data scan happens during render. Anything
 *   expensive lives behind an explicit user action or the idle scheduler in
 *   `@/store/useBackupStore`.
 */

import { AppDataSchema, type AppData } from "../schema";
import { migrate } from "../migrations";
import { errorMessage } from "../utils";
import { APP_VERSION } from "../version";
import { newId } from "../id";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Envelope format version. Bump only on an incompatible envelope change. */
export const BACKUP_VERSION = 4;

/** Accepted for reading: v1/v2 came from the legacy app, v3 from the first advanced build. */
export const MIN_BACKUP_VERSION = 1;

// localStorage keys. Small metadata only — never backup payloads.
export const LAST_META_KEY = "skillsync:backup:lastMeta";
export const AUTO_SETTINGS_KEY = "skillsync:backup:autoSettings";
export const BACKUP_HISTORY_KEY = "skillsync:backup:history";
export const BACKUP_HEALTH_KEY = "skillsync:backup:health";
export const CLOUD_SYNC_KEY = "skillsync:backup:cloudSync";
export const DEVICE_ID_KEY = "skillsync:backup:deviceId";
export const SYNC_STATE_KEY = "skillsync:backup:syncState";
/** Legacy key, no longer written; still cleared so old builds stop eating quota. */
export const AUTO_SNAPSHOTS_KEY = "skillsync:backup:autoSnapshots";

/** Snapshots kept by the auto-backup scheduler (in the IndexedDB vault). */
export const MAX_AUTO_SNAPSHOTS = 10;
/** Entries in the local activity log. */
export const MAX_BACKUP_HISTORY = 50;
/** Below this size compression is pointless (gzip + base64 would inflate it). */
export const COMPRESSION_THRESHOLD = 96 * 1024;
/** Hard ceiling so a runaway export can never hang the tab. */
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;

const PBKDF2_ITERATIONS = 120_000;

// ============================================================================
// TYPES
// ============================================================================

export type BackupMeta = {
  backupVersion: number;
  appVersion: string;
  backupId: string;
  createdAt: number;
  sizeBytes: number;
  compressed?: boolean;
  encrypted?: boolean;
  checksum?: string;
  algorithm?: string;
  incremental?: boolean;
  baseBackupId?: string;
  compressionRatio?: number;
  modules: string[];
  recordCounts: Record<string, number>;
};

export type BackupEnvelope = {
  kind: "skillsync-backup";
  backupVersion: number;
  appVersion: string;
  backupId: string;
  createdAt: string;
  /** AppData for plain envelopes, encoded string when compressed/encrypted. */
  data: AppData | Partial<AppData> | string;
  checksum?: string;
  algorithm?: string;
  encrypted?: boolean;
  compressed?: boolean;
  incremental?: boolean;
  baseBackupId?: string;
  encryptionInfo?: {
    algorithm: string;
    kdf?: string;
    salt: string;
    iv: string;
    iterations?: number;
    /** Older envelopes spelled this out; accepted on read. */
    iterationCount?: number;
  };
  compressionInfo?: {
    algorithm: string;
    originalSize: number;
  };
};

export type ValidBackup = BackupEnvelope & {
  sizeBytes: number;
  meta: BackupMeta;
  /**
   * Exact text this backup was decoded from. Kept so re-export / re-upload is
   * byte-identical to the file the user already has.
   */
  envelopeText?: string;
};

export type BackupStrategy = {
  type: "full" | "incremental" | "smart";
  compression: boolean;
  encryption: boolean;
  password?: string;
  includeModules: string[];
  excludeModules: string[];
};

export type AutoBackupSettings = {
  enabled: boolean;
  intervalHours: number;
  lastCreatedAt?: number;
  maxSnapshots: number;
  strategy: BackupStrategy["type"];
  compression: boolean;
  minChangesForIncremental: number;
  smartBackup: boolean;
  backupOnOpen: boolean;
  backupOnChanges: boolean;
};

export type CloudProvider = "github-gist" | "webdav" | "google-drive" | "dropbox" | "none";

export type CloudBackupConfig = {
  provider: CloudProvider;
  enabled: boolean;
  lastSyncAt?: number;
  /** Manual access token / PAT. Preferred for self-hosted setups. */
  token?: string;
  /** OAuth client id (Google) or app key (Dropbox). */
  clientId?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  /** Remote folder / base path / gist description. */
  folderId?: string;
  syncFrequency: "manual" | "hourly" | "daily" | "weekly";
  autoUpload: boolean;
  autoDownload: boolean;
  conflictResolution: "local-wins" | "remote-wins" | "manual";
};

export type DeviceInfo = {
  deviceId: string;
  deviceName: string;
  platform: string;
  lastActiveAt: number;
  syncCapabilities: string[];
};

export type SyncState = {
  deviceId: string;
  lastSyncAt: number;
  syncStatus: "idle" | "syncing" | "error" | "offline";
  provider?: CloudProvider;
  uploaded?: number;
  downloaded?: number;
  error?: string;
};

export type BackupHealthStatus = {
  status: "healthy" | "warning" | "critical" | "unknown";
  score: number;
  issues: BackupHealthIssue[];
  recommendations: string[];
  lastCheckedAt: number;
};

export type BackupHealthIssue = {
  id: string;
  type: "age" | "size" | "integrity" | "completeness";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details?: Record<string, unknown>;
  fixable: boolean;
  fixAction?: string;
};

export type BackupHistoryEntry = {
  backupId: string;
  createdAt: number;
  type: "manual" | "auto" | "cloud" | "sync";
  source: "local" | "cloud" | "device";
  sizeBytes: number;
  compressed: boolean;
  encrypted: boolean;
  status: "complete" | "partial" | "corrupted" | "restored" | "failed";
  notes: string;
  tags: string[];
};

export type ModuleChangeSummary = {
  module: string;
  created: number;
  updated: number;
  deleted: number;
  totalChanges: number;
  lastChangeAt: number;
};

// ============================================================================
// SMALL ENV HELPERS
// ============================================================================

const enc = /* @__PURE__ */ new TextEncoder();
const dec = /* @__PURE__ */ new TextDecoder();

/**
 * Resolved lazily and defensively: SSR has no `localStorage`, private mode
 * throws on access, and Vitest (node environment) stubs it as a global.
 */
function localStore(): Storage | null {
  try {
    const candidate = (globalThis as { localStorage?: Storage }).localStorage;
    return candidate && typeof candidate.getItem === "function" ? candidate : null;
  } catch {
    return null;
  }
}

function readLocal(key: string): string | null {
  try {
    return localStore()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): boolean {
  try {
    const store = localStore();
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    // Quota exceeded or storage disabled: never break a backup for a pointer.
    return false;
  }
}

function dropLocal(key: string): void {
  try {
    localStore()?.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

/** True when WebCrypto is usable. Over http://localhost and https it always is. */
export function cryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

/** Bytes always backed by a real ArrayBuffer (SharedArrayBuffer is not a BufferSource). */
type Bytes = Uint8Array<ArrayBuffer>;

function bytes(len: number): Bytes {
  return new Uint8Array(new ArrayBuffer(len));
}

function toBase64(bytes: Bytes): string {
  let binary = "";
  // Chunked: a single String.fromCharCode(...bytes) blows the argument limit
  // on multi-megabyte payloads.
  const step = 0x4000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Bytes {
  const binary = atob(b64);
  const out = bytes(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesOf(text: string): number {
  if (typeof Blob !== "undefined") return new Blob([text]).size;
  return enc.encode(text).length;
}

/**
 * Key-sorted JSON. Used for checksums and change detection so that two
 * structurally identical payloads always compare equal.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`).join(",")}}`;
}

// ============================================================================
// COMPRESSION (gzip + base64, tagged with a "gz:" prefix)
// ============================================================================

export function compressionAvailable(): boolean {
  return typeof CompressionStream !== "undefined";
}

export async function compressText(text: string): Promise<string | null> {
  if (!compressionAvailable()) return null;
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    const packed = `gz:${toBase64(bytes)}`;
    return packed.length < text.length ? packed : null;
  } catch {
    return null;
  }
}

export async function decompressText(value: string): Promise<string> {
  if (!value.startsWith("gz:")) return value;
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "This browser cannot read compressed backups (DecompressionStream is missing).",
    );
  }
  const bytes = fromBase64(value.slice(3));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

// ============================================================================
// ENCRYPTION (AES-256-GCM, PBKDF2 key derivation)
// ============================================================================

type EncryptionInfo = NonNullable<BackupEnvelope["encryptionInfo"]>;

async function deriveKey(password: string, salt: Bytes, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptData(
  data: string,
  password: string,
): Promise<{ encryptedData: string; info: EncryptionInfo }> {
  if (!cryptoAvailable())
    throw new Error("WebCrypto is unavailable — encryption needs https or localhost.");
  if (!password) throw new Error("A password is required to encrypt a backup.");

  const salt = crypto.getRandomValues(bytes(16));
  const iv = crypto.getRandomValues(bytes(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(data));

  return {
    encryptedData: toBase64(new Uint8Array(cipher)),
    info: {
      algorithm: "AES-256-GCM",
      kdf: "PBKDF2-SHA256",
      salt: toBase64(salt),
      iv: toBase64(iv),
      iterations: PBKDF2_ITERATIONS,
    },
  };
}

export async function decryptData(
  encryptedData: string,
  password: string,
  info: EncryptionInfo,
): Promise<string> {
  if (!cryptoAvailable())
    throw new Error("WebCrypto is unavailable — decryption needs https or localhost.");
  const iterations = info.iterations ?? info.iterationCount ?? PBKDF2_ITERATIONS;
  const key = await deriveKey(password, fromBase64(info.salt), iterations);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(info.iv) },
      key,
      fromBase64(encryptedData),
    );
    return dec.decode(plain);
  } catch {
    // AES-GCM authenticates; any failure here means the wrong password or a
    // tampered file. Never leak the underlying crypto message.
    throw new Error("Wrong password (or the file was modified after it was encrypted).");
  }
}

// ============================================================================
// CHECKSUM
// ============================================================================

export async function generateChecksum(data: string): Promise<string> {
  if (!cryptoAvailable()) return `fnv1a:${fnv1a(data)}`;
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/** Checksum of the *canonical* form — order-independent, stable across round trips. */
export async function checksumOfData(data: unknown): Promise<string> {
  return generateChecksum(canonicalStringify(data));
}

export async function verifyChecksum(data: string, expectedChecksum: string): Promise<boolean> {
  const actual = await generateChecksum(data);
  if (actual === expectedChecksum) return true;
  // v3 envelopes hashed with "fnv1a:" absent and with a different encoder; try
  // the legacy 32-bit fallback before declaring corruption.
  return `fnv1a:${fnv1a(data)}` === expectedChecksum;
}

// ============================================================================
// CHANGE DETECTION (incremental backups)
// ============================================================================

type ModuleRecord = { id?: unknown; createdAt?: unknown; updatedAt?: unknown };

const CHANGE_MODULES: Array<{ key: keyof AppData; hasId: boolean }> = [
  { key: "roadmaps", hasId: true },
  { key: "notes", hasId: true },
  { key: "projects", hasId: true },
  { key: "planner", hasId: true },
  { key: "habits", hasId: true },
  { key: "habitLogs", hasId: false },
  { key: "profile", hasId: false },
  { key: "preferences", hasId: false },
  { key: "widgets", hasId: false },
  { key: "goals", hasId: true },
  { key: "attendance", hasId: false },
  { key: "expenses", hasId: false },
  { key: "focus", hasId: false },
  { key: "cgpa", hasId: false },
  { key: "resume", hasId: false },
  { key: "notifications", hasId: false },
  { key: "coding", hasId: false },
  { key: "career", hasId: false },
];

export function detectChanges(oldData: AppData, newData: AppData): ModuleChangeSummary[] {
  const summaries: ModuleChangeSummary[] = [];

  for (const module of CHANGE_MODULES) {
    const rawOld: unknown = oldData?.[module.key];
    const rawNew: unknown = newData?.[module.key];
    const oldArray = (Array.isArray(rawOld) ? rawOld : rawOld ? [rawOld] : []) as ModuleRecord[];
    const newArray = (Array.isArray(rawNew) ? rawNew : rawNew ? [rawNew] : []) as ModuleRecord[];

    const getId = (item: ModuleRecord) =>
      module.hasId && item && typeof item === "object" && "id" in item
        ? String(item.id)
        : canonicalStringify(item);

    const oldIds = new Set(oldArray.map(getId));
    const newIds = new Set(newArray.map(getId));

    const created = newArray.filter((i) => !oldIds.has(getId(i)));
    const deleted = oldArray.filter((i) => !newIds.has(getId(i)));

    const oldById = new Map(oldArray.map((i) => [getId(i), i]));
    const updated = newArray.filter((i) => {
      const prev = oldById.get(getId(i));
      return prev !== undefined && canonicalStringify(prev) !== canonicalStringify(i);
    });

    if (created.length === 0 && deleted.length === 0 && updated.length === 0) continue;

    const stamps = [...created, ...updated].map((i) =>
      typeof i.createdAt === "number"
        ? i.createdAt
        : typeof i.updatedAt === "number"
          ? i.updatedAt
          : 0,
    );

    summaries.push({
      module: module.key,
      created: created.length,
      updated: updated.length,
      deleted: deleted.length,
      totalChanges: created.length + updated.length + deleted.length,
      lastChangeAt: Math.max(Date.now(), ...stamps),
    });
  }

  return summaries;
}

/** Only the modules that actually changed — unchanged keys are dropped. */
export function extractChangedData(
  newData: AppData,
  _oldData: AppData,
  changes: ModuleChangeSummary[],
): Partial<AppData> {
  const changed = new Set(changes.map((c) => c.module));
  const out: Partial<AppData> = {};
  for (const key of Object.keys(newData) as Array<keyof AppData>) {
    if (changed.has(key)) (out as Record<string, unknown>)[key] = newData[key];
  }
  return out;
}

export function applyIncrementalChanges(baseData: AppData, changes: Partial<AppData>): AppData {
  return { ...baseData, ...changes };
}

/**
 * Envelope `data` → AppData when it is already decoded. Returns null when the
 * payload is still an encoded string (compressed/encrypted) that this helper
 * cannot decode on its own.
 */
export function resolveEnvelopeData(value: AppData | Partial<AppData> | string): AppData | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as AppData;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  return value as AppData;
}

// ============================================================================
// CREATION
// ============================================================================

export type CreateBackupOptions = Partial<BackupStrategy> & {
  /** Force compression even for small payloads. */
  forceCompression?: boolean;
};

export type CreatedBackup = {
  text: string;
  meta: BackupMeta;
  createdAtISO: string;
  checksum: string;
  filename: string;
};

export function backupFilename(createdAtISO: string, backupId: string): string {
  const stamp = createdAtISO.replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
  return `SkillSync-Backup-${stamp}-${backupId.slice(0, 6)}.json`;
}

/**
 * Build a backup. `data` is validated first so an invalid in-memory state can
 * never be written to a file that would then refuse to restore.
 */
export async function createAdvancedBackup(
  data: AppData,
  options: CreateBackupOptions = {},
): Promise<CreatedBackup> {
  const strategy: BackupStrategy = {
    type: "full",
    compression: true,
    encryption: false,
    includeModules: [],
    excludeModules: [],
    ...options,
  };

  const safeData = AppDataSchema.parse(data);
  const createdAtISO = new Date().toISOString();
  const backupId = newId();

  const checksum = await checksumOfData(safeData);

  const env: BackupEnvelope = {
    kind: "skillsync-backup",
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    backupId,
    createdAt: createdAtISO,
    data: safeData,
    checksum,
    algorithm: "SHA-256",
  };

  const payload = JSON.stringify(safeData);

  // 1. compression (before encryption, so gzip sees real JSON text)
  if (strategy.compression) {
    const worthTrying = options.forceCompression === true || payload.length > COMPRESSION_THRESHOLD;
    if (worthTrying) {
      const packed = await compressText(payload);
      if (packed) {
        env.data = packed;
        env.compressed = true;
        env.compressionInfo = { algorithm: "gzip", originalSize: payload.length };
      }
    }
  }

  // 2. encryption, wrapping whatever `data` currently holds
  if (strategy.encryption) {
    if (!strategy.password)
      throw new Error("Choose a password before creating an encrypted backup.");
    const plain = typeof env.data === "string" ? env.data : payload;
    const { encryptedData, info } = await encryptData(plain, strategy.password);
    env.data = encryptedData;
    env.encrypted = true;
    env.encryptionInfo = info;
  }

  const text = JSON.stringify(env);
  const sizeBytes = bytesOf(text);
  if (sizeBytes > MAX_BACKUP_BYTES) {
    throw new Error(
      `This workspace is too large to back up in one file (${Math.round(sizeBytes / 1048576)} MB).`,
    );
  }

  const recordCounts = countRecords(safeData);
  const meta: BackupMeta = {
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    backupId,
    createdAt: Date.now(),
    sizeBytes,
    compressed: env.compressed === true,
    encrypted: env.encrypted === true,
    checksum,
    algorithm: "SHA-256",
    incremental: false,
    modules: Object.keys(safeData),
    recordCounts,
  };
  if (env.compressed && env.compressionInfo) {
    meta.compressionRatio = env.compressionInfo.originalSize / sizeBytes;
  }

  return { text, meta, createdAtISO, checksum, filename: backupFilename(createdAtISO, backupId) };
}

/** Incremental backup: only changed modules, restorable against `baseBackup`. */
export async function createIncrementalBackup(
  data: AppData,
  previousBackup: ValidBackup,
  options: CreateBackupOptions = {},
): Promise<CreatedBackup | null> {
  const safeData = AppDataSchema.parse(data);
  const previousData = resolveEnvelopeData(previousBackup.data);
  if (!previousData) {
    throw new Error(
      "The previous backup is encrypted or unreadable, so an incremental backup needs a full one.",
    );
  }

  let previousSafe: AppData;
  try {
    previousSafe = AppDataSchema.parse(previousData);
  } catch {
    previousSafe = previousData;
  }

  const changes = detectChanges(previousSafe, safeData);
  if (changes.reduce((sum, c) => sum + c.totalChanges, 0) === 0) return null;

  const changedData = extractChangedData(safeData, previousSafe, changes);
  const createdAtISO = new Date().toISOString();
  const backupId = newId();
  const baseBackupId = previousBackup.backupId ?? previousBackup.meta?.backupId;

  const checksum = await checksumOfData(changedData);
  const env: BackupEnvelope = {
    kind: "skillsync-backup",
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    backupId,
    createdAt: createdAtISO,
    data: changedData,
    checksum,
    algorithm: "SHA-256",
    incremental: true,
    baseBackupId,
  };

  const payload = JSON.stringify(changedData);
  if (options.compression !== false && payload.length > COMPRESSION_THRESHOLD) {
    const packed = await compressText(payload);
    if (packed) {
      env.data = packed;
      env.compressed = true;
      env.compressionInfo = { algorithm: "gzip", originalSize: payload.length };
    }
  }

  const text = JSON.stringify(env);
  const meta: BackupMeta = {
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    backupId,
    createdAt: Date.now(),
    sizeBytes: bytesOf(text),
    compressed: env.compressed === true,
    encrypted: false,
    checksum,
    algorithm: "SHA-256",
    incremental: true,
    baseBackupId,
    modules: changes.map((c) => c.module),
    recordCounts: countRecords(safeData),
  };

  return { text, meta, createdAtISO, checksum, filename: backupFilename(createdAtISO, backupId) };
}

// ============================================================================
// VALIDATION / DECODING
// ============================================================================

/** A backup that has been decoded, decompressed and decrypted. */
export type DecodedBackup = ValidBackup & { data: AppData };

export type ValidateResult =
  | { ok: true; backup: DecodedBackup; warnings: string[] }
  | { ok: false; error: string; recoverable?: boolean; needsPassword?: boolean };

export type ValidateOptions = { password?: string };

/**
 * Decode a payload string (or object) into AppData, undoing encryption then
 * compression, and verify the checksum when one is present.
 */
async function decodePayload(
  env: BackupEnvelope,
  password: string | undefined,
  warnings: string[],
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; error: string; needsPassword?: boolean; recoverable?: boolean }
> {
  let raw: unknown = env.data;

  if (env.encrypted) {
    if (typeof raw !== "string")
      return { ok: false, error: "Encrypted backup payload is malformed." };
    if (!env.encryptionInfo?.salt || !env.encryptionInfo?.iv) {
      return { ok: false, error: "Encrypted backup is missing its encryption parameters." };
    }
    if (!password) {
      return {
        ok: false,
        needsPassword: true,
        error: "This backup is encrypted and password-protected. Enter the password to open it.",
      };
    }
    try {
      raw = await decryptData(raw, password, env.encryptionInfo);
    } catch (e) {
      return { ok: false, error: errorMessage(e, "Could not decrypt this backup.") };
    }
    warnings.push("Decrypted with the password you provided.");
  }

  if (typeof raw === "string") {
    const text = env.compressed ? await decompressText(raw) : raw;
    try {
      raw = JSON.parse(text);
    } catch {
      return { ok: false, error: "Backup payload could not be decoded." };
    }
  }

  if (!raw || typeof raw !== "object") return { ok: false, error: "Backup payload is empty." };

  if (env.checksum) {
    const expected = env.checksum;
    const canonical = canonicalStringify(raw);
    let ok = (await generateChecksum(canonical)) === expected;
    if (!ok) ok = await verifyChecksum(canonical, expected);
    // v3 files hashed the raw serialization instead of the canonical one.
    if (!ok && typeof env.data === "object") {
      ok = (await generateChecksum(JSON.stringify(raw))) === expected;
    }
    if (!ok) {
      return {
        ok: false,
        recoverable: true,
        error: "Integrity check failed — this file was altered or is truncated.",
      };
    }
  } else {
    warnings.push("No checksum in this file, so its integrity could not be verified.");
  }

  return { ok: true, data: raw };
}

function metaFromEnvelope(env: BackupEnvelope, data: AppData, sizeBytes: number): BackupMeta {
  return {
    backupVersion: env.backupVersion,
    appVersion: String(env.appVersion ?? "unknown"),
    backupId: env.backupId,
    createdAt: Date.parse(env.createdAt) || Date.now(),
    sizeBytes,
    compressed: env.compressed === true,
    encrypted: env.encrypted === true,
    checksum: env.checksum,
    algorithm: env.algorithm,
    incremental: env.incremental === true,
    baseBackupId: env.baseBackupId,
    modules: Object.keys(data),
    recordCounts: countRecords(data),
  };
}

/**
 * Accepts a SkillSync backup file **or** a raw AppData export (the format the
 * older Profile → Export button produced), returning fully decoded data.
 */
export async function validateAdvancedBackup(
  input: string,
  options: ValidateOptions = {},
): Promise<ValidateResult> {
  const warnings: string[] = [];
  const sanitized = typeof input === "string" ? input.trim().replace(/^\uFEFF/, "") : "";
  if (!sanitized) return { ok: false, error: "This file is empty." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    return { ok: false, error: "This file is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Not a SkillSync backup file (expected a JSON object)." };
  }

  const env = parsed as BackupEnvelope;

  // Direct AppData export (no envelope) — supported for compatibility.
  if (
    env.kind !== "skillsync-backup" &&
    typeof (parsed as { schemaVersion?: unknown }).schemaVersion === "number"
  ) {
    try {
      const data = AppDataSchema.parse(migrate(parsed));
      const backupId = `export-${Date.now()}`;
      const createdAt = new Date().toISOString();
      return {
        ok: true,
        warnings,
        backup: {
          kind: "skillsync-backup",
          backupVersion: 1,
          appVersion: APP_VERSION,
          backupId,
          createdAt,
          data,
          sizeBytes: bytesOf(sanitized),
          envelopeText: sanitized,
          meta: {
            ...metaFromEnvelope(
              { ...env, backupVersion: 1, appVersion: APP_VERSION, backupId, createdAt },
              data,
              bytesOf(sanitized),
            ),
          },
        },
      };
    } catch (e) {
      return { ok: false, error: errorMessage(e, "That export is missing required fields.") };
    }
  }

  if (env.kind !== "skillsync-backup") return { ok: false, error: "Not a SkillSync backup file." };

  if (typeof env.backupVersion !== "number" || !Number.isInteger(env.backupVersion)) {
    return { ok: false, error: "This file is missing its backup version." };
  }
  if (env.backupVersion > BACKUP_VERSION) {
    return {
      ok: false,
      error: `This file came from a newer SkillSync (v${String(env.appVersion)}). Update the app, then restore.`,
    };
  }
  if (env.backupVersion < MIN_BACKUP_VERSION) {
    return { ok: false, error: `Backup format v${env.backupVersion} is no longer readable.` };
  }
  if (!env.data) return { ok: false, error: "This file has no data in it." };
  if (typeof env.backupId !== "string" || !env.backupId) {
    return { ok: false, error: "This file is missing its backup id." };
  }
  if (env.backupVersion >= 2 && !env.createdAt) {
    return { ok: false, error: "This file is missing its creation date." };
  }
  if (env.createdAt && Number.isNaN(Date.parse(env.createdAt))) {
    return { ok: false, error: "This file has an invalid creation date." };
  }

  if (env.incremental) warnings.push("Incremental backup: restoring it needs its base backup too.");

  const decoded = await decodePayload(env, options.password, warnings);
  if (!decoded.ok) {
    return {
      ok: false,
      error: decoded.error,
      needsPassword: decoded.needsPassword,
      recoverable: decoded.needsPassword || undefined,
    };
  }

  let data: AppData;
  try {
    data = AppDataSchema.parse(migrate(decoded.data));
  } catch (e) {
    return { ok: false, error: errorMessage(e, "Backup structure is invalid.") };
  }

  return {
    ok: true,
    warnings,
    backup: {
      ...env,
      data,
      sizeBytes: bytesOf(sanitized),
      envelopeText: sanitized,
      meta: metaFromEnvelope(env, data, bytesOf(sanitized)),
    },
  };
}

/** Validate an encrypted envelope with its password. */
export async function validateEncryptedBackup(
  input: string,
  password: string,
): Promise<ValidateResult> {
  return validateAdvancedBackup(input, { password });
}

/** Quick "is this file readable and intact" check, without importing it. */
export async function verifyBackupText(
  input: string,
  password?: string,
): Promise<{ ok: boolean; message: string; meta?: BackupMeta }> {
  const result = await validateAdvancedBackup(input, { password });
  if (!result.ok) return { ok: false, message: result.error };
  const count = Object.values(result.backup.meta.recordCounts).reduce((a, b) => a + b, 0);
  return {
    ok: true,
    message: `Intact — ${count} record${count === 1 ? "" : "s"} across ${result.backup.meta.modules.length} modules.`,
    meta: result.backup.meta,
  };
}

// ============================================================================
// RESTORE
// ============================================================================

export type RestoreOptions = {
  baseBackup?: ValidBackup;
  modulesToRestore?: string[];
  password?: string;
  onProgress?: (progress: number, message: string) => void;
};

export type RestoreResult =
  | {
      ok: true;
      data: AppData;
      warnings: string[];
      stats: { recordsRestored: number; modulesRestored: string[] };
    }
  | { ok: false; error: string };

/**
 * Turn a backup into AppData that can be pushed into the store. Never touches
 * the store itself — the caller decides when to apply it.
 */
export async function restoreAdvancedBackup(
  backup: ValidBackup,
  options: RestoreOptions = {},
): Promise<RestoreResult> {
  const warnings: string[] = [];
  const stats = { recordsRestored: 0, modulesRestored: [] as string[] };

  try {
    let dataToRestore = resolveEnvelopeData(backup.data);

    // Still encoded (loaded straight from a vault record or a file).
    if (!dataToRestore) {
      const decoded = await decodePayload(
        { ...backup, data: backup.data } as BackupEnvelope,
        options.password,
        warnings,
      );
      if (!decoded.ok) {
        return { ok: false, error: decoded.error };
      }
      dataToRestore = decoded.data as AppData;
    }

    if (backup.incremental && backup.baseBackupId) {
      if (!options.baseBackup) {
        return {
          ok: false,
          error: "This is an incremental backup — its base backup is needed to restore it.",
        };
      }
      const baseData = resolveEnvelopeData(options.baseBackup.data);
      if (!baseData)
        return {
          ok: false,
          error: "The base backup for this incremental file could not be decoded.",
        };
      dataToRestore = applyIncrementalChanges(baseData, dataToRestore as Partial<AppData>);
      warnings.push("Merged onto its base backup.");
    }

    if (options.modulesToRestore && options.modulesToRestore.length > 0) {
      const selective: Partial<AppData> = {};
      for (const key of options.modulesToRestore) {
        if (key in dataToRestore) {
          (selective as Record<string, unknown>)[key] = (dataToRestore as Record<string, unknown>)[
            key
          ];
          stats.modulesRestored.push(key);
        }
      }
      dataToRestore = selective as AppData;
      warnings.push(
        `Only these modules will be restored: ${stats.modulesRestored.join(", ") || "none"}.`,
      );
    }

    options.onProgress?.(0.6, "Validating");
    const finalData = AppDataSchema.parse(migrate(dataToRestore));
    stats.recordsRestored = Object.values(countRecords(finalData)).reduce((sum, n) => sum + n, 0);

    return { ok: true, data: finalData, warnings, stats };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Restore failed.") };
  }
}

// ============================================================================
// SUMMARIES
// ============================================================================

export function countRecords(data: AppData): Record<string, number> {
  const counts: Record<string, number> = {};
  const roadmaps = data?.roadmaps ?? [];

  counts.roadmaps = roadmaps.length;
  counts.phases = roadmaps.reduce((s, r) => s + (r.phases?.length ?? 0), 0);
  counts.topics = roadmaps.reduce(
    (s, r) => s + r.phases.reduce((t, p) => t + (p.topics?.length ?? 0), 0),
    0,
  );
  counts.subtopics = roadmaps.reduce(
    (s, r) =>
      s +
      r.phases.reduce(
        (t, p) => t + p.topics.reduce((u, x) => u + (x.subtopics?.length ?? 0), 0),
        0,
      ),
    0,
  );
  counts.notes = data?.notes?.length ?? 0;
  counts.projects = data?.projects?.length ?? 0;
  counts.plannerTasks = data?.planner?.length ?? 0;
  counts.habits = data?.habits?.length ?? 0;
  counts.habitLogs = data?.habitLogs?.length ?? 0;
  counts.subjects = data?.attendance?.subjects?.length ?? 0;
  counts.transactions = data?.expenses?.transactions?.length ?? 0;
  counts.focusSessions = data?.focus?.sessions?.length ?? 0;
  counts.cgpaSubjects =
    data?.cgpa?.semesters?.reduce((s, sem) => s + (sem.subjects?.length ?? 0), 0) ?? 0;
  counts.codingProblems = data?.coding?.problems?.length ?? 0;
  counts.careerApplications = data?.career?.applications?.length ?? 0;
  counts.notifications = data?.notifications?.items?.length ?? 0;
  counts.resumeItems =
    (data?.resume?.education?.length ?? 0) +
    (data?.resume?.experience?.length ?? 0) +
    (data?.resume?.projects?.length ?? 0) +
    (data?.resume?.certifications?.length ?? 0);

  return counts;
}

const SUMMARY_LABELS: Array<[keyof AppData | string, string]> = [
  ["roadmaps", "Roadmaps"],
  ["notes", "Notes"],
  ["projects", "Projects"],
  ["planner", "Planner tasks"],
  ["habits", "Habits"],
  ["attendance", "Attendance"],
  ["expenses", "Expenses"],
  ["focus", "Focus"],
  ["cgpa", "CGPA"],
  ["coding", "Coding"],
  ["career", "Career"],
  ["resume", "Resume"],
  ["profile", "Profile"],
  ["preferences", "Preferences"],
];

export function getBackupSummary(data: AppData): {
  modules: Array<{ key: string; label: string; count: number }>;
  totalRecords: number;
  sizeBytes: number;
} {
  const counts = countRecords(data);
  const pick = (keys: string[]) => keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);

  const modules = [
    {
      key: "roadmaps",
      label: "Roadmaps",
      count: pick(["roadmaps", "phases", "topics", "subtopics"]),
    },
    { key: "notes", label: "Notes", count: counts.notes },
    { key: "projects", label: "Projects", count: counts.projects },
    { key: "planner", label: "Planner", count: counts.plannerTasks },
    { key: "habits", label: "Habits", count: counts.habits + counts.habitLogs },
    { key: "attendance", label: "Attendance", count: counts.subjects },
    { key: "expenses", label: "Expenses", count: counts.transactions },
    { key: "focus", label: "Focus", count: counts.focusSessions },
    { key: "cgpa", label: "CGPA", count: counts.cgpaSubjects },
    { key: "coding", label: "Coding", count: counts.codingProblems },
    { key: "career", label: "Career", count: counts.careerApplications },
    { key: "resume", label: "Resume", count: counts.resumeItems },
  ];

  return {
    modules: modules.filter((m) => SUMMARY_LABELS.some(([key]) => key === m.key)),
    totalRecords: Object.values(counts).reduce((sum, n) => sum + n, 0),
    sizeBytes: JSON.stringify(data).length,
  };
}

/** Human one-liner: "3 roadmaps · 12 notes · 8 tasks". */
export function describeBackupData(data: AppData, max = 3): string {
  const counts = countRecords(data);
  const parts: string[] = [];
  if (counts.roadmaps) parts.push(`${counts.roadmaps} roadmap${counts.roadmaps === 1 ? "" : "s"}`);
  if (counts.notes) parts.push(`${counts.notes} note${counts.notes === 1 ? "" : "s"}`);
  if (counts.plannerTasks)
    parts.push(`${counts.plannerTasks} task${counts.plannerTasks === 1 ? "" : "s"}`);
  if (counts.projects) parts.push(`${counts.projects} project${counts.projects === 1 ? "" : "s"}`);
  if (counts.habits) parts.push(`${counts.habits} habit${counts.habits === 1 ? "" : "s"}`);
  if (counts.focusSessions)
    parts.push(`${counts.focusSessions} focus session${counts.focusSessions === 1 ? "" : "s"}`);
  return parts.slice(0, max).join(" · ") || "empty workspace";
}

// ============================================================================
// HEALTH (cheap by design — safe to run after a backup, never during render)
// ============================================================================

export function analyzeBackupHealthSync(
  backup: Pick<ValidBackup, "meta"> | { meta?: BackupMeta },
  currentData: AppData,
): BackupHealthStatus {
  const issues: BackupHealthIssue[] = [];
  const recommendations: string[] = [];
  const meta = backup.meta;
  if (!meta) {
    return {
      status: "unknown",
      score: 0,
      issues: [
        {
          id: "no-meta",
          type: "integrity",
          severity: "medium",
          message: "This copy has no readable metadata",
          fixable: true,
          fixAction: "backup_now",
        },
      ],
      recommendations: ["Create a new backup."],
      lastCheckedAt: Date.now(),
    };
  }
  const id = meta.backupId ?? "unknown";

  const ageDays = (Date.now() - (meta.createdAt ?? 0)) / 86_400_000;
  if (ageDays > 30) {
    issues.push({
      id: `age-${id}`,
      type: "age",
      severity: ageDays > 90 ? "critical" : ageDays > 60 ? "high" : "medium",
      message: `The newest backup is ${Math.round(ageDays)} days old`,
      fixable: true,
      fixAction: "backup_now",
    });
    recommendations.push("Create a fresh backup now.");
  }

  const sizeBytes = meta.sizeBytes ?? 0;
  if (sizeBytes > 25 * 1024 * 1024) {
    issues.push({
      id: `size-${id}`,
      type: "size",
      severity: sizeBytes > 50 * 1024 * 1024 ? "high" : "medium",
      message: `This backup is large (${formatBytes(sizeBytes)})`,
      fixable: true,
      fixAction: "enable_compression",
    });
    recommendations.push("Turn on compression for a smaller file.");
  }

  const backupCounts = meta.recordCounts ?? {};
  const currentCounts = countRecords(currentData);
  const drifted = Object.entries(currentCounts).filter(([key, count]) => {
    const inBackup = backupCounts[key] ?? 0;
    return count > 0 && inBackup === 0;
  });
  if (drifted.length > 0) {
    issues.push({
      id: `completeness-${id}`,
      type: "completeness",
      severity: "high",
      message: `Not covered by this backup: ${drifted.map(([k]) => k).join(", ")}`,
      fixable: true,
      fixAction: "backup_now",
    });
    recommendations.push("Back up again to capture the newer modules.");
  }

  if (!meta.checksum) {
    recommendations.push("Newer backups carry a checksum so damage is detected before a restore.");
  }

  let score = 100;
  for (const issue of issues)
    score -= { low: 5, medium: 15, high: 30, critical: 60 }[issue.severity];
  score = Math.max(0, Math.min(100, score));

  const status: BackupHealthStatus["status"] = issues.some((i) => i.severity === "critical")
    ? "critical"
    : issues.length > 0 || score < 100
      ? "warning"
      : "healthy";

  return { status, score, issues, recommendations, lastCheckedAt: Date.now() };
}

/** Async name kept for compatibility with existing callers. */
export async function analyzeBackupHealth(
  backup: Pick<ValidBackup, "meta"> | { meta?: BackupMeta },
  currentData: AppData,
): Promise<BackupHealthStatus> {
  return analyzeBackupHealthSync(backup, currentData);
}

export function getBackupStatus(meta: BackupMeta | null): {
  tone: "none" | "green" | "yellow" | "red";
  label: string;
  description: string;
} {
  if (!meta) {
    return {
      tone: "none",
      label: "No backup yet",
      description: "Create one now, then keep the file somewhere safe.",
    };
  }
  const ageDays = (Date.now() - meta.createdAt) / 86_400_000;
  if (ageDays < 7) {
    return {
      tone: "green",
      label: "Up to date",
      description: `${formatDate(meta.createdAt)} · ${formatTime(meta.createdAt)} · ${formatBytes(meta.sizeBytes)}`,
    };
  }
  if (ageDays < 30) {
    return {
      tone: "yellow",
      label: `${Math.round(ageDays)} days since your last backup`,
      description: "Worth refreshing.",
    };
  }
  return {
    tone: "red",
    label: `${Math.round(ageDays / 7)} weeks without a backup`,
    description: "Anything on this device is at risk until you back up.",
  };
}

// ============================================================================
// LOCAL PERSISTENCE (small metadata only)
// ============================================================================

export function getLastBackupMeta(): BackupMeta | null {
  const raw = readLocal(LAST_META_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BackupMeta;
    return parsed && typeof parsed.backupId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function setLastBackupMeta(meta: BackupMeta | null): void {
  if (meta) {
    writeLocal(LAST_META_KEY, JSON.stringify(meta));
    addToBackupHistory({
      backupId: meta.backupId,
      createdAt: meta.createdAt,
      type: "manual",
      source: "local",
      sizeBytes: meta.sizeBytes,
      compressed: meta.compressed === true,
      encrypted: meta.encrypted === true,
      status: "complete",
      notes: `Backup created (v${meta.backupVersion})`,
      tags: [
        meta.compressed ? "compressed" : "uncompressed",
        meta.encrypted ? "encrypted" : "plain",
      ]
        .filter(Boolean)
        .map(String),
    });
    return;
  }
  dropLocal(LAST_META_KEY);
}

export function getBackupHistory(): BackupHistoryEntry[] {
  const raw = readLocal(BACKUP_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BackupHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToBackupHistory(entry: BackupHistoryEntry): void {
  const next = [entry, ...getBackupHistory()].slice(0, MAX_BACKUP_HISTORY);
  writeLocal(BACKUP_HISTORY_KEY, JSON.stringify(next));
}

export function clearBackupHistory(): void {
  dropLocal(BACKUP_HISTORY_KEY);
}

export function getAutoBackupSettings(): AutoBackupSettings {
  const fallback: AutoBackupSettings = {
    enabled: false,
    intervalHours: 24,
    maxSnapshots: 5,
    strategy: "full",
    compression: true,
    minChangesForIncremental: 1,
    smartBackup: true,
    backupOnOpen: true,
    backupOnChanges: false,
  };
  const raw = readLocal(AUTO_SETTINGS_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<AutoBackupSettings>;
    const intervals = [1, 6, 12, 24, 48, 168];
    return {
      ...fallback,
      ...parsed,
      enabled: parsed.enabled === true,
      intervalHours: intervals.includes(Number(parsed.intervalHours))
        ? Number(parsed.intervalHours)
        : 24,
      maxSnapshots: Math.min(20, Math.max(1, Number(parsed.maxSnapshots) || fallback.maxSnapshots)),
      strategy: (["full", "incremental", "smart"] as const).includes(parsed.strategy as never)
        ? (parsed.strategy as AutoBackupSettings["strategy"])
        : "full",
    };
  } catch {
    return fallback;
  }
}

export function setAutoBackupSettings(settings: Partial<AutoBackupSettings>): AutoBackupSettings {
  const next = { ...getAutoBackupSettings(), ...settings };
  writeLocal(AUTO_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function isAutoBackupDue(
  settings: AutoBackupSettings = getAutoBackupSettings(),
  now = Date.now(),
): boolean {
  if (!settings.enabled) return false;
  if (!settings.lastCreatedAt) return true;
  return now - settings.lastCreatedAt >= settings.intervalHours * 3_600_000;
}

/** Removes every backup-owned localStorage key, including legacy leftovers. */
export function clearAdvancedBackupArtifacts(): void {
  for (const key of [
    LAST_META_KEY,
    AUTO_SNAPSHOTS_KEY,
    AUTO_SETTINGS_KEY,
    BACKUP_HISTORY_KEY,
    BACKUP_HEALTH_KEY,
    CLOUD_SYNC_KEY,
    DEVICE_ID_KEY,
    SYNC_STATE_KEY,
  ]) {
    dropLocal(key);
  }
  // Older builds parked full payloads here; make sure they are gone too.
  for (const provider of ["github-gist", "webdav", "google-drive", "dropbox", "custom"]) {
    dropLocal(`skillsync:backup:token:${provider}`);
  }
}

/** Alias kept so callers written against v3 keep compiling. */
export const clearBackupArtifactsAdvanced = clearAdvancedBackupArtifacts;

// ============================================================================
// CLOUD CONFIG + DEVICE
// ============================================================================

function allCloudConfigs(): Record<string, CloudBackupConfig> {
  const raw = readLocal(CLOUD_SYNC_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, CloudBackupConfig>)
      : {};
  } catch {
    return {};
  }
}

export function defaultCloudConfig(provider: CloudProvider): CloudBackupConfig {
  return {
    provider,
    enabled: false,
    syncFrequency: "manual",
    autoUpload: false,
    autoDownload: false,
    conflictResolution: "local-wins",
  };
}

/**
 * Read a provider config. Tokens are NOT kept here — see `loadCloudToken` in
 * cloud.ts, which stores them in IndexedDB instead of localStorage.
 */
export function getCloudBackupConfig(provider: CloudProvider = "github-gist"): CloudBackupConfig {
  const stored = allCloudConfigs()[provider];
  if (!stored) return defaultCloudConfig(provider);
  return { ...defaultCloudConfig(provider), ...stored, token: undefined };
}

export function setCloudBackupConfig(
  config: Partial<CloudBackupConfig> & { provider: CloudProvider },
): void {
  const all = allCloudConfigs();
  const merged = { ...getCloudBackupConfig(config.provider), ...config };
  // Strip the secret: it has its own (IndexedDB) home.
  const { token: _token, ...persisted } = merged;
  all[config.provider] = { ...persisted, token: undefined };
  writeLocal(CLOUD_SYNC_KEY, JSON.stringify(all));
}

export function listCloudConfigs(): CloudBackupConfig[] {
  const all = allCloudConfigs();
  return (["github-gist", "webdav", "google-drive", "dropbox"] as CloudProvider[]).map(
    (provider) => ({
      ...getCloudBackupConfig(provider),
      ...((all[provider] ?? {}) as CloudBackupConfig),
    }),
  );
}

export function getDeviceId(): string {
  const existing = readLocal(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `device-${newId()}`;
  writeLocal(DEVICE_ID_KEY, created);
  return created;
}

export function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent ?? "";
  const match =
    /Android\s([\d.]+)/.exec(ua) ??
    /(?:iPhone|iPad|iPod).*?OS\s([\d_]+)/.exec(ua) ??
    /(Windows NT [\d.]+)/.exec(ua) ??
    /(Mac OS X)/.exec(ua) ??
    /((?:X11|Linux).*)/.exec(ua);
  if (match?.[1]) return match[1].replace(/_/g, ".").slice(0, 40);
  return "This device";
}

export function getSyncState(): SyncState {
  const raw = readLocal(SYNC_STATE_KEY);
  const base: SyncState = {
    deviceId: getDeviceId(),
    lastSyncAt: 0,
    syncStatus: "idle",
    provider: "none",
    uploaded: 0,
    downloaded: 0,
  };
  if (!raw) return base;
  try {
    return { ...base, ...(JSON.parse(raw) as Partial<SyncState>), deviceId: base.deviceId };
  } catch {
    return base;
  }
}

export function setSyncState(state: Partial<SyncState>): SyncState {
  const next = { ...getSyncState(), ...state };
  writeLocal(SYNC_STATE_KEY, JSON.stringify(next));
  return next;
}

// ============================================================================
// FORMATTING
// ============================================================================

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(2)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** "just now" / "14 min ago" / "3 h ago" / "Mar 4" — one helper for every list. */
export function formatRelative(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(ms);
}
