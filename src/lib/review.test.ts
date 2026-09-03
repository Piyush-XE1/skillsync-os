import { describe, it, expect } from "vitest";
import type { AppData } from "./schema";
import { createInitialData } from "./seed";
import { composeReview, dailyCounts, lifetimeTopics } from "./review";
import { todayISO, addDaysISO } from "./date";

function seed(overrides?: Partial<AppData>): AppData {
  const data = createInitialData();
  data.stats.joinedAt = 1_700_000_000_000;
  Object.assign(data, overrides);
  return data;
}

const NOW = new Date(2026, 8, 3); // 2026-09-03 (local)

describe("review", () => {
  it("returns 7 days for an empty workspace with zero score and Warming up", () => {
    const r = composeReview(seed(), NOW);
    expect(r.dayCount).toBe(7);
    expect(r.days).toHaveLength(7);
    expect(r.score).toBe(0);
    expect(r.bestDay).toBeNull();
    expect(r.grade).toBe("Warming up");
    expect(r.days[0].date).toBe(addDaysISO(todayISO(NOW), -6));
    expect(r.days[6].date).toBe(todayISO(NOW));
  });

  it("scores activity into the right day and weights it", () => {
    const today = todayISO(NOW);
    const data = seed({
      habitLogs: [{ habitId: "h1", date: today }],
      planner: [
        {
          id: "p1",
          title: "x",
          date: today,
          done: true,
          doneAt: NOW.getTime(),
          priority: "medium",
          time: "",
          createdAt: NOW.getTime(),
        },
      ],
    });
    const r = composeReview(data, NOW);
    // habit(2) + task done(2) = 4 score today
    expect(r.days[6].score).toBe(4);
    // best day is today
    expect(r.bestDay?.date).toBe(today);
  });

  it("counts a solved problem into the week and delta", () => {
    const end = todayISO(NOW);
    const today = end;
    const data = seed();
    data.coding.problems.push({
      id: "c1",
      title: "Two Sum",
      platform: "leetcode",
      difficulty: "easy",
      tags: [],
      url: "",
      solvedAt: new Date(`${today}T00:00:00`).getTime(),
      notes: "",
      timeComplexity: "",
      spaceComplexity: "",
    });
    const r = composeReview(data, NOW);
    const solves = r.metrics.find((m) => m.key === "solves");
    expect(solves?.value).toBe(1);
    // this week vs last week delta = 1
    expect(solves?.delta).toBe(1);
  });

  it("generates a headline and highlights for a productive week", () => {
    const end = todayISO(NOW);
    const data = seed();
    for (let i = 0; i < 4; i++) {
      data.focus.sessions.push({
        id: `f${i}`,
        minutes: 25,
        mode: "focus",
        startedAt: new Date(`${end}T00:00:00`).getTime() - i * 86_400_000,
        task: "",
      });
    }
    data.habitLogs = [
      { habitId: "h1", date: addDaysISO(end, -1) },
      { habitId: "h1", date: end },
    ];
    const r = composeReview(data, NOW);
    expect(r.metrics.find((m) => m.key === "focus")?.value).toBe(100);
    expect(r.metrics.find((m) => m.key === "habits")?.value).toBe(2);
    expect(r.highlights.length).toBeGreaterThan(0);
    expect(r.headline.length).toBeGreaterThan(0);
    expect(r.score).toBeGreaterThan(0);
  });

  it("suggests nudges when the week is quiet", () => {
    const r = composeReview(seed(), NOW);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it("lifetimeTopics counts fully-completed topics", () => {
    const data = seed();
    // Mark one seeded topic complete (no checklist/subtopics → leaf done = 1).
    const r = data.roadmaps[0];
    r.phases[0].topics[0].done = true;
    expect(lifetimeTopics(data)).toBeGreaterThan(0);
  });

  it("handles date boundaries (activity outside the window is excluded)", () => {
    const old = addDaysISO(todayISO(NOW), -10);
    const data = seed();
    data.coding.problems.push({
      id: "c2",
      title: "Old",
      platform: "gfg",
      difficulty: "medium",
      tags: [],
      url: "",
      solvedAt: new Date(`${old}T00:00:00`).getTime(),
      notes: "",
      timeComplexity: "",
      spaceComplexity: "",
    });
    const r = composeReview(data, NOW);
    expect(r.metrics.find((m) => m.key === "solves")?.value).toBe(0);
  });
});
