// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { createInitialData } from "@/lib/seed";
import type { Note } from "@/lib/schema";
import { useAppStore } from "@/store/useAppStore";

vi.mock("@/lib/lovable-error-reporter", () => ({ reportLovableError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  Toaster: () => null,
}));

const note: Note = {
  id: "note-markdown",
  title: "Local notebook architecture",
  body: "## Principles\n\nKeep **writing** local.",
  tags: ["systems", "local-first"],
  pinned: true,
  notebook: "Research",
  archived: false,
  linkedTo: null,
  createdAt: 100,
  updatedAt: 200,
};

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  localStorage.clear();
  useAppStore.setState({ ...createInitialData(), notes: [note], _hydrated: true });
  window.history.pushState({}, "", "/notes/note-markdown/edit");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<RouterProvider router={getRouter()} />);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("the Markdown note composer", () => {
  it("mounts local save status, formatting tools, and responsive views", () => {
    const title = document.querySelector<HTMLTextAreaElement>("#note-title");
    const body = document.querySelector<HTMLTextAreaElement>("#note-body");
    expect(title?.value).toBe("Local notebook architecture");
    expect(body?.value).toContain("Keep **writing** local");
    expect(
      document.querySelector('[role="toolbar"][aria-label="Markdown formatting"]'),
    ).toBeTruthy();
    expect(document.querySelector('button[aria-label*="Bold"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Saved locally");
    expect(document.body.textContent).toContain("Write");
    expect(document.body.textContent).toContain("Split");
    expect(document.body.textContent).toContain("Preview");
  });
});
