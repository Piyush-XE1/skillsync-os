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
  useAppStore.setState({
    ...createInitialData(),
    notes: [note, { ...note, id: "archived", title: "Archived record", archived: true }],
    _hydrated: true,
  });
  window.history.pushState({}, "", "/notes");
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

describe("the notebook library", () => {
  it("renders collections, discovery controls, metadata, and creation templates", async () => {
    const text = document.body.textContent ?? "";
    expect(text).toContain("Notes");
    expect(text).toContain("All notes");
    expect(text).toContain("Pinned");
    expect(text).toContain("Archive");
    expect(text).toContain("Research");
    expect(text).toContain("Local notebook architecture");
    expect(text).not.toContain("Archived record");
    expect(document.querySelector('input[placeholder*="Search titles"]')).toBeTruthy();

    const create = [...document.querySelectorAll("button")].find((button) =>
      (button.textContent ?? "").includes("New note"),
    );
    expect(create).toBeTruthy();
    await act(async () => create?.click());
    expect(document.body.textContent).toContain("Study notes");
    expect(document.body.textContent).toContain("Meeting record");
    expect(document.body.textContent).toContain("Project brief");
  });
});
