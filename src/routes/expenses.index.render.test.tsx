// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInitialData } from "@/lib/seed";
import { getRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";

function seed() {
  const data = createInitialData();
  data.preferences.hasCompletedFirstLaunch = true;
  data.preferences.onboardingCompleted = true;
  data.preferences.modules.expenses = true;
  data.expenses.transactions = [];
  useAppStore.setState({ ...data, _hydrated: true });
}

function click(element: Element | null | undefined) {
  if (!element) throw new Error("element not found");
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

describe("expense log", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/expenses");
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

  it("offers a local expense date alongside title and amount", async () => {
    await render();
    click(
      Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Add Expense"),
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const dateField = document.querySelector<HTMLInputElement>('input[type="date"]');
    expect(document.body.textContent).toContain("Title");
    expect(document.body.textContent).toContain("Amount");
    expect(document.body.textContent).toContain("Date of expense");
    expect(dateField).not.toBeNull();
    expect(dateField?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
