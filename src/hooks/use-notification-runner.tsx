import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { getLastBackupMeta } from "@/lib/backup";
import { buildDueCandidates, isQuietHours } from "@/lib/notifications/engine";
import { getAdapter } from "@/lib/notifications/adapter";
import { getPermission, refreshPermission } from "@/lib/notifications/permission";
import { hasNativeBridge, nativeBridge } from "@/lib/native/bridge";
import { syncNativeSchedules } from "@/lib/notifications/native-sync";
import { ensureNotificationWorker } from "@/lib/notifications/sw";
import type { AppData } from "@/lib/schema";

const TICK_MS = 60_000;

/**
 * Client-only notification runner.
 *
 * Runs the rule engine on mount (catch-up), whenever the tab regains focus,
 * and on a slow interval while the app is open. Everything is idempotent via
 * `sourceId`, so repeated runs never duplicate a notification.
 */
export function useNotificationRunner() {
  const hydrated = useAppStore((s) => s._hydrated);
  const navigate = useNavigate();

  // Notification taps inside the APK ask the web app to open a route.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const open = (path: string) => {
      if (!path) return;
      void navigate({ to: path }).catch(() => {});
    };
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") open(detail);
    };
    window.addEventListener("skillsync:open", onOpen as EventListener);
    const bridge = nativeBridge();
    if (bridge) {
      void bridge
        .takePendingRoute()
        .then((r) => {
          if (r?.route) open(r.route);
        })
        .catch(() => {});
    }
    return () => window.removeEventListener("skillsync:open", onOpen as EventListener);
  }, [navigate]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    // Browsers need an active service worker to display notifications at all;
    // the APK uses the native bridge instead.
    if (!hasNativeBridge()) void ensureNotificationWorker();

    let disposed = false;
    // Guard against overlapping runs (interval + focus/visibility can collide).
    let running = false;

    const run = async () => {
      if (disposed || running) return;
      running = true;
      try {
        const state = useAppStore.getState();
        const settings = state.notifications?.settings;
        if (!settings) return;

        // Keep the mirrored permission value honest (native read on Android).
        const permission = await refreshPermission().catch(() => getPermission());
        if (disposed) return;
        if (permission !== settings.permission) {
          state.updateNotificationSettings({ permission });
        }

        const now = new Date();
        const data = state as unknown as AppData;
        const candidates = buildDueCandidates(
          data,
          settings,
          now,
          getLastBackupMeta()?.createdAt ?? null,
        );

        const quiet = isQuietHours(settings, now);
        const adapter = getAdapter();
        const canDeliver = settings.enabled && permission === "granted" && !quiet;

        for (const candidate of candidates) {
          const item = state.pushNotification(candidate);
          if (!item) continue;
          if (canDeliver) {
            void adapter.show(item).then((ok) => {
              if (ok) {
                useAppStore.setState((s) => ({
                  notifications: {
                    ...s.notifications,
                    items: s.notifications.items.map((i) =>
                      i.id === item.id ? { ...i, delivered: true } : i,
                    ),
                  },
                }));
              }
            });
          }
        }

        state.updateNotificationSettings({ lastRunAt: Date.now() });

        // Mirror settings into real Android alarms so reminders fire when closed.
        void syncNativeSchedules(settings, state.preferences?.modules);
      } finally {
        running = false;
      }
    };

    void run();
    const interval = window.setInterval(() => void run(), TICK_MS);
    const onFocus = () => void run();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [hydrated]);
}

/** Unread count for the bell badge. */
export function useUnreadCount() {
  return useAppStore((s) => (s.notifications?.items ?? []).filter((i) => !i.read).length);
}
