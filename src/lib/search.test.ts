import { describe, it, expect } from "vitest";
import { searchAll } from "@/lib/search";
import { createInitialData } from "@/lib/seed";
import type { AppData } from "@/lib/schema";

function data(): AppData {
  const d = createInitialData();
  d.notes = [
    {
      id: "n1",
      title: "React rendering notes",
      body: "Fiber and reconciliation",
      tags: [],
      pinned: false,
      linkedTo: null,
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  d.projects = [
    {
      id: "p1",
      title: "SkillSync",
      description: "Personal growth OS",
      status: "active",
      progress: 50,
      deadline: null,
      techStack: [],
      tasks: [],
      notes: "",
      githubUrl: "",
      createdAt: 1,
    },
  ];
  return d;
}

describe("searchAll", () => {
  it("returns pages as a launcher on an empty query", () => {
    const results = searchAll(data(), "");
    expect(results.length).toBeGreaterThan(5);
    expect(results.every((r) => r.kind === "page")).toBe(true);
  });

  it("finds topics by title across roadmaps", () => {
    const results = searchAll(data(), "async");
    expect(results.some((r) => r.kind === "topic" && /Async/i.test(r.title))).toBe(true);
  });

  it("finds notes by body content", () => {
    const results = searchAll(data(), "fiber");
    expect(results.some((r) => r.kind === "note" && r.title.includes("React"))).toBe(true);
  });

  it("ranks prefix matches above contained matches", () => {
    const d = data();
    d.notes.push(
      {
        id: "n2",
        title: "Async Deep Dive",
        body: "",
        tags: [],
        pinned: false,
        linkedTo: null,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "n3",
        title: "Basics of async",
        body: "",
        tags: [],
        pinned: false,
        linkedTo: null,
        createdAt: 1,
        updatedAt: 1,
      },
    );
    const results = searchAll(d, "async");
    const titles = results.map((r) => r.title);
    expect(titles.indexOf("Async Deep Dive")).toBeGreaterThanOrEqual(0);
    expect(titles.indexOf("Async Deep Dive")).toBeLessThan(titles.indexOf("Basics of async"));
  });

  it("finds projects and pages", () => {
    const results = searchAll(data(), "skillsync");
    const kinds = results.map((r) => r.kind);
    expect(kinds).toContain("project");
  });

  it("is case-insensitive and trims whitespace", () => {
    const results = searchAll(data(), "  REACT ");
    expect(results.length).toBeGreaterThan(0);
  });

  it("respects the result limit", () => {
    const results = searchAll(data(), "a", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });
});
