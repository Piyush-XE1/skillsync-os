// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";
import { createInitialData } from "@/lib/seed";
import { DEMO_SNAPSHOT_KEY } from "@/lib/demo";

function seed() {
  const data = createInitialData();
  data.profile = { name: "Real User", avatar: "" };
  useAppStore.setState({ ...data, _hydrated: true, demoMode: false });
}

function click(el: Element | null | undefined) {
  if (!el) throw new Error("element not found");
  act(() => {
    (el as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

describe("project showcase", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/showcase");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
    window.localStorage.clear();
  });

  async function render() {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 60));
    });
  }

  it("presents the project dossier with architecture and metrics", async () => {
    await render();
    const html = container.innerHTML;
    expect(html).toContain("SkillSync OS.");
    expect(html).toContain("Final year major project");
    expect(html).toContain("Architecture");
    expect(html).toContain("Versioned schema, not migrations by hand");
    expect(html).toContain("Load demo workspace");
    expect(html).toContain("Keyboard-first");
  });

  it("loads the demo workspace, snapshots the real one, and restores it on exit", async () => {
    await render();

    click(
      Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Load demo workspace"),
      ),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    // The demo persona is in the store…
    const demo = useAppStore.getState();
    expect(demo.demoMode).toBe(true);
    expect(demo.profile.name).toBe("Aditya Sharma");
    expect(demo.goals.length).toBeGreaterThanOrEqual(5);
    // …and the real workspace is stashed, not lost.
    expect(window.localStorage.getItem(DEMO_SNAPSHOT_KEY)).not.toBeNull();

    // Exit from the banner that follows the user across routes.
    click(
      Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === "Exit",
      ),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    const restored = useAppStore.getState();
    expect(restored.demoMode).toBe(false);
    expect(restored.profile.name).toBe("Real User");
    expect(window.localStorage.getItem(DEMO_SNAPSHOT_KEY)).toBeNull();
  });
});
