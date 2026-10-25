import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPENSE_CHIPS,
  HOME_WIDGETS,
  buildWidgetSnapshot,
  expenseChips,
  validExpenseAmount,
  homeWidgetDefinition,
  parseWidgetActions,
  planWidgetActions,
  sparkline,
  type HomeWidgetAction,
} from "./home-widgets";
import { createInitialData } from "./seed";
import type { AppData, Habit, PlannerTask } from "./schema";

const NOW = new Date(2026, 8, 25, 15, 30); // Fri 25 Sep 2026, 15:30 local
const TODAY = "2026-09-25";

const habit = (id: string, title = id): Habit => ({
  id,
  title,
  emoji: "flame",
  createdAt: 0,
  startDate: null,
});

const task = (id: string, date: string, done = false, time = ""): PlannerTask => ({
  id,
  title: id,
  date,
  time,
  done,
  priority: "medium",
  doneAt: done ? NOW.getTime() : null,
  createdAt: 0,
});

function workspace(patch: Partial<AppData> = {}): AppData {
  const base = createInitialData();
  return {
    ...base,
    habits: [],
    habitLogs: [],
    goals: [],
    planner: [],
    coding: { ...base.coding, problems: [] },
    focus: { ...base.focus, sessions: [] },
    ...patch,
  };
}

describe("sparkline", () => {
  it("renders one block per value", () => {
    expect([...sparkline([0, 25, 50, 75, 100])]).toHaveLength(5);
  });

  it("maps low values to low blocks and 100 to a full block", () => {
    expect(sparkline([0])).toBe("▁");
    expect(sparkline([100])).toBe("█");
  });

  it("clamps out-of-range and never throws on an empty window", () => {
    expect(sparkline([-50, 400])).toBe("▁█");
    expect(sparkline([])).toBe("");
  });
});

describe("home widget catalogue", () => {
  it("lists ten widgets with unique types", () => {
    expect(HOME_WIDGETS).toHaveLength(10);
    const types = new Set(HOME_WIDGETS.map((widget) => widget.type));
    expect(types.size).toBe(10);
  });

  it("resolves a definition by type and ignores unknown types", () => {
    expect(homeWidgetDefinition("habits")?.title).toBe("Habits");
    expect(homeWidgetDefinition("nope")).toBeUndefined();
  });

  it("matches the native WidgetSpecs catalog", () => {
    // Must stay in sync with android/.../WidgetSpecs.java
    expect(HOME_WIDGETS.map((w) => w.type)).toEqual([
      "overview",
      "today",
      "habits",
      "focus",
      "planner",
      "expenses",
      "aims",
      "stats",
      "quote",
      "quick",
    ]);
  });
});

