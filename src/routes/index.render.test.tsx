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
  data.preferences.hasCompletedFirstLaunch = true;
  data.preferences.onboardingCompleted = true;
  useAppStore.setState({ ...data, _hydrated: true });
}

function click(el: Element | null | undefined) {
  if (!el) throw new Error("element not found");
  act(() => {
    (el as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

describe("typographic dashboard and personal monograph", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/");
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

  it("keeps the working dashboard and has no Archetype/Anti-Self/Memento Mori/Quote/Timer/Capture blocks", async () => {
    await render();
    const html = container.innerHTML;
    expect(html.indexOf('id="dashboard-heading"')).toBeGreaterThan(-1);
    expect(container.textContent).toContain("Dashboard");
    expect(container.textContent).toContain("Customize");
    expect(container.querySelectorAll("[data-sort-row]").length).toBeGreaterThan(0);
    expect(html).not.toContain("The Archetype");
    expect(html).not.toContain("The Anti-Self");
    expect(html).not.toContain("Memento Mori");

    // Explicit removals from the in-app Home screen and app shell.
    expect(container.querySelector('[id="quote-obelisk-heading"]')).toBeNull();
    expect(container.querySelector('[role="timer"]')).toBeNull();
    expect(container.textContent).not.toContain("Daily inscription");
    expect(container.textContent).not.toContain("Chronometers");
    expect(container.querySelector('[aria-label="Quick capture"]')).toBeNull();
    expect(
      Array.from(container.querySelectorAll("button")).some(
        (button) => button.textContent?.trim() === "Capture",
      ),
    ).toBe(false);
  });

  it("keeps dashboard customization and keyboard reorder controls available", async () => {
    await render();
    click(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "Customize",
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(container.textContent).toContain("Drag to rearrange");
    expect(container.textContent).toContain("Widgets");
    expect(container.querySelector('button[aria-label^="Reorder "]')).not.toBeNull();
  });

  it("renders persisted identity and age perspective without the retired timer block", async () => {
    useAppStore.getState().addArchetypeTrait({
      text: "I speak with precision and act with intention.",
      category: "Conduct",
      notes: "Pause before answering.",
      subTenets: [{ id: "sub-1", text: "Say only what is necessary." }],
    });
    useAppStore.getState().addAntiSelfEntry({ text: "Choosing noise over intention." });
    useAppStore.getState().setBirthDate("2000-01-01");
    await render();
    expect(container.textContent).not.toContain("I speak with precision and act with intention.");
    expect(container.textContent).not.toContain("Choosing noise over intention.");
    expect(container.textContent).not.toContain("Age in completed weeks");
    expect(container.querySelector('[role="timer"]')).toBeNull();
  });
});
