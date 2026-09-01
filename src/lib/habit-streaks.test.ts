import { describe, it, expect } from "vitest";
import { habitStreak, habitAlive, allHabitStreaks } from "@/lib/habit-streaks";
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
