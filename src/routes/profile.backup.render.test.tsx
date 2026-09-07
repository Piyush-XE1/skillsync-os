// @vitest-environment jsdom
/**
 * Route-level smoke test for /profile/backup: the page has to mount through the
 * real router and expose the whole feature on one screen. Interactions are
 * covered in src/components/profile/BackupSection.test.tsx — mounting the app
 * tree per test leaves overlay animations running in jsdom, and React's act()
 * then waits forever for work that never ends.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { webcrypto } from "node:crypto";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";
import { useBackupStore } from "@/store/useBackupStore";
import { clearVault } from "@/lib/backup/vault";
import { createInitialData } from "@/lib/seed";

vi.mock("@/lib/lovable-error-reporter", () => ({ reportLovableError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  Toaster: () => null,
}));

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});

describe("/profile/backup", () => {
  it("renders the whole backup feature on the route", async () => {
    localStorage.clear();
    await clearVault();
    useAppStore.setState({ ...createInitialData(), _hydrated: true });
    await useBackupStore.getState().init();

    window.history.pushState({}, "", "/profile/backup");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RouterProvider router={getRouter()} />);
      await new Promise((r) => setTimeout(r, 80));
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("Backup & Restore");
    expect(text).toContain("Create backup");
    expect(text).toContain("On this device");
    expect(text).toContain("Cloud copies");
    expect(text).toContain("Automatic copies");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  }, 20000);
});
