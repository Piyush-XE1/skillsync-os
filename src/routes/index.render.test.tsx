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

  it("leads with the quotation and Archetype, then restores the dashboard without its oversized hero", async () => {
    await render();
    const html = container.innerHTML;
    const header = container.querySelector("header");
    const quotePosition = html.indexOf('id="quote-obelisk-heading"');
    const archetypePosition = html.indexOf('id="archetype-heading"');
    const dashboardPosition = html.indexOf('id="dashboard-heading"');

    expect(header?.textContent).not.toContain("Small steps, compounded daily");
    expect(header?.textContent).not.toContain("live widgets");
    expect(header?.textContent).not.toContain("Local-first · Ready");
    expect(quotePosition).toBeGreaterThan(-1);
    expect(archetypePosition).toBeGreaterThan(quotePosition);
    expect(dashboardPosition).toBeGreaterThan(archetypePosition);
    expect(container.textContent).toContain("dashboard.");
    expect(container.textContent).toContain("Customize");
    expect(container.querySelectorAll("[data-sort-row]").length).toBeGreaterThan(0);
    expect(container.querySelector('[aria-label="Today at a glance"]')).toBeNull();
    expect(html).toContain("Daily inscription");
    expect(html).toContain("The Archetype");
    expect(html).toContain("The Anti-Self");
    expect(html).toContain("Memento Mori");
    expect(html).toContain("Chronometers");
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
    expect(container.textContent).toContain("Drag the grip to rearrange");
    expect(container.textContent).toContain("Widgets");
    expect(container.querySelector('button[aria-label^="Reorder "]')).not.toBeNull();
  });

  it("handles an empty Personal Monologue with a working add action", async () => {
    await render();
    click(
      Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("My quotes"),
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(container.textContent).toContain("Your own words belong here");
    expect(
      Array.from(container.querySelectorAll("button")).some((button) =>
        button.textContent?.includes("Add the first quotation"),
      ),
    ).toBe(true);
  });

  it("renders persisted identity, age perspective, and independent timer data", async () => {
    useAppStore.getState().addArchetypeTrait({
      text: "I speak with precision and act with intention.",
      category: "Conduct",
      notes: "Pause before answering.",
      subTenets: [{ id: "sub-1", text: "Say only what is necessary." }],
    });
    useAppStore.getState().setBirthDate("2000-01-01");
    const timer = useAppStore.getState().addStopwatch({ title: "Deep Work", icon: "Brain" });
    useAppStore.getState().startStopwatch(timer.id, Date.now() - 65_000);

    await render();
    expect(container.textContent).toContain("I speak with precision and act with intention.");
    expect(container.textContent).toContain("Age in completed weeks");
    expect(container.textContent).toContain("Deep Work");
    expect(container.querySelector('[role="timer"]')).not.toBeNull();
  });

  it("keeps Anti-Self visually subordinate until opened", async () => {
    useAppStore.getState().addAntiSelfEntry({ text: "Choosing noise over intention." });
    await render();
    const content = container.querySelector("#anti-self-content");
    expect(content?.hasAttribute("hidden")).toBe(true);
    click(container.querySelector('[aria-controls="anti-self-content"]'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(content?.hasAttribute("hidden")).toBe(false);
    expect(content?.textContent).toContain("Choosing noise over intention.");
  });
});
