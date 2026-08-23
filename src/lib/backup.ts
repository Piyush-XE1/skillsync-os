import { AppDataSchema, type AppData } from "./schema";
import { migrate } from "./migrations";
import { errorMessage } from "./utils";
import { APP_VERSION } from "./version";
import { newId } from "./id";

/** Increment only when the envelope (not application data) changes incompatibly. */
export const BACKUP_VERSION = 2;
const LAST_META_KEY = "skillsync:backup:lastMeta";
const AUTO_SETTINGS_KEY = "skillsync:backup:autoSettings";
const AUTO_SNAPSHOTS_KEY = "skillsync:backup:autoSnapshots";
const MAX_AUTO_SNAPSHOTS = 3;

export type BackupMeta = {
  backupVersion: number;
  appVersion: string;
  backupId: string;
  createdAt: number;
  sizeBytes: number;
};
export type BackupEnvelope = {
  kind: "skillsync-backup";
  backupVersion: number;
  appVersion: string;
  backupId: string;
  createdAt: string;
  data: AppData;
};
export type ValidBackup = BackupEnvelope & { sizeBytes: number };

/** Produces a portable envelope. Call from an event handler or idle task, never while rendering. */
export function serializeBackup(data: AppData): {
  text: string;
  meta: BackupMeta;
  createdAtISO: string;
} {
  // Parse first so no invalid/in-memory UI state can be exported.
  const safeData = AppDataSchema.parse(data);
  const createdAtISO = new Date().toISOString();
  const backupId = newId();
  const env: BackupEnvelope = {
    kind: "skillsync-backup",
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    backupId,
    createdAt: createdAtISO,
    data: safeData,
  };
  const text = JSON.stringify(env, null, 2);
  return {
    text,
    createdAtISO,
    meta: {
      backupVersion: BACKUP_VERSION,
      appVersion: APP_VERSION,
      backupId,
      createdAt: Date.now(),
      sizeBytes: new Blob([text]).size,
    },
  };
}

export function validateBackup(
  input: string,
): { ok: true; backup: ValidBackup } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return { ok: false, error: "Backup file is empty or malformed." };
  const obj = parsed as Record<string, unknown>;
  if (obj.kind !== "skillsync-backup") return { ok: false, error: "Not a SkillSync backup file." };
  const backupVersion = obj.backupVersion;
  if (
    typeof backupVersion !== "number" ||
    !Number.isInteger(backupVersion) ||
    typeof obj.appVersion !== "string" ||
    typeof obj.createdAt !== "string" ||
    !obj.data
  )
    return { ok: false, error: "Backup is missing required metadata or data." };
  if (backupVersion >= 2 && (typeof obj.backupId !== "string" || !obj.backupId))
    return { ok: false, error: "Backup is missing its backup ID." };
  if (Number.isNaN(Date.parse(obj.createdAt)))
    return { ok: false, error: "Backup creation date is invalid." };
  if (backupVersion > BACKUP_VERSION)
    return {
      ok: false,
      error: `Backup was made with newer SkillSync (v${obj.appVersion}). Please update SkillSync.`,
    };
  if (backupVersion < 1) return { ok: false, error: "Unsupported backup version." };
  try {
    const data = AppDataSchema.parse(migrate(obj.data));
    return {
      ok: true,
      backup: {
        kind: "skillsync-backup",
        backupVersion,
        appVersion: obj.appVersion,
        backupId: typeof obj.backupId === "string" ? obj.backupId : `legacy-${obj.createdAt}`,
        createdAt: obj.createdAt,
        data,
        sizeBytes: new Blob([input]).size,
      },
    };
  } catch (e) {
    return { ok: false, error: errorMessage(e, "Backup structure is invalid.") };
  }
}

