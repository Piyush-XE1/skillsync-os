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
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("search render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/search");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders the command palette with quick-launch destinations", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    expect(html).toContain("roadmaps");
    expect(html).toContain("Focus");
    expect(html).toContain("CGPA");
    expect(html).not.toContain("Resume");
    expect(html).toContain("Go to");
  });
});
