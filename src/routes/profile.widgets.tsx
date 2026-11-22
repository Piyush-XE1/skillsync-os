import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  NotebookPen,
  Plus,
  RefreshCw,
  Smartphone,
  SquareCheckBig,
  Wallet,
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
        content:
          "Put a sticky note, expense logger and habit checkmarks on your Android home screen.",
      },
      { property: "og:title", content: "Home screen widgets — SkillSync" },
      {
        property: "og:description",
        content: "Three native Android launcher widgets, backed by your local workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WidgetsPage,
});

const ICONS: Record<HomeWidgetType, LucideIcon> = {
  sticky_note: NotebookPen,
  expense_logger: Wallet,
  habit_check: SquareCheckBig,
};

function WidgetsPage() {
  const hydrated = useHydrated();
  const native = hasNativeBridge();
  const data = useAppStore(useShallow(toAppData));
  const [status, setStatus] = useState<NativeWidgetStatus | null>(null);
  const [pinning, setPinning] = useState<HomeWidgetType | null>(null);
  const [syncing, setSyncing] = useState(false);

  const snapshot = hydrated ? buildWidgetSnapshot(data) : null;

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
            Android · {HOME_WIDGETS.length} launcher widgets
          </div>
          <h1 className="font-editorial truncate text-[26px] font-normal leading-tight tracking-[-0.03em]">
            Home screen
          </h1>
        </div>
      </header>

      <div className="space-y-4 px-5 pb-24 lg:px-2">
        <div className="rounded-[18px] border border-[color-mix(in_oklab,var(--primary)_24%,transparent)] bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))] px-4 py-3.5">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            These are real Android launcher widgets — they sit next to your other apps, not inside
            SkillSync. Long-press your device home screen →{" "}
            <span className="text-foreground">Widgets</span> →{" "}
            <span className="text-foreground">SkillSync</span> to add them.
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/75">
            The sticky note stays on the device. Expense logging and habit checkmarks use the same
            local records as the app.
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
                Browsers cannot place launcher widgets. Open SkillSync on Android and long-press an
                empty spot on your home screen → Widgets → SkillSync. The previews below mirror what
                the APK draws.
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
                      Your launcher may not open a pin dialog — add it from the widget picker
                      instead.
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
                body: "Tap Add and confirm the launcher sheet, or long-press your device home screen → Widgets → SkillSync.",
              },
              {
                title: "Write or log in place",
                body: "The sticky note edits on the launcher. Expense logging opens the full form. Habit blocks check straight from the widget.",
              },
              {
                title: "One source of truth",
                body: "Habits and expenses shown by widgets come from the same local store the app uses; taps are replayed into it on resume.",
              },
              {
                title: "Quiet about refreshing",
                body: "Widgets repaint when data changes, every 30 minutes, and just after midnight — never in a polling loop.",
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
            Widgets never send anything off the device. The note stays in Android local storage;
            habits come from a snapshot the app writes.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

/* ------------------------------- previews ------------------------------- */

/** In-spirit previews of the native RemoteViews layouts. */
function WidgetPreview({
  type,
  snapshot,
}: {
  type: HomeWidgetType;
  snapshot: WidgetSnapshot | null;
}) {
  if (type === "sticky_note") {
    return (
      <div className="pointer-events-none select-none rounded-[8px] border border-[#d8cbb2] bg-[#f1e8d6] p-3 shadow-[0_6px_18px_rgba(0,0,0,0.28)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-[#d9c9a8]" />
        <div className="mt-2 flex items-center justify-between border-b border-[#d8cbb2]/70 pb-1.5">
          <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#6f6250]">
            Note
          </span>
          <span className="text-[8px] uppercase tracking-[0.1em] text-[#8d7f69]">Edit ✎</span>
        </div>
        <p className="mt-2 font-serif text-[12px] italic leading-snug text-[#3b342c]">
          Tap the note to write something worth remembering.
        </p>
      </div>
    );
  }

  if (type === "expense_logger") {
    return (
      <div className="pointer-events-none flex select-none items-center gap-3">
        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-[10px] border border-[#C29F62]/40 bg-[#101014] shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
          <span className="font-editorial text-[24px] leading-none text-[#C29F62]">+</span>
          <span className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-[#a5a09a]">
            Spend
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          One tap opens every expense field — title, amount, date, description, tags and type.
        </p>
      </div>
    );
  }

  const habits = snapshot?.habits ?? [];
  const done = snapshot?.today.habitsDone ?? 0;
  const total = snapshot?.today.habitsTotal ?? 0;
  return (
    <div className="pointer-events-none select-none rounded-[10px] border border-white/[0.08] bg-black/45 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[8px] uppercase tracking-[0.16em] text-primary">Today</span>
        <span className="text-[8px] text-muted-foreground">
          {done} of {total}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {(habits.length
          ? habits.slice(0, 3)
          : [{ id: "x", title: "No habits yet", done: false }]
        ).map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 rounded-md bg-white/[0.035] px-2 py-1"
          >
            <span
              className={
                "flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border text-[8px] " +
                (entry.done
                  ? "border-[#4ADE80] bg-[#4ADE80]/20 text-[#4ADE80]"
                  : "border-white/20 text-transparent")
              }
            >
              ✓
            </span>
            <span className="min-w-0 flex-1 truncate text-[9.5px] text-foreground/90">
              {entry.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
