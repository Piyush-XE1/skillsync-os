import { describe, expect, it } from "vitest";
import {
  HOME_WIDGETS,
  WIDGET_LIST_LIMIT,
  buildWidgetSnapshot,
  homeWidgetDefinition,
  parseWidgetActions,
  planWidgetActions,
  type HomeWidgetAction,
} from "./home-widgets";
import { createInitialData } from "./seed";
import type { AppData, Habit } from "./schema";

const NOW = new Date(2026, 8, 25, 15, 30); // Fri 25 Sep 2026, 15:30 local
const TODAY = "2026-09-25";

const habit = (id: string, title = id): Habit => ({
  id,
  title,
  emoji: "flame",
  createdAt: 0,
  startDate: null,
});

function workspace(patch: Partial<AppData> = {}): AppData {
  const base = createInitialData();
  return { ...base, habits: [], habitLogs: [], ...patch };
}

describe("launcher widget catalogue", () => {
  it("registers exactly the three supported widgets with the requested footprints", () => {
    expect(HOME_WIDGETS.map((widget) => [widget.type, widget.size])).toEqual([
      ["sticky_note", "5 × 2"],
      ["expense_logger", "1 × 1"],
      ["habit_check", "2 × 2"],
    ]);
  });

  it("resolves definitions by type and rejects retired widgets", () => {
    expect(homeWidgetDefinition("habit_check")?.title).toBe("Habit checkmarks");
    expect(homeWidgetDefinition("quote")).toBeUndefined();
    expect(homeWidgetDefinition("spend")).toBeUndefined();
  });
});

describe("buildWidgetSnapshot", () => {
  it("reads today's completion state from the existing habit store", () => {
    const data = workspace({
      habits: [habit("h1", "Read"), habit("h2", "Gym")],
      habitLogs: [{ habitId: "h1", date: TODAY, kind: "check-in" }],
    });
    const snapshot = buildWidgetSnapshot(data, NOW);

    expect(snapshot.dayKey).toBe(TODAY);
    expect(snapshot.today).toEqual({ habitsDone: 1, habitsTotal: 2, habitPct: 50 });
    expect(snapshot.habits).toEqual([
      { id: "h1", title: "Read", streak: expect.any(Number), done: true },
      { id: "h2", title: "Gym", streak: expect.any(Number), done: false },
    ]);
  });

  it("keeps the snapshot small and does not copy private journal data", () => {
    const data = workspace({
      people: [
        {
          id: "p1",
          name: "Rahul",
          learned: "Private note",
          tags: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      expenses: {
        monthlyBudget: 0,
        customTags: [],
        transactions: [
          {
            id: "t1",
            title: "Coffee",
            description: "",
            amount: 100,
            type: "debit",
            tags: ["Food"],
            at: NOW.getTime(),
            position: 0,
            updatedAt: NOW.getTime(),
          },
        ],
      },
    });
    const snapshot = buildWidgetSnapshot(data, NOW);
    expect(Object.keys(snapshot).sort()).toEqual(["dayKey", "habits", "today"]);
    expect(JSON.stringify(snapshot)).not.toContain("Private note");
  });

  it("caps the habit list for the binder payload", () => {
    const habits = Array.from({ length: WIDGET_LIST_LIMIT + 5 }, (_, index) =>
      habit(`h${index}`, `Habit ${index}`),
    );
    expect(buildWidgetSnapshot(workspace({ habits }), NOW).habits).toHaveLength(WIDGET_LIST_LIMIT);
  });
});

describe("habit tap queue", () => {
  const state = {
    habits: [{ id: "h1" }],
    habitLogs: [] as Array<{ habitId: string; date: string }>,
  };
  const tap = (done: boolean, date = TODAY, id = "h1"): HomeWidgetAction => ({
    type: "habit",
    id,
    done,
    date,
  });

  it("plans check-in and uncheck as reversible operations", () => {
    expect(planWidgetActions(state, [tap(true), tap(true)], TODAY)).toEqual([
      { kind: "setHabit", id: "h1", date: TODAY, done: true },
    ]);
    expect(
      planWidgetActions(
        { habits: state.habits, habitLogs: [{ habitId: "h1", date: TODAY }] },
        [tap(false)],
        TODAY,
      ),
    ).toEqual([{ kind: "setHabit", id: "h1", date: TODAY, done: false }]);
  });

  it("drops taps for deleted habits and already-correct state", () => {
    expect(planWidgetActions(state, [tap(true, TODAY, "gone")], TODAY)).toEqual([]);
    expect(
      planWidgetActions(
        { habits: state.habits, habitLogs: [{ habitId: "h1", date: TODAY }] },
        [tap(true)],
        TODAY,
      ),
    ).toEqual([]);
  });

  it("parses only well-formed habit actions from native JSON", () => {
    expect(
      parseWidgetActions([
        { type: "habit", id: "h1", done: true, date: TODAY },
        { type: "habit", id: "", done: true },
        { type: "task", id: "t1", done: true },
        { type: "expense", amount: 50 },
        null,
        "junk",
      ]),
    ).toEqual([{ type: "habit", id: "h1", done: true, date: TODAY }]);
  });
});
