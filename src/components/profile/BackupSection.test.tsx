// @vitest-environment jsdom
/**
 * The backup screen, driven the way a person drives it.
 *
 * `BackupSection` is mounted on its own rather than through the router: the app
 * shell keeps overlay/animation timers alive in jsdom and React's act() then
 * waits for work that never ends. Route mounting itself is covered by
 * src/routes/profile.backup.render.test.tsx.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { webcrypto } from "node:crypto";
import { BackupSection } from "@/components/profile/BackupSection";
import { useAppStore } from "@/store/useAppStore";
import { useBackupStore } from "@/store/useBackupStore";
import { clearVault, getVaultRecord, listVaultRecords } from "@/lib/backup/vault";
import { createInitialData } from "@/lib/seed";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  Toaster: () => null,
}));

let root: Root;
let container: HTMLDivElement;

function text() {
  // Sheets render through a portal on body, so look at the whole document.
  return document.body.textContent ?? "";
}

/** Run an action and let React catch up, so assertions see the result. */
async function run<T>(fn: () => Promise<T> | T): Promise<T> {
  let value!: T;
  await act(async () => {
    value = await fn();
    await new Promise((r) => setTimeout(r, 30));
  });
  return value;
}

async function click(name: string, nth = 0) {
  const needle = name.trim().toLowerCase();
  const nodes = [...document.body.querySelectorAll("button")].filter((node) =>
    (node.textContent ?? "").trim().toLowerCase().includes(needle),
  ) as HTMLButtonElement[];
  const node = nodes[nth];
  if (!node) throw new Error(`No button containing "${name}" (${nodes.length} found)`);
  await run(() => node.click());
  return node;
}

async function clickSelector(selector: string) {
  const node = document.querySelector(selector) as HTMLElement | null;
  if (!node) throw new Error(`No element matching "${selector}"`);
  await run(() => node.click());
  return node;
}

async function createBackup(input?: {
  encryption?: boolean;
  password?: string;
  compression?: boolean;
}) {
  const made = await run(() => useBackupStore.getState().create(input));
  if (!made) throw new Error(`create() failed: ${useBackupStore.getState().error ?? "unknown"}`);
  return made;
}

beforeAll(() => {
  // jsdom ships no WebCrypto; the password path has to stay testable.
  vi.stubGlobal("crypto", webcrypto);
});

beforeEach(async () => {
  localStorage.clear();
  useAppStore.setState({ ...createInitialData(), _hydrated: true });
  await clearVault();
  useBackupStore.setState({
    created: null,
    pendingRestore: null,
    restoreStep: 0,
    lastSafetyId: null,
    error: null,
    records: [],
    lastMeta: null,
  });
  await useBackupStore.getState().init();

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<BackupSection />);
    await new Promise((r) => setTimeout(r, 40));
  });
});

afterEach(() => {
  useBackupStore.setState({ created: null, pendingRestore: null, restoreStep: 0 });
  act(() => root.unmount());
  container.remove();
});

