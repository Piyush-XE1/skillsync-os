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
  data.focus.sessions.push({
    id: "s1",
    minutes: 25,
    mode: "focus",
    startedAt: today.getTime(),
    task: "",
  });
  data.coding.problems.push({
    id: "1",
    title: "Two Sum",
    platform: "leetcode",
    difficulty: "easy",
    tags: ["array"],
    url: "",
    solvedAt: today.getTime(),
    notes: "",
    timeComplexity: "",
    spaceComplexity: "",
  });
  data.habitLogs = [{ habitId: "h1", date: new Date().toISOString().slice(0, 10) }];
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("review render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/review");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders the weekly report with score, metrics and narrative", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 60));
    });
    const html = container.innerHTML;
    expect(html).toContain("Week in Review");
    expect(html).toContain("Topics learned");
    expect(html).toContain("Problems solved");
    expect(html).toContain("What to focus on");
    expect(html).toContain("Highlights");
    // chart SVGs render
    expect(html).toContain("<svg");
  });
});
