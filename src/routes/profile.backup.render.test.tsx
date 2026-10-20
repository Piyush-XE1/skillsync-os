// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { webcrypto } from "node:crypto";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { clearVault } from "@/lib/backup/vault";
import { createInitialData } from "@/lib/seed";
import { useAppStore } from "@/store/useAppStore";
import { useBackupStore } from "@/store/useBackupStore";

vi.mock("@/lib/lovable-error-reporter", () => ({ reportLovableError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  Toaster: () => null,
}));

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});

describe("/profile/backup", () => {
  it("renders exactly the two supported destination experiences", async () => {
    localStorage.clear();
    await clearVault();
    useAppStore.setState({ ...createInitialData(), _hydrated: true });
    useBackupStore.setState({
      ready: false,
      cloud: { items: {}, status: {}, busy: null, error: null },
    });
    await useBackupStore.getState().init();

    window.history.pushState({}, "", "/profile/backup");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RouterProvider router={getRouter()} />);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const text = document.body.textContent ?? "";
    expect(text).toContain("Backup & Restore");
    expect(text).toContain("Save to device");
    expect(text).toContain("Backup sync with Google Drive");
    expect(text).toContain("Restore from a file");
    expect(text).not.toContain("Automatic copies");
    expect(text).not.toContain("GitHub Gist");
    expect(text).not.toContain("Reset SkillSync");

    await act(async () => root.unmount());
    container.remove();
  }, 20000);
});
