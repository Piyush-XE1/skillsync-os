// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { webcrypto } from "node:crypto";
import { BackupSection } from "@/components/profile/BackupSection";
import { configureCloud } from "@/lib/backup/cloud";
import { clearVault, getVaultRecord, listVaultRecords } from "@/lib/backup/vault";
import { createInitialData } from "@/lib/seed";
import { useAppStore } from "@/store/useAppStore";
import { useBackupStore } from "@/store/useBackupStore";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  Toaster: () => null,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function pageText() {
  return document.body.textContent ?? "";
}

async function run<T>(action: () => Promise<T> | T): Promise<T> {
  let result!: T;
  await act(async () => {
    result = await action();
    await new Promise((resolve) => setTimeout(resolve, 35));
  });
  return result;
}

async function click(label: string) {
  const needle = label.toLocaleLowerCase();
  const button = [...document.body.querySelectorAll("button")].find((item) =>
    (item.textContent ?? "").toLocaleLowerCase().includes(needle),
  ) as HTMLButtonElement | undefined;
  if (!button) throw new Error(`No button containing “${label}”`);
  await run(() => button.click());
}

async function mount() {
  await useBackupStore.getState().init();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<BackupSection />);
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});

beforeEach(async () => {
  localStorage.clear();
  useAppStore.setState({ ...createInitialData(), _hydrated: true });
  await clearVault();
  useBackupStore.setState({
    ready: false,
    busy: null,
    error: null,
    records: [],
    lastMeta: null,
    created: null,
    pendingRestore: null,
    restoreStep: 0,
    lastSafetyId: null,
    cloud: { items: {}, status: {}, busy: null, error: null },
  });
});

afterEach(() => {
  useBackupStore.setState({ created: null, pendingRestore: null, restoreStep: 0 });
  if (root) act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("the simplified backup screen", () => {
  it("shows only the device and Google Drive destinations", async () => {
    await mount();

    expect(pageText()).toContain("Save to device");
    expect(pageText()).toContain("Backup sync with Google Drive");
    expect(pageText()).toContain("Restore from a file");
    expect(pageText()).toContain("Connect Google Drive");

    for (const removed of [
      "GitHub Gist",
      "WebDAV",
      "Dropbox",
      "Automatic copies",
      "Options for the next backup",
      "On this device",
      "Recent backup activity",
      "Reset SkillSync",
    ]) {
      expect(pageText()).not.toContain(removed);
    }
  });

  it("creates a portable compatible backup without exposing advanced controls", async () => {
    await mount();
    await click("Save to device");

    expect(pageText()).toContain("Your backup is ready");
    expect(pageText()).toContain("complete workspace");
    const records = await listVaultRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe("manual");
    expect(records[0].records).toBeGreaterThan(0);
    expect(pageText()).not.toContain("Encrypt with a password");
    expect(pageText()).not.toContain("Only what changed");
  });

  it("keeps the one-time Google OAuth setup focused on Drive", async () => {
    await mount();
    await click("Connect Google Drive");

    expect(pageText()).toContain("Google OAuth client ID");
    expect(pageText()).toContain("Continue with Google");
    expect(pageText()).toContain("Where do I get a client ID?");
    expect(pageText()).not.toContain("Personal access token");
    expect(pageText()).not.toContain("Dropbox");
  });

  it("offers sync and cloud restore after a Google token is configured", async () => {
    await configureCloud({
      provider: "google-drive",
      clientId: "test.apps.googleusercontent.com",
      token: "test-token",
      enabled: true,
      autoUpload: false,
    });
    await mount();

    expect(pageText()).toContain("Google Drive connected");
    expect(pageText()).toContain("Sync now");
    expect(pageText()).toContain("Restore from Google Drive");
    expect(pageText()).toContain("Keep new backups synced");
  });
});

describe("safe restore confirmation", () => {
  it("retains the password gate for existing encrypted backup files", async () => {
    await mount();
    const made = await run(() =>
      useBackupStore.getState().create({ encryption: true, password: "screen-test" }),
    );
    expect(made).toBeTruthy();
    const record = await getVaultRecord(made!.meta.backupId);
    expect(record).toBeTruthy();

    await run(() =>
      useBackupStore.getState().stageRestore(record!.text, {
        source: "file",
        name: "encrypted-backup.json",
      }),
    );

    expect(pageText()).toContain("Unlock backup");
    expect(pageText()).toContain("password-protected");
    expect(pageText()).not.toContain("Confirm restore");
  });

  it("previews, confirms, and can undo a file restore", async () => {
    await mount();
    const made = await run(() => useBackupStore.getState().create());
    const record = await getVaultRecord(made!.meta.backupId);
    useBackupStore.getState().dismissCreated();
    useAppStore.getState().addNote({ title: "Added after backup" });

    await run(() =>
      useBackupStore.getState().stageRestore(record!.text, {
        source: "file",
        name: "SkillSync-backup.json",
      }),
    );
    expect(pageText()).toContain("Restore this backup?");
    expect(pageText()).toContain("Review restore");

    await click("Review restore");
    expect(pageText()).toContain("Confirm restore");
    await click("Restore workspace");

    expect(useAppStore.getState().notes.map((note) => note.title)).not.toContain(
      "Added after backup",
    );
    expect(useBackupStore.getState().lastSafetyId).toBeTruthy();
    expect(pageText()).toContain("Undo the last restore");

    await click("Undo the last restore");
    expect(useAppStore.getState().notes.map((note) => note.title)).toContain("Added after backup");
  });
});
