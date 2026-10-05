import { describe, it, expect } from "vitest";
import {
  allHabitStreaks,
  canUseEmergencyFreeze,
  emergencyFreezeCandidate,
  firstRecoveryHabit,
  habitAlive,
  habitStreak,
} from "@/lib/habit-streaks";
import { todayISO, addDaysISO } from "@/lib/date";

const today = todayISO();
const daysAgo = (n: number) => addDaysISO(today, -n);

function logs(habitId: string, dates: string[]) {
  return dates.map((date) => ({ habitId, date }));
}

describe("habitStreak", () => {
  it("returns zeroes when the habit has no logs", () => {
    expect(habitStreak("h1", [])).toEqual({ current: 0, best: 0 });
  });

  it("counts the current streak ending today", () => {
    const l = logs("h1", [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(5)]);
    expect(habitStreak("h1", l)).toEqual({ current: 3, best: 3 });
  });

  it("keeps the streak alive when today is missing but yesterday is logged", () => {
    const l = logs("h1", [daysAgo(1), daysAgo(2), daysAgo(3)]);
    expect(habitStreak("h1", l)).toEqual({ current: 3, best: 3 });
  });

  it("reports best streak separately from the current one", () => {
    const l = logs("h1", [
      daysAgo(0),
      daysAgo(1),
      daysAgo(6),
      daysAgo(7),
      daysAgo(8),
      daysAgo(9),
      daysAgo(20),
      daysAgo(21),
      daysAgo(22),
    ]);
    const r = habitStreak("h1", l);
    expect(r.current).toBe(2);
    expect(r.best).toBe(4);
  });

  it("ignores other habits' logs", () => {
    const l = [...logs("h1", [daysAgo(0), daysAgo(1)]), ...logs("h2", [daysAgo(0)])];
    expect(habitStreak("h1", l).current).toBe(2);
    expect(habitStreak("h2", l).current).toBe(1);
  });

  it("uses the injected ISO day instead of the system clock", () => {
    const l = logs("h1", ["2025-03-09", "2025-03-10"]);
    expect(habitStreak("h1", l, "2025-03-11")).toEqual({ current: 2, best: 2 });
    expect(habitAlive("h1", l, "2025-03-11")).toBe(true);
    expect(habitStreak("h1", l, "2025-03-20").current).toBe(0);
  });
});

describe("habit recovery and emergency freeze", () => {
  const habits = [{ id: "h1", title: "Walk", startDate: "2025-01-01" }];

  it("prompts a gentle restart after two missed full days, but not for a new habit", () => {
    const history = logs("h1", ["2025-03-08"]);
    expect(firstRecoveryHabit(habits, history, "2025-03-11")?.id).toBe("h1");
    expect(
      firstRecoveryHabit([{ id: "new", title: "New", startDate: "2025-03-10" }], [], "2025-03-11"),
    ).toBeNull();
    expect(firstRecoveryHabit(habits, logs("h1", ["2025-03-10"]), "2025-03-11")).toBeNull();
  });

  it("offers a freeze only when it bridges one missed day, then cools down for 14 days", () => {
    const history = logs("h1", ["2025-03-09"]);
    expect(emergencyFreezeCandidate(habits, history, "2025-03-11")).toEqual({
      habitId: "h1",
      habitTitle: "Walk",
      date: "2025-03-10",
    });
    expect(emergencyFreezeCandidate(habits, logs("h1", ["2025-03-08"]), "2025-03-11")).toBeNull();

    const used = [
      { habitId: "h1", date: "2025-03-09", kind: "freeze" as const, freezeUsedAt: "2025-03-01" },
    ];
    expect(canUseEmergencyFreeze(used, "2025-03-14")).toBe(false);
    expect(canUseEmergencyFreeze(used, "2025-03-15")).toBe(true);
    expect(emergencyFreezeCandidate(habits, used, "2025-03-14")).toBeNull();
  });

  it("counts a freeze toward streak continuity without treating it as a check-in kind", () => {
    const protectedLogs = [
      { habitId: "h1", date: "2025-03-08" },
      { habitId: "h1", date: "2025-03-09", kind: "freeze" as const, freezeUsedAt: "2025-03-10" },
      { habitId: "h1", date: "2025-03-10" },
    ];
    expect(habitStreak("h1", protectedLogs, "2025-03-10")).toEqual({ current: 3, best: 3 });
  });
});

describe("habitAlive", () => {
  it("is true when checked today or yesterday", () => {
    expect(habitAlive("h1", logs("h1", [daysAgo(1)]))).toBe(true);
    expect(habitAlive("h1", logs("h1", [daysAgo(2)]))).toBe(false);
    expect(habitAlive("h1", [])).toBe(false);
  });
});

describe("allHabitStreaks", () => {
  it("aggregates best streaks across habits", () => {
    const l = [
      ...logs("h1", [daysAgo(0), daysAgo(1)]),
      ...logs("h2", [daysAgo(5), daysAgo(6), daysAgo(7), daysAgo(8)]),
    ];
    const result = allHabitStreaks(["h1", "h2"], l);
    expect(result.alive).toBe(1);
    expect(result.best).toBe(4);
  });
});