describe("buildWidgetSnapshot", () => {
  it("summarises today's habits, focus, tasks and solves", () => {
    const data = workspace({
      habits: [habit("gym"), habit("read")],
      habitLogs: [{ habitId: "gym", date: TODAY }],
      goals: [
        { id: "g1", title: "No junk food", emoji: "target", note: "", createdAt: 0 },
        { id: "g2", title: "Good at academics", emoji: "target", note: "", createdAt: 0 },
      ],
      planner: [task("dsa", TODAY, true, "08:00"), task("lab", TODAY, false, "17:00")],
      focus: {
        ...createInitialData().focus,
        sessions: [
          { id: "s1", startedAt: NOW.getTime(), minutes: 25, mode: "focus", task: "" },
          { id: "s2", startedAt: NOW.getTime(), minutes: 25, mode: "focus", task: "" },
        ],
      },
    });

    const snapshot = buildWidgetSnapshot(data, NOW);

    expect(snapshot.dayKey).toBe(TODAY);
    expect(snapshot.today.habitsDone).toBe(1);
    expect(snapshot.today.habitsTotal).toBe(2);
    expect(snapshot.today.habitPct).toBe(50);
    expect(snapshot.today.focusMinutes).toBe(50);
    expect(snapshot.today.tasksToday).toBe(2);
    expect(snapshot.today.tasksDoneToday).toBe(1);
    expect(snapshot.today.aims).toBe(2);
    expect(snapshot.focus.streak).toBe(1);
    expect(snapshot.focus.goalMinutes).toBe(100);

    expect(snapshot.habits).toEqual([
      { id: "gym", title: "gym", streak: 1, done: true },
      { id: "read", title: "read", streak: 0, done: false },
    ]);
    // Undone tasks come first so the widget is actionable.
    expect(snapshot.tasks.map((row) => row.id)).toEqual(["lab", "dsa"]);
    expect(snapshot.aims.map((row) => row.title)).toEqual(["No junk food", "Good at academics"]);
  });

  it("only lists tasks dated today", () => {
    const data = workspace({
      planner: [
        task("yesterday", "2026-09-24"),
        task("today", TODAY),
        task("tomorrow", "2026-09-26"),
      ],
    });
    expect(buildWidgetSnapshot(data, NOW).tasks.map((row) => row.id)).toEqual(["today"]);
  });

  it("caps every list so a huge workspace stays a glance", () => {
    const data = workspace({
      habits: Array.from({ length: 20 }, (_, i) => habit(`h${i}`)),
      goals: Array.from({ length: 20 }, (_, i) => ({
        id: `g${i}`,
        title: `aim ${i}`,
        emoji: "target",
        note: "",
        createdAt: 0,
      })),
      planner: Array.from({ length: 20 }, (_, i) => task(`t${i}`, TODAY)),
    });
    const snapshot = buildWidgetSnapshot(data, NOW);
    expect(snapshot.habits).toHaveLength(8);
    expect(snapshot.aims).toHaveLength(8);
    expect(snapshot.tasks).toHaveLength(8);
  });

  it("produces a seven-character effort strip and a daily quote", () => {
    const snapshot = buildWidgetSnapshot(workspace(), NOW);
    expect([...snapshot.sparkline]).toHaveLength(7);
    expect(snapshot.quote.text.length).toBeGreaterThan(0);
    expect(snapshot.quote.author.length).toBeGreaterThan(0);
  });

  it("prefers a custom quote when the preference says so", () => {
    const base = createInitialData();
    const data = workspace({
      quoteFilterPreference: "custom",
      customQuotes: [{ id: "q1", quote: "Keep going.", author: "Me", createdAt: 0, updatedAt: 0 }],
    });
    expect(base.customQuotes).toBeDefined();
    expect(buildWidgetSnapshot(data, NOW).quote).toEqual({ text: "Keep going.", author: "Me" });
  });

  it("summarises spending for the Spend widget", () => {
    const data = workspace({
      expenses: {
        monthlyBudget: 5000,
        transactions: [
          {
            id: "t1",
            title: "Food",
            description: "",
            amount: 120,
            type: "debit",
            tags: [],
            at: NOW.getTime(),
            position: 0,
            updatedAt: 0,
          },
          {
            id: "t2",
            title: "Transit",
            description: "",
            amount: 80,
            type: "debit",
            tags: [],
            at: NOW.getTime(),
            position: 1,
            updatedAt: 0,
          },
          {
            id: "t3",
            title: "Stipend",
            description: "",
            amount: 9000,
            type: "credit",
            tags: [],
            at: NOW.getTime(),
            position: 2,
            updatedAt: 0,
          },
          {
            id: "t4",
            title: "Book",
            description: "",
            amount: 300,
            type: "debit",
            tags: [],
            at: new Date(2026, 8, 2, 10).getTime(),
            position: 3,
            updatedAt: 0,
          },
        ],
      },
    });

    const snapshot = buildWidgetSnapshot(data, NOW);
    expect(snapshot.expenses.todaySpend).toBe(200); // credits excluded
    expect(snapshot.expenses.todayCount).toBe(2);
    expect(snapshot.expenses.monthSpend).toBe(500);
    expect(snapshot.expenses.monthlyBudget).toBe(5000);
    expect(snapshot.expenses.currency).toBe("₹");
    expect(snapshot.expenses.chips.length).toBeGreaterThan(0);
  });

  it("is plain JSON the native side can cache", () => {
    const snapshot = buildWidgetSnapshot(workspace(), NOW);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("reports an empty CGPA as an empty string, never NaN", () => {
    expect(buildWidgetSnapshot(workspace({ cgpa: { semesters: [] } }), NOW).stats.cgpa).toBe("");
  });
});

describe("expense chips", () => {
  it("falls back to readable defaults with no history", () => {
    expect(expenseChips([])).toEqual(DEFAULT_EXPENSE_CHIPS);
  });

  it("derives one-tap amounts from the user's own median spend", () => {
    const chips = expenseChips([
      { amount: 40, type: "debit" },
      { amount: 60, type: "debit" },
      { amount: 80, type: "debit" },
      { amount: 9999, type: "credit" },
    ]);
    expect(chips).toEqual([30, 60, 120]);
  });

  it("rounds to a readable step for larger spends", () => {
    const chips = expenseChips([{ amount: 1200, type: "debit" }]);
    expect(chips).toEqual([600, 1200, 2400]);
  });

  it("never suggests a zero amount", () => {
    const chips = expenseChips([{ amount: 5, type: "debit" }]);
    expect(chips.every((chip) => chip > 0)).toBe(true);
    expect(chips[0]).toBe(10);
  });
});

describe("validExpenseAmount", () => {
  it("accepts plausible spends and rounds to paise", () => {
    expect(validExpenseAmount(120)).toBe(120);
    expect(validExpenseAmount("150.456")).toBe(150.46);
  });

  it("rejects junk, zero, negatives and absurd amounts", () => {
    for (const value of [0, -5, NaN, Infinity, "abc", null, undefined, 20_000_000]) {
      expect(validExpenseAmount(value)).toBeNull();
    }
  });
});

describe("planWidgetActions", () => {
  const state = {
    habits: [{ id: "gym" }, { id: "read" }],
    habitLogs: [{ habitId: "gym", date: TODAY }],
    planner: [
      { id: "dsa", done: false },
      { id: "lab", done: true },
    ],
  };

  it("checks a habit in and records the operation", () => {
    const actions: HomeWidgetAction[] = [{ type: "habit", id: "read", date: TODAY, done: true }];
    expect(planWidgetActions(state, actions, TODAY)).toEqual([
      { kind: "setHabit", id: "read", date: TODAY, done: true },
    ]);
  });

  it("skips taps the store already reflects", () => {
    expect(
      planWidgetActions(state, [{ type: "habit", id: "gym", date: TODAY, done: true }], TODAY),
    ).toEqual([]);
  });

  it("unchecks a habit and defaults the day to today", () => {
    expect(planWidgetActions(state, [{ type: "habit", id: "gym", done: false }], TODAY)).toEqual([
      { kind: "setHabit", id: "gym", date: TODAY, done: false },
    ]);
  });

  it("nets out repeated taps on the same row", () => {
    const actions: HomeWidgetAction[] = [
      { type: "habit", id: "read", date: TODAY, done: true },
      { type: "habit", id: "read", date: TODAY, done: false },
    ];
    expect(planWidgetActions(state, actions, TODAY)).toEqual([
      { kind: "setHabit", id: "read", date: TODAY, done: true },
      { kind: "setHabit", id: "read", date: TODAY, done: false },
    ]);
  });

  it("completes and re-opens planner tasks", () => {
    expect(planWidgetActions(state, [{ type: "task", id: "dsa", done: true }], TODAY)).toEqual([
      { kind: "setTaskDone", id: "dsa", done: true },
    ]);
    expect(planWidgetActions(state, [{ type: "task", id: "lab", done: false }], TODAY)).toEqual([
      { kind: "setTaskDone", id: "lab", done: false },
    ]);
    expect(planWidgetActions(state, [{ type: "task", id: "lab", done: true }], TODAY)).toEqual([]);
  });

  it("queues a widget-logged spend as an addExpense operation", () => {
    const at = NOW.getTime();
    expect(
      planWidgetActions(state, [{ type: "expense", amount: 120, category: "Food", at }], TODAY),
    ).toEqual([{ kind: "addExpense", amount: 120, title: "Quick spend", tags: ["Food"], at }]);
  });

  it("labels a custom-amount spend with its category", () => {
    const at = NOW.getTime();
    expect(
      planWidgetActions(
        state,
        [{ type: "expense", amount: 65.5, title: "Transit", category: "Transit", at }],
        TODAY,
      ),
    ).toEqual([{ kind: "addExpense", amount: 65.5, title: "Transit", tags: ["Transit"], at }]);
  });

  it("drops a spend the store already recorded", () => {
    const at = NOW.getTime();
    const withTx = {
      ...state,
      transactions: [{ amount: 120, type: "debit", at: at + 400 }],
    };
    expect(planWidgetActions(withTx, [{ type: "expense", amount: 120, at }], TODAY)).toEqual([]);
  });

  it("keeps two genuine identical spends made minutes apart", () => {
    const at = NOW.getTime();
    const withTx = {
      ...state,
      transactions: [{ amount: 120, type: "debit", at: at - 60_000 }],
    };
    expect(planWidgetActions(withTx, [{ type: "expense", amount: 120, at }], TODAY)).toHaveLength(
      1,
    );
  });

  it("ignores an impossible expense amount", () => {
    expect(planWidgetActions(state, [{ type: "expense", amount: 0 }], TODAY)).toEqual([]);
    expect(planWidgetActions(state, [{ type: "expense", amount: -20 }], TODAY)).toEqual([]);
  });

  it("ignores a tap for a habit that no longer exists", () => {
    expect(planWidgetActions(state, [{ type: "habit", id: "deleted", done: true }], TODAY)).toEqual(
      [],
    );
  });

  it("ignores unknown ids and malformed entries", () => {
    const actions = [
      { type: "habit", id: "ghost", done: true },
      { type: "task", id: "ghost", done: true },
      { type: "task" },
      null,
    ] as unknown as HomeWidgetAction[];
    expect(planWidgetActions(state, actions, TODAY)).toEqual([]);
  });
});

describe("parseWidgetActions", () => {
  it("keeps well-formed actions and drops everything else", () => {
    expect(
      parseWidgetActions([
        { type: "habit", id: "gym", date: TODAY, done: true },
        { type: "task", id: "dsa", done: false },
        { type: "expense", amount: 90, category: "Food", at: 123 },
        { type: "expense", amount: 0 },
        { type: "wat", id: "x", done: true },
        { type: "habit", done: true },
        "nope",
        42,
      ]),
    ).toEqual([
      { type: "habit", id: "gym", date: TODAY, done: true },
      { type: "task", id: "dsa", done: false },
      { type: "expense", amount: 90, title: undefined, category: "Food", at: 123 },
    ]);
  });

  it("returns an empty list for non-array payloads", () => {
    expect(parseWidgetActions(null)).toEqual([]);
    expect(parseWidgetActions({ actions: [] })).toEqual([]);
  });
});
