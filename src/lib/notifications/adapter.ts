import type { NotificationItem, ScheduledNotification } from "./types";
import { getPermission } from "./permission";
import { getRegistration } from "./sw";
import { hasNativeBridge, nativeBridge, type NativeRepeat } from "@/lib/native/bridge";

/**
 * Delivery adapter interface. The web adapter shows notifications while the
 * app is open. The Capacitor adapter (Phase 3) implements the same surface
 * with @capacitor/local-notifications, giving real OS-level scheduling.
 */
export type NotificationAdapter = {
  readonly kind: "web" | "capacitor" | "noop";
  /** Whether real OS scheduling (background, app closed) is available. */
  readonly canSchedule: boolean;
  show(item: NotificationItem): Promise<boolean>;
  schedule(entry: ScheduledNotification): Promise<number | null>;
  cancel(entry: ScheduledNotification): Promise<void>;
};

/** Delivery result with the exact path taken — used by diagnostics/logs. */
export type DeliveryResult = {
  ok: boolean;
  via: "native" | "serviceWorker" | "constructor" | "none";
  error: string | null;
};

/**
 * Displays a notification, preferring the service-worker path.
 *
 * On Android Chrome `new Notification()` throws an "Illegal constructor"
 * TypeError, so registration.showNotification() is the only path that works
 * there. Desktop keeps the constructor as a fallback.
 */
export async function deliver(item: NotificationItem): Promise<DeliveryResult> {
  if (typeof window === "undefined") {
    return { ok: false, via: "none", error: "no window" };
  }

  // Android APK: post through the native NotificationManager.
  const bridge = nativeBridge();
  if (bridge) {
    try {
      const result = await bridge.notify({
        id: item.sourceId ?? item.id,
        title: item.title,
        body: item.body,
        url: item.action?.kind === "route" ? item.action.to : "/notifications",
        priority: item.priority,
      });
      if (result?.ok) return { ok: true, via: "native", error: null };
      return { ok: false, via: "none", error: "native notification rejected" };
    } catch (e) {
      return {
        ok: false,
        via: "none",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  if (getPermission() !== "granted") {
    return { ok: false, via: "none", error: "permission not granted" };
  }

  const options: NotificationOptions & { renotify?: boolean } = {
    body: item.body,
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    tag: item.sourceId ?? item.id,
    silent: item.priority === "low",
    data: { url: item.action?.kind === "route" ? item.action.to : "/notifications" },
  };

  let swError: string | null = null;
  try {
    const reg = await getRegistration();
    if (reg) {
      await reg.showNotification(item.title, options);
      console.info("[notifications] displayed via service worker", item.sourceId ?? item.id);
      return { ok: true, via: "serviceWorker", error: null };
    }
    swError = "no service worker registration";
  } catch (e) {
    swError = e instanceof Error ? e.message : String(e);
  }

  try {
    new window.Notification(item.title, options);
    console.info("[notifications] displayed via constructor", item.sourceId ?? item.id);
    return { ok: true, via: "constructor", error: swError };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.warn("[notifications] delivery failed", { swError, constructorError: err });
    return { ok: false, via: "none", error: swError ? `${swError}; ${err}` : err };
  }
}

const webAdapter: NotificationAdapter = {
  kind: "web",
  canSchedule: false,
  async show(item) {
    return (await deliver(item)).ok;
  },
  // The web platform has no reliable "fire later" API — scheduling is handled
  // in-app by the runner while SkillSync is open.
  async schedule() {
    return null;
  },
  async cancel() {},
};

const noopAdapter: NotificationAdapter = {
  kind: "noop",
  canSchedule: false,
  async show() {
    return false;
  },
  async schedule() {
    return null;
  },
  async cancel() {},
};

function repeatOf(entry: ScheduledNotification): NativeRepeat {
  const kind = entry.recurrence?.kind;
  if (kind === "daily" || kind === "weekdays" || kind === "weekly" || kind === "monthly") {
    return kind;
  }
  return "none";
}

/**
 * Android APK adapter: real OS-level scheduling through AlarmManager, so
 * reminders fire while SkillSync is closed.
 */
const nativeAdapter: NotificationAdapter = {
  kind: "capacitor",
  canSchedule: true,
  async show(item) {
    return (await deliver(item)).ok;
  },
  async schedule(entry) {
    const bridge = nativeBridge();
    if (!bridge) return null;
    try {
      const result = await bridge.schedule({
        id: entry.sourceId ?? entry.id,
        title: entry.title,
        body: entry.body,
        at: entry.dueAt,
        repeat: repeatOf(entry),
        url: entry.action?.kind === "route" ? entry.action.to : "/notifications",
        priority: entry.priority,
      });
      return result?.ok ? result.at : null;
    } catch (e) {
      console.warn("[notifications] native schedule failed", e);
      return null;
    }
  },
  async cancel(entry) {
    const bridge = nativeBridge();
    if (!bridge) return;
    try {
      await bridge.cancel({ id: entry.sourceId ?? entry.id });
    } catch {
      /* best effort */
    }
  },
};

/**
 * Runtime-only platform detection, so the web build never imports native code.
 */
export function getAdapter(): NotificationAdapter {
  if (typeof window === "undefined") return noopAdapter;
  if (hasNativeBridge()) return nativeAdapter;
  return webAdapter;
}
