import { CURRENT_SCHEMA_VERSION, AppDataSchema, type AppData } from "./schema";
import { createInitialData } from "./seed";
import { todayISO } from "./date";
import { createDefaultNotifications } from "./notifications/types";

/**
 * Loose shape of persisted data while it is being migrated. It can come from
 * any historical schema version (or a hand-edited backup file), so strict
 * typing here would only add casts without adding safety; the final
 * `AppDataSchema` parse is what guarantees the result.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyData = Record<string, any>;

/**
 * v1 → v2: adds habit.startDate, attendance module, expenses module,
 * preferences.modules flags.
 */
const migrators: Record<number, (data: LegacyData) => LegacyData> = {
  1: (data) => {
    const habits = Array.isArray(data.habits)
      ? data.habits.map((h: unknown) => {
          const habit = h as LegacyData;
          if (habit && typeof habit === "object" && habit.startDate === undefined) {
            const createdAt = typeof habit.createdAt === "number" ? habit.createdAt : Date.now();
            return { ...habit, startDate: todayISO(new Date(createdAt)) };
          }
          return habit;
        })
      : [];
    const preferences = {
      notifications: true,
      developerMode: false,
      modules: { attendance: false, expenses: false },
      ...(data.preferences ?? {}),
    };
    if (!preferences.modules) preferences.modules = { attendance: false, expenses: false };
    return {
      ...data,
      habits,
      preferences,
      attendance: data.attendance ?? { subjects: [] },
      expenses: data.expenses ?? { transactions: [] },
    };
  },
  3: (data) => ({
    ...data,
    notifications: data.notifications ?? createDefaultNotifications(),
  }),
  2: (data) => ({
    ...data,
    preferences: {
      ...(data.preferences ?? {}),
      background: (data.preferences ?? {}).background ?? "aurora",
    },
  }),
  /**
   * v4 -> v5: the separate Theme preference is gone. Background is now the
   * single source of truth for appearance, so anyone who had chosen the light
   * theme keeps a light app via the new "light" background.
   */
  4: (data) => {
    const prefs = { ...(data.preferences ?? {}) };
    if (prefs.theme === "light") prefs.background = "light";
    delete prefs.theme;
    return { ...data, preferences: prefs };
  },
  /**
   * v5 -> v6: the "Minimal Gradient" and "Atmospheric" backgrounds were
   * retired. Users on either one are moved to "aurora" — the closest safe
   * fallback that preserves their dark appearance (both removed options were
   * dark). At the same time the new premium "Atelier" background becomes
   * available to everyone.
   */
  5: (data) => {
    const prefs = { ...(data.preferences ?? {}) };
    if (prefs.background === "gradient" || prefs.background === "atmospheric") {
      prefs.background = "aurora";
    }
    return { ...data, preferences: prefs };
  },
};

export function migrate(input: unknown): AppData {
  const seed = createInitialData();
  if (!input || typeof input !== "object") return seed;

  let data: LegacyData = { ...seed, ...(input as LegacyData) };
  const from = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;

  for (let v = from; v < CURRENT_SCHEMA_VERSION; v++) {
    const fn = migrators[v];
    if (fn) data = fn(data);
  }
  data.schemaVersion = CURRENT_SCHEMA_VERSION;

  // Defensive: guarantee shape even if older persisted state slipped through.
  data.preferences = {
    notifications: true,
    developerMode: false,
    background: "aurora",
    ...(data.preferences ?? {}),
    modules: {
      attendance: false,
      expenses: false,
      ...((data.preferences ?? {}).modules ?? {}),
    },
  };
  // Appearance has exactly one source of truth: preferences.background.
  // A legacy light theme becomes the Minimalist Light background; any
  // retired or unknown background value (e.g. "gradient", "atmospheric")
  // safely falls back to "aurora", the app's default dark appearance.
  {
    const prefs = data.preferences as LegacyData;
    if (prefs.theme === "light") prefs.background = "light";
    delete prefs.theme;
    if (!["aurora", "light", "atelier"].includes(prefs.background)) {
      prefs.background = "aurora";
    }
  }

  data.attendance = data.attendance ?? { subjects: [] };
  data.expenses = data.expenses ?? { transactions: [] };
  // Expense Manager V2: description / tags / position / updatedAt
  data.expenses.transactions = (data.expenses.transactions ?? []).map(
    (t: LegacyData, i: number) => ({
      ...t,
      description: t.description ?? "",
      tags: Array.isArray(t.tags) ? t.tags : [],
      position: typeof t.position === "number" ? t.position : i,
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : (t.at ?? 0),
    }),
  );
  {
    const defaults = createDefaultNotifications();
    const n = data.notifications ?? {};
    data.notifications = {
      settings: {
        ...defaults.settings,
        ...(n.settings ?? {}),
        categories: {
          ...defaults.settings.categories,
          ...((n.settings ?? {}).categories ?? {}),
        },
        quietHours: {
          ...defaults.settings.quietHours,
          ...((n.settings ?? {}).quietHours ?? {}),
        },
        weeklySummary: {
          ...defaults.settings.weeklySummary,
          ...((n.settings ?? {}).weeklySummary ?? {}),
        },
      },
      items: Array.isArray(n.items) ? n.items : [],
      scheduled: Array.isArray(n.scheduled) ? n.scheduled : [],
    };
  }

  const parsed = AppDataSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  return { ...seed, ...data, schemaVersion: CURRENT_SCHEMA_VERSION };
}
