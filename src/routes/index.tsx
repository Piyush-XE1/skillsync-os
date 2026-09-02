import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Flame,
  Sparkles,
  Zap,
  BookOpen,
  FolderKanban,
  StickyNote,
  CalendarClock,
  Plus,
  ChevronRight,
  Activity,
  GraduationCap,
  Bell,
  Timer,
  Check,
  Trophy,
  Quote,
  Circle,
  CheckCircle2,
  Braces,
  Briefcase,
} from "lucide-react";
import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import {
  Card,
  Chip,
  CircularProgress,
  ProgressBar,
  SectionHeader,
} from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { Reveal } from "@/components/common/Reveal";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { roadmapPct, topicPct } from "@/lib/progress";
import { todayISO } from "@/lib/date";
import { focusTotals } from "@/lib/focus";
import { dailyQuote } from "@/lib/quotes";
import { allAchievements, ACHIEVEMENTS } from "@/lib/achievements";
import { habitStreak } from "@/lib/habit-streaks";
import { haptics } from "@/lib/haptics";
import { codingStats } from "@/lib/coding";
import { careerStats } from "@/lib/career";
import type { AppData, Roadmap, Topic } from "@/lib/schema";

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

/** First incomplete topic across roadmaps, in roadmap order — "continue here". */
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

const PRIORITY_TONE = { high: "danger", medium: "warning", low: "default" } as const;

