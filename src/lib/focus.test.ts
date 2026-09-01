import { describe, it, expect } from "vitest";
import {
  formatClock,
  formatMinutes,
  focusTotals,
  minutesByDay,
  focusStreak,
  focusXp,
} from "@/lib/focus";
import type { FocusSession } from "@/lib/schema";
import { todayISO, addDaysISO } from "@/lib/date";

const NOW = new Date(2026, 7, 30, 14, 0, 0); // Aug 30, 2026 (local)
const today = todayISO(NOW);

function session(
  minutes: number,
  mode: "focus" | "break" = "focus",
  startedAt = NOW.getTime(),
): FocusSession {
  return { id: `s-${Math.random()}`, startedAt, minutes, mode, task: "" };
}

describe("focus lib", () => {
  it("formats clocks", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(59)).toBe("00:59");
    expect(formatClock(600)).toBe("10:00");
    expect(formatClock(3670)).toBe("1:01:10");
  });

  it("formats minutes", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(95)).toBe("1h 35m");
  });

  it("aggregates today vs total", () => {
    const yesterday = new Date(NOW.getTime() - 86400000).getTime();
    const sessions = [session(25), session(50), session(10, "focus", yesterday)];
    const totals = focusTotals(sessions, NOW);
    expect(totals.todayMinutes).toBe(75);
    expect(totals.totalMinutes).toBe(85);
    expect(totals.sessionsToday).toBe(2);
    expect(totals.todayFocusSessions).toBe(2);
    expect(totals.totalSessions).toBe(3);
  });

  it("buckets minutes per day for charts", () => {
    const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).getTime();
    const buckets = minutesByDay(
      [session(25, "focus", daysAgo(2)), session(10, "focus", daysAgo(0))],
      4,
      NOW,
    );
    expect(buckets).toHaveLength(4);
    expect(buckets[0].date).toBe(addDaysISO(today, -3));
    expect(buckets[0].minutes).toBe(0);
    expect(buckets[1].minutes).toBe(25);
    expect(buckets[3].minutes).toBe(10);
  });

  it("computes the deep-work streak", () => {
    const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).getTime();
    const sessions = [
      session(25, "focus", daysAgo(0)),
      session(25, "focus", daysAgo(1)),
      session(25, "focus", daysAgo(2)),
      session(25, "focus", daysAgo(5)),
    ];
    expect(focusStreak(sessions, NOW)).toBe(3);
    expect(focusStreak([], NOW)).toBe(0);
  });

  it("caps and floors XP from focus sessions", () => {
    expect(focusXp(25)).toBe(25);
    expect(focusXp(90)).toBe(60);
    expect(focusXp(0)).toBe(1);
  });
});
