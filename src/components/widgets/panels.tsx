import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BookOpen,
  Braces,
  Briefcase,
  CalendarClock,
  CalendarRange,
  Check,
  ChevronRight,
  Circle,
  FolderKanban,
  GraduationCap,
  Quote as QuoteIcon,
  Sparkles,
  StickyNote,
  Timer,
  Trophy,
  Wallet,
  CalendarCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, Chip, ProgressBar } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { WidgetFrame, type WidgetProps } from "./WidgetFrame";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { roadmapPct, topicPct } from "@/lib/progress";
import { todayISO } from "@/lib/date";
import { dailyQuote } from "@/lib/quotes";
import { composeReview } from "@/lib/review";
import { ACHIEVEMENTS, allAchievements } from "@/lib/achievements";
import { habitStreak } from "@/lib/habit-streaks";
import { fireConfetti } from "@/lib/confetti";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { AppData, Roadmap, Topic } from "@/lib/schema";

/**
 * Wide / full-bleed widgets: the lists and hero panels that make the dashboard
 * feel like a cockpit instead of a stats sheet.
 */

/* ---------------------------- continue learning --------------------------- */

function findNextTopic(roadmaps: Roadmap[]): {
  roadmapTitle: string;
  roadmapId: string;
  phaseId: string;
  topic: Topic;
  pct: number;
} | null {
  for (const r of roadmaps) {
    for (const p of r.phases) {
      for (const t of p.topics) {
        const pct = topicPct(t);
        if (pct < 100) {
          return { roadmapTitle: r.title, roadmapId: r.id, phaseId: p.id, topic: t, pct };
        }
      }
    }
  }
  return null;
}

export function ContinueLearningWidget({ size, ...chrome }: WidgetProps) {
  const roadmaps = useAppStore((s) => s.roadmaps);
  const next = useMemo(() => findNextTopic(roadmaps), [roadmaps]);
  const done = roadmaps.length > 0 && !next;

  return (
    <WidgetFrame
      size={size}
      glow
      className="border-white/[0.08]"
      bodyClassName="flex flex-col"
      {...chrome}
    >
      <div className="pointer-events-none absolute inset-0 gradient-mesh opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--primary)]/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-1 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {done ? "All clear" : "Continue learning"}
          </div>
          {next ? (
            <>
              <div className="mt-1.5 truncate text-[18px] font-semibold tracking-tight">
                {next.topic.title}
              </div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">
                {next.roadmapTitle} · {next.pct}% done
              </div>
            </>
          ) : (
            <>
              <div className="mt-1.5 text-[18px] font-semibold tracking-tight">
                Every topic is complete.
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                Time for a new roadmap — or ship the thing you've been learning for.
              </div>
            </>
          )}
        </div>
        <span className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          {done ? (
            <Trophy className="h-5 w-5 text-[var(--warning)]" strokeWidth={1.75} />
          ) : (
            <BookOpen className="h-5 w-5 text-[var(--primary-glow)]" strokeWidth={1.75} />
          )}
        </span>
      </div>
      {next ? (
        <div className="relative mt-4 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={next.pct} tone="gradient" />
          </div>
          <Link
            to="/learn/$roadmapId/$topicId"
            params={{ roadmapId: next.roadmapId, topicId: next.topic.id }}
            search={{ phaseId: next.phaseId }}
            onClick={() => {
              haptics.tap();
              sound.select();
            }}
            className="gradient-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-glow)] transition-transform hover:brightness-110 active:scale-95"
            aria-label={`Open ${next.topic.title}`}
          >
            <ChevronRight className="h-4.5 w-4.5 text-white" strokeWidth={2.25} />
          </Link>
        </div>
      ) : (
        <div className="relative mt-4">
          <Link
            to="/learn"
            onClick={() => sound.select()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:bg-white/[0.08]"
          >
            Browse roadmaps <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </WidgetFrame>
  );
}

/* ---------------------------------- today -------------------------------- */

const PRIORITY_TONE = { high: "danger", medium: "warning", low: "default" } as const;

export function TodayWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const planner = useAppStore((s) => s.planner);
  const updatePlannerTask = useAppStore((s) => s.updatePlannerTask);
  const today = todayISO();

  const todays = useMemo(
    () => planner.filter((t) => t.date === today && !t.done).slice(0, size === "tile" ? 3 : 6),
    [planner, today, size],
  );
  const overdue = useMemo(
    () => planner.filter((t) => t.date < today && !t.done).slice(0, 2),
    [planner, today],
  );

  const complete = (id: string) => {
    const remaining = todays.length + overdue.length;
    updatePlannerTask(id, { done: true, doneAt: Date.now() });
    haptics.success();
    sound.complete();
    // The last task of the day earns a small celebration.
    if (remaining <= 1) {
      fireConfetti({ count: 70, origin: { x: 0.5, y: 0.55 }, ttl: 1.6 });
      sound.streak();
      toast.success("Day cleared", { description: "Every task on today's list is done." });
    }
  };

  return (
    <WidgetFrame
      size={size}
      title="Today"
      icon={<CalendarClock className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/planner"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Planner <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      {!hydrated || (todays.length === 0 && overdue.length === 0) ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled today"
          hint="Add a task in Planner to see it here."
        />
      ) : (
        <div className="space-y-2.5">
          {overdue.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => complete(t.id)}
                aria-label={`Mark ${t.title} done`}
                className="pressable flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--danger)]/45 text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10"
              >
                <Circle className="h-4 w-4" strokeWidth={2} />
              </button>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{t.title}</span>
              <Chip tone="danger">Overdue</Chip>
            </div>
          ))}
          {todays.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => complete(t.id)}
                aria-label={`Mark ${t.title} done`}
                className="pressable group/check flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/15"
              >
                <Check
                  className="h-3.5 w-3.5 text-transparent transition-colors group-hover/check:text-[var(--primary-glow)]"
                  strokeWidth={3}
                />
              </button>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{t.title}</span>
              {t.priority !== "medium" ? (
                <Chip tone={PRIORITY_TONE[t.priority]}>{t.priority}</Chip>
              ) : null}
              {t.time ? <Chip>{t.time}</Chip> : null}
            </div>
          ))}
        </div>
      )}
    </WidgetFrame>
  );
}

