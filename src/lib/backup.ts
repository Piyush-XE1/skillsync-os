import { AppDataSchema, type AppData } from "./schema";
import { migrate } from "./migrations";
import { errorMessage } from "./utils";
import { APP_VERSION } from "./version";

export const BACKUP_VERSION = 1;
const LAST_META_KEY = "skillsync:backup:lastMeta";

export type BackupMeta = {
  backupVersion: number;
  appVersion: string;
  createdAt: number; // ms epoch
  sizeBytes: number;
};

export type BackupEnvelope = {
  kind: "skillsync-backup";
  backupVersion: number;
  appVersion: string;
  createdAt: string; // ISO
  data: AppData;
};

export function serializeBackup(data: AppData): {
  text: string;
  meta: BackupMeta;
  createdAtISO: string;
} {
  const createdAtISO = new Date().toISOString();
  const env: BackupEnvelope = {
    kind: "skillsync-backup",
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    createdAt: createdAtISO,
    data,
  };
  const text = JSON.stringify(env, null, 2);
  return {
    text,
    createdAtISO,
    meta: {
      backupVersion: BACKUP_VERSION,
      appVersion: APP_VERSION,
      createdAt: Date.now(),
      sizeBytes: new Blob([text]).size,
    },
  };
}

export type ValidBackup = {
  backupVersion: number;
  appVersion: string;
  createdAt: string;
  data: AppData;
  sizeBytes: number;
};

export function validateBackup(
  input: string,
): { ok: true; backup: ValidBackup } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Backup file is empty or malformed." };
  }
  const obj = parsed as Record<string, unknown>;
  const isEnvelope =
    obj.kind === "skillsync-backup" || (typeof obj.backupVersion === "number" && Boolean(obj.data));
  if (obj.kind !== undefined && obj.kind !== "skillsync-backup") {
    return { ok: false, error: "Not a SkillSync backup file." };
  }
  const raw = isEnvelope ? obj.data : obj;
  const backupVersion = typeof obj.backupVersion === "number" ? obj.backupVersion : undefined;
  const appVersion = typeof obj.appVersion === "string" ? obj.appVersion : undefined;
  const createdAt = typeof obj.createdAt === "string" ? obj.createdAt : undefined;
  if (isEnvelope && backupVersion !== undefined && backupVersion > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Backup was made with a newer app${appVersion ? ` (v${appVersion})` : ""}. Please update SkillSync.`,
    };
  }
  try {
    const migrated = migrate(raw);
    const data = AppDataSchema.parse(migrated);
    return {
      ok: true,
      backup: {
        backupVersion: isEnvelope ? (backupVersion ?? BACKUP_VERSION) : BACKUP_VERSION,
        appVersion: isEnvelope ? (appVersion ?? "?") : "legacy",
        createdAt: isEnvelope ? (createdAt ?? new Date().toISOString()) : new Date().toISOString(),
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
  };
}

export function totalRecords(s: BackupSummary): number {
  return (
    s.roadmaps +
    s.phases +
    s.topics +
    s.subtopics +
    s.checklists +
    s.notes +
    s.projects +
    s.plannerTasks +
    s.habits +
    s.habitLogs +
    s.subjects +
    s.transactions
  );
}

export function moduleList(data: AppData): { key: string; label: string; count: number }[] {
  const s = backupSummary(data);
  return [
    { key: "roadmaps", label: "Roadmaps", count: s.roadmaps },
    { key: "notes", label: "Notes", count: s.notes },
    { key: "projects", label: "Projects", count: s.projects },
    { key: "planner", label: "Planner tasks", count: s.plannerTasks },
    { key: "habits", label: "Habits", count: s.habits },
    { key: "habitLogs", label: "Habit logs", count: s.habitLogs },
    { key: "attendance", label: "Attendance subjects", count: s.subjects },
    { key: "expenses", label: "Expense entries", count: s.transactions },
    { key: "preferences", label: "Preferences & settings", count: 1 },
    { key: "profile", label: "Profile", count: 1 },
  ];
}

export function getLastBackupMeta(): BackupMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackupMeta;
  } catch {
    return null;
  }
}

export function setLastBackupMeta(meta: BackupMeta | null) {
  if (typeof window === "undefined") return;
  try {
    if (meta) window.localStorage.setItem(LAST_META_KEY, JSON.stringify(meta));
    else window.localStorage.removeItem(LAST_META_KEY);
  } catch {
    /* ignore */
  }
}

export type BackupStatus = {
  tone: "none" | "green" | "yellow" | "red";
  label: string;
};

export function backupStatus(meta: BackupMeta | null): BackupStatus {
  if (!meta) return { tone: "none", label: "No backup available" };
  const ageDays = (Date.now() - meta.createdAt) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return { tone: "green", label: "Backup is up to date" };
  if (ageDays < 30) return { tone: "yellow", label: "Backup is getting old" };
  return { tone: "red", label: "Backup is very old" };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
