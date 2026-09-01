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
  data.cgpa.semesters = [
    {
      id: "sem-5",
      number: 5,
      subjects: [
        { id: "s1", name: "DBMS", code: "CS-301", credits: 4, grade: "O" },
        { id: "s2", name: "Operating Systems", code: "CS-302", credits: 3, grade: "A+" },
      ],
    },
  ];
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("cgpa render", () => {
  let root: Root;
  let container: HTMLDivElement;
  const router = getRouter();

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    seed();
    window.history.pushState({}, "", "/cgpa");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (container.parentElement) container.parentElement.removeChild(container);
    useAppStore.getState().resetAll();
  });

  it("renders the cumulative GPA and semester subjects", async () => {
    await act(async () => {
      root.render(<RouterProvider router={router} />);
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    expect(html).toContain("CGPA Tracker");
    // (4*10 + 3*9) / 7 = 67/7 ≈ 9.57
    expect(html).toContain("9.57");
    expect(html).toContain("DBMS");
    expect(html).toContain("Operating Systems");
    expect(html).toContain("Semester 5");
    expect(html).toContain("Target simulator");
  });
});