/* ---------------------------------- habits -------------------------------- */

export function HabitsWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const habits = useAppStore((s) => s.habits);
  const logs = useAppStore((s) => s.habitLogs);
  const toggleHabitToday = useAppStore((s) => s.toggleHabitToday);
  const today = todayISO();

  const doneSet = useMemo(
    () => new Set(logs.filter((l) => l.date === today).map((l) => l.habitId)),
    [logs, today],
  );

  const toggle = (id: string) => {
    const wasDone = doneSet.has(id);
    toggleHabitToday(id);
    if (wasDone) {
      haptics.tap();
      sound.tap();
      return;
    }
    haptics.success();
    sound.complete();
    // Completing the whole day is the milestone worth celebrating.
    if (doneSet.size + 1 >= habits.length && habits.length > 0) {
      fireConfetti({ count: 90, origin: { x: 0.5, y: 0.6 }, ttl: 1.8 });
      sound.streak();
      toast.success("All habits logged", { description: "Today is a clean sweep." });
    }
  };

  return (
    <WidgetFrame
      size={size}
      title="Operation Rebirth"
      icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/habits"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Habits <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      {!hydrated || habits.length === 0 ? (
        <EmptyState icon={Sparkles} title="No habits yet" hint="Add one on the Habits page." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {habits.map((h) => {
            const done = doneSet.has(h.id);
            const streak = habitStreak(h.id, logs);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => toggle(h.id)}
                aria-pressed={done}
                className={cn(
                  "pressable flex items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] font-medium transition-all active:scale-95",
                  done
                    ? "border-[color-mix(in_oklab,var(--primary)_45%,transparent)] bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-foreground shadow-[0_10px_26px_-18px_var(--glow)]"
                    : "border-white/[0.08] bg-white/[0.03] text-muted-foreground",
                )}
              >
                <span aria-hidden>{h.emoji}</span>
                {h.title}
                {streak.current > 0 ? (
                  <span className="flex items-center gap-0.5 text-[10.5px] text-[var(--warning)]">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                      <path d="M12 2c1.5 3.2.4 5-1 6.6C9.4 10.4 8 12 8 14.5A4.5 4.5 0 0 0 12.5 19 4.5 4.5 0 0 0 17 14.5c0-3.6-2.4-5.4-3.4-8.2-.6 1.4-1.2 2.2-2 3 .2-2.6.6-5 .4-7.3Z" />
                    </svg>
                    {streak.current}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}

/* ------------------------------- week in review --------------------------- */

export function WeekReviewWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const habitLogs = useAppStore((s) => s.habitLogs);
  const planner = useAppStore((s) => s.planner);
  const focusSessions = useAppStore((s) => s.focus.sessions);
  const codingProblems = useAppStore((s) => s.coding.problems);
  const roadmaps = useAppStore((s) => s.roadmaps);

  const review = useMemo(() => {
    const data = useAppStore.getState() as unknown as AppData;
    return composeReview(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitLogs, planner, focusSessions, codingProblems, roadmaps]);

  const maxScore = Math.max(1, ...review.days.map((d) => d.score));

  return (
    <WidgetFrame
      size={size}
      title="Week in review"
      icon={<CalendarRange className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/review"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Full report <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <div className="flex items-start gap-4">
        <div className="glass flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl">
          <span className="text-[20px] leading-none" aria-hidden>
            {review.gradeEmoji}
          </span>
          <span className="mt-1 text-[15px] font-semibold leading-none tracking-tight">
            {hydrated ? review.grade : "—"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium leading-snug tracking-tight">
            {hydrated ? review.headline : "Loading…"}
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">
            Effort score {hydrated ? Math.round(review.score) : "—"} · {review.dayCount} days
          </div>
          <div className="mt-3 flex h-10 items-end gap-1.5" aria-hidden>
            {review.days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full rounded-t-[4px] transition-[height] duration-700 ease-[var(--ease-out-soft)]",
                    d.score > 0 ? "gradient-primary" : "bg-white/[0.07]",
                  )}
                  style={{ height: `${Math.max(6, (d.score / maxScore) * 100)}%` }}
                />
                <span className="text-[9px] uppercase text-muted-foreground/70">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}

/* ---------------------------------- quote -------------------------------- */

export function QuoteWidget({ size, ...chrome }: WidgetProps) {
  const today = todayISO();
  const quote = useMemo(() => dailyQuote(today), [today]);
  return (
    <WidgetFrame size={size} glow {...chrome} className="p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--secondary)]/18 blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <QuoteIcon
          className="h-4 w-4 shrink-0 rotate-180 text-[var(--primary)]"
          strokeWidth={2}
          aria-hidden
        />
        <div>
          <p className="text-[13.5px] font-medium leading-relaxed tracking-tight">{quote.text}</p>
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">— {quote.author}</p>
        </div>
      </div>
    </WidgetFrame>
  );
}

/* ------------------------------- achievements ---------------------------- */

export function AchievementsWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const unlocked = useAppStore((s) => s.stats.achievements);
  const habitLogs = useAppStore((s) => s.habitLogs);
  const roadmaps = useAppStore((s) => s.roadmaps);
  const achievements = useMemo(() => {
    const data = useAppStore.getState() as unknown as AppData;
    return allAchievements(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, habitLogs, roadmaps]);
  const earned = achievements.filter((a) => unlocked.includes(a.id));

  return (
    <WidgetFrame
      size={size}
      title={`Trophy shelf · ${unlocked.length}/${ACHIEVEMENTS.length}`}
      icon={<Trophy className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/achievements"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          All badges <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      {!hydrated || earned.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No badges yet"
          hint="Finish a topic or log a habit to unlock your first."
        />
      ) : (
        <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
          {earned.slice(0, 8).map((a) => (
            <div
              key={a.id}
              className="card-surface min-w-[128px] shrink-0 p-3 text-center transition-transform [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5"
            >
              <div className="text-[24px]" aria-hidden>
                {a.icon}
              </div>
              <div className="mt-1 truncate text-[12px] font-semibold">{a.title}</div>
              <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                {a.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetFrame>
  );
}

/* -------------------------------- next badge ------------------------------ */

export function NextBadgeWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const unlocked = useAppStore((s) => s.stats.achievements);
  const stats = useAppStore((s) => s.stats);
  const habitLogs = useAppStore((s) => s.habitLogs);
  const next = useMemo(() => {
    const data = useAppStore.getState() as unknown as AppData;
    return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id))
      .map((a) => ({
        ...a,
        hint: a.progressHint ? a.progressHint(data) : undefined,
      }))
      .slice(0, size === "tile" ? 2 : 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, stats, habitLogs, size]);

  return (
    <WidgetFrame
      size={size}
      title={`Next badge · ${unlocked.length} earned`}
      icon={<Trophy className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/achievements"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Trophies <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      {!hydrated || next.length === 0 ? (
        <EmptyState icon={Trophy} title="Every badge unlocked" hint="Legend status achieved." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {next.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px] text-muted-foreground"
            >
              <span className="opacity-60" aria-hidden>
                {a.icon}
              </span>
              {a.title}
              {a.hint ? <span className="text-[10.5px] opacity-70">{a.hint}</span> : null}
            </div>
          ))}
        </div>
      )}
    </WidgetFrame>
  );
}

/* ------------------------------- quick access ---------------------------- */

type Shortcut = { icon: typeof BookOpen; label: string; to: string };

export function QuickAccessWidget({ size, ...chrome }: WidgetProps) {
  const modules = useAppStore((s) => s.preferences.modules);
  const shortcuts = useMemo<Shortcut[]>(() => {
    const base: Shortcut[] = [
      { icon: BookOpen, label: "Learn", to: "/learn" },
      { icon: FolderKanban, label: "Projects", to: "/projects" },
      { icon: StickyNote, label: "Notes", to: "/notes" },
      { icon: CalendarClock, label: "Planner", to: "/planner" },
    ];
    if (modules.focus) base.push({ icon: Timer, label: "Focus", to: "/focus" });
    if (modules.coding) base.push({ icon: Braces, label: "DSA", to: "/coding" });
    if (modules.career) base.push({ icon: Briefcase, label: "Career", to: "/career" });
    if (modules.cgpa) base.push({ icon: GraduationCap, label: "CGPA", to: "/cgpa" });
    if (modules.expenses) base.push({ icon: Wallet, label: "Expenses", to: "/expenses" });
    if (modules.attendance)
      base.push({ icon: CalendarCheck2, label: "Attendance", to: "/attendance" });
    return base;
  }, [modules]);

  return (
    <WidgetFrame size={size} title="Quick access" {...chrome}>
      <div
        className={cn(
          "grid gap-2.5",
          size === "full" ? "grid-cols-4 sm:grid-cols-5 lg:grid-cols-10" : "grid-cols-4",
        )}
      >
        {shortcuts.slice(0, size === "full" ? 10 : 8).map(({ icon: Icon, label, to }) => (
          <Link
            key={label}
            to={to}
            onClick={() => {
              haptics.selection();
              sound.select();
            }}
            className="card-surface pressable flex flex-col items-center gap-2 p-3"
          >
            <span className="icon-tile h-9 w-9">
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </span>
            <span className="text-[10.5px] font-medium text-muted-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </WidgetFrame>
  );
}

/* ---------------------------- learning progress --------------------------- */

export function RoadmapsWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const roadmaps = useAppStore((s) => s.roadmaps);
  const shown = roadmaps.slice(0, size === "full" ? 6 : 4);
  return (
    <WidgetFrame
      size={size}
      title="Learning progress"
      icon={<BookOpen className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/learn"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      {!hydrated || roadmaps.length === 0 ? (
        <EmptyState icon={BookOpen} title="No roadmaps" hint="Import or create one in Learn." />
      ) : (
        <div className={cn("gap-4", size === "full" ? "grid grid-cols-2 gap-x-6" : "space-y-4")}>
          {shown.map((r) => {
            const pct = roadmapPct(r);
            return (
              <Link
                key={r.id}
                to="/learn/$roadmapId"
                params={{ roadmapId: r.id }}
                className="block space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: r.color }}
                      aria-hidden
                    />
                    <span className="truncate text-[13px] font-medium">{r.title}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                    {pct}%
                  </span>
                </div>
                <ProgressBar value={pct} tone="gradient" />
              </Link>
            );
          })}
        </div>
      )}
    </WidgetFrame>
  );
}

/* --------------------------------- projects ------------------------------- */

export function ProjectsWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const projects = useAppStore((s) => s.projects);
  const active = useMemo(
    () => projects.filter((p) => p.status !== "done").slice(0, size === "full" ? 6 : 4),
    [projects, size],
  );
  return (
    <WidgetFrame
      size={size}
      title="Projects"
      icon={<FolderKanban className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/projects"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          See all <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      {!hydrated || active.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No active projects"
          hint="Ship something. Add a project to start tracking."
        />
      ) : (
        <div
          className={cn(
            "gap-3",
            size === "full"
              ? "grid sm:grid-cols-2 lg:grid-cols-3"
              : "no-scrollbar -mx-1 flex overflow-x-auto px-1 pb-1",
          )}
        >
          {active.map((p) => (
            <Link
              key={p.id}
              to="/projects"
              className={cn(
                "card-surface space-y-2.5 p-4 transition-transform [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
                size === "full" ? "min-w-0" : "min-w-[200px] max-w-[220px] shrink-0",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Chip tone={p.status === "active" ? "primary" : "success"}>
                  {p.status === "active" ? "In progress" : "Planning"}
                </Chip>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {p.progress}%
                </span>
              </div>
              <div className="truncate text-[14px] font-semibold tracking-tight">{p.title}</div>
              <div className="line-clamp-2 text-[11.5px] text-muted-foreground">
                {p.description || "No description"}
              </div>
              <ProgressBar value={p.progress} tone="gradient" />
            </Link>
          ))}
        </div>
      )}
    </WidgetFrame>
  );
}

/* ---------------------------------- notes -------------------------------- */

export function NotesWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const notes = useAppStore((s) => s.notes);
  const recent = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, size === "full" ? 5 : 3),
    [notes, size],
  );
  return (
    <WidgetFrame
      size={size}
      title="Recent notes"
      icon={<StickyNote className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/notes"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      {!hydrated || recent.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" hint="Capture ideas as you learn." />
      ) : (
        <Card className="p-0" elevated={false}>
          <div className="divide-y divide-white/[0.05]">
            {recent.map((n) => (
              <Link
                key={n.id}
                to="/notes/$noteId"
                params={{ noteId: n.id }}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="icon-tile h-8 w-8 rounded-lg">
                  <StickyNote className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{n.title}</div>
                  <div className="truncate text-[11.5px] text-muted-foreground">
                    {n.body || "Empty"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </WidgetFrame>
  );
}
