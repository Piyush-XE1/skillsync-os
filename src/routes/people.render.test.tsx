// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInitialData } from "@/lib/seed";
import { getRouter } from "@/router";
import { useAppStore } from "@/store/useAppStore";
import type { Person } from "@/lib/schema";

/** Person A: name + how we met. B: partial. C: every field. */
const PEOPLE: Person[] = [
  {
    id: "a",
    name: "Rahul",
    howMet: "College",
    tags: [],
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "b",
    name: "Ananya",
    howMet: "Tech event",
    liked: "Explained her work clearly.",
    learned: "Clarity is a form of generosity.",
    tags: ["Networking", "Learning"],
    createdAt: 2,
    updatedAt: 2,
  },
  {
    id: "c",
    name: "Professor Mehta",
    howMet: "Friend introduction",
    liked: "Patient with questions.",
    disliked: "Interrupted others twice.",
    learned: "Ask the second question.",
    talkedAbout: "Research and teaching.",
    locationContext: "College canteen",
    dateMet: "2026-09-14",
    followUp: "Send the book recommendation.",
    tags: ["College", "Mentor"],
    createdAt: 3,
    updatedAt: 3,
  },
];

function seed() {
  const data = createInitialData();
  data.preferences.hasCompletedFirstLaunch = true;
  data.preferences.onboardingCompleted = true;
  data.people = PEOPLE.map((person) => ({ ...person }));
  useAppStore.setState({ ...data, _hydrated: true });
}

function click(element: Element | null | undefined) {
  if (!element) throw new Error("element not found");
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function cards(container: HTMLElement) {
  return Array.from(container.querySelectorAll("h3")).map((node) => node.textContent);
}

describe("people journal", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/people");
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

  it("renders A/B/C with only the fields each one actually entered", async () => {
    await render();
    expect(cards(container)).toEqual(["Professor Mehta", "Ananya", "Rahul"]);

    const details = Array.from(container.querySelectorAll("details"));
    expect(details).toHaveLength(2); // A has nothing to expand
    const labels = details.flatMap((node) =>
      Array.from(node.querySelectorAll("dt")).map((dt) => dt.textContent),
    );
    expect(labels).toContain("What I liked");
    expect(labels).toContain("What I didn't like");
    expect(labels).toContain("Where we met");
    expect(labels).toContain("Follow-up / remember");
    expect(container.textContent).toContain("Clarity is a form of generosity.");
    expect(container.textContent).toContain("Ask the second question.");
    expect(container.textContent).toContain("Networking");

    // No empty section placeholders anywhere in the normal view.
    expect(container.textContent).not.toContain("Description: —");
    expect(container.textContent).not.toContain("Tags: —");
    expect(container.textContent).not.toContain("undefined");
  });

  it("searches, filters by tag and sorts", async () => {
    await render();
    const search = container.querySelector<HTMLInputElement>('input[aria-label="Search people"]');
    expect(search).not.toBeNull();
    type(search!, "second question");
    expect(cards(container)).toEqual(["Professor Mehta"]);
    type(search!, "");

    click(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "Mentor",
      ),
    );
    expect(cards(container)).toEqual(["Professor Mehta"]);
    click(
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "All",
      ),
    );

    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Sort people"]');
    expect(select).not.toBeNull();
    await act(async () => {
      if (!select) return;
      select.value = "alphabetical";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(cards(container)).toEqual(["Ananya", "Professor Mehta", "Rahul"]);
  });

  it("edits an entry", async () => {
    await render();
    click(container.querySelector('[aria-label="Edit Ananya"]'));
    const nameInput = Array.from(document.querySelectorAll("input")).find(
      (input) => input.value === "Ananya",
    );
    expect(nameInput).toBeDefined();
    type(nameInput as HTMLInputElement, "Ananya Sharma");
    click(
      Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === "Save entry",
      ),
    );
    expect(useAppStore.getState().people.find((p) => p.id === "b")?.name).toBe("Ananya Sharma");
    expect(useAppStore.getState().people.find((p) => p.id === "b")?.learned).toBe(
      "Clarity is a form of generosity.",
    );
  });
});
