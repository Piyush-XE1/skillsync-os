// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInitialData } from "@/lib/seed";
import { getRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";

function seed() {
  const data = createInitialData();
  data.preferences.hasCompletedFirstLaunch = true;
  data.preferences.onboardingCompleted = true;
  data.projects = [
    {
      id: "p-full",
      title: "Signal Lab",
      description: "A calm dashboard for deliberate practice.",
      status: "active",
      progress: 62,
      deadline: "2026-12-20",
      techStack: ["React", "TypeScript"],
      tasks: [
        { id: "t1", title: "Design the overview", done: true },
        { id: "t2", title: "Wire the local store", done: false },
      ],
      notes: "Keep the interface quiet.",
      githubUrl: "https://github.com/example/signal-lab",
      createdAt: 1,
    },
    {
      id: "p-minimal",
      title: "Empty scaffold",
      description: "",
      status: "planning",
      progress: 0,
      deadline: null,
      techStack: [],
      tasks: [],
      notes: "",
      githubUrl: "",
      createdAt: 2,
    },
  ];
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("projects overview", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/projects");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useAppStore.getState().resetAll();
  });

  async function render() {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  }

  it("shows entered information in the normal view and hides blank fields", async () => {
    await render();
    const text = container.textContent ?? "";
    expect(text).toContain("Signal Lab");
    expect(text).toContain("A calm dashboard for deliberate practice.");
    expect(text).toContain("Due 2026-12-20");
    expect(text).toContain("62%");
    expect(text).toContain("React");
    expect(text).toContain("Tasks · 1 of 2 done");
    expect(text).toContain("Notes");
    expect(text).toContain("https://github.com/example/signal-lab");

    // The minimal project has no description/deadline/stack/tasks/notes/link.
    expect(text).not.toContain("Due —");
    expect(text).not.toContain("Description:");
    expect(text).not.toContain("Tasks · 0 of 0 done");
    expect(container.querySelector('[aria-label="Edit Signal Lab"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Edit Empty scaffold"]')).not.toBeNull();
  });
});
