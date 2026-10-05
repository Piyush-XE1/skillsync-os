import { addDaysISO, dateISO, todayISO } from "./date";

export type HabitLogLike = {
  habitId: string;
  date: string;
  kind?: "check-in" | "freeze";
  freezeUsedAt?: string;
};

export type HabitStreakResult = {
  /** Consecutive days ending today (or yesterday if today is not logged yet). */
  current: number;
  /** Longest consecutive run across the entire log history. */
  best: number;
};

export type HabitRecoveryLike = {
  id: string;
  title: string;
  startDate?: string | null;
  createdAt?: number;
};

export type EmergencyFreezeCandidate = {
  habitId: string;
  habitTitle: string;
  date: string;
};

export const EMERGENCY_FREEZE_COOLDOWN_DAYS = 14;

/**
 * Computes a single habit's current and best streak from its check-in logs.
 *
 * The current streak is forgiving: a habit logged yesterday still counts as
 * "alive" today, because the user still has time to check in. Freeze records
 * count for continuity but are kept distinguishable from actual check-ins.
 */
export function habitStreak(
  habitId: string,
  logs: HabitLogLike[],
  now: string = todayISO(),
): HabitStreakResult {
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

  // Current: walk backwards from the injected day; if it is missing, start
  // from yesterday so an "almost checked-in today" habit keeps its streak.
  let current = 0;
  let cursor = now;
  if (!dates.has(cursor)) cursor = addDaysISO(cursor, -1);
  while (dates.has(cursor)) {
    current++;
    cursor = addDaysISO(cursor, -1);
  }

  return { current, best: Math.max(best, current) };
}

/** True when a habit is "alive" — checked in today or yesterday. */
export function habitAlive(
  habitId: string,
  logs: HabitLogLike[],
  now: string = todayISO(),
): boolean {
  const yesterday = addDaysISO(now, -1);
  return logs.some((l) => l.habitId === habitId && (l.date === now || l.date === yesterday));
}

/** Aggregate streak data across every habit, for dashboards and summaries. */
export function allHabitStreaks(
  habitIds: string[],
  logs: HabitLogLike[],
  now: string = todayISO(),
) {
  const perHabit = habitIds.map((id) => habitStreak(id, logs, now));
  const alive = perHabit.filter((s) => s.current > 0).length;
  const best = perHabit.reduce((m, s) => Math.max(m, s.best), 0);
  return { perHabit, alive, best };
}

/** True when a habit was active but missed the two full days before `now`. */
export function needsMicroStepRecovery(
  habit: HabitRecoveryLike,
  logs: HabitLogLike[],
  now: string = todayISO(),
): boolean {
  const missedDays = [addDaysISO(now, -1), addDaysISO(now, -2)];
  if (logs.some((log) => log.habitId === habit.id && missedDays.includes(log.date))) return false;

  const startDate =
    habit.startDate || (habit.createdAt ? dateISO(new Date(habit.createdAt)) : null);
  // A brand-new habit has not yet had two full opportunities to be checked in.
  if (startDate && startDate > missedDays[1]) return false;
  // Recovery means returning to something the user has already practiced.
  return logs.some((log) => log.habitId === habit.id && log.date < missedDays[1]);
}

/** First habit that merits a gentle, no-judgement restart prompt. */
export function firstRecoveryHabit<T extends HabitRecoveryLike>(
  habits: T[],
  logs: HabitLogLike[],
  now: string = todayISO(),
): T | null {
  return habits.find((habit) => needsMicroStepRecovery(habit, logs, now)) ?? null;
}

/** Next local calendar day on which another emergency freeze may be used. */
export function nextEmergencyFreezeDate(logs: HabitLogLike[]): string | null {
  const lastUse = logs
    .filter((log) => log.kind === "freeze")
    .map((log) => log.freezeUsedAt ?? log.date)
    .sort()
    .at(-1);
  return lastUse ? addDaysISO(lastUse, EMERGENCY_FREEZE_COOLDOWN_DAYS) : null;
}

/** An emergency freeze is available once per rolling 14 local calendar days. */
export function canUseEmergencyFreeze(logs: HabitLogLike[], now: string = todayISO()): boolean {
  const availableOn = nextEmergencyFreezeDate(logs);
  return availableOn === null || availableOn <= now;
}

/**
 * Find a single missed-yesterday day that can be bridged to the previous
 * check-in. Freezing a day farther back cannot repair a streak across multiple
 * missed days, so the emergency token is reserved for a useful recovery.
 */
export function emergencyFreezeCandidate<T extends HabitRecoveryLike>(
  habits: T[],
  logs: HabitLogLike[],
  now: string = todayISO(),
): EmergencyFreezeCandidate | null {
  if (!canUseEmergencyFreeze(logs, now)) return null;
  const missedDate = addDaysISO(now, -1);
  const priorDate = addDaysISO(missedDate, -1);
  const habit = habits.find((candidate) => {
    const started =
      candidate.startDate || (candidate.createdAt ? dateISO(new Date(candidate.createdAt)) : null);
    const wasActive = started === null || started <= priorDate;
    const missed = !logs.some((log) => log.habitId === candidate.id && log.date === missedDate);
    const priorCheckIn = logs.some((log) => log.habitId === candidate.id && log.date === priorDate);
    return wasActive && missed && priorCheckIn;
  });
  return habit ? { habitId: habit.id, habitTitle: habit.title, date: missedDate } : null;
}
