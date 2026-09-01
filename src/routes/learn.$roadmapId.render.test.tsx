// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";
import { createInitialData } from "@/lib/seed";

const ROADMAP_ID = "roadmap-render-demo";

function seed() {
  const data = createInitialData();
  data.roadmaps = [
    {
      id: ROADMAP_ID,
      title: "Render Test Roadmap",
      subtitle: "Subtitle",
      color: "#7c3aed",
      phases: [
        {
          id: "p1",
          title: "Foundations",
          topics: [
            {
              id: "t1",
              title: "Syntax",
              done: true,
              notes: "",
              resources: [],
              subtopics: [],
              checklist: [
                { id: "c1", title: "Variables", done: true, createdAt: 1 },
                { id: "c2", title: "Operators", done: false, createdAt: 1 },
              ],
              createdAt: 1,
              completedAt: null,
            },
          ],
          createdAt: 1,
        },
        {
          id: "p2",
          title: "Core",
          topics: [
            {
              id: "t2",
              title: "Functions",
              done: false,
              completedAt: null,
              notes: "",
              resources: [],
              subtopics: [
                {
                  id: "s1",
                  title: "Scope",
                  done: false,
                  notes: "",
                  resources: [],
                  checklist: [{ id: "c3", title: "Read", done: false, createdAt: 1 }],
                  createdAt: 1,
                },
              ],
              checklist: [],
              createdAt: 1,
            },
          ],
          createdAt: 1,
        },
      ],
      createdAt: 1,
    },
  ];
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("roadmap detail render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    // Point the router at the detail route.
    window.history.pushState({}, "", `/learn/${ROADMAP_ID}`);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders the roadmap journey without crashing", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      // Allow TanStack route loading to settle
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    expect(html).toContain("Render Test Roadmap");
    expect(html).toContain("Foundations");
    expect(html).toContain("Syntax");
    expect(html).toContain("Scope");
    expect(html).toContain("Start");
    expect(html).toContain("Roadmap complete");
    // Topics vs subtopics: journey primitives present
    expect(html).toContain("Add stop to this leg");
    expect(html).toContain("Add a phase to the journey");
  });
});
