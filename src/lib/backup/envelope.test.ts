/**
 * Envelope contract tests: everything that must stay true for files people
 * already have on disk, plus the round trips that used to be broken
 * (compressed copies could not be restored from the vault, and encrypted
 * copies could not be restored at all).
 */

import { describe, it, expect, vi } from "vitest";
import { webcrypto } from "node:crypto";
import {
  BACKUP_VERSION,
  canonicalStringify,
  createAdvancedBackup,
  formatBytes,
  getBackupStatus,
  getBackupSummary,
  countRecords,
  isAutoBackupDue,
  formatRelative,
  restoreAdvancedBackup,
  validateAdvancedBackup,
  validateEncryptedBackup,
  verifyBackupText,
  type ValidBackup,
} from "@/lib/backup/advanced-backup";
import { createInitialData } from "@/lib/seed";
import { APP_VERSION } from "@/lib/version";

vi.stubGlobal("crypto", webcrypto);

const asBackup = (value: object) => value as unknown as ValidBackup;

describe("backup envelope — create + validate", () => {
  it("writes a portable envelope with stable metadata", async () => {
    const data = createInitialData();
    const { text, meta, createdAtISO } = await createAdvancedBackup(data);
    const parsed = JSON.parse(text);

    expect(parsed.kind).toBe("skillsync-backup");
    expect(parsed.backupVersion).toBe(BACKUP_VERSION);
    expect(parsed.appVersion).toBe(APP_VERSION);
    expect(parsed.createdAt).toBe(createdAtISO);
    expect(meta.sizeBytes).toBeGreaterThan(0);
    expect(meta.backupId).toBeTruthy();
  });

  it("accepts its own output unchanged", async () => {
    const data = createInitialData();
    const { text } = await createAdvancedBackup(data);
    const result = await validateAdvancedBackup(text);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data).toEqual(data);
      expect(result.backup.appVersion).toBe(APP_VERSION);
    }
  });

  it("round-trips a compressed payload (this used to fail on restore)", async () => {
    const data = createInitialData();
    const made = await createAdvancedBackup(data, { compression: true, forceCompression: true });
    expect(made.meta.compressed).toBe(true);

    const parsed = JSON.parse(made.text);
    expect(typeof parsed.data).toBe("string");
    expect(parsed.data.startsWith("gz:")).toBe(true);

    const validated = await validateAdvancedBackup(made.text);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(validated.backup.data).toEqual(data);

    // Exactly what the vault hands to the restore path: the raw envelope, with
    // `data` still an encoded string.
    const restored = await restoreAdvancedBackup(
      asBackup({ ...parsed, meta: made.meta, sizeBytes: made.meta.sizeBytes }),
    );
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.data).toEqual(data);
  });

  it("round-trips an encrypted payload with its password", async () => {
    const data = createInitialData();
    const password = "correct horse";
    const made = await createAdvancedBackup(data, {
      encryption: true,
      password,
      compression: false,
    });
    expect(made.meta.encrypted).toBe(true);

    // Without a password the file is politely unreadable, not "corrupted".
    const locked = await validateAdvancedBackup(made.text);
    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.needsPassword).toBe(true);
      expect(locked.recoverable).toBe(true);
    }

    const wrong = await validateEncryptedBackup(made.text, "not it");
    expect(wrong.ok).toBe(false);

    const right = await validateEncryptedBackup(made.text, password);
    expect(right.ok).toBe(true);
    if (right.ok) expect(right.backup.data).toEqual(data);
  });

  it("does not leak workspace contents into an encrypted file", async () => {
    const data = createInitialData();
    const noteTitle = data.notes[0]?.title ?? "";
    const made = await createAdvancedBackup(data, { encryption: true, password: "hunter22" });
    if (!noteTitle) return;
    expect(made.text).not.toContain(noteTitle);
  });

  it("rejects junk input with human errors", async () => {
    expect((await validateAdvancedBackup("")).ok).toBe(false);
    expect((await validateAdvancedBackup("{not json")).ok).toBe(false);
    expect((await validateAdvancedBackup("null")).ok).toBe(false);
    expect((await validateAdvancedBackup("[]")).ok).toBe(false);
    const notOurs = await validateAdvancedBackup(JSON.stringify({ hello: "world" }));
    expect(notOurs.ok).toBe(false);
    if (!notOurs.ok) expect(notOurs.error).toContain("Not a SkillSync backup");
  });

  it("detects a modified file instead of restoring it", async () => {
    const data = createInitialData();
    const made = await createAdvancedBackup(data, { compression: false });
    const tampered = JSON.parse(made.text);
    expect(Array.isArray(tampered.data.roadmaps)).toBe(true);
    tampered.data.roadmaps = [];
    const result = await validateAdvancedBackup(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Integrity check failed/);
  });

  it("still reads a v3-era pretty-printed envelope", async () => {
    const data = createInitialData();
    const env = {
      kind: "skillsync-backup",
      backupVersion: 3,
      appVersion: APP_VERSION,
      backupId: "legacy-abc",
      createdAt: new Date().toISOString(),
      data,
    };
    const result = await validateAdvancedBackup(JSON.stringify(env, null, 2));
    expect(result.ok).toBe(true);
  });

  it("refuses files from a newer app", async () => {
    const result = await validateAdvancedBackup(
      JSON.stringify({
        kind: "skillsync-backup",
        backupVersion: BACKUP_VERSION + 1,
        appVersion: "99.0",
        backupId: "x",
        createdAt: new Date().toISOString(),
        data: createInitialData(),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("newer SkillSync");
  });

  it("verifyBackupText summarises a healthy file", async () => {
    const data = createInitialData();
    const made = await createAdvancedBackup(data);
    const checked = await verifyBackupText(made.text);
    expect(checked.ok).toBe(true);
    expect(checked.message).toMatch(/Intact/);
  });
});

describe("backup envelope — checksum stability", () => {
  it("ignores key order", async () => {
    const a = canonicalStringify({ b: 1, a: { d: [1, 2], c: "x" } });
    const b = canonicalStringify({ a: { c: "x", d: [1, 2] }, b: 1 });
    expect(a).toBe(b);
  });

  it("a re-serialized backup keeps verifying", async () => {
    const data = createInitialData();
    const made = await createAdvancedBackup(data, { compression: false });
    const reparsed = JSON.parse(made.text);
    // Rebuild with a different key order, as a zod parse would.
    reparsed.data = JSON.parse(JSON.stringify({ z: 1, ...reparsed.data }));
    delete (reparsed.data as Record<string, unknown>).z;
    const result = await validateAdvancedBackup(JSON.stringify(reparsed));
    expect(result.ok).toBe(true);
  });
});

describe("backup settings + status", () => {
  it("maps age to green / yellow / red", () => {
    const now = Date.now();
    const meta = (createdAt: number) => ({
      backupVersion: BACKUP_VERSION,
      appVersion: "",
      backupId: "x",
      createdAt,
      sizeBytes: 1,
      modules: [],
      recordCounts: {},
    });
    expect(getBackupStatus(null).tone).toBe("none");
    expect(getBackupStatus(meta(now - 1e6)).tone).toBe("green");
    expect(getBackupStatus(meta(now - 20 * 864e5)).tone).toBe("yellow");
    expect(getBackupStatus(meta(now - 60 * 864e5)).tone).toBe("red");
  });

  it("auto-backup is only due once the interval passed", () => {
    const now = Date.now();
    expect(
      isAutoBackupDue({ enabled: false, intervalHours: 24, lastCreatedAt: 0 } as never, now),
    ).toBe(false);
    expect(isAutoBackupDue({ enabled: true, intervalHours: 24 } as never, now)).toBe(true);
    expect(
      isAutoBackupDue(
        { enabled: true, intervalHours: 24, lastCreatedAt: now - 3600e3 } as never,
        now,
      ),
    ).toBe(false);
    expect(
      isAutoBackupDue(
        { enabled: true, intervalHours: 24, lastCreatedAt: now - 25 * 3600e3 } as never,
        now,
      ),
    ).toBe(true);
  });

  it("counts nested roadmap records for the summary", () => {
    const data = createInitialData();
    const summary = getBackupSummary(data);
    const counts = countRecords(data);
    expect(counts.roadmaps).toBe(data.roadmaps.length);
    expect(summary.totalRecords).toBeGreaterThan(0);
    expect(summary.modules.some((m) => m.key === "roadmaps")).toBe(true);
    expect(summary.modules.some((m) => m.key === "habits")).toBe(true);
  });

  it("formats sizes and relative time", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
    const now = Date.now();
    expect(formatRelative(now - 30_000, now)).toBe("just now");
    expect(formatRelative(now, now)).toBe("just now");
    expect(formatRelative(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(formatRelative(now - 3 * 3600_000, now)).toBe("3 h ago");
  });
});
