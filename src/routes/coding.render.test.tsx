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
  data.coding.problems = [
    {
      id: "p1",
      title: "Two Sum",
      platform: "leetcode",
      difficulty: "easy",
      tags: ["Array", "Hash Table"],
      url: "",
      solvedAt: Date.now(),
      notes: "",
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
    },
    {
      id: "p2",
      title: "Longest Substring Without Repeating Characters",
      platform: "leetcode",
      difficulty: "medium",
      tags: ["Sliding Window"],
      url: "",
      solvedAt: Date.now() - 86_400_000,
      notes: "",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
    },
  ];
  data.coding.rating = 1450;
  data.coding.maxRating = 1460;
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("coding render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/coding");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders the solved problems and stats", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    expect(html).toContain("Code");
    expect(html).toContain("Two Sum");
    expect(html).toContain("Longest Substring Without Repeating Characters");
    expect(html).toContain("Hash Table");
    expect(html).toContain("LeetCode");
  });
});
