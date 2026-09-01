import type { FocusSession } from "./schema";
import { todayISO, addDaysISO } from "./date";

/** Formats a countdown as "MM:SS" (or "H:MM:SS" beyond an hour). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

export type FocusTotals = {
  todayMinutes: number;
  totalMinutes: number;
  sessionsToday: number;
  totalSessions: number;
  todayFocusSessions: number;
};

/** Aggregates focus sessions into dashboard-friendly numbers. */
export function focusTotals(sessions: FocusSession[], now: Date = new Date()): FocusTotals {
  const today = todayISO(now);
  let todayMinutes = 0;
  let totalMinutes = 0;
  let sessionsToday = 0;
  let todayFocusSessions = 0;
  for (const s of sessions) {
    const day = todayISO(new Date(s.startedAt));
    totalMinutes += s.minutes;
    if (day === today) {
      todayMinutes += s.minutes;
      sessionsToday++;
      if (s.mode === "focus") todayFocusSessions++;
    }
  }
  return {
    todayMinutes,
    totalMinutes,
    sessionsToday,
    totalSessions: sessions.length,
    todayFocusSessions,
  };
}

/**
 * Minutes per day for the last `days` days (oldest → newest), aligned to ISO
 * dates so it plugs straight into bar charts and heatmaps.
 */
export function minutesByDay(
  sessions: FocusSession[],
  days: number,
  now: Date = new Date(),
): {
  date: string;
  minutes: number;
}[] {
  const today = todayISO(now);
  const buckets = new Map<string, number>();
  for (const s of sessions) {
    const day = todayISO(new Date(s.startedAt));
    buckets.set(day, (buckets.get(day) ?? 0) + s.minutes);
  }
  return Array.from({ length: days }).map((_, i) => {
    const date = addDaysISO(today, -(days - 1 - i));
    return { date, minutes: Math.round(buckets.get(date) ?? 0) };
  });
}

/**
 * Consecutive days (ending today or yesterday) with at least one focus
 * session — the "deep work streak".
 */
export function focusStreak(sessions: FocusSession[], now: Date = new Date()): number {
  const days = new Set(sessions.map((s) => todayISO(new Date(s.startedAt))));
  if (days.size === 0) return 0;
  let streak = 0;
  let cursor = todayISO(now);
  if (!days.has(cursor)) cursor = addDaysISO(cursor, -1);
  while (days.has(cursor)) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

/** XP earned for completing a focus session: 1 per minute, capped at 60. */
export function focusXp(minutes: number): number {
  return Math.min(60, Math.max(1, Math.round(minutes)));
}