describe("the backup screen", () => {
  it("puts every control on one screen", async () => {
    expect(text()).toContain("Create backup");
    expect(text()).toContain("Restore");
    expect(text()).toContain("On this device");
    expect(text()).toContain("Cloud copies");
    expect(text()).toContain("Automatic copies");
    expect(text()).toContain("Options for the next backup");
    expect(text()).toContain("No copies yet");
  });

  it("opens the options without leaving the page", async () => {
    expect(text()).not.toContain("Encrypt with a password");

    await click("Options for the next backup");

    expect(text()).toContain("Encrypt with a password");
    expect(text()).toContain("Compress");
    expect(text()).toContain("Only what changed");
    // Password fields only appear once encryption is on.
    expect(text()).not.toContain("Repeat password");
    await clickSelector('button[aria-label="Encrypt with a password"]');
    expect(container.querySelectorAll('input[type="password"]').length).toBe(2);
  });

  it("refuses to encrypt with a weak password instead of writing a broken file", async () => {
    await click("Options for the next backup");
    await clickSelector('button[aria-label="Encrypt with a password"]');

    const fields = [...container.querySelectorAll<HTMLInputElement>('input[type="password"]')];
    await run(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(fields[0], "abc");
      fields[0].dispatchEvent(new Event("input", { bubbles: true }));
    });

    await click("Create backup");

    expect(text()).not.toContain("Backup created");
    expect(useBackupStore.getState().records).toHaveLength(0);
  });

  it("creates a backup from the button and files it in the vault", async () => {
    await click("Create backup");

    expect(text()).toContain("Backup created");
    expect(text()).toContain("Save file");
    expect(text()).toContain("Keep vault copy only");

    await click("Keep vault copy only");

    expect(text()).toMatch(/1 copy · /);
    expect(text()).toContain("Back up now");
    expect(text()).toContain("Last backup");

    const [record] = await listVaultRecords();
    expect(record.kind).toBe("manual");
    expect(record.records).toBeGreaterThan(0);
  });

  it("lists the four providers and opens a setup guide for each", async () => {
    expect(text()).toContain("GitHub Gist");
    expect(text()).toContain("WebDAV");
    expect(text()).toContain("Google Drive");
    expect(text()).toContain("Dropbox");
    expect((text().match(/Set up/g) ?? []).length).toBeGreaterThanOrEqual(4);

    await click("Set up");

    expect(text()).toContain("Personal access token");
    expect(text()).toContain("gist");
    expect(text()).toContain("Save & connect");

    // Escape closes the guide again — no dead-end dialog.
    await run(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(text()).not.toContain("Personal access token");
  });

  it("reveals the schedule only when automatic copies are on", async () => {
    expect(text()).not.toContain("Keep the newest");

    await clickSelector('button[aria-label="Automatic copies"]');

    expect(useBackupStore.getState().auto.enabled).toBe(true);
    expect(text()).toContain("Keep the newest");
    expect(text()).toContain("Daily");
    expect(text()).toContain("Run now");

    // Turning the switch on runs one copy straight away (nothing was ever
    // saved), so "Run now" is measured as a delta rather than an absolute.
    const before = (await listVaultRecords()).filter((r) => r.kind === "auto").length;
    await click("Run now");
    const after = (await listVaultRecords()).filter((r) => r.kind === "auto").length;
    expect(before).toBeGreaterThanOrEqual(1);
    expect(after).toBe(before + 1);
  });

  it("verifies the newest copy on request", async () => {
    await createBackup();
    expect(text()).toContain("Verify newest");

    await click("Verify newest");

    expect(useBackupStore.getState().error).toBeNull();
  });
});

describe("restore from the panel", () => {
  it("keeps the password gate in front of an encrypted copy", async () => {
    await createBackup({ encryption: true, password: "screen-test" });

    const record = useBackupStore.getState().records[0];
    expect(record).toBeTruthy();
    expect(record.encrypted).toBe(true);

    // The first "Restore" is the file picker; the per-copy action is next.
    await click("Restore", 1);

    expect(text()).toContain("Unlock backup");
    expect(text()).toContain("password-protected");
    expect(text()).not.toContain("Confirm restore");
  });

  it("shows what is about to be restored before doing it", async () => {
    const made = await createBackup();
    const record = await getVaultRecord(made.meta.backupId);
    expect(record).toBeTruthy();

    await run(() =>
      useBackupStore.getState().stageRestore(record!.text, {
        source: "cloud",
        name: "SkillSync-Backup-x.json",
        provider: "github-gist",
      }),
    );

    expect(text()).toContain("Restore this backup?");
    expect(text()).toMatch(/roadmaps/i);
    expect(text()).toContain("Review");
  });

  it("warns before replacing the workspace, and offers undo after", async () => {
    const made = await createBackup();
    await run(() => useAppStore.getState().addNote({ title: "Note added after the backup" }));

    await click("Restore", 1);
    expect(text()).toContain("Restore this backup?");

    await click("Review");
    expect(text()).toContain("Confirm restore");

    await click("Restore it");
    await new Promise((r) => setTimeout(r, 80));

    expect(useBackupStore.getState().restoreStep).toBe(0);
    expect(useAppStore.getState().notes.map((n) => n.title)).not.toContain(
      "Note added after the backup",
    );
    expect(useBackupStore.getState().lastSafetyId).toBeTruthy();
    expect(made.meta.backupId).toBeTruthy();

    // Undo is offered right there, and takes the workspace back to the snapshot.
    await click("Undo that restore");
    expect(useAppStore.getState().notes.map((n) => n.title)).toContain(
      "Note added after the backup",
    );
  });
});
