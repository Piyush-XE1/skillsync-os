// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getAutoBackupSettings,
  setAutoBackupSettings,
  clearBackupArtifacts,
  createAutomaticSnapshot,
  getAutomaticSnapshotCount,
} from "@/lib/backup";
import { createInitialData } from "@/lib/seed";

const LAST_META_KEY = "skillsync:backup:lastMeta";
const AUTO_SETTINGS_KEY = "skillsync:backup:autoSettings";
const AUTO_SNAPSHOTS_KEY = "skillsync:backup:autoSnapshots";

describe("backup - localStorage state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads the default auto-backup settings", () => {
    expect(getAutoBackupSettings()).toEqual({ enabled: false, intervalHours: 24 });
  });

  it("persists and reads auto-backup settings", () => {
    setAutoBackupSettings({ enabled: true, intervalHours: 24, lastCreatedAt: 123 });
    expect(getAutoBackupSettings()).toEqual({
      enabled: true,
      intervalHours: 24,
      lastCreatedAt: 123,
    });
  });

  it("does not create an automatic snapshot when auto-backup is off", () => {
    expect(createAutomaticSnapshot(createInitialData())).toBeNull();
    expect(getAutomaticSnapshotCount()).toBe(0);
  });

  it("creates a capped automatic snapshot when enabled", () => {
    setAutoBackupSettings({ enabled: true, intervalHours: 24 });
    const meta = createAutomaticSnapshot(createInitialData());
    expect(meta).not.toBeNull();
    expect(getAutomaticSnapshotCount()).toBe(1);
  });

  it("clearBackupArtifacts wipes every backup-related key", () => {
    localStorage.setItem(LAST_META_KEY, "x");
    localStorage.setItem(AUTO_SETTINGS_KEY, "y");
    localStorage.setItem(AUTO_SNAPSHOTS_KEY, "z");
    clearBackupArtifacts();
    expect(localStorage.getItem(LAST_META_KEY)).toBeNull();
    expect(localStorage.getItem(AUTO_SETTINGS_KEY)).toBeNull();
    expect(localStorage.getItem(AUTO_SNAPSHOTS_KEY)).toBeNull();
  });
});
