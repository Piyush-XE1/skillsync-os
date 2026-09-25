import { describe, expect, it } from "vitest";
import { activityStrip, DAILY_FOCUS_GOAL_MINUTES, todaySummary } from "./today";
import type { CodingProblem, FocusSession, Goal, Habit, PlannerTask } from "./schema";

const NOW = new Date(2026, 8, 25, 15, 30); // Fri 25 Sep 2026, 15:30 local
const TODAY = "2026-09-25";

const habit = (id: string, title = id): Habit => ({
  id,
  title,
  emoji: "🔥",
  createdAt: 0,
  startDate: null,
});

const log = (habitId: string, date: string) => ({ habitId, date });

const goal = (id: string): Goal => ({
  id,
  title: id,
  emoji: "🎯",
  note: "",
  createdAt: 0,
});

const task = (id: string, date: string, done = false): PlannerTask => ({
  id,
  title: id,
  date,
  time: "",
  done,
  priority: "medium",
  doneAt: done ? NOW.getTime() : null,
  createdAt: 0,
});

const solve = (id: string, at: Date): CodingProblem => ({
  id,
  title: id,
  platform: "leetcode",
  difficulty: "medium",
  tags: [],
  url: "",
  solvedAt: at.getTime(),
  notes: "",
  timeComplexity: "",
  spaceComplexity: "",
});

const session = (id: string, minutes: number, at: Date): FocusSession => ({
  id,
  startedAt: at.getTime(),
  minutes,
  mode: "focus",
  task: "",
});

const daysAgo = (n: number, hour = 10) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const base = {
  habits: [habit("gym"), habit("read"), habit("water")],
  habitLogs: [] as Array<{ habitId: string; date: string }>,
  goals: [goal("g1"), goal("g2")],
  planner: [] as PlannerTask[],
  coding: [] as CodingProblem[],
  focusSessions: [] as FocusSession[],
};

describe("todaySummary", () => {
  it("counts today's habits, focus and solves", () => {
    const summary = todaySummary(
      {
        ...base,
        habitLogs: [log("gym", TODAY), log("read", TODAY), log("gym", "2026-09-24")],
        focusSessions: [
          session("s1", 25, NOW),
          session("s2", 50, NOW),
          session("s3", 90, daysAgo(1)),
        ],
        coding: [solve("p1", NOW), solve("p2", daysAgo(3)), solve("p3", daysAgo(9))],
        planner: [task("t1", TODAY, true), task("t2", TODAY), task("t3", "2026-09-26")],
      },
      NOW,
    );

    expect(summary.habitsDone).toBe(2);
    expect(summary.habitsTotal).toBe(3);
    expect(summary.habitPct).toBe(67);
    expect(summary.focusMinutes).toBe(75);
    expect(summary.focusGoalMinutes).toBe(DAILY_FOCUS_GOAL_MINUTES);
    expect(summary.focusPct).toBe(75);
    expect(summary.solvesToday).toBe(1);
    expect(summary.solvesWeek).toBe(2);
    expect(summary.aims).toBe(2);
    expect(summary.tasksToday).toBe(2);
    expect(summary.tasksDoneToday).toBe(1);
  });

  it("never divides by zero on an empty workspace", () => {
    const summary = todaySummary({ ...base, habits: [] }, NOW);
    expect(summary.habitPct).toBe(0);
    expect(summary.habitsDone).toBe(0);
    expect(summary.bestStreak).toBe(0);
    expect(summary.habitsActiveThisWeek).toBe(0);
    expect(Number.isFinite(summary.focusPct)).toBe(true);
  });

  it("reports the longest currently-alive habit streak", () => {
    const logs = [
      ...["2026-09-25", "2026-09-24", "2026-09-23"].map((d) => log("gym", d)),
      ...["2026-09-25", "2026-09-24"].map((d) => log("read", d)),
    ];
    const summary = todaySummary({ ...base, habitLogs: logs }, NOW);
    expect(summary.bestStreak).toBe(3);
    expect(summary.habitsActiveThisWeek).toBe(2);
  });

  it("tracks how far through the week we are", () => {
    const summary = todaySummary(base, NOW);
    expect(summary.dayOfWeek).toBe(5); // Friday
    expect(summary.weekPct).toBe(71);
  });
});

describe("activityStrip", () => {
  it("returns one entry per trailing day, oldest first, ending today", () => {
    const strip = activityStrip(
      {
        ...base,
        habitLogs: [log("gym", TODAY), log("read", "2026-09-24"), log("gym", "2026-09-24")],
        focusSessions: [session("s1", 50, daysAgo(2))],
        coding: [solve("p1", daysAgo(1))],
      },
      NOW,
      7,
    );

    expect(strip).toHaveLength(7);
    expect(strip[6].date).toBe(TODAY);
    expect(strip[5].date).toBe("2026-09-24");
    expect(strip[6].habitsDone).toBe(1);
    expect(strip[5].habitPct).toBe(67);
    expect(strip[4].focusMinutes).toBe(50);
    expect(strip[5].solves).toBe(1);
    expect(strip[4].label.length).toBeGreaterThan(0);
  });

  it("keeps every intensity inside 0..100 even with no data", () => {
    for (const day of activityStrip(base, NOW, 7)) {
      expect(day.intensity).toBeGreaterThanOrEqual(0);
      expect(day.intensity).toBeLessThanOrEqual(100);
    }
  });
});
