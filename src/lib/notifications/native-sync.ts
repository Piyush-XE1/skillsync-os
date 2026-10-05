/**
 * Mirrors SkillSync's notification settings into real Android alarms.
 *
 * On the web this is a no-op (the in-app runner handles reminders while the app
 * is open). Inside the APK every enabled timed category becomes a recurring
 * OS-level alarm, so reminders fire with the app closed, fully offline.
 * Alarms are only rewritten when the settings signature actually changes.
 */

import { nativeBridge, type NativeRepeat } from "@/lib/native/bridge";
import { CATEGORY_META, NOTIFICATION_CATEGORIES, type NotificationSettings } from "./types";

const SIGNATURE_KEY = "skillsync.native-schedule.signature";

type DesiredReminder = {
  id: string;
  title: string;
  body: string;
  at: number;
  repeat: NativeRepeat;
  url: string;
};

function nextAt(time: string, weekday?: number): number {
  const [h, m] = time.split(":").map((n) => Number.parseInt(n, 10));
  const now = new Date();
  const at = new Date(now);
  at.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  if (typeof weekday === "number") {
    const delta = (weekday - at.getDay() + 7) % 7;
    at.setDate(at.getDate() + delta);
  }
  if (at.getTime() <= now.getTime()) {
    at.setDate(at.getDate() + (typeof weekday === "number" ? 7 : 1));
  }
  return at.getTime();
}

export function desiredReminders(
  settings: NotificationSettings,
  modules: { expenses?: boolean } | undefined,
): DesiredReminder[] {
  if (!settings.enabled) return [];
  const out: DesiredReminder[] = [];

  for (const key of NOTIFICATION_CATEGORIES) {
    const meta = CATEGORY_META[key];
    if (key === "weeklySummary" || !meta.timed) continue;
    if (meta.module && !modules?.[meta.module]) continue;
    const setting = settings.categories?.[key];
    if (!setting?.enabled) continue;
    const time = setting.time ?? meta.defaultTime ?? "09:00";
    out.push({
      id: `category:${key}`,
      title: `${meta.label} reminder`,
      body: meta.description,
      at: nextAt(time),
      repeat: "daily",
      url: "/notifications",
    });
  }

  if (settings.weeklySummary?.enabled) {
    out.push({
      id: "category:weeklySummary",
      title: "Your SkillSync week",
      body: "Open SkillSync for this week's progress digest.",
      at: nextAt(settings.weeklySummary.time, settings.weeklySummary.weekday),
      repeat: "weekly",
      url: "/analytics",
    });
  }

  return out;
}

function signatureOf(reminders: DesiredReminder[]): string {
  return JSON.stringify(
    reminders.map((r) => [r.id, r.repeat, new Date(r.at).toTimeString().slice(0, 5)]),
  );
}

/** Reconciles native alarms with the current settings. Safe to call often. */
export async function syncNativeSchedules(
  settings: NotificationSettings,
  modules: { expenses?: boolean } | undefined,
  force = false,
): Promise<{ synced: boolean; count: number }> {
  const bridge = nativeBridge();
  if (!bridge) return { synced: false, count: 0 };

  const target = desiredReminders(settings, modules);
  const signature = signatureOf(target);

  let previous: string | null = null;
  try {
    previous = window.localStorage.getItem(SIGNATURE_KEY);
  } catch {
    previous = null;
  }
  if (!force && previous === signature) {
    return { synced: false, count: target.length };
  }

  try {
    await bridge.cancelAll();
    for (const reminder of target) {
      await bridge.schedule({
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        at: reminder.at,
        repeat: reminder.repeat,
        url: reminder.url,
        priority: "normal",
      });
    }
    try {
      window.localStorage.setItem(SIGNATURE_KEY, signature);
    } catch {
      /* ignore quota errors */
    }
    return { synced: true, count: target.length };
  } catch (e) {
    console.warn("[notifications] native schedule sync failed", e);
    return { synced: false, count: 0 };
  }
}
