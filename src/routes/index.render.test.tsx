// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";
import { createInitialData } from "@/lib/seed";
import { defaultWidgetLayout, setWidgetVisible } from "@/lib/widgets";

function seed() {
  const data = createInitialData();
  const today = new Date();
  data.preferences.modules = { ...data.preferences.modules, expenses: true, coding: true };
  data.focus.sessions.push({
    id: "s1",
    minutes: 25,
    mode: "focus",
    startedAt: today.getTime(),
    task: "Deep work",
  });
  data.expenses.transactions.push({
    id: "tx1",
    title: "Bus ticket",
    description: "",
    amount: 120,
    type: "debit",
    tags: ["Travel"],
    at: today.getTime(),
    position: 0,
    updatedAt: today.getTime(),
  });
  data.widgets = defaultWidgetLayout();
  useAppStore.setState({ ...data, _hydrated: true });
}

function click(el: Element | null | undefined) {
  if (!el) throw new Error("element not found");
  act(() => {
    (el as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

describe("dashboard widgets", () => {
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
      await new Promise((r) => setTimeout(r, 80));
    });
  }

  it("renders the default widget grid", async () => {
    await render();
    const html = container.innerHTML;
    expect(html).toContain("Your dashboard");
    // The highlighted Aims panel sits at the top of the grid.
    expect(html).toContain("Aims");
    expect(html).toContain("Gym");
    expect(html).toContain("Continue learning");
    expect(html).toContain("Money this month");
    // No reward-system surfaces anywhere on the dashboard.
    expect(html).not.toContain("Level &amp; XP");
    expect(html).not.toContain("Trophy shelf");
    expect(html).not.toContain("badge");
  });

  it("arms drag grips in customize mode and disarms them afterwards", async () => {
    await render();
    expect(container.querySelectorAll('[aria-roledescription="Draggable item"]').length).toBe(0);

    click(
      Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Customize"),
      ),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(container.innerHTML).toContain("Customizing");
    const grips = container.querySelectorAll('[aria-roledescription="Draggable item"]');
    expect(grips.length).toBeGreaterThan(5);
    expect(grips[0].getAttribute("aria-label")).toContain("Reorder");

    click(Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Done"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(container.querySelectorAll('[aria-roledescription="Draggable item"]').length).toBe(0);
  });

  it("removes a widget from the grid and persists the layout", async () => {
    await render();
    // "Gym" is one of the seeded aims, so it only renders inside the panel.
    expect(container.innerHTML).toContain("Gym");

    click(
      Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Customize"),
      ),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    click(container.querySelector('[aria-label="Remove Aims from the dashboard"]'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(container.innerHTML).not.toContain("Gym");
    const layout = useAppStore.getState().widgets;
    expect(layout.find((w) => w.id === "goals")?.visible).toBe(false);
    // …and it can be brought back from the persisted layout.
    expect(setWidgetVisible(layout, "goals", true).find((w) => w.id === "goals")?.visible).toBe(
      true,
    );
  });

  it("resizes a widget through the frame control", async () => {
    await render();
    click(
      Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Customize"),
      ),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    // "Aims" defaults to full width, so the frame offers "smaller".
    click(container.querySelector('[aria-label="Make Aims smaller"]'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(useAppStore.getState().widgets.find((w) => w.id === "goals")?.size).toBe("wide");
  });

  it("hides widgets whose module is switched off", async () => {
    useAppStore.setState((s) => ({
      preferences: { ...s.preferences, modules: { ...s.preferences.modules, expenses: false } },
    }));
    await render();
    expect(container.innerHTML).not.toContain("Money this month");
    expect(container.innerHTML).toContain("Gym");
  });
});
