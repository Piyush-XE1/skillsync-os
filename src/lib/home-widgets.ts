/**
 * Home screen widgets — the web half of the native Android widget system.
 *
 * The native side (see `android/app/src/main/java/com/skillsync/os/WidgetRender.java`)
 * cannot read localStorage: widgets must draw while the app is closed. So the app
 * pushes a small, plain-JSON snapshot of the data those three widgets need, and
 * the native providers render from it.
 *
 * Everything here is pure — the snapshot shape, the catalogue the in-app
 * gallery lists, and the planner that turns a habit tap back into a store
 * operation. `use-home-widgets.ts` wires it to the store.
 *
 * The snapshot is deliberately *narrow*: a launcher widget is a cache of the
 * workspace, never a second source of truth and never a dumping ground for
 * every module.
 */

import { todaySummary } from "@/lib/today";
import { habitStreak } from "@/lib/habit-streaks";
import { todayISO } from "@/lib/date";
import type { AppData } from "@/lib/schema";

export type HomeWidgetType = "sticky_note" | "expense_logger" | "habit_check";

export type HomeWidgetDefinition = {
  type: HomeWidgetType;
  title: string;
  /** One line shown under the title in the gallery. */
  description: string;
  /** Default launcher footprint: columns × rows, not an image ratio. */
  size: string;
  /** What the widget can do without opening the app. */
  interaction: string;
};

/** Kept in sync with `WidgetSpecs.ALL` on the native side. */
export const HOME_WIDGETS: HomeWidgetDefinition[] = [
  {
    type: "sticky_note",
    title: "Sticky note",
    description: "A quiet paper note on your launcher. Tap it to write, edit or replace the text.",
    size: "5 × 2",
    interaction: "Tap the note to edit it in place",
  },
  {
    type: "expense_logger",
    title: "Expense logger",
    description: "One tap opens the complete expense entry form with every field.",
    size: "1 × 1",
    interaction: "Opens Add Expense",
  },
  {
    type: "habit_check",
    title: "Habit checkmarks",
    description: "Today's habits as completion blocks. Tap one to check or uncheck it.",
    size: "2 × 2",
    interaction: "Checks habits in place, both ways",
  },
];

export const HOME_WIDGET_TYPES: HomeWidgetType[] = HOME_WIDGETS.map((widget) => widget.type);

export function homeWidgetDefinition(type: string): HomeWidgetDefinition | undefined {
  return HOME_WIDGETS.find((widget) => widget.type === type);
}

/* ------------------------------- snapshot ------------------------------- */

export type WidgetHabitRow = {
  id: string;
  title: string;
  streak: number;
  done: boolean;
};

export type WidgetSnapshot = {
  /** ISO date the "today" numbers belong to — the widget flags stale snapshots. */
  dayKey: string;
  today: {
    habitsDone: number;
    habitsTotal: number;
    habitPct: number;
  };
  habits: WidgetHabitRow[];
};

/** Widgets are glanceable, not exhaustive — cap the habit list. */
export const WIDGET_LIST_LIMIT = 12;

const doneOn = (logs: Array<{ habitId: string; date: string }>, habitId: string, day: string) =>
  logs.some((log) => log.habitId === habitId && log.date === day);

/** One source of truth: `buildWidgetSnapshot` reads the same habit store as the app. */
export function buildWidgetSnapshot(data: AppData, now: Date = new Date()): WidgetSnapshot {
  const day = todayISO(now);
  const summary = todaySummary(
    {
      habits: data.habits,
      habitLogs: data.habitLogs,
      goals: data.goals,
      planner: data.planner,
      coding: data.coding.problems,
      focusSessions: data.focus.sessions,
    },
    now,
  );
  const habits: WidgetHabitRow[] = data.habits.slice(0, WIDGET_LIST_LIMIT).map((habit) => ({
    id: habit.id,
    title: habit.title,
    streak: habitStreak(habit.id, data.habitLogs, day).current,
    done: doneOn(data.habitLogs, habit.id, day),
  }));

  return {
    dayKey: day,
    today: {
      habitsDone: summary.habitsDone,
      habitsTotal: summary.habitsTotal,
      habitPct: summary.habitPct,
    },
    habits,
  };
}

/* ---------------------------- inline actions ---------------------------- */

/**
 * A tap made on the habit widget while the app was closed. The native side
 * applies it optimistically to its cache and queues it; these are replayed
 * against the store on the next resume, so the widget and the app converge.
 */
export type HomeWidgetAction = {
  type: "habit";
  id: string;
  date?: string;
  done: boolean;
};

export type HomeWidgetOperation = {
  kind: "setHabit";
  id: string;
  date: string;
  done: boolean;
};

type PlannerState = {
  /** Habits that still exist — a queued tap for a deleted habit is dropped. */
  habits: Array<{ id: string }>;
  habitLogs: Array<{ habitId: string; date: string }>;
};

/**
 * Replays queued habit taps into idempotent store operations. Two taps on the
 * same row net out correctly (check in → uncheck), and a tap the store already
 * reflects is dropped. Unknown ids and malformed payloads are ignored.
 */
export function planWidgetActions(
  state: PlannerState,
  actions: HomeWidgetAction[],
  today: string = todayISO(),
): HomeWidgetOperation[] {
  const logs = state.habitLogs.map((log) => ({ habitId: log.habitId, date: log.date }));
  const knownHabits = new Set(state.habits.map((habit) => habit.id));
  const operations: HomeWidgetOperation[] = [];

  for (const action of actions) {
    if (!action || action.type !== "habit" || typeof action.id !== "string" || !action.id) {
      continue;
    }
    if (!knownHabits.has(action.id)) continue;
    const date = typeof action.date === "string" && action.date ? action.date : today;
    const index = logs.findIndex((log) => log.habitId === action.id && log.date === date);
    const current = index >= 0;
    if (current === action.done) continue;
    if (action.done) logs.push({ habitId: action.id, date });
    else logs.splice(index, 1);
    operations.push({ kind: "setHabit", id: action.id, date, done: action.done });
  }

  return operations;
}

/** Defensive parse of whatever the native queue returned. */
export function parseWidgetActions(payload: unknown): HomeWidgetAction[] {
  if (!Array.isArray(payload)) return [];
  const actions: HomeWidgetAction[] = [];
  for (const raw of payload) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    if (entry.type !== "habit") continue;
    const id = typeof entry.id === "string" ? entry.id : "";
    if (!id) continue;
    actions.push({
      type: "habit",
      id,
      done: entry.done === true,
      date: typeof entry.date === "string" ? entry.date : undefined,
    });
  }
  return actions;
}
