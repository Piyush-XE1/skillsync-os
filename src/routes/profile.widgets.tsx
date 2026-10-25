import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarCheck,
  Check,
  LayoutGrid,
  Wallet,
  Plus,
  Quote,
  RefreshCw,
  Smartphone,
  Sun,
  Target,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { toAppData, useAppStore, useHydrated } from "@/store/useAppStore";
import {
  HOME_WIDGETS,
  buildWidgetSnapshot,
  type HomeWidgetType,
  type WidgetSnapshot,
} from "@/lib/home-widgets";
import {
  hasNativeBridge,
  nativePinWidget,
  nativeWidgetRefresh,
  nativeWidgetStatus,
  nativeWidgetSync,
  type NativeWidgetStatus,
} from "@/lib/native/bridge";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";

export const Route = createFileRoute("/profile/widgets")({
  head: () => ({
    meta: [
      { title: "Home screen widgets — SkillSync" },
      {
        name: "description",
        content: "Put SkillSync habits, focus, aims and tasks on your phone's home screen.",
      },
      { property: "og:title", content: "Home screen widgets — SkillSync" },
      {
        property: "og:description",
        content: "Nine Android home screen widgets that update from your local workspace.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary" },
    ],
  }),
  component: WidgetsPage,
});

const ICONS: Record<HomeWidgetType, LucideIcon> = {
  overview: LayoutGrid,
  today: Sun,
  habits: Activity,
  focus: Timer,
  expenses: Wallet,
  planner: CalendarCheck,
  aims: Target,
  stats: BarChart3,
  quote: Quote,
  quick: Zap,
};

