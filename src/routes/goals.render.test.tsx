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
  data.goals = [
    { id: "g1", title: "Gym", emoji: "🏋️", note: "Show up.", createdAt: 1 },
    { id: "g2", title: "No fap", emoji: "🔒", note: "", createdAt: 2 },
    { id: "g3", title: "Sleep on time", emoji: "😴", note: "", createdAt: 3 },
  ];
  useAppStore.setState({ ...data, _hydrated: true });
}

function click(el: Element | null | undefined) {
  if (!el) throw new Error("element not found");
  act(() => {
    (el as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

describe("aims render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/goals");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  async function render() {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 50));
    });
  }

  it("lists the aims and never scores them", async () => {
    await render();
    const html = container.innerHTML;
    expect(html).toContain("Your aims");
    expect(html).toContain("Gym");
    expect(html).toContain("No fap");
    expect(html).toContain("Sleep on time");
    // The reward language is gone for good.
    expect(html).not.toContain("XP");
    expect(html).not.toContain("Badge");
    expect(html).not.toContain("Level");
  });

  it("adds an aim from the quick-add presets", async () => {
    await render();
    click(
      Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("No junk food"),
      ),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(useAppStore.getState().goals.some((g) => g.title === "No junk food")).toBe(true);
    expect(container.innerHTML).toContain("No junk food");
  });
});
