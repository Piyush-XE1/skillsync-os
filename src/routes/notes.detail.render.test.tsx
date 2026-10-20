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
  body: "## Principles\n\nKeep **writing** local.\n\n- [ ] Test restore\n\n> Durable by default.",
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
  window.history.pushState({}, "", "/notes/note-markdown");
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

describe("the notebook reader", () => {
  it("renders Markdown, actions, outline, metadata, and interactive tasks", async () => {
    expect(document.querySelector("article.note-prose h2")?.textContent).toContain("Principles");
    expect(document.querySelector("article.note-prose strong")?.textContent).toBe("writing");

    const task = document.querySelector<HTMLInputElement>(
      'article.note-prose input[type="checkbox"]',
    );
    expect(task).toBeTruthy();
    expect(task?.disabled).toBe(false);
    await act(async () => task?.click());
    expect(useAppStore.getState().notes[0].body).toContain("- [x] Test restore");

    expect(document.body.textContent).toContain("ON THIS PAGE");
    expect(document.body.textContent).toContain("Export .md");
    expect(document.body.textContent).toContain("Duplicate");
    expect(document.body.textContent).toContain("1 min read");
  });
});
