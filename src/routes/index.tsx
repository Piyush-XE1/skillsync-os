import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Check, LayoutGrid, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { WidgetGrid } from "@/components/widgets/WidgetGrid";
import { DashboardGuidance } from "@/components/dashboard/DashboardGuidance";
import { WidgetCustomizer } from "@/components/widgets/WidgetCustomizer";
import { TypographicQuoteObelisk } from "@/components/home/TypographicQuoteObelisk";
import { ArchetypeSection } from "@/components/home/ArchetypeSection";
import { AntiSelfSection } from "@/components/home/AntiSelfSection";
import { MementoMoriSection } from "@/components/home/MementoMoriSection";
import { UniversalStopwatchModule } from "@/components/home/UniversalStopwatchModule";
import { useAppStore } from "@/store/useAppStore";
import { visibleWidgets } from "@/lib/widgets";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillSync OS — Personal Dashboard & Monograph" },
      {
        name: "description",
        content:
          "Your local-first dashboard for aims, learning, habits, projects, identity, reflection, and deliberate practice.",
      },
      { property: "og:title", content: "SkillSync OS — Personal Dashboard & Monograph" },
      {
        property: "og:description",
        content: "The working dashboard you own, paired with a quieter personal monograph.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "A quiet hour";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "The day closes";
}

/**
 * The working dashboard remains intact: guidance, every persisted widget,
 * customization, drag/keyboard reordering, and quick task entry. Only the old
 * oversized TodayHero tile is retired. The quotation and identity work lead the
 * page, while the complete working dashboard remains directly beneath them.
 */
function Dashboard() {
  const profile = useAppStore((state) => state.profile);
  const layout = useAppStore((state) => state.widgets);
  const modules = useAppStore((state) => state.preferences.modules);

  const [customizing, setCustomizing] = useState(false);
  const [openCustomizer, setOpenCustomizer] = useState(false);

  const shownCount = visibleWidgets(layout, modules).length;
  const firstName = profile.name.trim().split(/\s+/)[0] || "Learner";

  const startCustomizing = () => {
    haptics.impact();
    sound.open();
    setCustomizing(true);
    toast("Customize mode", {
      description: "Drag a card by its grip to rearrange. Tap × to remove one.",
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
      <TypographicHomeHeader firstName={firstName} />

      <section aria-label="Opening personal monograph" className="border-t border-border pt-2">
        <TypographicQuoteObelisk />
        <ArchetypeSection />
      </section>

      <TypeRibbon />

      <div className="px-5 py-12 lg:px-2 lg:py-16">
        <DashboardGuidance />

        <section aria-labelledby="dashboard-heading" className="border-t border-border pt-5">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-numerical text-[9px] tracking-[0.18em] text-primary">
                  01 / LIVE SYSTEMS
                </span>
                <span className="h-px w-8 bg-border" aria-hidden="true" />
              </div>
              <h2
                id="dashboard-heading"
                className="font-editorial mt-2 text-[clamp(2rem,5vw,4.4rem)] font-normal leading-[0.95] tracking-[-0.045em]"
              >
                Your <em className="font-normal text-primary">dashboard.</em>
              </h2>
              <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {customizing
                  ? "Drag the grip to rearrange · × removes"
                  : `${shownCount} working instrument${shownCount === 1 ? "" : "s"} · yours to arrange`}
              </p>
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
                    className="pressable flex h-10 items-center gap-1.5 border border-border bg-surface px-3 text-[11px] font-semibold uppercase tracking-[0.1em]"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span className="hidden sm:inline">Widgets</span>
                  </button>
                  <button
                    type="button"
                    onClick={finishCustomizing}
                    className="pressable gradient-primary flex h-10 items-center gap-1.5 border border-primary px-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-foreground"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Done
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startCustomizing}
                  className="pressable flex h-10 items-center gap-1.5 border border-border bg-surface px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Customize
                </button>
              )}
            </div>
          </div>

          {customizing ? (
            <div className="mb-4 flex items-center gap-2 border border-dashed border-primary/40 bg-primary/[0.04] px-3.5 py-2.5 text-[12px] text-muted-foreground">
              <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2} />
              <span className="min-w-0 flex-1">
                Drag by the grip, or focus one and press{" "}
                <kbd className="border border-border bg-surface-2 px-1 font-numerical text-[10px]">
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
                className="pressable flex h-7 w-7 items-center justify-center border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
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
                className="pressable flex min-h-10 items-center gap-1.5 border-b border-border px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Add or arrange widgets
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <section aria-label="Personal monograph continuation" className="border-t border-border pt-2">
        <AntiSelfSection />
        <MementoMoriSection />
        <UniversalStopwatchModule />
      </section>

      <footer className="px-5 pb-8 pt-10 lg:px-2">
        <div className="border-t border-border pt-6 text-center">
          <p className="font-editorial text-lg text-foreground/80">
            Private by design. Deliberate by practice.
          </p>
          <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Local-first · Cloud backup only when you choose
          </p>
        </div>
      </footer>

      <WidgetCustomizer
        open={openCustomizer}
        onClose={() => {
          sound.close();
          setOpenCustomizer(false);
        }}
      />

      {customizing ? (
        <button
          type="button"
          onClick={finishCustomizing}
          className={cn(
            "gradient-primary fixed bottom-28 right-6 z-30 flex h-12 items-center gap-2 border border-primary px-5",
            "transition-transform active:scale-[0.98] lg:bottom-10 lg:right-10",
          )}
        >
          <Check className="h-5 w-5 text-primary-foreground" strokeWidth={2.25} />
          <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-foreground">
            Done
          </span>
        </button>
      ) : (
        <Link
          to="/planner"
          aria-label="Add task"
          onClick={() => {
            haptics.tap();
            sound.tap();
          }}
          className="gradient-primary fixed bottom-28 right-6 z-30 flex h-12 w-12 items-center justify-center gap-2 border border-primary transition-transform active:scale-[0.98] lg:bottom-10 lg:right-10 lg:w-auto lg:px-5"
        >
          <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.25} />
          <span className="hidden text-[12px] font-semibold uppercase tracking-[0.1em] text-primary-foreground lg:inline">
            Add task
          </span>
        </Link>
      )}
    </AppShell>
  );
}

