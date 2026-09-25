/**
 * Today at a glance — the arithmetic behind the dashboard hero.
 *
 * Pure functions, no React and no clock of their own (`now` is injected), so
 * every number the hero shows is unit-tested. The hero is the first thing the
 * app reveals after the brand opening, so it must never guess: it reads the
 * same store the rest of the app reads and reduces it to a handful of signals.
 */

import { dateISO, todayISO } from "./date";
import { habitStreak } from "./habit-streaks";
import type { CodingProblem, FocusSession, Goal, Habit, PlannerTask } from "./schema";

export type TodayInput = {
  habits: Habit[];
  habitLogs: Array<{ habitId: string; date: string }>;
  goals: Goal[];
  planner: PlannerTask[];
  coding: CodingProblem[];
  focusSessions: FocusSession[];
};

export type TodaySummary = {
  /** Habits checked off today / habits that exist. */
  habitsDone: number;
  habitsTotal: number;
  /** 0..100 — today's habit completion, the hero ring. */
  habitPct: number;

  /** Focus minutes planned for sessions started today. */
  focusMinutes: number;
  focusGoalMinutes: number;
  focusPct: number;

  /** Problems solved today, plus the trailing-7-day count. */
  solvesToday: number;
  solvesWeek: number;

  /** Aims pinned by the user. */
  aims: number;

  /** Planner tasks dated today. */
  tasksToday: number;
  tasksDoneToday: number;

  /** Longest currently-alive per-habit streak — a consistency signal. */
  bestStreak: number;
  /** How many habits were checked at least once in the last 7 days. */
  habitsActiveThisWeek: number;

  /** 1 (Monday) … 7 (Sunday) — how far through the week we are. */
  dayOfWeek: number;
  /** 0..100 — fraction of the week elapsed, for the week rail. */
  weekPct: number;
};

/** Minutes of deep work a day is "on track" for — matches the Focus module. */
export const DAILY_FOCUS_GOAL_MINUTES = 100;

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function sameDay(epochMs: number, iso: string): boolean {
  return dateISO(new Date(epochMs)) === iso;
}

/** ISO dates for the trailing `days` window, oldest → today. */
export function trailingDates(now: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(dateISO(d));
  }
  return out;
}

export function todaySummary(input: TodayInput, now: Date = new Date()): TodaySummary {
  const today = todayISO(now);
  const week = trailingDates(now, 7);

  const doneToday = new Set(
    input.habitLogs.filter((log) => log.date === today).map((log) => log.habitId),
  );
  const habitsDone = input.habits.filter((h) => doneToday.has(h.id)).length;
  const habitsTotal = input.habits.length;

  const focusMinutes = input.focusSessions
    .filter((s) => sameDay(s.startedAt, today))
    .reduce((sum, s) => sum + s.minutes, 0);

  const solvesToday = input.coding.filter((p) => sameDay(p.solvedAt, today)).length;
  const solvesWeek = input.coding.filter((p) =>
    week.includes(dateISO(new Date(p.solvedAt))),
  ).length;

  const tasksToday = input.planner.filter((t) => t.date === today);
  const tasksDoneToday = tasksToday.filter((t) => t.done).length;

  const bestStreak = input.habits.reduce((best, habit) => {
    const { current } = habitStreak(habit.id, input.habitLogs);
    return Math.max(best, current);
  }, 0);

  const habitsActiveThisWeek = input.habits.filter((habit) =>
    input.habitLogs.some((log) => log.habitId === habit.id && week.includes(log.date)),
  ).length;

  const dayOfWeek = ((now.getDay() + 6) % 7) + 1;

  return {
    habitsDone,
    habitsTotal,
    habitPct: habitsTotal === 0 ? 0 : clampPct((habitsDone / habitsTotal) * 100),

    focusMinutes,
    focusGoalMinutes: DAILY_FOCUS_GOAL_MINUTES,
    focusPct: clampPct((focusMinutes / DAILY_FOCUS_GOAL_MINUTES) * 100),

    solvesToday,
    solvesWeek,

    aims: input.goals.length,

    tasksToday: tasksToday.length,
    tasksDoneToday,

    bestStreak,
    habitsActiveThisWeek,

    dayOfWeek,
    weekPct: clampPct((dayOfWeek / 7) * 100),
  };
}

export type ActivityDay = {
  date: string;
  /** Short weekday label (Mon, Tue…). */
  label: string;
  habitsDone: number;
  habitPct: number;
  focusMinutes: number;
  solves: number;
  /** 0..100 composite used for the bar height. */
  intensity: number;
};

/**
 * Trailing activity strip: habits, focus and solves per day, normalised into a
 * single intensity the hero renders as a mini bar chart.
 */
export function activityStrip(input: TodayInput, now: Date = new Date(), days = 7): ActivityDay[] {
  const dates = trailingDates(now, days);
  const maxFocus = Math.max(
    1,
    ...dates.map((date) =>
      input.focusSessions
        .filter((s) => sameDay(s.startedAt, date))
        .reduce((sum, s) => sum + s.minutes, 0),
    ),
  );

  return dates.map((date) => {
    const done = new Set(
      input.habitLogs.filter((log) => log.date === date).map((log) => log.habitId),
    );
    const habitsDone = input.habits.filter((h) => done.has(h.id)).length;
    const habitPct = input.habits.length === 0 ? 0 : (habitsDone / input.habits.length) * 100;
    const focusMinutes = input.focusSessions
      .filter((s) => sameDay(s.startedAt, date))
      .reduce((sum, s) => sum + s.minutes, 0);
    const solves = input.coding.filter((p) => sameDay(p.solvedAt, date)).length;
    const focusShare = (focusMinutes / maxFocus) * 100;
    const intensity = clampPct(
      habitPct * 0.5 + focusShare * 0.4 + Math.min(100, solves * 25) * 0.1,
    );
    const [y, m, d] = date.split("-").map(Number);
    return {
      date,
      label: new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" }),
      habitsDone,
      habitPct: clampPct(habitPct),
      focusMinutes,
      solves,
      intensity,
    };
  });
}
