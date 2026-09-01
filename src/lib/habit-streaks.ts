import { todayISO, addDaysISO } from "./date";

export type HabitLogLike = { habitId: string; date: string };

export type HabitStreakResult = {
  /** Consecutive days ending today (or yesterday if today is not logged yet). */
  current: number;
  /** Longest consecutive run across the entire log history. */
  best: number;
};

/**
 * Computes a single habit's current and best streak from its check-in logs.
 *
 * The current streak is forgiving: a habit logged yesterday still counts as
 * "alive" today, because the user still has time to check in.
 */
export function habitStreak(habitId: string, logs: HabitLogLike[]): HabitStreakResult {
  const dates = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date));
  if (dates.size === 0) return { current: 0, best: 0 };

  // Best: scan sorted dates for the longest consecutive run.
  const sorted = [...dates].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = addDaysISO(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > best) best = run;
  }

  // Current: walk backwards from today; if today is missing, start from
  // yesterday so an "almost checked-in today" habit keeps its streak visible.
  let current = 0;
  let cursor = todayISO();
  if (!dates.has(cursor)) cursor = addDaysISO(cursor, -1);
  while (dates.has(cursor)) {
    current++;
    cursor = addDaysISO(cursor, -1);
  }

  return { current, best: Math.max(best, current) };
}

/** True when a habit is "alive" — checked in today or yesterday. */
export function habitAlive(habitId: string, logs: HabitLogLike[]): boolean {
  const today = todayISO();
  const yesterday = addDaysISO(today, -1);
  return logs.some((l) => l.habitId === habitId && (l.date === today || l.date === yesterday));
}

/** Aggregate streak data across every habit, for dashboards and summaries. */
export function allHabitStreaks(habitIds: string[], logs: HabitLogLike[]) {
  const perHabit = habitIds.map((id) => habitStreak(id, logs));
  const alive = perHabit.filter((s) => s.current > 0).length;
  const best = perHabit.reduce((m, s) => Math.max(m, s.best), 0);
  return { perHabit, alive, best };
}
