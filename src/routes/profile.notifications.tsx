import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, BellRing, Info, Moon, ShieldAlert } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/notifications/CategoryIcon";
import { Toggle } from "@/components/common/Toggle";
import { TextField } from "@/components/edit/Fields";
import {
  CATEGORY_META,
  NOTIFICATION_CATEGORIES,
  type CategoryKey,
} from "@/lib/notifications/types";
import {
  PERMISSION_COPY,
  refreshPermission,
  requestPermission,
  type PermissionState,
} from "@/lib/notifications/permission";
import { deliver } from "@/lib/notifications/adapter";
import {
  ensureNotificationWorker,
  inspectEnvironment,
  type NotificationEnvironment,
} from "@/lib/notifications/sw";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile/notifications")({
  head: () => ({
    meta: [
      { title: "Notification settings — SkillSync" },
      {
        name: "description",
        content: "Choose which SkillSync reminders you get, when they arrive, and set quiet hours.",
      },
      { property: "og:title", content: "Notification settings — SkillSync" },
      {
        property: "og:description",
        content: "Per-category reminders, quiet hours and weekly summaries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationSettingsPage,
});

function NotificationSettingsPage() {
  const settings = useAppStore((s) => s.notifications.settings);
  const modules = useAppStore((s) => s.preferences.modules);
  const update = useAppStore((s) => s.updateNotificationSettings);
  const setCategory = useAppStore((s) => s.setNotificationCategory);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [env, setEnv] = useState<NotificationEnvironment | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void refreshPermission().then((current) => {
      if (!alive) return;
      setPermission(current);
      if (current !== settings.permission) update({ permission: current });
    });
    return () => {
      alive = false;
    };
  }, [settings.permission, update]);

  useEffect(() => {
    let alive = true;
    void ensureNotificationWorker().then(() =>
      inspectEnvironment().then((e) => {
        if (alive) setEnv(e);
      }),
    );
    return () => {
      alive = false;
    };
  }, []);

  /** Bypasses all app logic: straight to the delivery layer. */
  const runTest = async () => {
    setTestResult("Sending…");
    const current = await refreshPermission();
    const perm = current === "default" ? await requestPermission() : current;
    setPermission(perm);
    if (perm !== "granted") {
      setTestResult(`Blocked: permission is "${perm}".`);
      setEnv(await inspectEnvironment());
      return;
    }
    await ensureNotificationWorker();
    const result = await deliver({
      id: `test-${Date.now()}`,
      createdAt: Date.now(),
      category: "habits",
      title: "SkillSync test notification",
      body: "If you can see this, delivery works on this device.",
      read: false,
      priority: "normal",
      origin: "manual",
      delivered: false,
      action: { kind: "route", to: "/notifications" },
    });
    setEnv(await inspectEnvironment());
    setTestResult(
      result.ok
        ? `Delivered via ${
            result.via === "native"
              ? "Android's notification manager"
              : result.via === "serviceWorker"
                ? "the service worker"
                : "the browser notification API"
          }.`
        : `Failed: ${result.error ?? "unknown error"}`,
    );
  };

  const copy = PERMISSION_COPY[permission];
  const canAsk = permission === "default";

  const visibleCategories = NOTIFICATION_CATEGORIES.filter((key) => {
    const meta = CATEGORY_META[key];
    if (key === "weeklySummary") return false;
    if (meta.module) return Boolean(modules?.[meta.module]);
    return true;
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Preferences"
        title="Notifications."
        subtitle="Local, offline reminders. Nothing leaves this device."
        right={
          <Link
            to="/profile"
            aria-label="Back"
            className="glass flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
          </Link>
        }
      />

      <div className="space-y-7 px-5 lg:px-2">
        {/* Permission */}
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                permission === "granted" ? "gradient-primary" : "bg-white/[0.04]",
              )}
            >
              {permission === "denied" || permission === "unsupported" ? (
                <ShieldAlert className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              ) : (
                <BellRing
                  className={cn(
                    "h-5 w-5",
                    permission === "granted" ? "text-white" : "text-muted-foreground",
                  )}
                  strokeWidth={1.75}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold tracking-tight">{copy.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {copy.body}
              </p>
              {canAsk ? (
                <button
                  type="button"
                  onClick={async () => {
                    const next = await requestPermission();
                    setPermission(next);
                    update({ permission: next, enabled: next === "granted" });
                  }}
                  className="pressable gradient-primary mt-3 w-full rounded-[14px] py-2.5 text-[13px] font-semibold text-primary-foreground"
                >
                  Allow notifications
                </button>
              ) : null}
            </div>
          </div>
        </Card>

        {/* Master switch */}
        <section className="space-y-3">
          <SectionHeader title="Delivery" />
          <Card className="p-2">
            <div className="divide-y divide-white/[0.05]">
              <div className="flex items-center gap-3 px-3 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03]">
                  <Bell className="h-[16px] w-[16px] text-muted-foreground" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium tracking-tight">System notifications</div>
                  <div className="text-[12px] text-muted-foreground">
                    Show reminders outside the app
                  </div>
                </div>
                <Toggle
                  label="System notifications"
                  on={settings.enabled && permission === "granted"}
                  onChange={(v) => update({ enabled: v })}
                />
              </div>
              <div className="flex items-center gap-3 px-3 py-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03]">
                  <Moon className="h-[16px] w-[16px] text-muted-foreground" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium tracking-tight">Quiet hours</div>
                  <div className="text-[12px] text-muted-foreground">
                    Collect silently, don't interrupt
                  </div>
                </div>
                <Toggle
                  label="Quiet hours"
                  on={settings.quietHours.enabled}
                  onChange={(v) => update({ quietHours: { ...settings.quietHours, enabled: v } })}
                />
              </div>
              {settings.quietHours.enabled ? (
                <div className="flex items-center gap-3 px-3 py-3.5">
                  <div className="flex-1 text-[13px] text-muted-foreground">From</div>
                  <TextField
                    type="time"
                    value={settings.quietHours.from}
                    onChange={(e) =>
                      update({
                        quietHours: { ...settings.quietHours, from: e.target.value },
                      })
                    }
                    className="h-10 w-[104px]"
                  />
                  <div className="text-[13px] text-muted-foreground">to</div>
                  <TextField
                    type="time"
                    value={settings.quietHours.to}
                    onChange={(e) =>
                      update({
                        quietHours: { ...settings.quietHours, to: e.target.value },
                      })
                    }
                    className="h-10 w-[104px]"
                  />
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        {/* Categories */}
        <section className="space-y-3">
          <SectionHeader title="Categories" />
          <Card className="p-2">
            <div className="divide-y divide-white/[0.05]">
              {visibleCategories.map((key: CategoryKey) => {
                const meta = CATEGORY_META[key];
                const setting = settings.categories?.[key] ?? { enabled: true };
                return (
                  <div key={key} className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03]">
                        <CategoryIcon
                          name={meta.icon}
                          className="h-[16px] w-[16px] text-muted-foreground"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium tracking-tight">{meta.label}</div>
                        <div className="text-[12px] leading-snug text-muted-foreground">
                          {meta.description}
                        </div>
                      </div>
                      <Toggle
                        label={meta.label}
                        on={setting.enabled}
                        onChange={(v) => setCategory(key, { enabled: v })}
                      />
                    </div>
                    {meta.timed && setting.enabled ? (
                      <div className="mt-3 flex items-center gap-3 pl-12">
                        <span className="text-[12.5px] text-muted-foreground">Remind at</span>
                        <TextField
                          type="time"
                          value={setting.time ?? meta.defaultTime ?? "09:00"}
                          onChange={(e) => setCategory(key, { time: e.target.value })}
                          className="h-10 w-[104px]"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Weekly summary */}
        <section className="space-y-3">
          <SectionHeader title="Weekly summary" />
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03]">
                <CategoryIcon
                  name={CATEGORY_META.weeklySummary.icon}
                  className="h-[16px] w-[16px] text-muted-foreground"
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium tracking-tight">Weekly digest</div>
                <div className="text-[12px] text-muted-foreground">
                  A recap of check-ins, tasks and level
                </div>
              </div>
              <Toggle
                label="Weekly digest"
                on={settings.weeklySummary.enabled}
                onChange={(v) =>
                  update({ weeklySummary: { ...settings.weeklySummary, enabled: v } })
                }
              />
            </div>
            {settings.weeklySummary.enabled ? (
              <div className="mt-4 flex items-center gap-2">
                <select
                  value={settings.weeklySummary.weekday}
                  onChange={(e) =>
                    update({
                      weeklySummary: {
                        ...settings.weeklySummary,
                        weekday: Number(e.target.value),
                      },
                    })
                  }
                  className="h-11 flex-1 rounded-[14px] border border-border bg-white/[0.03] px-3 text-[14px] text-foreground outline-none"
                >
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((day, i) => (
                    <option key={day} value={i} className="bg-[#111]">
                      {day}
                    </option>
                  ))}
                </select>
                <TextField
                  type="time"
                  value={settings.weeklySummary.time}
                  onChange={(e) =>
                    update({
                      weeklySummary: { ...settings.weeklySummary, time: e.target.value },
                    })
                  }
                  className="w-[112px]"
                />
              </div>
            ) : null}
          </Card>
        </section>

        {/* Diagnostics */}
        <section className="space-y-3">
          <SectionHeader title="Diagnostics" />
          <Card className="p-4">
            <button
              type="button"
              onClick={runTest}
              className="pressable glass w-full rounded-[14px] py-2.5 text-[13px] font-semibold"
            >
              Send test notification
            </button>
            {testResult ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                {testResult}
              </p>
            ) : null}
            {env ? (
              <div className="mt-3 space-y-1.5 border-t border-white/[0.05] pt-3">
                {(env.native
                  ? ([
                      ["Android app (native bridge)", true],
                      ["Native notifications", env.nativeNotificationsEnabled],
                      ["Native haptics", env.nativeHaptics],
                      ["Background scheduling", env.nativeScheduling],
                      ["Exact alarms allowed", env.exactAlarms],
                      ["Permission granted", permission === "granted"],
                    ] as const)
                  : ([
                      ["Installed app", env.standalone],
                      ["Secure context", env.secureContext],
                      ["Notification API", env.notificationApi],
                      ["Service worker API", env.serviceWorkerApi],
                      ["Worker registered", env.swRegistered],
                      ["Worker active", env.swActive],
                      ["Worker controlling page", env.swControlling],
                      ["Permission granted", permission === "granted"],
                    ] as const)
                ).map(([label, ok]) => (
                  <div key={label} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={ok ? "text-emerald-400" : "text-amber-400"}>
                      {ok ? "yes" : "no"}
                    </span>
                  </div>
                ))}
                {env.native ? (
                  <p className="pt-1 text-[12px] text-muted-foreground">
                    {env.scheduledCount ?? 0} reminder
                    {env.scheduledCount === 1 ? "" : "s"} armed at the OS level
                    {env.androidSdk ? ` · Android API ${env.androidSdk}` : ""}
                  </p>
                ) : null}
                {env.error ? <p className="pt-1 text-[12px] text-amber-400">{env.error}</p> : null}
              </div>
            ) : null}
          </Card>
        </section>

        {/* Honest limits */}
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.03]">
              <Info className="h-[16px] w-[16px] text-muted-foreground" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
              <div className="mb-1 text-[13.5px] font-semibold text-foreground">
                How reminders behave
              </div>
              In the browser, reminders are evaluated while SkillSync is open — including a catch-up
              pass every time you launch it, so nothing is lost. Notifications that fire in the
              background while the app is closed need the Android build, which schedules them at the
              OS level. Everything here is stored locally and works fully offline.
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
