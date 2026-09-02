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
  data.stats.achievements = ["first-topic", "first-habit", "streak-7"];
  data.habitLogs = [{ habitId: "h1", date: "2026-01-01" }];
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("achievements render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/achievements");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders the collection with unlocked badges and rank", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    expect(html).toContain("Achievements");
    expect(html).toContain("First Light");
    expect(html).toContain("First Step");
    expect(html).toContain("Consistency");
    expect(html).toContain("badges");
  });
});
