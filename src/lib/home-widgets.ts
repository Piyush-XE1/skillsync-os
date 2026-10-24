/**
 * Home screen widgets — the web half of the native Android widget system.
 *
 * The native side (see `android/app/src/main/java/com/skillsync/os/WidgetRender.java`)
 * cannot read localStorage: widgets must draw while the app is closed. So the app
 * pushes a compact, plain-JSON snapshot of the workspace after every meaningful
 * change, and the native providers render from that snapshot.
 *
 * Everything in this file is pure — the snapshot shape, the catalogue the in-app
 * gallery lists, the sparkline, and the planner that turns inline widget taps
 * back into store operations. `use-home-widgets.ts` wires it to the store.
 */

import { dailyQuote } from "@/lib/quotes";
import { activityStrip, todaySummary } from "@/lib/today";
import { habitStreak } from "@/lib/habit-streaks";
import { codingStats } from "@/lib/coding";
import { cumulativeGpa } from "@/lib/cgpa";
import { focusStreak, focusTotals } from "@/lib/focus";
import { todayISO } from "@/lib/date";
import type { AppData, FocusSettings, ModuleKey, PlannerTask } from "@/lib/schema";

export type HomeWidgetType =
  | "today"
  | "habits"
  | "focus"
  | "aims"
  | "planner"
  | "stats"
  | "quote"
  | "quick"
  | "overview";

export type HomeWidgetDefinition = {
  type: HomeWidgetType;
  title: string;
  /** One line shown under the title in the gallery. */
  description: string;
  /** Default footprint, e.g. "4 × 2". */
  size: string;
  /** What the widget can do without opening the app. */
  interaction: string;
  /** Module that must be enabled for the widget to have data, if any. */
  module?: ModuleKey;
};

/**
 * The gallery order — the flagship "overview" sits first, the smallest
 * shortcuts last. Kept in sync with `WidgetSpecs.ALL` on the native side.
 */
export const HOME_WIDGETS: HomeWidgetDefinition[] = [
  {
    type: "overview",
    title: "Overview",
    description: "Today, your habits and your tasks in one 4 × 4 panel.",
    size: "4 × 4",
    interaction: "Tap a habit or task to check it off",
  },
  {
    type: "today",
    title: "Today",
    description: "Habit completion, deep work, tasks and solves — plus a 7-day effort strip.",
    size: "4 × 2",
    interaction: "Each stat opens its module",
  },
  {
    type: "habits",
    title: "Habits",
    description: "Every habit with its live streak. Tap a row to check in for today.",
    size: "4 × 2",
    interaction: "Check in without opening the app",
    module: "habits",
  },
  {
    type: "focus",
    title: "Focus",
    description: "Deep-work minutes against your daily goal, your streak and quick starts.",
    size: "2 × 2",
    interaction: "15 / 25 / 50-minute starts open the timer",
    module: "focus",
  },
  {
    type: "planner",
    title: "Planner",
    description: "Today's plan with times and priorities. Tap a task to complete it.",
    size: "4 × 2",
    interaction: "Complete tasks in place",
    module: "planner",
  },
  {
    type: "aims",
    title: "Aims",
    description: "The goals you are working on, pinned where you cannot avoid them.",
    size: "4 × 2",
    interaction: "Opens Aims",
  },
  {
    type: "stats",
    title: "Stats",
    description: "Solves today and this week, best streak and CGPA.",
    size: "2 × 2",
    interaction: "Opens Analytics",
    module: "coding",
  },
  {
    type: "quote",
    title: "Daily quote",
    description: "One engineering or growth quote, renewed every day.",
    size: "4 × 2",
    interaction: "Opens Home",
  },
  {
    type: "quick",
    title: "Quick actions",
    description: "Six one-tap shortcuts: task, note, habit, focus, planner, analytics.",
    size: "4 × 1",
    interaction: "Jumps straight into the module",
  },
];

export const HOME_WIDGET_TYPES: HomeWidgetType[] = HOME_WIDGETS.map((w) => w.type);

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

export type WidgetTaskRow = {
  id: string;
  title: string;
  time: string;
  done: boolean;
  priority: string;
};

export type WidgetAimRow = {
  id: string;
  title: string;
  note: string;
};