function Dashboard() {
  const hydrated = useHydrated();
  const unread = useUnreadCountSafe();
  const stats = useAppStore((s) => s.stats);
  const profile = useAppStore((s) => s.profile);
  const roadmaps = useAppStore((s) => s.roadmaps);
  const notes = useAppStore((s) => s.notes);
  const projects = useAppStore((s) => s.projects);
  const planner = useAppStore((s) => s.planner);
  const habits = useAppStore((s) => s.habits);
  const habitLogs = useAppStore((s) => s.habitLogs);
  const modules = useAppStore((s) => s.preferences.modules);
  const subjects = useAppStore((s) => s.attendance.subjects);
  const focusSessions = useAppStore((s) => s.focus.sessions);
  const codingProblems = useAppStore((s) => s.coding.problems);
  const careerApps = useAppStore((s) => s.career.applications);
  const toggleHabitToday = useAppStore((s) => s.toggleHabitToday);
  const updatePlannerTask = useAppStore((s) => s.updatePlannerTask);

  const today = todayISO();
  const quote = useMemo(() => dailyQuote(today), [today]);

  const todaysTasks = useMemo(
    () => planner.filter((t) => t.date === today && !t.done).slice(0, 3),
    [planner, today],
  );
  const overdue = useMemo(
    () => planner.filter((t) => t.date < today && !t.done).slice(0, 2),
    [planner, today],
  );
  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3),
    [notes],
  );
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "done").slice(0, 4),
    [projects],
  );
  const todayHabitCount = habitLogs.filter((l) => l.date === today).length;
  const xpToNext = stats.xp % 100;
  const focus = useMemo(() => focusTotals(focusSessions), [focusSessions]);
  const nextTopic = useMemo(() => findNextTopic(roadmaps), [roadmaps]);
  const achievements = useMemo(
    () => allAchievements(useAppStore.getState() as unknown as AppData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      stats.achievements,
      stats.streak,
      stats.level,
      habitLogs,
      projects,
      roadmaps,
      notes,
      focusSessions,
    ],
  );
  const unlockedCount = stats.achievements.length;
  const lockedNext = ACHIEVEMENTS.filter((a) => !stats.achievements.includes(a.id)).slice(0, 2);

  const habitTodaySet = useMemo(() => {
    const set = new Set(habitLogs.filter((l) => l.date === today).map((l) => l.habitId));
    return set;
  }, [habitLogs, today]);

  const attendance = useMemo(() => {
    let p = 0;
    let a = 0;
    for (const s of subjects) {
      p += s.present;
      a += s.absent;
    }
    const total = p + a;
    const pct = total > 0 ? Math.round((p / total) * 100) : 0;
    const currentSem = subjects.length > 0 ? Math.max(...subjects.map((s) => s.semester)) : null;
    return { present: p, total, pct, currentSem };
  }, [subjects]);

  const prep = useMemo(() => {
    const code = codingStats(codingProblems);
    const career = careerStats(careerApps);
    return { code, career, show: modules.coding || modules.career };
  }, [codingProblems, careerApps, modules.coding, modules.career]);

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
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              className="glass relative flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
            >
              <Bell className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
              {unread > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[9.5px] font-bold text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          </div>
        }
      />

      <div className="space-y-6 px-5 lg:px-2">
        {/* Stat row */}
        <Reveal>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Flame className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Daily Streak</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? stats.streak : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">days</span>
              </div>
              <div className="mt-3 flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const on = hydrated && i < Math.min(stats.streak, 7);
                  return (
                    <div
                      key={i}
                      className={
                        "h-1.5 flex-1 rounded-full " + (on ? "gradient-primary" : "bg-white/[0.06]")
                      }
                    />
                  );
                })}
              </div>
            </Card>

            <Card className="flex items-center gap-4 p-4">
              <CircularProgress
                value={xpToNext}
                size={64}
                stroke={6}
                label={<span className="text-[14px]">{hydrated ? stats.level : "—"}</span>}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>XP</span>
                </div>
                <div className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight">
                  {hydrated ? stats.xp : "—"}
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  Level {hydrated ? stats.level : "—"} · {xpToNext}/100
                </div>
              </div>
            </Card>

            <Link to="/focus" className="card-surface block p-4 transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Timer className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Focus today</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? focus.todayMinutes : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">min</span>
              </div>
              <div className="mt-3">
                <Chip tone="primary">
                  <Sparkles className="h-3 w-3" /> {focus.sessionsToday} sessions
                </Chip>
              </div>
            </Link>

            <Link
              to="/habits"
              className="card-surface block p-4 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Habits today</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? `${todayHabitCount}/${habits.length}` : "—"}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  value={habits.length > 0 ? (todayHabitCount / habits.length) * 100 : 0}
                  tone="gradient"
                />
              </div>
            </Link>
          </div>
        </Reveal>

        {/* Continue learning */}
        <Reveal delay={60}>
          {nextTopic ? (
            <Card className="relative overflow-hidden border-white/[0.08] p-5">
              <div className="pointer-events-none absolute inset-0 gradient-mesh opacity-70" />
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--primary)]/25 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Continue learning
                    </div>
                    <div className="mt-1.5 truncate text-[18px] font-semibold tracking-tight">
                      {nextTopic.topic.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {nextTopic.roadmapTitle} · {nextTopic.pct}% done
                    </div>
                  </div>
                  <Link
                    to="/learn/$roadmapId/$topicId"
                    params={{ roadmapId: nextTopic.roadmapId, topicId: nextTopic.topic.id }}
                    search={{ phaseId: nextTopic.phaseId }}
                    className="gradient-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-glow)] transition-transform hover:brightness-110 active:scale-95"
                    aria-label="Open topic"
                  >
                    <ChevronRight className="h-4.5 w-4.5 text-white" strokeWidth={2.25} />
                  </Link>
                </div>
                <div className="mt-4">
                  <ProgressBar value={nextTopic.pct} tone="gradient" />
                </div>
              </div>
            </Card>
          ) : (
            <Card className="relative overflow-hidden border-white/[0.08] p-5">
              <div className="pointer-events-none absolute inset-0 gradient-mesh opacity-70" />
              <div className="relative flex items-center gap-4">
                <span className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <Trophy className="h-5 w-5 text-[var(--warning)]" strokeWidth={1.75} />
                </span>
                <div>
                  <div className="text-[15px] font-semibold tracking-tight">
                    Every topic is complete.
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                    Time for a new roadmap — or ship the thing you've been learning for.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </Reveal>

        {/* Smart Today */}
        <Reveal delay={100}>
          <section className="space-y-3">
            <SectionHeader
              title="Today"
              action={
                <Link to="/planner" className="inline-flex items-center gap-1">
                  Planner <ChevronRight className="h-3 w-3" />
                </Link>
              }
            />
            {!hydrated || (todaysTasks.length === 0 && overdue.length === 0) ? (
              <EmptyState
                icon={CalendarClock}
                title="Nothing scheduled today"
                hint="Add a task in Planner to see it here."
              />
            ) : (
              <Card>
                <div className="space-y-2.5">
                  {overdue.map((t) => (
                    <div key={t.id} className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          updatePlannerTask(t.id, { done: true });
                          haptics.success();
                        }}
                        aria-label="Mark done"
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--danger)]/40"
                      >
                        <Circle className="h-4 w-4 text-[var(--danger)]" strokeWidth={2} />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{t.title}</span>
                      <Chip tone="danger">Overdue</Chip>
                    </div>
                  ))}
                  {todaysTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          updatePlannerTask(t.id, { done: true });
                          haptics.success();
                        }}
                        aria-label="Mark done"
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-[var(--primary)]"
                      >
                        <Check className="h-4 w-4 text-transparent" strokeWidth={2.5} />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{t.title}</span>
                      {t.priority !== "medium" ? (
                        <Chip tone={PRIORITY_TONE[t.priority]}>{t.priority}</Chip>
                      ) : null}
                      {t.time ? <Chip>{t.time}</Chip> : null}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </section>
        </Reveal>

        {/* Habits quick toggle */}
        <Reveal delay={120}>
          <section className="space-y-3">
            <SectionHeader title="Operation Rebirth" action={<Link to="/habits">Habits</Link>} />
            <Card className="p-4">
              <div className="flex flex-wrap gap-2">
                {habits.map((h) => {
                  const done = habitTodaySet.has(h.id);
                  const streak = habitStreak(h.id, habitLogs);
                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        toggleHabitToday(h.id);
                        if (!done) haptics.success();
                      }}
                      className={
                        "flex items-center gap-2 rounded-full border px-3 py-2 text-[12.5px] font-medium transition-all active:scale-95 " +
                        (done
                          ? "border-[var(--primary)]/40 bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-foreground"
                          : "border-white/[0.08] bg-white/[0.03] text-muted-foreground")
                      }
                    >
                      <span>{h.emoji}</span>
                      {h.title}
                      {streak.current > 0 ? (
                        <span className="flex items-center gap-0.5 text-[10.5px] text-[var(--warning)]">
                          <Flame className="h-3 w-3" strokeWidth={2} />
                          {streak.current}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </Card>
          </section>
        </Reveal>

        {/* Achievements strip */}
        {hydrated && stats.achievements.length > 0 ? (
          <Reveal delay={140}>
            <section className="space-y-3">
              <SectionHeader title="Achievements" action={<Link to="/profile">All badges</Link>} />
              <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:px-0">
                {achievements
                  .filter((a) => stats.achievements.includes(a.id))
                  .slice(0, 6)
                  .map((a) => (
                    <Card key={a.id} className="min-w-[150px] shrink-0 p-4 text-center">
                      <div className="text-[26px]">{a.icon}</div>
                      <div className="mt-1.5 text-[12.5px] font-semibold">{a.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">
                        {a.description}
                      </div>
                    </Card>
                  ))}
              </div>
            </section>
          </Reveal>
        ) : null}

        {/* Daily insight */}
        <Reveal delay={160}>
          <Card className="relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--secondary)]/20 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <Quote
                className="h-4 w-4 shrink-0 rotate-180 text-[var(--primary)]"
                strokeWidth={2}
              />
              <div>
                <p className="text-[13.5px] font-medium leading-relaxed tracking-tight">
                  {quote.text}
                </p>
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">— {quote.author}</p>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* Next up to unlock */}
        {hydrated && lockedNext.length > 0 ? (
          <Reveal delay={180}>
            <section className="space-y-3">
              <SectionHeader
                title={`Next badge${unlockedCount > 0 ? ` · ${unlockedCount} earned` : ""}`}
              />
              <Card className="flex flex-wrap gap-2 p-4">
                {lockedNext.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px] text-muted-foreground"
                  >
                    <span className="opacity-60">{a.icon}</span>
                    {a.title}
                    {a.progressHint ? (
                      <span className="text-[10.5px] opacity-70">
                        {a.progressHint({ ...useAppStore.getState() } as unknown as AppData)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </Card>
            </section>
          </Reveal>
        ) : null}

        {/* Quick Access */}
        <Reveal delay={120}>
          <section className="space-y-3">
            <SectionHeader title="Quick Access" />
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { icon: BookOpen, label: "Learn", to: "/learn" as const },
                { icon: FolderKanban, label: "Projects", to: "/projects" as const },
                { icon: StickyNote, label: "Notes", to: "/notes" as const },
                { icon: Timer, label: "Focus", to: "/focus" as const },
              ].map(({ icon: Icon, label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="card-surface flex flex-col items-center gap-2 p-3 transition-all active:scale-[0.96]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04]">
                    <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Learning Progress */}
        <Reveal delay={140}>
          <section className="space-y-3">
            <SectionHeader title="Learning Progress" action={<Link to="/learn">See all</Link>} />
            <Card>
              <div className="space-y-4">
                {hydrated &&
                  roadmaps.slice(0, 4).map((r) => {
                    const pct = roadmapPct(r);
                    return (
                      <Link
                        key={r.id}
                        to="/learn/$roadmapId"
                        params={{ roadmapId: r.id }}
                        className="block space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium">{r.title}</span>
                          <span className="text-[12px] text-muted-foreground">
                            {hydrated ? `${pct}%` : "—"}
                          </span>
                        </div>
                        <ProgressBar value={hydrated ? pct : 0} tone="gradient" />
                      </Link>
                    );
                  })}
              </div>
            </Card>
          </section>
        </Reveal>

        {/* Projects */}
        <Reveal delay={160}>
          <section className="space-y-3">
            <SectionHeader title="Projects" action={<Link to="/projects">See all</Link>} />
            {!hydrated || activeProjects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No active projects"
                hint="Ship something. Add a project to start tracking."
              />
            ) : (
              <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 xl:grid-cols-4">
                {activeProjects.map((p) => (
                  <Link
                    key={p.id}
                    to="/projects"
                    className="card-surface min-w-[220px] max-w-[240px] flex-1 space-y-3 p-5 transition-transform lg:min-w-0 lg:max-w-none [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5"
                  >
                    <Chip tone={p.status === "active" ? "primary" : "success"}>
                      {p.status === "active" ? "In progress" : "Planning"}
                    </Chip>
                    <div className="text-[14px] font-semibold tracking-tight">{p.title}</div>
                    <div className="line-clamp-2 text-[12px] text-muted-foreground">
                      {p.description || "No description"}
                    </div>
                    <ProgressBar value={p.progress} tone="gradient" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* Recent Notes */}
        <Reveal delay={180}>
          <section className="space-y-3">
            <SectionHeader title="Recent Notes" action={<Link to="/notes">Open</Link>} />
            {!hydrated || recentNotes.length === 0 ? (
              <EmptyState
                icon={StickyNote}
                title="No notes yet"
                hint="Capture ideas as you learn."
              />
            ) : (
              <Card>
                <div className="divide-y divide-white/[0.05]">
                  {recentNotes.map((n) => (
                    <Link
                      key={n.id}
                      to="/notes/$noteId"
                      params={{ noteId: n.id }}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                        <StickyNote className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{n.title}</div>
                        <div className="truncate text-[11.5px] text-muted-foreground">
                          {n.body || "Empty"}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </section>
        </Reveal>

        {hydrated && modules.attendance ? (
          <Reveal delay={200}>
            <section className="space-y-3">
              <SectionHeader title="Attendance" action={<Link to="/attendance">Open</Link>} />
              <Link
                to="/attendance"
                className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary">
                  <GraduationCap className="h-5 w-5 text-white" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold tracking-tight">
                    {attendance.total > 0
                      ? `${attendance.pct}% overall attendance`
                      : "No attendance data yet"}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {attendance.currentSem
                      ? `Semester ${attendance.currentSem} · ${attendance.present}/${attendance.total} classes`
                      : "Add subjects to start tracking"}
                  </div>
                  {attendance.total > 0 ? (
                    <div className="mt-2">
                      <ProgressBar value={attendance.pct} tone="gradient" />
                    </div>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </Link>
            </section>
          </Reveal>
        ) : null}

        {hydrated && prep.show ? (
          <Reveal delay={210}>
            <section className="space-y-3">
              <SectionHeader title="Placement Prep" />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {modules.coding ? (
                  <Link
                    to="/coding"
                    className="card-surface p-4 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Braces className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>DSA solved</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-[28px] font-semibold tracking-tight">
                        {prep.code.total}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">problems</span>
                    </div>
                    <div className="mt-2 text-[11.5px] text-muted-foreground">
                      🔥 {prep.code.currentStreak}-day streak · {prep.code.thisWeek} this week
                    </div>
                  </Link>
                ) : null}
                {modules.coding ? (
                  <div className="card-surface p-4">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>Today</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-[28px] font-semibold tracking-tight">
                        {prep.code.today}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">solved</span>
                    </div>
                    <div className="mt-2 text-[11.5px] text-muted-foreground">
                      {prep.code.byDifficulty.hard} hard · {prep.code.byDifficulty.medium} medium
                    </div>
                  </div>
                ) : null}
                {modules.career ? (
                  <Link
                    to="/career"
                    className="card-surface p-4 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>Applications</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-[28px] font-semibold tracking-tight">
                        {prep.career.total}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">sent</span>
                    </div>
                    <div className="mt-2 text-[11.5px] text-muted-foreground">
                      {prep.career.active} active · {prep.career.offers} offers
                    </div>
                  </Link>
                ) : null}
                {modules.career ? (
                  <div className="card-surface p-4">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>Interview rounds</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-[28px] font-semibold tracking-tight">
                        {prep.career.interviewStages}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">cleared</span>
                    </div>
                    <div className="mt-2 text-[11.5px] text-muted-foreground">
                      {prep.career.referrals} referrals · {prep.career.responseRate}% response
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </Reveal>
        ) : null}

        <div className="h-4" />

        {/* Floating quick add → planner */}
        <Link
          to="/planner"
          aria-label="Add task"
          className="fixed bottom-28 right-6 z-30 flex h-12 w-12 items-center justify-center gap-2 rounded-full gradient-primary shadow-[var(--shadow-glow)] transition-transform hover:brightness-110 active:scale-95 lg:bottom-10 lg:right-10 lg:h-12 lg:w-auto lg:rounded-[16px] lg:px-5"
        >
          <Plus className="h-5 w-5 text-white" strokeWidth={2.25} />
          <span className="hidden text-[14px] font-medium text-white lg:inline">Add Task</span>
        </Link>
      </div>
    </AppShell>
  );
}

/** Unread count with a safe fallback (runner-dependent). */
function useUnreadCountSafe() {
  return useAppStore((s) => (s.notifications?.items ?? []).filter((n) => !n.read).length);
}
