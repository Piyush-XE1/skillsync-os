import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, Bell, Check, LayoutGrid, Plus, SlidersHorizontal, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { WidgetGrid } from "@/components/widgets/WidgetGrid";
import { WidgetCustomizer } from "@/components/widgets/WidgetCustomizer";
import { useAppStore } from "@/store/useAppStore";
import { visibleWidgets } from "@/lib/widgets";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillSync — Personal Growth OS" },
      {
        name: "description",
        content:
          "Your personal growth operating system: roadmaps, projects, habits and daily focus in one place.",
      },
      { property: "og:title", content: "SkillSync — Personal Growth OS" },
      {
        property: "og:description",
        content: "Roadmaps, projects, habits, and daily focus in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Good night";
}

function todayDateLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * The dashboard is a widget grid the user owns: every panel — streaks, XP,
 * focus, habits, week in review, projects, notes — is a widget that can be
 * hidden, resized and dragged into place. Layout persists with the workspace.
 *
 * Two modes:
 *  - **Live** (default) — widgets are inert surfaces; taps and scrolls behave
 *    normally, nothing is draggable.
 *  - **Customize** — grips appear, the grid jiggles, drag/keyboard reordering
 *    is armed, and ✕ / resize controls show on every card.
 */
function Dashboard() {
  const profile = useAppStore((s) => s.profile);
  const layout = useAppStore((s) => s.widgets);
  const modules = useAppStore((s) => s.preferences.modules);

  const [customizing, setCustomizing] = useState(false);
  const [openCustomizer, setOpenCustomizer] = useState(false);

  const shownCount = visibleWidgets(layout, modules).length;

  const startCustomizing = () => {
    haptics.impact();
    sound.open();
    setCustomizing(true);
    toast("Customize mode", {
      description: "Drag a card by its grip to rearrange. Tap ✕ to remove one.",
      duration: 4200,
    });
  };

  const finishCustomizing = () => {
    haptics.success();
    sound.success();
    setCustomizing(false);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={todayDateLabel()}
        title={`${greeting()}${profile.name ? `, ${profile.name.split(" ")[0]}` : ""}.`}
        subtitle="Small steps, compounded daily."
        right={
          <div className="flex items-center gap-2">
            <Link
              to="/search"
              aria-label="Search"
              onClick={() => sound.select()}
              className="glass flex h-10 items-center gap-2 rounded-full px-3.5 text-[11px] font-medium text-muted-foreground transition-transform active:scale-95"
            >
              <Activity className="h-[15px] w-[15px]" strokeWidth={1.75} />
              <span className="hidden sm:inline">Search…</span>
              <kbd className="hidden rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[9.5px] sm:inline">
                /
              </kbd>
            </Link>
            <Link
              to="/notifications"
              aria-label="Notifications"
              onClick={() => sound.select()}
              className="glass relative flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              <Bell className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
              <UnreadBadge />
            </Link>
          </div>
        }
      />

      <div className="px-5 pb-24 lg:px-2">
        {/* Dashboard toolbar */}
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {customizing ? "Customizing" : "Your dashboard"}
            </div>
            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground/70">
              {customizing
                ? "Drag the grip to rearrange · ✕ removes"
                : `${shownCount} widget${shownCount === 1 ? "" : "s"} · yours to arrange`}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {customizing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    sound.open();
                    setOpenCustomizer(true);
                  }}
                  className="pressable glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span className="hidden sm:inline">Widgets</span>
                </button>
                <button
                  type="button"
                  onClick={finishCustomizing}
                  className="pressable gradient-primary flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Done
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startCustomizing}
                className="pressable glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} />
                Customize
              </button>
            )}
          </div>
        </div>

        {customizing ? (
          <div className="mb-4 flex items-center gap-2 rounded-[16px] border border-dashed border-[color-mix(in_oklab,var(--primary)_35%,transparent)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] px-3.5 py-2.5 text-[12px] text-muted-foreground">
            <LayoutGrid
              className="h-3.5 w-3.5 shrink-0 text-[var(--primary-glow)]"
              strokeWidth={2}
            />
            <span className="min-w-0 flex-1">
              Drag by the grip, or focus one and press{" "}
              <kbd className="rounded border border-white/10 bg-white/[0.05] px-1 text-[10px]">
                Space
              </kbd>{" "}
              then the arrow keys.
            </span>
            <button
              type="button"
              onClick={() => {
                sound.close();
                setCustomizing(false);
              }}
              aria-label="Exit customize mode"
              className="pressable flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : null}

        <WidgetGrid customizing={customizing} />

        {!customizing ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={startCustomizing}
              className="pressable flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.02] px-3.5 py-2 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,transparent)] hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Add or arrange widgets
            </button>
          </div>
        ) : null}
      </div>

      <WidgetCustomizer
        open={openCustomizer}
        onClose={() => {
          sound.close();
          setOpenCustomizer(false);
        }}
      />

      {/* Floating quick add → planner (swapped for a Done control while editing) */}
      {customizing ? (
        <button
          type="button"
          onClick={finishCustomizing}
          className={cn(
            "fixed bottom-28 right-6 z-30 flex h-12 items-center gap-2 rounded-full gradient-primary px-5",
            "shadow-[var(--shadow-glow)] transition-transform hover:brightness-110 active:scale-95",
            "lg:bottom-10 lg:right-10",
          )}
        >
          <Check className="h-5 w-5 text-white" strokeWidth={2.25} />
          <span className="text-[14px] font-medium text-white">Done</span>
        </button>
      ) : (
        <Link
          to="/planner"
          aria-label="Add task"
          onClick={() => {
            haptics.tap();
            sound.tap();
          }}
          className="fixed bottom-28 right-6 z-30 flex h-12 w-12 items-center justify-center gap-2 rounded-full gradient-primary shadow-[var(--shadow-glow)] transition-transform hover:brightness-110 active:scale-95 lg:bottom-10 lg:right-10 lg:h-12 lg:w-auto lg:rounded-[16px] lg:px-5"
        >
          <Plus className="h-5 w-5 text-white" strokeWidth={2.25} />
          <span className="hidden text-[14px] font-medium text-white lg:inline">Add Task</span>
        </Link>
      )}
    </AppShell>
  );
}

/** Unread pip, kept in its own component so it subscribes to the store alone. */
function UnreadBadge() {
  const unread = useAppStore((s) => (s.notifications?.items ?? []).filter((n) => !n.read).length);
  if (unread <= 0) return null;
  return (
    <span className="absolute right-1.5 top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[9.5px] font-bold text-primary-foreground">
      {unread > 9 ? "9+" : unread}
    </span>
  );
}