export type BackupSummary = {
  roadmaps: number;
  phases: number;
  topics: number;
  subtopics: number;
  checklists: number;
  notes: number;
  projects: number;
  plannerTasks: number;
  habits: number;
  habitLogs: number;
  subjects: number;
  transactions: number;
  notifications: number;
};
export function backupSummary(data: AppData): BackupSummary {
  let phases = 0,
    topics = 0,
    subtopics = 0,
    checklists = 0;
  for (const r of data.roadmaps) {
    phases += r.phases.length;
    for (const p of r.phases) {
      topics += p.topics.length;
      for (const t of p.topics) {
        subtopics += t.subtopics.length;
        checklists += t.checklist.length + t.subtopics.reduce((n, s) => n + s.checklist.length, 0);
      }
    }
  }
  return {
    roadmaps: data.roadmaps.length,
    phases,
    topics,
    subtopics,
    checklists,
    notes: data.notes.length,
    projects: data.projects.length,
    plannerTasks: data.planner.length,
    habits: data.habits.length,
    habitLogs: data.habitLogs.length,
    subjects: data.attendance?.subjects?.length ?? 0,
    transactions: data.expenses?.transactions?.length ?? 0,
    notifications: data.notifications?.items?.length ?? 0,
  };
}
export function totalRecords(s: BackupSummary) {
  return Object.values(s).reduce((n, v) => n + v, 0);
}
export function moduleList(data: AppData) {
  const s = backupSummary(data);
  return [
    { key: "roadmaps", label: "Roadmaps & learning progress", count: s.roadmaps },
    { key: "notes", label: "Notes", count: s.notes },
    { key: "projects", label: "Projects", count: s.projects },
    { key: "planner", label: "Planner tasks", count: s.plannerTasks },
    { key: "habits", label: "Habits & completion logs", count: s.habits + s.habitLogs },
    { key: "attendance", label: "Attendance subjects", count: s.subjects },
    { key: "expenses", label: "Expense entries", count: s.transactions },
    { key: "notifications", label: "Notification history & schedules", count: s.notifications },
    { key: "preferences", label: "Preferences, profile & progress", count: 1 },
  ];
}
export function getLastBackupMeta(): BackupMeta | null {
  try {
    const raw = window.localStorage.getItem(LAST_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function setLastBackupMeta(meta: BackupMeta | null) {
  try {
    if (meta) localStorage.setItem(LAST_META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(LAST_META_KEY);
  } catch {
    /* quota/storage unavailable */
  }
}

/**
 * Wipes backup-related local artifacts. Called on "Reset SkillSync": without
 * this, a fresh workspace would still show the previous install's backup
 * status, and retained recovery snapshots could resurrect wiped data.
 */
export function clearBackupArtifacts() {
  try {
    localStorage.removeItem(LAST_META_KEY);
    localStorage.removeItem(AUTO_SNAPSHOTS_KEY);
  } catch {
    /* storage unavailable */
  }
}
export type BackupStatus = { tone: "none" | "green" | "yellow" | "red"; label: string };
export function backupStatus(meta: BackupMeta | null): BackupStatus {
  if (!meta) return { tone: "none", label: "No backup available" };
  const age = (Date.now() - meta.createdAt) / 86400000;
  return age < 7
    ? { tone: "green", label: "Backup is up to date" }
    : age < 30
      ? { tone: "yellow", label: "Backup is getting old" }
      : { tone: "red", label: "Backup is very old" };
}
export function formatBytes(n: number) {
  return n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(2)} MB`;
}
export function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
export function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export type AutoBackupSettings = { enabled: boolean; intervalHours: 24; lastCreatedAt?: number };
export function getAutoBackupSettings(): AutoBackupSettings {
  try {
    const raw = JSON.parse(
      localStorage.getItem(AUTO_SETTINGS_KEY) ?? "{}",
    ) as Partial<AutoBackupSettings>;
    return {
      enabled: raw.enabled === true,
      intervalHours: 24,
      lastCreatedAt: typeof raw.lastCreatedAt === "number" ? raw.lastCreatedAt : undefined,
    };
  } catch {
    return { enabled: false, intervalHours: 24 };
  }
}
export function setAutoBackupSettings(settings: AutoBackupSettings) {
  localStorage.setItem(AUTO_SETTINGS_KEY, JSON.stringify(settings));
}
/** Small, capped local recovery snapshots. Browsers cannot silently write user files. */
export function createAutomaticSnapshot(data: AppData): BackupMeta | null {
  const settings = getAutoBackupSettings();
  if (!settings.enabled) return null;
  if (
    settings.lastCreatedAt &&
    Date.now() - settings.lastCreatedAt < settings.intervalHours * 3600000
  )
    return null;
  try {
    const made = serializeBackup(data);
    const snapshots: string[] = JSON.parse(localStorage.getItem(AUTO_SNAPSHOTS_KEY) ?? "[]");
    snapshots.unshift(made.text);
    localStorage.setItem(
      AUTO_SNAPSHOTS_KEY,
      JSON.stringify(snapshots.slice(0, MAX_AUTO_SNAPSHOTS)),
    );
    setAutoBackupSettings({ ...settings, lastCreatedAt: made.meta.createdAt });
    return made.meta;
  } catch {
    return null;
  }
}
export function getAutomaticSnapshotCount() {
  try {
    return (JSON.parse(localStorage.getItem(AUTO_SNAPSHOTS_KEY) ?? "[]") as unknown[]).length;
  } catch {
    return 0;
  }
}
/** Recovery snapshot used immediately before a destructive restore. Kept locally and capped. */
export function createSafetySnapshot(data: AppData): BackupMeta | null {
  try {
    const made = serializeBackup(data);
    const snapshots: string[] = JSON.parse(localStorage.getItem(AUTO_SNAPSHOTS_KEY) ?? "[]");
    snapshots.unshift(made.text);
    localStorage.setItem(
      AUTO_SNAPSHOTS_KEY,
      JSON.stringify(snapshots.slice(0, MAX_AUTO_SNAPSHOTS)),
    );
    return made.meta;
  } catch {
    return null;
  }
}