export type WidgetSnapshot = {
  /** ISO date the "today" numbers belong to — the widgets flag stale snapshots. */
  dayKey: string;
  profile: { name: string };
  today: {
    habitsDone: number;
    habitsTotal: number;
    habitPct: number;
    focusMinutes: number;
    focusGoalMinutes: number;
    tasksToday: number;
    tasksDoneToday: number;
    solvesToday: number;
    solvesWeek: number;
    bestStreak: number;
    aims: number;
  };
  focus: {
    todayMinutes: number;
    goalMinutes: number;
    streak: number;
    todaySessions: number;
    defaultMinutes: number;
  };
  stats: {
    solvesToday: number;
    solvesWeek: number;
    solvesTotal: number;
    bestStreak: number;
    cgpa: string;
    focusTotalMinutes: number;
  };
  habits: WidgetHabitRow[];
  tasks: WidgetTaskRow[];
  aims: WidgetAimRow[];
  quote: { text: string; author: string };
  /** Seven block characters, oldest → today. */
  sparkline: string;
};

/** Widgets are glanceable, not exhaustive — cap every list. */
export const WIDGET_LIST_LIMIT = 8;

const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

/**
 * Seven values (0..100) as block characters. Pure and stable, so the same week
 * always renders the same strip — the widget never "flickers" between syncs.
 */
export function sparkline(values: number[]): string {
  return values
    .map((value) => {
      const clamped = Math.max(0, Math.min(100, value));
      const index =
        clamped === 0
          ? 0
          : Math.min(BLOCKS.length - 1, Math.round((clamped / 100) * (BLOCKS.length - 1)));
      return BLOCKS[index];
    })
    .join("");
}

const doneOn = (logs: Array<{ habitId: string; date: string }>, habitId: string, day: string) =>
  logs.some((log) => log.habitId === habitId && log.date === day);

const round = (value: number) => Math.round(value);

function taskSort(a: PlannerTask, b: PlannerTask): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const at = a.time || "99:99";
  const bt = b.time || "99:99";
  if (at !== bt) return at.localeCompare(bt);
  const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1);
}

function quoteFor(data: AppData, day: string): { text: string; author: string } {
  const custom = data.customQuotes;
  const selected = data.selectedCustomQuoteId
    ? custom.find((quote) => quote.id === data.selectedCustomQuoteId)
    : undefined;
  if (data.quoteFilterPreference === "custom") {
    const pick = selected ?? custom[0];
    if (pick) return { text: pick.quote, author: pick.author || "Me" };
  }
  const daily = dailyQuote(day);
  return { text: daily.text, author: daily.author };
}

/**
 * Builds the compact snapshot the Android widgets render from.
 *
 * `now` is injected so every number is deterministic in tests. The result is
 * plain JSON: numbers, strings and small arrays only.
 */
export function buildWidgetSnapshot(data: AppData, now: Date = new Date()): WidgetSnapshot {
  const day = todayISO(now);
  const settings: FocusSettings = data.focus.settings;

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

  const strip = activityStrip(
    {
      habits: data.habits,
      habitLogs: data.habitLogs,
      goals: data.goals,
      planner: data.planner,
      coding: data.coding.problems,
      focusSessions: data.focus.sessions,
    },
    now,
    7,
  );

  const coding = codingStats(data.coding.problems);
  const gpa = cumulativeGpa(data.cgpa.semesters);
  const focus = focusTotals(data.focus.sessions, now);

  const habits: WidgetHabitRow[] = data.habits.slice(0, WIDGET_LIST_LIMIT).map((habit) => ({
    id: habit.id,
    title: habit.title,
    streak: habitStreak(habit.id, data.habitLogs, day).current,
    done: doneOn(data.habitLogs, habit.id, day),
  }));

  const tasks: WidgetTaskRow[] = data.planner
    .filter((task) => task.date === day)
    .sort(taskSort)
    .slice(0, WIDGET_LIST_LIMIT)
    .map((task) => ({
      id: task.id,
      title: task.title,
      time: task.time,
      done: task.done,
      priority: task.priority,
    }));

  const aims: WidgetAimRow[] = data.goals.slice(0, WIDGET_LIST_LIMIT).map((goal) => ({
    id: goal.id,
    title: goal.title,
    note: goal.note,
  }));

  return {
    dayKey: day,
    profile: { name: data.profile.name },
    today: {
      habitsDone: summary.habitsDone,
      habitsTotal: summary.habitsTotal,
      habitPct: summary.habitPct,
      focusMinutes: summary.focusMinutes,
      focusGoalMinutes: summary.focusGoalMinutes,
      tasksToday: summary.tasksToday,
      tasksDoneToday: summary.tasksDoneToday,
      solvesToday: summary.solvesToday,
      solvesWeek: summary.solvesWeek,
      bestStreak: summary.bestStreak,
      aims: summary.aims,
    },
    focus: {
      todayMinutes: summary.focusMinutes,
      goalMinutes: summary.focusGoalMinutes,
      streak: focusStreak(data.focus.sessions, now),
      todaySessions: focus.todayFocusSessions,
      defaultMinutes: settings.workMin,
    },
    stats: {
      solvesToday: coding.today,
      solvesWeek: coding.thisWeek,
      solvesTotal: coding.total,
      bestStreak: Math.max(summary.bestStreak, coding.currentStreak),
      cgpa: gpa.cgpa === null ? "" : gpa.cgpa.toFixed(2),
      focusTotalMinutes: round(focus.totalMinutes),
    },
    habits,
    tasks,
    aims,
    quote: quoteFor(data, day),
    sparkline: sparkline(strip.map((entry) => entry.intensity)),
  };
}

