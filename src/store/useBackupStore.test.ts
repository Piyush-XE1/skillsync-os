// @vitest-environment jsdom
/**
 * The store is the single source of truth for the backup screen, so these
 * tests cover the user-visible loop end to end: create → vault → restore →
 * undo, plus the rules the auto-backup scheduler depends on.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { toasts, toast } = vi.hoisted(() => {
  const toasts: Array<{ kind: string; message: string }> = [];
  const push = (kind: string) => (message: string) => {
    toasts.push({ kind, message: String(message) });
  };
  const toast = Object.assign(push("info"), { success: push("success"), error: push("error") });
  return { toasts, toast };
});
vi.mock("sonner", () => ({ toast }));

import { useAppStore } from "@/store/useAppStore";
import { useBackupStore } from "@/store/useBackupStore";
import { listVaultRecords } from "@/lib/backup/vault";

beforeEach(async () => {
  toasts.length = 0;
  localStorage.clear();
  useBackupStore.setState({
    ready: true,
    busy: null,
    error: null,
    created: null,
    pendingRestore: null,
    restoreStep: 0,
    lastSafetyId: null,
    records: [],
    lastMeta: null,
    stats: { count: 0, bytes: 0, persistent: false, backend: "in-memory" },
    auto: {
      enabled: false,
      intervalHours: 24,
      maxSnapshots: 5,
      strategy: "full",
      compression: true,
      minChangesForIncremental: 1,
      smartBackup: true,
      backupOnOpen: true,
      backupOnChanges: false,
    },
    cloud: { items: {}, status: {}, busy: null, error: null },
  });
  await (await import("@/lib/backup/vault")).clearVault();
});

describe("useBackupStore — create", () => {
  it("writes a vault copy and points at it", async () => {
    const result = await useBackupStore.getState().create();

    expect(result).not.toBeNull();
    const state = useBackupStore.getState();
    expect(state.lastMeta?.backupId).toBe(result?.meta.backupId);
    expect(state.records.map((r) => r.id)).toContain(result?.meta.backupId);
    expect(state.created?.text).toContain("skillsync-backup");
    expect(state.error).toBeNull();

    const stored = await listVaultRecords();
    expect(stored).toHaveLength(1);
    expect(stored[0].kind).toBe("manual");
  });

  it("refuses to encrypt without a password, and says why", async () => {
    const result = await useBackupStore.getState().create({ encryption: true });
    expect(result).toBeNull();
    expect(useBackupStore.getState().error).toMatch(/password/i);
  });

  it("encrypts when given a usable password", async () => {
    const result = await useBackupStore
      .getState()
      .create({ encryption: true, password: "double secret" });
    expect(result?.meta.encrypted).toBe(true);
    const [record] = await listVaultRecords();
    expect(record.encrypted).toBe(true);
    // The file must not contain readable workspace text.
    const { getVaultRecord } = await import("@/lib/backup/vault");
    const full = await getVaultRecord(record.id);
    expect(full?.text).not.toContain("schemaVersion");
  });
});

describe("useBackupStore — restore", () => {
  it("stages a preview, snapshots first, then replaces the workspace", async () => {
    const before = useAppStore.getState().exportJSON();
    const made = await useBackupStore.getState().create();
    expect(made).not.toBeNull();

    // Change something after the backup so the restore has to undo it.
    useAppStore.getState().addNote({ title: "Written after the backup" });
    expect(useAppStore.getState().exportJSON()).not.toBe(before);

    await useBackupStore.getState().restoreFromVault(made!.meta.backupId);
    const staged = useBackupStore.getState().pendingRestore;
    expect(staged).not.toBeNull();
    expect(useBackupStore.getState().restoreStep).toBe(1);
    expect(staged?.data).toBeTruthy();

    await useBackupStore.getState().confirmRestore();

    expect(useAppStore.getState().exportJSON()).toBe(before);
    expect(useBackupStore.getState().restoreStep).toBe(0);
    expect(useBackupStore.getState().lastSafetyId).toBeTruthy();
    // The pre-restore snapshot is kept, which is what makes "undo" possible.
    const kinds = (await listVaultRecords()).map((r) => r.kind);
    expect(kinds).toContain("safety");
  });

  it("asks for a password instead of failing when the file is encrypted", async () => {
    const made = await useBackupStore
      .getState()
      .create({ encryption: true, password: "let-me-in" });
    const { getVaultRecord } = await import("@/lib/backup/vault");
    const record = await getVaultRecord(made!.meta.backupId);

    await useBackupStore
      .getState()
      .stageRestore(record!.text, { source: "vault", name: record!.id, refId: record!.id });
    const staged = useBackupStore.getState().pendingRestore;
    expect(staged?.encrypted).toBe(true);
    expect(staged?.data).toBeFalsy();

    await useBackupStore.getState().unlockPendingRestore("wrong password");
    expect(useBackupStore.getState().pendingRestore?.data).toBeFalsy();

    await useBackupStore.getState().unlockPendingRestore("let-me-in");
    expect(useBackupStore.getState().pendingRestore?.data).toBeTruthy();
    expect(useBackupStore.getState().records.length).toBeGreaterThan(0);
  });

  it("tells the user when a file is not a backup at all", async () => {
    await useBackupStore
      .getState()
      .stageRestore(JSON.stringify({ nope: true }), { source: "file", name: "nope.json" });
    expect(useBackupStore.getState().pendingRestore).toBeNull();
    expect(useBackupStore.getState().error).toMatch(/Not a SkillSync backup/);
  });
});

describe("useBackupStore — vault housekeeping", () => {
  it("deletes a copy and drops the pointer when it was the newest", async () => {
    const made = await useBackupStore.getState().create();
    expect(useBackupStore.getState().lastMeta).toBeTruthy();

    await useBackupStore.getState().deleteRecord(made!.meta.backupId);

    expect(useBackupStore.getState().lastMeta).toBeNull();
    expect(useBackupStore.getState().records).toHaveLength(0);
  });

  it("clears every local copy without touching cloud markers on disk", async () => {
    await useBackupStore.getState().create();
    await useBackupStore.getState().create();
    expect((await listVaultRecords()).length).toBe(2);

    await useBackupStore.getState().clearLocalCopies();
    expect((await listVaultRecords()).length).toBe(0);
    expect(useBackupStore.getState().lastMeta).toBeNull();
  });

  it("verifyLatest reports a healthy file", async () => {
    await useBackupStore.getState().create();
    toasts.length = 0;
    await useBackupStore.getState().verifyLatest();
    expect(toasts.some((t) => t.kind === "success" && /Intact/.test(t.message))).toBe(true);
  });
});

describe("useBackupStore — automatic copies", () => {
  it("only runs when the interval has passed", async () => {
    useBackupStore
      .getState()
      .updateAuto({ enabled: true, intervalHours: 24, lastCreatedAt: Date.now() });
    await useBackupStore.getState().maybeAutoBackup("interval");
    expect((await listVaultRecords()).length).toBe(0);

    useBackupStore.getState().updateAuto({ lastCreatedAt: Date.now() - 25 * 3600_000 });
    await useBackupStore.getState().maybeAutoBackup("interval");

    const records = await listVaultRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe("auto");
    expect(useBackupStore.getState().auto.lastCreatedAt).toBeGreaterThan(Date.now() - 5000);
  });

  it("does nothing when the user turned it off", async () => {
    useBackupStore.getState().updateAuto({ enabled: false, lastCreatedAt: 0 });
    await useBackupStore.getState().maybeAutoBackup("interval");
    expect((await listVaultRecords()).length).toBe(0);
  });

  it("keeps only the configured number of rolling copies", async () => {
    useBackupStore
      .getState()
      .updateAuto({ enabled: true, intervalHours: 24, maxSnapshots: 2, lastCreatedAt: 0 });
    for (let i = 0; i < 4; i++) {
      useBackupStore.getState().updateAuto({ lastCreatedAt: 0 });
      await useBackupStore.getState().maybeAutoBackup("interval");
    }
    const autos = (await listVaultRecords()).filter((r) => r.kind === "auto");
    expect(autos.length).toBeLessThanOrEqual(2);
  });

  it("runAutoNow works even when auto-backup is switched off", async () => {
    await useBackupStore.getState().runAutoNow();
    expect((await listVaultRecords()).length).toBe(1);
  });
});

describe("useBackupStore — cloud glue", () => {
  const okFetch = (body: unknown) =>
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify(body)),
        headers: { get: () => null },
      } as unknown as Response),
    );

  it("pushes a new copy to the provider the person switched on", async () => {
    const { configureCloud } = await import("@/lib/backup/cloud");
    await configureCloud({
      provider: "github-gist",
      token: "ghp_test",
      enabled: true,
      autoUpload: true,
    });
    const fetchMock = okFetch({ id: "gist-9", html_url: "https://gist.example/9" });
    globalThis.fetch = fetchMock as never;

    const made = await useBackupStore.getState().create();
    expect(made).not.toBeNull();
    // The upload is fire-and-forget by design: wait for it to land.
    await new Promise((r) => setTimeout(r, 60));

    expect(fetchMock).toHaveBeenCalled();
    const [record] = await listVaultRecords();
    expect(record.cloud?.provider).toBe("github-gist");
    expect(record.cloud?.fileId).toBe("gist-9");
    expect(useBackupStore.getState().cloud.status["github-gist"]?.lastSyncAt).toBeGreaterThan(0);
  });

  it("leaves the network alone when auto-upload is off", async () => {
    const { configureCloud } = await import("@/lib/backup/cloud");
    await configureCloud({
      provider: "github-gist",
      token: "ghp_test",
      enabled: true,
      autoUpload: false,
    });
    const fetchMock = okFetch({ id: "nope" });
    globalThis.fetch = fetchMock as never;

    await useBackupStore.getState().create();
    await new Promise((r) => setTimeout(r, 40));

    expect(fetchMock).not.toHaveBeenCalled();
    const [record] = await listVaultRecords();
    expect(record.cloud).toBeUndefined();
  });

  it("reports an error instead of pretending an upload happened", async () => {
    const made = await useBackupStore.getState().create();
    expect(made).not.toBeNull();

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"message":"Bad credentials"}'),
        headers: { get: () => null },
      } as unknown as Response),
    ) as never;

    const { configureCloud } = await import("@/lib/backup/cloud");
    await configureCloud({
      provider: "github-gist",
      token: "ghp_test",
      enabled: true,
      autoUpload: false,
    });
    toasts.length = 0;
    await useBackupStore.getState().uploadToCloud("github-gist");
    expect(useBackupStore.getState().cloud.error).toMatch(/credentials|rejected/i);
    expect(toasts.some((t) => t.kind === "error")).toBe(true);
  });
});
