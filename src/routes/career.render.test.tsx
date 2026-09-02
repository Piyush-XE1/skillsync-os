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
  data.career.applications = [
    {
      id: "a1",
      company: "Google",
      role: "SDE Intern",
      location: "Bengaluru",
      status: "interview",
      appliedAt: Date.now(),
      deadline: null,
      referral: "Senior friend",
      link: "",
      salary: "",
      notes: "",
      rounds: [
        {
          id: "r1",
          name: "DSA Round",
          date: Date.now(),
          type: "virtual",
          outcome: "cleared",
          notes: "",
        },
      ],
    },
    {
      id: "a2",
      company: "Amazon",
      role: "SDE 1",
      location: "Remote",
      status: "offer",
      appliedAt: Date.now() - 172_800_000,
      deadline: null,
      referral: "",
      link: "",
      salary: "₹25 LPA",
      notes: "",
      rounds: [],
    },
  ];
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("career render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/career");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders applications and pipeline stats", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    expect(html).toContain("Career");
    expect(html).toContain("Google");
    expect(html).toContain("Amazon");
    expect(html).toContain("Offer");
    expect(html).toContain("DSA Round");
    expect(html).toContain("SDE Intern");
  });
});
