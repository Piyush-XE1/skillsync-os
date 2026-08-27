// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";
import { createInitialData } from "@/lib/seed";

function seed() {
  const data = createInitialData();
  data.roadmaps = [
    {
      id: "r1",
      title: "Render List Roadmap",
      subtitle: "Subtitle",
      color: "#7c3aed",
      phases: [
        { id: "p1", title: "Foundations", topics: [], createdAt: 1 },
        { id: "p2", title: "Core", topics: [], createdAt: 1 },
        { id: "p3", title: "Advanced", topics: [], createdAt: 1 },
      ],
      createdAt: 1,
    },
  ];
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("learn index render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/learn");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders roadmap cards with a course-map preview", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    expect(html).toContain("Render List Roadmap");
    expect(html).toContain("Roadmaps");

    // The compact course-map preview renders one dot per phase (route line aside)
    expect(html).toContain("Course");
  });
});
