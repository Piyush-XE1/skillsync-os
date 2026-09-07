/**
 * Vault behaviour that must hold in every browser — including the ones where
 * IndexedDB is missing, where SkillSync falls back to a session-only store.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clearVault,
  deleteVaultRecord,
  getVaultRecord,
  listVaultRecords,
  markVaultRecord,
  pruneVaultKind,
  putVaultRecord,
  vaultBackendName,
  vaultIsPersistent,
  vaultStats,
  kvDelete,
  kvGet,
  kvSet,
  loadCloudToken,
  saveCloudToken,
  defaultLabel,
} from "@/lib/backup/vault";
import type { BackupMeta } from "@/lib/backup/advanced-backup";

let counter = 0;
const meta = (overrides: Partial<BackupMeta> = {}): BackupMeta => ({
  backupVersion: 4,
  appVersion: "1.0.0",
  backupId: `bk-${(counter += 1)}`,
  createdAt: Date.now(),
  sizeBytes: 1234,
  modules: ["roadmaps", "notes"],
  recordCounts: { roadmaps: 2, notes: 5 },
  ...overrides,
});

beforeEach(async () => {
  await clearVault();
});

describe("backup vault", () => {
  it("reports its backend honestly", () => {
    // No IndexedDB in the node test environment: the vault must say so instead
    // of pretending the data is durable.
    expect(vaultIsPersistent()).toBe(false);
    expect(vaultBackendName()).toBe("in-memory");
  });

  it("stores, lists and reads back a record", async () => {
    const created = meta();
    await putVaultRecord({ text: '{"kind":"skillsync-backup"}', meta: created, kind: "manual" });

    const list = await listVaultRecords();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.backupId);
    expect(list[0].records).toBe(7);
    expect(list[0].recordCounts).toEqual({ roadmaps: 2, notes: 5 });
    // Listing hands out summaries only — never the payload.
    expect((list[0] as unknown as Record<string, unknown>).text).toBeUndefined();

    const record = await getVaultRecord(created.backupId);
    expect(record?.text).toBe('{"kind":"skillsync-backup"}');
    expect(record?.meta.backupId).toBe(created.backupId);
  });

  it("sorts newest first and labels by kind", async () => {
    const now = Date.now();
    await putVaultRecord({ text: "old", meta: meta({ createdAt: now - 60_000 }), kind: "manual" });
    await putVaultRecord({ text: "new", meta: meta({ createdAt: now }), kind: "auto" });

    const list = await listVaultRecords();
    expect(list[0].kind).toBe("auto");
    expect(list[0].label).toMatch(/^Auto ·/);
    expect(defaultLabel("safety", now)).toMatch(/^Before restore ·/);
  });

  it("deletes and reports whether anything went away", async () => {
    const created = meta();
    await putVaultRecord({ text: "x", meta: created, kind: "manual" });
    expect(await deleteVaultRecord(created.backupId)).toBe(true);
    expect(await getVaultRecord(created.backupId)).toBeNull();
    expect(await deleteVaultRecord(created.backupId)).toBe(false);
  });

  it("prunes rolling copies but keeps the newest N", async () => {
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      await putVaultRecord({
        text: `s${i}`,
        meta: meta({ createdAt: now - i * 1000 }),
        kind: "auto",
      });
    }
    await putVaultRecord({
      text: "manual",
      meta: meta({ createdAt: now - 50_000 }),
      kind: "manual",
    });

    const removed = await pruneVaultKind("auto", 3);
    expect(removed).toBe(3);
    const left = await listVaultRecords();
    expect(left.filter((r) => r.kind === "auto")).toHaveLength(3);
    expect(left.some((r) => r.kind === "manual")).toBe(true);
  });

  it("keeps a cloud marker next to a local copy", async () => {
    const created = meta();
    await putVaultRecord({ text: "x", meta: created, kind: "manual" });
    await markVaultRecord(created.backupId, {
      provider: "github-gist",
      fileId: "1234",
      uploadedAt: 999,
    });

    const [summary] = await listVaultRecords();
    expect(summary.cloud?.fileId).toBe("1234");
    expect(summary.cloud?.provider).toBe("github-gist");
  });

  it("totals sizes for the storage line", async () => {
    await putVaultRecord({ text: "aaa", meta: meta({ sizeBytes: 100 }), kind: "manual" });
    await putVaultRecord({ text: "bbb", meta: meta({ sizeBytes: 250 }), kind: "manual" });
    const stats = await vaultStats();
    expect(stats.count).toBe(2);
    expect(stats.bytes).toBe(350);
  });

  it("keeps secrets out of the record list", async () => {
    await saveCloudToken("github-gist", "ghp_secret");
    expect(await loadCloudToken("github-gist")).toBe("ghp_secret");

    const list = await listVaultRecords();
    expect(JSON.stringify(list)).not.toContain("ghp_secret");

    await saveCloudToken("github-gist", null);
    expect(await loadCloudToken("github-gist")).toBeNull();
  });

  it("round-trips the key/value side-car", async () => {
    await kvSet("thing", { a: 1 });
    expect(await kvGet<{ a: number }>("thing")).toEqual({ a: 1 });
    await kvDelete("thing");
    expect(await kvGet("thing")).toBeNull();
  });
});
