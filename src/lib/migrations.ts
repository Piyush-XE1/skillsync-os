import { z } from "zod";
import { CURRENT_SCHEMA_VERSION, AppDataSchema, type AppData } from "./schema";
import { createInitialData } from "./seed";
import { todayISO } from "./date";
import { createDefaultNotifications } from "./notifications/types";
import { defaultAccentFor } from "./accent";
import { DEFAULT_SOUND_VOLUME, clampVolume } from "./sound";
import { defaultWidgetLayout, normalizeWidgetLayout } from "./widgets";

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
  /**
   * v6 -> v7: the Focus, CGPA and Resume modules join the workspace, and the
   * stats model gains lifetime XP, join date and achievement history. Old
   * workspaces keep all of their data; the new domains start empty with
   * sensible defaults.
   */
  6: (data) => {
    const legacyStats = (data.stats ?? {}) as LegacyData;
    const stats = {
      xp: typeof legacyStats.xp === "number" ? legacyStats.xp : 0,
      level: typeof legacyStats.level === "number" ? legacyStats.level : 1,
      streak: typeof legacyStats.streak === "number" ? legacyStats.streak : 0,
      lastActive: typeof legacyStats.lastActive === "string" ? legacyStats.lastActive : "",
      totalXp: typeof legacyStats.totalXp === "number" ? legacyStats.totalXp : 0,
      joinedAt: typeof legacyStats.joinedAt === "number" ? legacyStats.joinedAt : Date.now(),
      achievements: Array.isArray(legacyStats.achievements) ? legacyStats.achievements : [],
    };
    const modules = {
      attendance: false,
      expenses: false,
      focus: true,
      cgpa: true,
      resume: true,
      ...(((data.preferences ?? {}) as LegacyData).modules ?? {}),
    };
    return {
      ...data,
      stats,
      preferences: { ...(data.preferences ?? {}), modules },
    };
  },
  /**
   * v7 -> v8: the Coding (DSA prep) and Career (placement tracker) modules join
   * the workspace. Existing data is untouched; the new domains start empty and
   * are enabled by default for new workspaces while old workspaces keep their
   * module preferences (both default on for existing installs too, so the
   * modules are discoverable after the upgrade).
   */
  7: (data) => {
    const prefs = (data.preferences ?? {}) as LegacyData;
    const modules = {
      ...(prefs.modules ?? {}),
      coding: typeof (prefs.modules ?? {}).coding === "boolean" ? prefs.modules.coding : true,
      career: typeof (prefs.modules ?? {}).career === "boolean" ? prefs.modules.career : true,
    };
    return {
      ...data,
      preferences: { ...prefs, modules },
      coding: data.coding ?? { problems: [], rating: 0, maxRating: 0, ratingHistory: [] },
      career: data.career ?? { applications: [] },
    };
  },
  /**
   * v8 -> v9: the Theme Studio ships. A custom accent colour is stored per
   * workspace; anyone who hasn't picked one gets the default that matches
   * their current background, so the new setting is invisible for existing
   * users until they open the picker.
   */
  8: (data) => {
    const prefs = (data.preferences ?? {}) as LegacyData;
    const accent =
      typeof prefs.accent === "string" && prefs.accent.trim().length > 0
        ? prefs.accent
        : defaultAccentFor(prefs.background);
    return { ...data, preferences: { ...prefs, accent } };
  },
  /**
   * v9 -> v10: the dashboard becomes a widget grid and the OS grows a sound
   * design. Existing workspaces get the shipped layout (every widget in its
   * default place) plus sound on at the default volume — nothing they already
   * had moves or disappears.
   */
  9: (data) => {
    const prefs = (data.preferences ?? {}) as LegacyData;
    const sound = typeof prefs.sound === "boolean" ? prefs.sound : true;
    const soundVolume =
      typeof prefs.soundVolume === "number" ? clampVolume(prefs.soundVolume) : DEFAULT_SOUND_VOLUME;
    return {
      ...data,
      preferences: { ...prefs, sound, soundVolume },
      widgets: Array.isArray(data.widgets) ? data.widgets : defaultWidgetLayout(),
    };
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
    accent: defaultAccentFor((data.preferences ?? {}).background as string | undefined),
    ...(data.preferences ?? {}),
    modules: {
      attendance: false,
      expenses: false,
      focus: true,
      cgpa: true,
      resume: true,
      coding: true,
      career: true,
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
    // Accent: fall back to the background's default if it was never set.
    if (typeof prefs.accent !== "string" || prefs.accent.trim().length === 0) {
      prefs.accent = defaultAccentFor(prefs.background);
    }
    // Sound design: always a boolean + a clamped 0..1 volume.
    if (typeof prefs.sound !== "boolean") prefs.sound = true;
    prefs.soundVolume =
      typeof prefs.soundVolume === "number" ? clampVolume(prefs.soundVolume) : DEFAULT_SOUND_VOLUME;
  }

  // Widget layout: repair whatever was persisted (unknown ids, duplicates,
  // impossible sizes) and append widgets this workspace has never seen.
  data.widgets = normalizeWidgetLayout(data.widgets);

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
  // Planner V2: every task gets an explicit priority.
  data.planner = (data.planner ?? []).map((t: LegacyData) => ({
    ...t,
    priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
    doneAt: typeof t.doneAt === "number" ? t.doneAt : null,
  }));
  // Focus / CGPA / Resume modules joined the schema in v7; absent keys get
  // their defaults from the schema parse below.
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

  // Corrupted or partially-incompatible data (e.g. one module written by an
  // old broken build): salvage valid top-level fields individually, reverting
  // broken ones to seed values. Never return an invalid shape — callers like
  // zustand persist would otherwise adopt it and crash the app at runtime.
  const salvaged: LegacyData = { ...seed };
  for (const [key, fieldSchema] of Object.entries(AppDataSchema.shape)) {
    if (data[key] === undefined) continue;
    const fieldParsed = (fieldSchema as z.ZodTypeAny).safeParse(data[key]);
    if (fieldParsed.success) salvaged[key] = fieldParsed.data;
  }
  salvaged.schemaVersion = CURRENT_SCHEMA_VERSION;
  const finalParse = AppDataSchema.safeParse(salvaged);
  return finalParse.success ? finalParse.data : seed;
}
