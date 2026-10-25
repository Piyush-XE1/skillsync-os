// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { webcrypto } from "node:crypto";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { createInitialData } from "@/lib/seed";
import { useAppStore } from "@/store/useAppStore";

vi.mock("@/lib/lovable-error-reporter", () => ({ reportLovableError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  Toaster: () => null,
}));

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});

describe("/profile/widgets", () => {
  it("renders the widget gallery with a preview per widget", async () => {
    localStorage.clear();
    useAppStore.setState({ ...createInitialData(), _hydrated: true });

    window.history.pushState({}, "", "/profile/widgets");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RouterProvider router={getRouter()} />);
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    const text = document.body.textContent ?? "";
    // The browser has no native bridge, so the page explains the Android path.
    expect(text).toContain("Home screen");
    expect(text).toContain("Add these on your phone");
    expect(text).toContain("13 widgets");
    for (const title of [
      "Overview",
      "Today",
      "Habits",
      "Focus",
      "Planner",
      "Aims",
      "Stats",
      "Daily quote",
      "Quick actions",
      "Notes",
      "Pulse",
      "Roadmaps",
    ]) {
      expect(text).toContain(title);
    }
    expect(text).toContain("How it works");
    // Every gallery card is present.
    expect(container.querySelectorAll("section").length).toBeGreaterThanOrEqual(2);

    await act(async () => root.unmount());
    container.remove();
  }, 20000);
});
