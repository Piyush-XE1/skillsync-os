import { describe, it, expect } from "vitest";
import type { AppData } from "./schema";
import { createInitialData } from "./seed";
import {
  effortByDay,
  focusDaily,
  codingWeekly,
  platformBreakdown,
  difficultyBreakdown,
  learningBreakdown,
  codingStreak,
} from "./trends";
import { todayISO, addDaysISO } from "./date";

function seed(overrides?: Partial<AppData>): AppData {
  const data = createInitialData();
  data.stats.joinedAt = 1_700_000_000_000;
  Object.assign(data, overrides);
  return data;
}

describe("trends", () => {
  it("effortByDay returns the requested number of days", () => {
    const data = seed();
    const series = effortByDay(data, 10);
    expect(series).toHaveLength(10);
  });

  it("effortByDay weights activity into the correct bucket", () => {
    const today = todayISO();
    const data = seed({
      habitLogs: [{ habitId: "h1", date: today }],
      planner: [
        {
          id: "p1",
          title: "x",
          date: today,
          done: true,
          doneAt: Date.now(),
          priority: "medium",
          time: "",
          createdAt: Date.now(),
        },
      ],
    });
    const series = effortByDay(data, 7);
    const todayPoint = series[series.length - 1];
    // habit(2) + planner done(2)
    expect(todayPoint.value).toBe(4);
  });

  it("focusDaily aligns focus sessions to their day", () => {
    const today = todayISO();
    const data = seed();
    data.focus.sessions.push({
      id: "s1",
      minutes: 25,
      mode: "focus",
      startedAt: Date.now(),
      task: "",
    });
    const series = focusDaily(data, 7);
    expect(series[series.length - 1].value).toBe(25);
  });

  it("codingWeekly aggregates into weekly buckets", () => {
    const data = seed();
    for (const d of [4, 3, 2]) {
      const iso = addDaysISO(todayISO(), -d);
      data.coding.problems.push({
        id: `c${Math.random()}`,
        title: "p",
        platform: "leetcode",
        difficulty: "easy",
        tags: [],
        url: "",
        solvedAt: new Date(`${iso}T00:00:00`).getTime(),
        notes: "",
        timeComplexity: "",
        spaceComplexity: "",
      });
    }
    const series = codingWeekly(data, 4);
    expect(series.length).toBe(4);
    expect(series.reduce((s, v) => s + v.value, 0)).toBe(3);
  });

  it("platform and difficulty breakdowns sum to totals", () => {
    const data = seed();
    data.coding.problems = [
      {
        id: "1",
        title: "a",
        platform: "leetcode",
        difficulty: "easy",
        tags: [],
        url: "",
        solvedAt: Date.now(),
        notes: "",
        timeComplexity: "",
        spaceComplexity: "",
      },
      {
        id: "2",
        title: "a",
        platform: "codeforces",
        difficulty: "medium",
        tags: [],
        url: "",
        solvedAt: Date.now(),
        notes: "",
        timeComplexity: "",
        spaceComplexity: "",
      },
      {
        id: "3",
        title: "a",
        platform: "leetcode",
        difficulty: "hard",
        tags: [],
        url: "",
        solvedAt: Date.now(),
        notes: "",
        timeComplexity: "",
        spaceComplexity: "",
      },
    ];
    const platform = platformBreakdown(data);
    expect(platform.reduce((s, v) => s + v.value, 0)).toBe(3);
    const difficulty = difficultyBreakdown(data);
    expect(difficulty.find((d) => d.label === "Easy")?.value).toBe(1);
    expect(difficulty.find((d) => d.label === "Medium")?.value).toBe(1);
    expect(difficulty.find((d) => d.label === "Hard")?.value).toBe(1);
  });

  it("learningBreakdown splits completed vs remaining", () => {
    const data = seed();
    const total = learningBreakdown(data).reduce((s, v) => s + v.value, 0);
    expect(total).toBeGreaterThan(0);
    expect(learningBreakdown(data)[0].label).toBe("Completed");
  });

  it("codingStreak computes solve streaks", () => {
    const data = seed();
    expect(codingStreak(data).current).toBe(0);
  });
});
