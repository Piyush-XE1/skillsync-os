import { describe, it, expect } from "vitest";
import { codingStats, solveStreak, problemsByDay, solvedOn } from "./coding";
import { todayISO, addDaysISO, fromISO } from "./date";
import type { CodingProblem } from "./schema";

function problem(
  overrides: Partial<CodingProblem> & { title?: string; solvedAt: number },
): CodingProblem {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    title: overrides.title ?? "Problem",
    platform: overrides.platform ?? "leetcode",
    difficulty: overrides.difficulty ?? "easy",
    tags: overrides.tags ?? [],
    url: "",
    solvedAt: overrides.solvedAt,
    notes: "",
    timeComplexity: "",
    spaceComplexity: "",
  };
}

function ts(daysAgo: number): number {
  return fromISO(addDaysISO(todayISO(), -daysAgo)).getTime();
}

describe("solveStreak", () => {
  it("returns 0 for no problems", () => {
    expect(solveStreak([])).toEqual({ current: 0, best: 0 });
  });

  it("counts a consecutive-day streak including today", () => {
    const problems = [
      problem({ solvedAt: ts(0) }),
      problem({ solvedAt: ts(1) }),
      problem({ solvedAt: ts(2) }),
    ];
    expect(solveStreak(problems)).toEqual({ current: 3, best: 3 });
  });

  it("keeps a streak alive when nothing was solved today but yesterday was", () => {
    const problems = [problem({ solvedAt: ts(1) }), problem({ solvedAt: ts(2) })];
    // Yesterday + the day before → streak of 2, still current (not broken yet).
    expect(solveStreak(problems).current).toBe(2);
  });

  it("computes the best streak across gaps", () => {
    const problems = [
      problem({ solvedAt: ts(0) }),
      problem({ solvedAt: ts(1) }),
      problem({ solvedAt: ts(2) }),
      problem({ solvedAt: ts(5) }),
      problem({ solvedAt: ts(6) }),
    ];
    expect(solveStreak(problems).best).toBe(3);
  });
});

describe("codingStats", () => {
  it("aggregates total, byDifficulty and byPlatform", () => {
    const problems = [
      problem({ difficulty: "easy", platform: "leetcode", solvedAt: ts(0) }),
      problem({ difficulty: "medium", platform: "codeforces", solvedAt: ts(1) }),
      problem({ difficulty: "hard", platform: "leetcode", solvedAt: ts(2) }),
      problem({ difficulty: "easy", platform: "gfg", solvedAt: ts(3), tags: ["Array", "Array"] }),
    ];
    const stats = codingStats(problems);
    expect(stats.total).toBe(4);
    expect(stats.byDifficulty).toEqual({ easy: 2, medium: 1, hard: 1 });
    expect(stats.byPlatform).toEqual({
      leetcode: 2,
      codeforces: 1,
      codechef: 0,
      gfg: 1,
      hackerrank: 0,
      other: 0,
    });
    expect(stats.tags.find((t) => t.tag === "Array")).toEqual({ tag: "Array", count: 2 });
  });

  it("computes today / this week / this month buckets", () => {
    const problems = [
      problem({ solvedAt: ts(0) }),
      problem({ solvedAt: ts(0) }),
      problem({ solvedAt: ts(3) }),
      problem({ solvedAt: ts(10) }),
      problem({ solvedAt: ts(40) }),
    ];
    const stats = codingStats(problems);
    expect(stats.today).toBe(2);
    expect(stats.thisWeek).toBe(3); // today + 3 days ago
    expect(stats.thisMonth).toBe(4); // within last 30 days
  });
});

describe("problemsByDay / solvedOn", () => {
  it("maps solves onto calendar days", () => {
    const problems = [problem({ solvedAt: ts(0) })];
    expect(solvedOn(problems)).toBe(1);
    expect(solvedOn(problems, addDaysISO(todayISO(), -1))).toBe(0);
  });

  it("returns a fixed-length daily series ending today", () => {
    const series = problemsByDay(problemsFor(2), 30);
    expect(series).toHaveLength(30);
    expect(series[series.length - 1].date).toBe(todayISO());
    const total = series.reduce((sum, d) => sum + d.count, 0);
    expect(total).toBe(2);
  });
});

function problemsFor(count: number): CodingProblem[] {
  return Array.from({ length: count }).map((_, i) => problem({ solvedAt: ts(i) }));
}