function WidgetsPage() {
  const hydrated = useHydrated();
  const native = hasNativeBridge();
  const data = useAppStore(useShallow(toAppData));
  const [status, setStatus] = useState<NativeWidgetStatus | null>(null);
  const [pinning, setPinning] = useState<HomeWidgetType | null>(null);
  const [syncing, setSyncing] = useState(false);

  const snapshot = useMemo(() => (hydrated ? buildWidgetSnapshot(data) : null), [data, hydrated]);

  const refreshStatus = async () => {
    if (!native) return;
    setStatus(await nativeWidgetStatus());
  };

  useEffect(() => {
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native]);

  const handlePin = async (type: HomeWidgetType) => {
    haptics.impact();
    sound.tap();
    setPinning(type);
    try {
      const result = await nativePinWidget(type);
      if (!result) {
        toast("Widgets live on your home screen in the Android app.", {
          description: "Open SkillSync on your phone to add them.",
        });
      } else if (!result.supported) {
        toast("Your launcher doesn't offer in-app pinning", {
          description: "Long-press an empty spot on your home screen → Widgets → SkillSync.",
        });
      } else if (result.ok) {
        toast.success("Confirm the widget on your home screen");
      } else {
        toast.error("The launcher didn't open its pin dialog");
      }
      await refreshStatus();
    } finally {
      setPinning(null);
    }
  };

  const handleSync = async () => {
    if (!native) return;
    setSyncing(true);
    haptics.tap();
    try {
      const pushed = await nativeWidgetSync(buildWidgetSnapshot(toAppData(useAppStore.getState())));
      await nativeWidgetRefresh();
      await refreshStatus();
      if (pushed) toast.success("Widgets synced");
      else toast.error("Couldn't reach the widget service");
    } finally {
      setSyncing(false);
    }
  };

  const pinningSupported = status?.pinningSupported ?? false;
  const syncedLabel = status?.syncedAt
    ? new Date(status.syncedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3 px-5 pt-1 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-11 w-11 items-center justify-center rounded-[5px] active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Android · {HOME_WIDGETS.length} widgets
          </div>
          <h1 className="font-editorial truncate text-[26px] font-normal leading-tight tracking-[-0.03em]">
            Home screen
          </h1>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-24 lg:px-2">
        <div className="rounded-[18px] border border-[color-mix(in_oklab,var(--primary)_24%,transparent)] bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))] px-4 py-3.5">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            These are real Android home screen widgets — they sit next to your other apps, not
            inside SkillSync. Everything is rendered from your on-device data, so they work with no
            internet and the app closed.
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/75">
            Habit check-ins and planner completions happen straight from the widget.
          </p>
        </div>

        {!native ? (
          <Card className="flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04]">
              <Smartphone className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold tracking-tight">
                Add these on your phone
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                Open SkillSync on Android, then long-press an empty spot on your home screen →
                <span className="text-foreground"> Widgets </span>→
                <span className="text-foreground"> SkillSync</span>. The previews below show exactly
                what each widget draws.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold tracking-tight">Widget sync</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {syncedLabel ? `Last pushed at ${syncedLabel}` : "Not synced yet"}
                  {status && status.pendingActions > 0
                    ? ` · ${status.pendingActions} tap${status.pendingActions === 1 ? "" : "s"} waiting`
                    : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="pressable flex h-10 items-center gap-2 rounded-full border border-border-strong bg-white/[0.03] px-3.5 text-[12px] font-medium disabled:opacity-50"
              >
                <RefreshCw
                  className={"h-3.5 w-3.5 " + (syncing ? "animate-spin" : "")}
                  strokeWidth={1.9}
                />
                Sync now
              </button>
            </div>
          </Card>
        )}

        <section className="space-y-3">
          <SectionHeader title="Widget gallery" action={native ? "Add in one tap" : "Android"} />
          <div className="grid gap-3 md:grid-cols-2">
            {HOME_WIDGETS.map((widget) => {
              const Icon = ICONS[widget.type];
              const busy = pinning === widget.type;
              return (
                <Card key={widget.type} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04]">
                      <Icon className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[14px] font-semibold tracking-tight">
                          {widget.title}
                        </div>
                        <Chip>{widget.size}</Chip>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {widget.description}
                      </p>
                    </div>
                  </div>

                  <WidgetPreview type={widget.type} snapshot={snapshot} />

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[11px] text-muted-foreground/80">
                      {widget.interaction}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handlePin(widget.type)}
                      disabled={!native || busy}
                      className="pressable flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--primary)_38%,transparent)] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] px-3 text-[11.5px] font-medium text-foreground disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      {native ? "Add" : "Android"}
                    </button>
                  </div>
                  {native && !pinningSupported ? (
                    <p className="text-[10.5px] leading-relaxed text-muted-foreground/70">
                      Your launcher may not open a pin dialog — if nothing happens, add it from the
                      launcher&apos;s widget picker instead.
                    </p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="How it works" />
          <Card className="space-y-3 p-4">
            {[
              {
                title: "Add one",
                body: "Tap Add and confirm the launcher sheet — or long-press your home screen → Widgets → SkillSync.",
              },
              {
                title: "Tap to change things",
                body: "Habit rows and planner tasks toggle in place, with the app closed. Aims and quote open the app.",
              },
              {
                title: "Every size is yours",
                body: "All widgets resize. Taller habit and task widgets simply show more rows.",
              },
              {
                title: "Always up to date",
                body: "Widgets repaint whenever the workspace changes, every 30 minutes, and just after midnight.",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_16%,transparent)]">
                  <Check className="h-3 w-3 text-primary" strokeWidth={2.4} />
                </span>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold tracking-tight">{item.title}</div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </div>
            ))}
          </Card>
          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/70">
            Widgets never send anything off the device. They read the same local snapshot the app
            writes — nothing more.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

/* ------------------------------- previews ------------------------------- */

/** Mirrors the native formatter: grouped thousands, decimals only when present. */
function money(value: number, currency = "₹") {
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  return (
    currency +
    value.toLocaleString(undefined, {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    })
  );
}

/** A faithful-in-spirit mock of what the native RemoteViews widget draws. */
function WidgetPreview({
  type,
  snapshot,
}: {
  type: HomeWidgetType;
  snapshot: WidgetSnapshot | null;
}) {
  const data = snapshot;
  const habits = data?.habits ?? [];
  const tasks = data?.tasks ?? [];
  const aims = data?.aims ?? [];
  const doneHabits = data?.today.habitsDone ?? 0;
  const totalHabits = data?.today.habitsTotal ?? 0;
  const taskDone = data?.today.tasksDoneToday ?? 0;
  const taskTotal = data?.today.tasksToday ?? 0;

  const heading = (eyebrow: string, meta = "") => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[8px] uppercase tracking-[0.16em] text-primary">{eyebrow}</span>
      <span className="text-[8px] text-muted-foreground">{meta}</span>
    </div>
  );

  const row = (mark: string, title: string, meta = "", done = false) => (
    <div
      key={`${mark}-${title}-${meta}`}
      className="flex items-center gap-1.5 rounded-md bg-white/[0.035] px-2 py-1"
    >
      <span className={"text-[9px] " + (done ? "text-emerald-400" : "text-primary")}>{mark}</span>
      <span
        className={
          "min-w-0 flex-1 truncate text-[9.5px] " +
          (done ? "text-muted-foreground line-through" : "text-foreground/90")
        }
      >
        {title}
      </span>
      {meta ? <span className="text-[8px] text-muted-foreground">{meta}</span> : null}
    </div>
  );

  const meter = (pct: number) => (
    <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );

  const statCells = (items: { label: string; value: string }[]) => (
    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
      {items.map((item) => (
        <div key={item.label} className="rounded-md bg-white/[0.035] px-1.5 py-1">
          <div className="truncate text-[10px] font-semibold text-foreground/90">{item.value}</div>
          <div className="truncate text-[7px] uppercase tracking-[0.08em] text-muted-foreground">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="pointer-events-none select-none rounded-[16px] border border-white/[0.08] bg-black/45 p-2.5">
      {type === "today" ? (
        <>
          {heading("Today", data ? "synced" : "not synced")}
          <div className="mt-1 truncate text-[13px] font-semibold tracking-tight">
            {totalHabits === 0 ? "No habits yet" : `${doneHabits} of ${totalHabits} habits`}
          </div>
          {meter(totalHabits === 0 ? 0 : (doneHabits / totalHabits) * 100)}
          {statCells([
            { label: "deep work", value: `${data?.today.focusMinutes ?? 0}m` },
            { label: "tasks", value: `${taskDone}/${taskTotal}` },
            { label: "solves", value: String(data?.today.solvesToday ?? 0) },
          ])}
          <div className="mt-1.5 font-mono text-[11px] tracking-[0.2em] text-primary">
            {data?.sparkline ?? "▁▁▁▁▁▁▁"}
          </div>
        </>
      ) : null}

      {type === "habits" ? (
        <>
          {heading("Habits", `${doneHabits} of ${totalHabits}`)}
          {meter(totalHabits === 0 ? 0 : (doneHabits / totalHabits) * 100)}
          <div className="mt-1.5 space-y-1">
            {(habits.length
              ? habits.slice(0, 3)
              : [{ id: "x", title: "No habits yet", streak: 0, done: false }]
            ).map((habit) =>
              row(
                habit.done ? "✓" : "○",
                habit.title,
                habit.streak > 0 ? `${habit.streak}d` : "",
                habit.done,
              ),
            )}
          </div>
        </>
      ) : null}

      {type === "focus" ? (
        <>
          {heading("Focus", data ? "synced" : "not synced")}
          <div className="mt-1 text-[15px] font-semibold tracking-tight">
            {data?.focus.todayMinutes ?? 0}m
          </div>
          <div className="text-[8.5px] text-muted-foreground">
            of {data?.focus.goalMinutes ?? 100}m goal
            {data && data.focus.streak > 0 ? ` · ${data.focus.streak}-day streak` : ""}
          </div>
          {meter(
            ((data?.focus.todayMinutes ?? 0) / Math.max(1, data?.focus.goalMinutes ?? 100)) * 100,
          )}
          <div className="mt-1.5 flex gap-1">
            {["15m", "25m", "50m"].map((label) => (
              <span
                key={label}
                className={
                  "flex-1 rounded-full py-1 text-center text-[8.5px] " +
                  (label === "25m"
                    ? "border border-primary/60 bg-primary/15 text-primary"
                    : "border border-white/10 bg-white/[0.04] text-foreground/80")
                }
              >
                {label}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {type === "planner" ? (
        <>
          {heading("Today's plan", `${taskDone} of ${taskTotal} done`)}
          {meter(taskTotal === 0 ? 0 : (taskDone / taskTotal) * 100)}
          <div className="mt-1.5 space-y-1">
            {(tasks.length
              ? tasks.slice(0, 3)
              : [{ id: "x", title: "Nothing planned yet", time: "", done: false, priority: "low" }]
            ).map((task) => row(task.done ? "✓" : "□", task.title, task.time, task.done))}
          </div>
        </>
      ) : null}

      {type === "expenses" ? (
        <>
          {heading("Spend", data ? "synced" : "not synced")}
          <div className="mt-1 text-[15px] font-semibold tracking-tight">
            {money(data?.expenses.todaySpend ?? 0, data?.expenses.currency)}
          </div>
          <div className="truncate text-[8.5px] text-muted-foreground">
            {data && data.expenses.monthlyBudget > 0
              ? `of ${money(data.expenses.monthlyBudget, data.expenses.currency)} this month · ${money(data.expenses.monthSpend, data.expenses.currency)} spent`
              : `${data?.expenses.todayCount ?? 0} today · ${money(data?.expenses.monthSpend ?? 0, data?.expenses.currency)} this month`}
          </div>
          {meter(
            data && data.expenses.monthlyBudget > 0
              ? (data.expenses.monthSpend / data.expenses.monthlyBudget) * 100
              : 0,
          )}
          <div className="mt-1.5 flex gap-1">
            {[...(data?.expenses.chips ?? [50, 100, 250])].map((chip) => (
              <span
                key={chip}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.04] py-1 text-center text-[8.5px] text-foreground/80"
              >
                {money(chip, data?.expenses.currency)}
              </span>
            ))}
            <span className="rounded-full border border-primary/60 bg-primary/15 px-2 py-1 text-center text-[8.5px] font-semibold text-primary">
              ＋
            </span>
          </div>
        </>
      ) : null}

      {type === "aims" ? (
        <>
          {heading("Aims", aims.length ? `${aims.length} pinned` : "")}
          <div className="mt-1.5 space-y-1">
            {(aims.length
              ? aims.slice(0, 3)
              : [{ id: "x", title: "No aims pinned yet", note: "" }]
            ).map((aim) => (
              <div
                key={aim.id}
                className="flex items-center gap-1.5 rounded-md bg-white/[0.035] px-2 py-1"
              >
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span className="min-w-0 flex-1 truncate text-[9.5px] text-foreground/90">
                  {aim.title}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {type === "stats" ? (
        <>
          {heading("Stats", data ? "synced" : "not synced")}
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {[
              { label: "solves today", value: String(data?.stats.solvesToday ?? 0) },
              { label: "this week", value: String(data?.stats.solvesWeek ?? 0) },
              { label: "best streak", value: `${data?.stats.bestStreak ?? 0}d` },
              { label: "cgpa", value: data?.stats.cgpa || "—" },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[12px] font-semibold text-foreground/90">{item.value}</div>
                <div className="text-[7px] uppercase tracking-[0.08em] text-muted-foreground">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {type === "quote" ? (
        <>
          {heading("Daily perspective", data ? "today" : "")}
          <p className="mt-1 line-clamp-3 text-[10px] italic leading-relaxed text-foreground/90">
            “{data?.quote.text ?? "Open SkillSync for today's perspective."}”
          </p>
          <div className="mt-1 text-[7.5px] uppercase tracking-[0.1em] text-muted-foreground">
            — {data?.quote.author ?? "SkillSync"}
          </div>
        </>
      ) : null}

      {type === "quick" ? (
        <>
          {heading("Quick capture")}
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            {["＋ Task", "＋ Note", "＋ Habit", "＋ Spend", "Focus", "Analytics"].map((label) => (
              <span
                key={label}
                className={
                  "rounded-full py-1 text-center text-[8.5px] " +
                  (label === "Focus"
                    ? "border border-primary/60 bg-primary/15 text-primary"
                    : "border border-white/10 bg-white/[0.04] text-foreground/80")
                }
              >
                {label}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {type === "overview" ? (
        <>
          {heading("SkillSync OS", data ? "synced" : "not synced")}
          <div className="mt-1 truncate text-[12px] font-semibold tracking-tight">
            {data?.profile.name ? `${data.profile.name} · today` : "Today"}
          </div>
          <div className="truncate text-[8.5px] text-muted-foreground">
            {doneHabits}/{totalHabits} habits · {data?.today.focusMinutes ?? 0}m focus · {taskDone}/
            {taskTotal} tasks
          </div>
          {meter(totalHabits === 0 ? 0 : (doneHabits / totalHabits) * 100)}
          <div className="mt-1.5 space-y-1">
            {habits
              .slice(0, 2)
              .map((habit) =>
                row(
                  habit.done ? "✓" : "○",
                  habit.title,
                  habit.streak > 0 ? `${habit.streak}d` : "",
                  habit.done,
                ),
              )}
            {tasks
              .slice(0, 2)
              .map((task) => row(task.done ? "✓" : "□", task.title, task.time, task.done))}
          </div>
          <div className="mt-1.5 font-mono text-[10px] tracking-[0.2em] text-primary">
            {data?.sparkline ?? "▁▁▁▁▁▁▁"}
          </div>
        </>
      ) : null}
    </div>
  );
}
