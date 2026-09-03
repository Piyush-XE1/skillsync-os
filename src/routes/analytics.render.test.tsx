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
  const today = new Date();
  data.coding.problems = [
    {
      id: "1",
      title: "Two Sum",
      platform: "leetcode",
      difficulty: "easy",
      tags: ["array"],
      url: "",
      solvedAt: today.getTime(),
      notes: "",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
    },
    {
      id: "2",
      title: "LRU Cache",
      platform: "leetcode",
      difficulty: "hard",
      tags: ["design"],
      url: "",
      solvedAt: today.getTime(),
      notes: "",
      timeComplexity: "",
      spaceComplexity: "",
    },
    {
      id: "3",
      title: "A",
      platform: "codeforces",
      difficulty: "medium",
      tags: [],
      url: "",
      solvedAt: today.getTime(),
      notes: "",
      timeComplexity: "",
      spaceComplexity: "",
    },
  ];
  data.focus.sessions.push({
    id: "s1",
    minutes: 25,
    mode: "focus",
    startedAt: today.getTime(),
    task: "",
  });
  data.habitLogs = [{ habitId: "h1", date: new Date().toISOString().slice(0, 10) }];
  data.planner = [
    {
      id: "p1",
      title: "x",
      date: new Date().toISOString().slice(0, 10),
      done: true,
      doneAt: today.getTime(),
      priority: "medium",
      time: "",
      createdAt: today.getTime(),
    },
  ];
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("analytics render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/analytics");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders charts and insights without crashing", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 60));
    });
    const html = container.innerHTML;
    expect(html).toContain("Analytics");
    expect(html).toContain("Momentum");
    expect(html).toContain("Deep work");
    expect(html).toContain("Difficulty");
    // chart SVGs render
    expect(html).toContain("<svg");
  });
});