/* ---------------------------- inline actions ---------------------------- */

/**
 * A tap made on a widget while the app was closed. The native side applies it
 * optimistically to its cache and queues it; these are replayed against the
 * store on the next resume, so the workspace and the widgets converge.
 */
export type HomeWidgetAction =
  | { type: "habit"; id: string; date?: string; done: boolean }
  | { type: "task"; id: string; done: boolean };

export type HomeWidgetOperation =
  | { kind: "setHabit"; id: string; date: string; done: boolean }
  | { kind: "setTaskDone"; id: string; done: boolean };

type PlannerState = {
  /** Habits that still exist — a queued tap for a deleted habit is dropped. */
  habits: Array<{ id: string }>;
  habitLogs: Array<{ habitId: string; date: string }>;
  planner: Array<Pick<PlannerTask, "id" | "done">>;
};

/**
 * Replays queued widget taps into idempotent store operations.
 *
 * Replaying two taps on the same row nets out correctly (check in → uncheck),
 * and a tap that the store already reflects is dropped. Unknown ids and
 * malformed payloads are ignored rather than thrown.
 */
export function planWidgetActions(
  state: PlannerState,
  actions: HomeWidgetAction[],
  today: string = todayISO(),
): HomeWidgetOperation[] {
  const logs = state.habitLogs.map((log) => ({ habitId: log.habitId, date: log.date }));
  const knownHabits = new Set(state.habits.map((habit) => habit.id));
  const done = new Map<string, boolean>(state.planner.map((task) => [task.id, task.done]));
  const operations: HomeWidgetOperation[] = [];

  for (const action of actions) {
    if (!action || typeof action !== "object") continue;

    if (action.type === "habit" && typeof action.id === "string" && action.id) {
      if (!knownHabits.has(action.id)) continue;
      const date = typeof action.date === "string" && action.date ? action.date : today;
      const index = logs.findIndex((log) => log.habitId === action.id && log.date === date);
      const current = index >= 0;
      if (current === action.done) continue;
      if (action.done) logs.push({ habitId: action.id, date });
      else logs.splice(index, 1);
      operations.push({ kind: "setHabit", id: action.id, date, done: action.done });
      continue;
    }

    if (action.type === "task" && typeof action.id === "string" && action.id) {
      if (!done.has(action.id)) continue;
      if (done.get(action.id) === action.done) continue;
      done.set(action.id, action.done);
      operations.push({ kind: "setTaskDone", id: action.id, done: action.done });
    }
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
    const id = typeof entry.id === "string" ? entry.id : "";
    if (!id) continue;
    if (entry.type === "habit") {
      actions.push({
        type: "habit",
        id,
        done: entry.done === true,
        date: typeof entry.date === "string" ? entry.date : undefined,
      });
    } else if (entry.type === "task") {
      actions.push({ type: "task", id, done: entry.done === true });
    }
  }
  return actions;
}
