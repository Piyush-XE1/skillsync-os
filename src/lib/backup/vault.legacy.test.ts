// @vitest-environment jsdom
/**
 * Upgrading away from the old layout: earlier builds wrote whole backup
 * payloads into localStorage (a ~5 MB budget shared with the app itself). The
 * migration must move them into the vault and release the quota, without
 * throwing when the leftovers are half-written.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clearVault, listVaultRecords, migrateLegacyLocalStorageBackups } from "@/lib/backup/vault";
import { createAdvancedBackup } from "@/lib/backup/advanced-backup";
import { createInitialData } from "@/lib/seed";

beforeEach(async () => {
  localStorage.clear();
  await clearVault();
});

describe("legacy localStorage migration", () => {
  it("moves auto snapshots into the vault and clears the key", async () => {
    const made = await createAdvancedBackup(createInitialData(), { compression: false });
    localStorage.setItem(
      "skillsync:backup:autoSnapshots",
      JSON.stringify([{ text: made.text, meta: made.meta }]),
    );

    const moved = await migrateLegacyLocalStorageBackups();

    expect(moved).toBe(1);
    expect(localStorage.getItem("skillsync:backup:autoSnapshots")).toBeNull();
    const list = await listVaultRecords();
    expect(list.map((r) => r.id)).toContain(made.meta.backupId);
    expect(list[0].kind).toBe("auto");
  });

  it("picks up loose payload keys and drops them", async () => {
    const made = await createAdvancedBackup(createInitialData(), { compression: false });
    const parsed = JSON.parse(made.text);
    localStorage.setItem(`skillsync:backup:${parsed.backupId}`, made.text);
    localStorage.setItem(`skillsync:backup:meta:${parsed.backupId}`, JSON.stringify(made.meta));
    // Settings keys must survive: they are small and still in use.
    localStorage.setItem("skillsync:backup:lastMeta", made.text);

    const moved = await migrateLegacyLocalStorageBackups();

    expect(moved).toBe(1);
    expect(localStorage.getItem(`skillsync:backup:${parsed.backupId}`)).toBeNull();
    expect(localStorage.getItem("skillsync:backup:lastMeta")).toBe(made.text);
    expect((await listVaultRecords()).length).toBe(1);
  });

  it("ignores unreadable leftovers instead of failing the screen", async () => {
    localStorage.setItem("skillsync:backup:autoSnapshots", "{not json");
    localStorage.setItem("skillsync:backup:loose", `${"x".repeat(600)}`);

    await expect(migrateLegacyLocalStorageBackups()).resolves.toBe(0);
  });
});
