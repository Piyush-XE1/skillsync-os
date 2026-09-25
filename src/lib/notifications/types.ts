import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Notification categories
 * ------------------------------------------------------------------ */

export const NOTIFICATION_CATEGORIES = [
  "learn",
  "habits",
  "attendance",
  "planner",
  "projects",
  "expenses",
  "backup",
  "weeklySummary",
] as const;

export type CategoryKey = (typeof NOTIFICATION_CATEGORIES)[number];

export type CategoryMeta = {
  key: CategoryKey;
  label: string;
  description: string;
  /** lucide-react icon name rendered by the UI map. */
  icon: string;
  /** Optional module flag this category depends on. */
  module?: "attendance" | "expenses";
  /** Whether the category supports a daily reminder time. */
  timed: boolean;
  defaultTime?: string;
};

export const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  learn: {
    key: "learn",
    label: "Learn",
    description: "Roadmap progress nudges and inactivity reminders",
    icon: "graduation-cap",
    timed: true,
    defaultTime: "19:00",
  },
  habits: {
    key: "habits",
    label: "Habits",
    description: "Daily check-in reminders for Operation Rebirth",
    icon: "flame",
    timed: true,
    defaultTime: "21:00",
  },
  attendance: {
    key: "attendance",
    label: "Attendance",
    description: "Alerts when a subject drops below its minimum",
    icon: "school",
    module: "attendance",
    timed: true,
    defaultTime: "18:00",
  },
  planner: {
    key: "planner",
    label: "Planner",
    description: "Tasks due today and unfinished items",
    icon: "calendar-range",
    timed: true,
    defaultTime: "08:30",
  },
  projects: {
    key: "projects",
    label: "Projects",
    description: "Deadlines and stale project reminders",
    icon: "folder-kanban",
    timed: true,
    defaultTime: "17:00",
  },
  expenses: {
    key: "expenses",
    label: "Expenses",
    description: "Spending recaps and logging reminders",
    icon: "wallet",
    module: "expenses",
    timed: true,
    defaultTime: "20:00",
  },
  backup: {
    key: "backup",
    label: "Backup",
    description: "Reminders when your last backup gets old",
    icon: "save",
    timed: false,
  },
  weeklySummary: {
    key: "weeklySummary",
    label: "Weekly summary",
    description: "A digest of your week every Sunday",
    icon: "chart-line",
    timed: false,
  },
};

/* ------------------------------------------------------------------ *
 * Schemas
 * ------------------------------------------------------------------ */

export const NotificationPriority = z.enum(["low", "normal", "high"]);

export const NotificationActionSchema = z.object({
  kind: z.literal("route"),
  to: z.string(),
  params: z.record(z.string(), z.string()).optional(),
});

export const NotificationOrigin = z.enum(["rule", "manual", "ai"]);

export const NotificationItemSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  category: z.enum(NOTIFICATION_CATEGORIES),
  title: z.string(),
  body: z.string().default(""),
  read: z.boolean().default(false),
  priority: NotificationPriority.default("normal"),
  action: NotificationActionSchema.nullable().default(null),
  /** lucide icon name; falls back to the category icon. */
  icon: z.string().optional(),
  /** Dedupe key, e.g. "habit:sleep:2026-08-03". */
  sourceId: z.string().optional(),
  /** Whether an OS-level notification was actually shown. */
  delivered: z.boolean().default(false),
  origin: NotificationOrigin.default("rule"),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const RecurrenceSchema = z.object({
  kind: z.enum(["daily", "weekdays", "weekly", "monthly"]),
  time: z.string().default("09:00"),
  /** 0 = Sunday, used by "weekly". */
  weekday: z.number().int().min(0).max(6).optional(),
  /** 1-31, used by "monthly". */
  day: z.number().int().min(1).max(31).optional(),
});

export const ScheduledNotificationSchema = z.object({
  id: z.string(),
  category: z.enum(NOTIFICATION_CATEGORIES),
  title: z.string(),
  body: z.string().default(""),
  dueAt: z.number(),
  recurrence: RecurrenceSchema.nullable().default(null),
  action: NotificationActionSchema.nullable().default(null),
  priority: NotificationPriority.default("normal"),
  sourceId: z.string().optional(),
  /** Capacitor LocalNotifications id (Phase 3). */
  nativeId: z.number().optional(),
  status: z.enum(["pending", "fired", "cancelled"]).default("pending"),
  origin: NotificationOrigin.default("rule"),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const CategorySettingSchema = z.object({
  enabled: z.boolean().default(true),
  time: z.string().optional(),
});

export const NotificationSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  permission: z.enum(["default", "granted", "denied", "unsupported"]).default("default"),
  categories: z
    .record(z.enum(NOTIFICATION_CATEGORIES), CategorySettingSchema)
    .default(() => createDefaultCategories()),
  quietHours: z
    .object({
      enabled: z.boolean().default(false),
      from: z.string().default("22:30"),
      to: z.string().default("07:30"),
    })
    .default({ enabled: false, from: "22:30", to: "07:30" }),
  weeklySummary: z
    .object({
      enabled: z.boolean().default(true),
      weekday: z.number().int().min(0).max(6).default(0),
      time: z.string().default("19:00"),
    })
    .default({ enabled: true, weekday: 0, time: "19:00" }),
  lastRunAt: z.number().default(0),
});

export const NotificationsStateSchema = z.object({
  settings: NotificationSettingsSchema.default(() => createDefaultSettings()),
  items: z.array(NotificationItemSchema).default([]),
  scheduled: z.array(ScheduledNotificationSchema).default([]),
});

export type NotificationItem = z.infer<typeof NotificationItemSchema>;
export type ScheduledNotification = z.infer<typeof ScheduledNotificationSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type NotificationsState = z.infer<typeof NotificationsStateSchema>;
export type NotificationCategorySetting = z.infer<typeof CategorySettingSchema>;
export type NotificationAction = z.infer<typeof NotificationActionSchema>;

/** Newest-first history cap; keeps localStorage small and the list fast. */
export const HISTORY_LIMIT = 200;

export function createDefaultCategories(): Record<CategoryKey, NotificationCategorySetting> {
  const out = {} as Record<CategoryKey, NotificationCategorySetting>;
  for (const key of NOTIFICATION_CATEGORIES) {
    const meta = CATEGORY_META[key];
    out[key] = meta.defaultTime ? { enabled: true, time: meta.defaultTime } : { enabled: true };
  }
  return out;
}

export function createDefaultSettings(): NotificationSettings {
  return {
    enabled: false,
    permission: "default",
    categories: createDefaultCategories(),
    quietHours: { enabled: false, from: "22:30", to: "07:30" },
    weeklySummary: { enabled: true, weekday: 0, time: "19:00" },
    lastRunAt: 0,
  };
}

export function createDefaultNotifications(): NotificationsState {
  return { settings: createDefaultSettings(), items: [], scheduled: [] };
}
