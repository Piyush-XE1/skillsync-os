import { describe, it, expect } from "vitest";
import {
  serializeBackup,
  validateBackup,
  backupStatus,
  backupSummary,
  totalRecords,
  moduleList,
  formatBytes,
} from "@/lib/backup";
import { createInitialData } from "@/lib/seed";
import { APP_VERSION } from "@/lib/version";

describe("backup - serialize/validate", () => {
  it("produces a valid portable envelope", () => {
    const data = createInitialData();
    const { text, meta, createdAtISO } = serializeBackup(data);
    const parsed = JSON.parse(text);
    expect(parsed.kind).toBe("skillsync-backup");
    expect(parsed.backupVersion).toBeGreaterThanOrEqual(1);
    expect(parsed.appVersion).toBe(APP_VERSION);
    expect(parsed.backupId).toBeTruthy();
    expect(parsed.createdAt).toBe(createdAtISO);
    expect(parsed.data).toEqual(data);
    expect(meta.sizeBytes).toBeGreaterThan(0);
  });

  it("accepts its own serialize output", () => {
    const data = createInitialData();
    const { text } = serializeBackup(data);
    const res = validateBackup(text);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.data).toEqual(data);
      expect(res.backup.appVersion).toBe(APP_VERSION);
    }
  });

  it("rejects invalid JSON", () => {
    const res = validateBackup("{not json");
    expect(res).toEqual({ ok: false, error: "File is not valid JSON." });
  });

  it("rejects empty / non-object / array payloads", () => {
    expect(validateBackup("").ok).toBe(false);
    expect(validateBackup("   ").ok).toBe(false);
    expect(validateBackup("null").ok).toBe(false);
    expect(validateBackup("[]").ok).toBe(false);
    expect(validateBackup("123").ok).toBe(false);
  });

  it("rejects a payload that is not a SkillSync export", () => {
    expect(validateBackup(JSON.stringify({ hello: "world" })).ok).toBe(false);
  });

  it("accepts a direct AppData export (schemaVersion present)", () => {
    const data = createInitialData();
    const res = validateBackup(JSON.stringify(data));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.data).toEqual(data);
      // Direct exports are treated as a v1 envelope
      expect(res.backup.backupVersion).toBe(1);
    }
  });

  it("rejects a backup from a newer app version", () => {
    const data = createInitialData();
    const env = {
      kind: "skillsync-backup",
      backupVersion: 3, // > BACKUP_VERSION (2)
      appVersion: "99.0",
      backupId: "abc",
      createdAt: new Date().toISOString(),
      data,
    };
    const res = validateBackup(JSON.stringify(env));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/newer SkillSync/);
  });
});

describe("backup - status", () => {
  it("reports none when there is no backup", () => {
    expect(backupStatus(null)).toEqual({ tone: "none", label: "No backup available" });
  });

  it("maps age to green / yellow / red", () => {
    const now = Date.now();
    expect(
      backupStatus({
        backupVersion: 2,
        appVersion: "",
        backupId: "x",
        createdAt: now - 1e6,
        sizeBytes: 1,
      }),
    ).toMatchObject({ tone: "green" });
    expect(
      backupStatus({
        backupVersion: 2,
        appVersion: "",
        backupId: "x",
        createdAt: now - 20 * 864e5,
        sizeBytes: 1,
      }),
    ).toMatchObject({ tone: "yellow" });
    expect(
      backupStatus({
        backupVersion: 2,
        appVersion: "",
        backupId: "x",
        createdAt: now - 60 * 864e5,
        sizeBytes: 1,
      }),
    ).toMatchObject({ tone: "red" });
  });
});

describe("backup - summary", () => {
  it("counts nested roadmap records", () => {
    const data = createInitialData();
    const s = backupSummary(data);
    expect(s.roadmaps).toBe(data.roadmaps.length);
    // The seed roadmaps are non-empty
    expect(s.phases).toBeGreaterThan(0);
    expect(s.topics).toBeGreaterThan(0);
  });

  it("computes total records and module list", () => {
    const data = createInitialData();
    const s = backupSummary(data);
    const total = totalRecords(s);
    expect(total).toBeGreaterThan(0);
    const mods = moduleList(data);
    expect(mods.some((m) => m.key === "roadmaps")).toBe(true);
    expect(mods.some((m) => m.key === "habits")).toBe(true);
  });
});

describe("backup - formatBytes", () => {
  it("formats byte sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});