function TypographicHomeHeader({ firstName }: { firstName: string }) {
  const words = greeting().split(" ");
  const lead = words.shift() ?? "Good";
  const remainder = words.join(" ");

  return (
    <header className="px-5 lg:px-2">
      <div className="flex items-center justify-between gap-4 border-y border-border py-3">
        <div className="font-numerical text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Index / SkillSync OS
        </div>
        <nav aria-label="Home utilities" className="flex items-center gap-1">
          <Link
            to="/search"
            aria-label="Search SkillSync"
            onClick={() => sound.select()}
            className="pressable flex h-9 w-9 items-center justify-center border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          >
            <Search className="h-4 w-4" strokeWidth={1.6} />
          </Link>
          <Link
            to="/notifications"
            aria-label="Notifications"
            onClick={() => sound.select()}
            className="pressable relative flex h-9 w-9 items-center justify-center border border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          >
            <Bell className="h-4 w-4" strokeWidth={1.6} />
            <UnreadBadge />
          </Link>
        </nav>
      </div>

      <div className="py-9 sm:py-12 lg:py-16">
        <div className="editorial-kicker mb-5">Field notes / Today</div>
        <h1 className="text-balance leading-[0.82] tracking-[-0.065em]">
          <span className="block font-sans text-[clamp(2.2rem,7vw,6.6rem)] font-light uppercase text-foreground/90">
            {lead}{" "}
            {remainder ? (
              <em className="font-editorial normal-case font-normal text-primary">{remainder}</em>
            ) : null}
          </span>
          <span className="font-editorial mt-3 block text-[clamp(4.2rem,14vw,12.5rem)] font-normal">
            <ChromaticWord value={firstName} />
            <span className="text-primary">.</span>
          </span>
        </h1>
      </div>
    </header>
  );
}

const LETTER_COLOURS = [
  "text-primary",
  "text-foreground",
  "text-info",
  "text-foreground",
  "text-success",
  "text-foreground",
  "text-danger",
];

function ChromaticWord({ value }: { value: string }) {
  return (
    <span aria-label={value}>
      {Array.from(value).map((letter, index) => (
        <span
          aria-hidden="true"
          className={LETTER_COLOURS[index % LETTER_COLOURS.length]}
          key={`${letter}-${index}`}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

function TypeRibbon() {
  const phrase = "LEARN / BUILD / FOCUS / REVIEW / ITERATE / ";
  return (
    <div
      className="type-ribbon border-y border-border py-3"
      aria-label="Learn, build, focus, review, iterate"
    >
      <div className="type-ribbon-track font-numerical text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
        <span>{phrase}</span>
        <span aria-hidden="true" className="text-primary">
          {phrase}
        </span>
        <span aria-hidden="true">{phrase}</span>
        <span aria-hidden="true" className="text-info">
          {phrase}
        </span>
      </div>
    </div>
  );
}

function UnreadBadge() {
  const unread = useAppStore(
    (state) => state.notifications?.items?.filter((item) => !item.read).length ?? 0,
  );
  if (!unread) return null;
  return (
    <span className="font-numerical absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-primary-foreground">
      {unread > 9 ? "9+" : unread}
    </span>
  );
}
