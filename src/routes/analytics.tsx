import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Flame, Timer, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CircularProgress, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { Heatmap, type HeatCell } from "@/components/common/Heatmap";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { roadmapPct } from "@/lib/progress";
import { todayISO, addDaysISO } from "@/lib/date";
import { minutesByDay, focusTotals, focusStreak } from "@/lib/focus";
import { habitStreak } from "@/lib/habit-streaks";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — SkillSync" },
      { name: "description", content: "Learning, projects, focus and habit trends." },
      { property: "og:title", content: "Analytics — SkillSync" },
      { property: "og:description", content: "Growth, measured." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

const ACTIVITY_DAYS = 90;

function AnalyticsPage() {
  const hydrated = useHydrated();
  const data = useAppStore((s) => s);
  const roadmaps = data.roadmaps;
  const projects = data.projects;
  const habits = data.habits;
  const habitLogs = data.habitLogs;
  const stats = data.stats;

  const overallLearning = useMemo(
    () =>
      roadmaps.length === 0
        ? 0
        : Math.round(roadmaps.reduce((s, r) => s + roadmapPct(r), 0) / roadmaps.length),
    [roadmaps],
  );

  const projectProgress = useMemo(
    () =>
      projects.length === 0
        ? 0
        : Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length),
    [projects],
  );

  /* ---------------------------------------------------------- activity -- */
  const activity = useMemo(() => {
    const perDay = new Map<string, number>();
    const bump = (dateISO: string, weight: number) =>
      perDay.set(dateISO, (perDay.get(dateISO) ?? 0) + weight);
    for (const l of habitLogs) bump(l.date, 2);
    for (const s of data.focus.sessions) bump(todayISO(new Date(s.startedAt)), 2);
    for (const t of data.planner) if (t.doneAt) bump(todayISO(new Date(t.doneAt)), 2);
    for (const r of roadmaps)
      for (const p of r.phases)
        for (const t of p.topics) if (t.completedAt) bump(todayISO(new Date(t.completedAt)), 4);
    for (const c of data.coding.problems) bump(todayISO(new Date(c.solvedAt)), 3);

    const today = todayISO();
    const cells: HeatCell[] = Array.from({ length: ACTIVITY_DAYS }).map((_, i) => {
      const date = addDaysISO(today, -(ACTIVITY_DAYS - 1 - i));
      const count = perDay.get(date) ?? 0;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 8 ? 3 : 4;
      return { date, level };
    });
    return { cells, total: [...perDay.values()].reduce((a, b) => a + b, 0) };
  }, [data.focus.sessions, data.planner, data.coding.problems, habitLogs, roadmaps]);

  /* -------------------------------------------------------- velocity ---- */
  const topicsDoneDates = useMemo(() => {
    const dates: string[] = [];
    for (const r of roadmaps)
      for (const p of r.phases)
        for (const t of p.topics) if (t.completedAt) dates.push(todayISO(new Date(t.completedAt)));
    return dates;
  }, [roadmaps]);

  const velocity = useMemo(() => {
    const today = todayISO();
    const since = (from: number) =>
      topicsDoneDates.filter((d) => d >= addDaysISO(today, from) && d <= today).length;
    const last7 = since(-6);
    const prev7 = since(-13) - last7;
    const delta = last7 - prev7;
    return { last7, prev7, delta };
  }, [topicsDoneDates]);

  /* ------------------------------------------------------------ focus --- */
  const focusWeek = useMemo(() => minutesByDay(data.focus.sessions, 14), [data.focus.sessions]);
  const focus = useMemo(() => focusTotals(data.focus.sessions), [data.focus.sessions]);
  const deepStreak = useMemo(() => focusStreak(data.focus.sessions), [data.focus.sessions]);

  const habitCells = useMemo(() => {
    const today = todayISO();
    const days = 70; // 10 weeks
    const dates = Array.from({ length: days }).map((_, i) => addDaysISO(today, -(days - 1 - i)));
    const dateSet = new Set(habitLogs.map((l) => l.date));
    return habits.slice(0, 6).map((h) => {
      const mine = new Set(habitLogs.filter((l) => l.habitId === h.id).map((l) => l.date));
      return {
        habit: h,
        streak: habitStreak(h.id, habitLogs),
        cells: dates.map((date) => ({ date, level: mine.has(date) ? 3 : 0 })) as HeatCell[],
        days: dates.length,
      };
    });
  }, [habitLogs, habits]);

  const xpToNext = stats.xp % 100;

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
      </header>

      <div className="mb-6 px-5 lg:px-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Insights
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Analytics.
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">Progress, quietly measured.</p>
      </div>

      <div className="space-y-6 px-5 lg:px-2 lg:auto-grid-wide lg:space-y-0 lg:items-start">
        <div className="grid grid-cols-2 gap-3 lg:col-span-full lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-[12px] text-muted-foreground">Learning</div>
            <div className="mt-2 text-[28px] font-semibold tracking-tight">
              {hydrated ? overallLearning : 0}%
            </div>
            <div className="mt-2">
              <ProgressBar value={hydrated ? overallLearning : 0} tone="gradient" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-muted-foreground">Projects</div>
            <div className="mt-2 text-[28px] font-semibold tracking-tight">
              {hydrated ? projectProgress : 0}%
            </div>
            <div className="mt-2">
              <ProgressBar value={hydrated ? projectProgress : 0} tone="gradient" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[12px] text-muted-foreground">Streak</div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold tracking-tight">
                {hydrated ? stats.streak : 0}
              </span>
              <Flame className="h-4 w-4 text-[var(--warning)]" />
            </div>
          </Card>
          <Card className="flex items-center gap-4 p-4">
            <CircularProgress
              value={xpToNext}
              size={64}
              stroke={6}
              label={<span className="text-[13px]">{hydrated ? stats.level : "—"}</span>}
            />
            <div>
              <div className="text-[12px] text-muted-foreground">Level progress</div>
              <div className="mt-1 flex items-center gap-1.5 text-[16px] font-semibold tracking-tight">
                <Zap className="h-3.5 w-3.5 text-[var(--primary)]" strokeWidth={2} />
                {hydrated ? stats.xp : 0} XP
              </div>
            </div>
          </Card>
        </div>

        {/* Activity heatmap */}
        <section className="space-y-3 lg:col-span-full">
          <SectionHeader title={`Activity (${ACTIVITY_DAYS} days)`} />
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12.5px] text-muted-foreground">
                {hydrated ? `${activity.total} actions logged` : "—"} · habits, focus, topics &
                tasks
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Less</span>
                {[0, 1, 2, 3, 4].map((l) => (
                  <span key={l} data-level={l} className="heat-cell" />
                ))}
                <span className="text-[10px] text-muted-foreground">More</span>
              </div>
            </div>
            <Heatmap cells={activity.cells} weeks={Math.ceil(ACTIVITY_DAYS / 7)} />
          </Card>
        </section>

        {/* Velocity */}
        <section className="space-y-3">
          <SectionHeader title="Learning velocity" />
          <Card className="space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[32px] font-semibold tracking-tight">
                {hydrated ? velocity.last7 : "—"}
              </span>
              <span className="text-[12px] text-muted-foreground">topics this week</span>
            </div>
            <div
              className={
                "flex items-center gap-1.5 text-[12.5px] font-medium " +
                (velocity.delta >= 0 ? "text-success" : "text-danger")
              }
            >
              {velocity.delta >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
              )}
              {velocity.delta === 0
                ? "Same pace as last week"
                : `${Math.abs(velocity.delta)} ${velocity.delta >= 0 ? "more" : "fewer"} than last week`}
            </div>
            <ProgressBar
              value={
                velocity.prev7 > 0
                  ? (velocity.last7 / Math.max(1, velocity.prev7)) * 100
                  : velocity.last7 > 0
                    ? 100
                    : 0
              }
              tone="gradient"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Last week: {velocity.prev7}</span>
              <span>This week: {velocity.last7}</span>
            </div>
          </Card>
        </section>

        {/* Focus */}
        <section className="space-y-3">
          <SectionHeader title="Deep work (14 days)" />
          <Card className="p-4">
            <div className="flex h-24 items-end gap-1">
              {focusWeek.map(({ date, minutes }) => (
                <div key={date} className="group relative flex flex-1 flex-col items-center">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-[var(--primary)]/40 to-[var(--primary)]/90"
                    style={{
                      height: `${minutes > 0 ? Math.max(5, (minutes / 120) * 80) : 3}px`,
                      opacity: minutes > 0 ? 1 : 0.25,
                    }}
                    title={`${minutes}m`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" strokeWidth={2} />
                {focus.todayMinutes}m today · {focus.totalMinutes}m total
              </span>
              <span className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-[var(--warning)]" strokeWidth={2} />
                {deepStreak} day streak
              </span>
            </div>
          </Card>
        </section>

        {/* Habit consistency */}
        <section className="space-y-3 lg:col-span-full">
          <SectionHeader title="Habit consistency (10 weeks)" />
          {habits.length === 0 ? (
            <Card className="p-6 text-center text-[12.5px] text-muted-foreground">
              No habits yet.
            </Card>
          ) : (
            <Card className="divide-y divide-white/[0.05] p-4">
              {habitCells.map(({ habit, streak, cells }) => (
                <div key={habit.id} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
                  <div className="flex w-28 shrink-0 items-center gap-2">
                    <span>{habit.emoji}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-medium">{habit.title}</div>
                      <div className="text-[10.5px] text-muted-foreground">
                        {streak.current} current · {streak.best} best
                      </div>
                    </div>
                  </div>
                  <Heatmap cells={cells} weeks={10} className="min-w-0 flex-1 justify-end" />
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* Roadmaps */}
        <section className="space-y-3">
          <SectionHeader title="Roadmap completion" />
          <Card>
            <div className="space-y-4">
              {roadmaps.length === 0 ? (
                <div className="text-center text-[12.5px] text-muted-foreground">
                  No roadmaps yet.
                </div>
              ) : (
                roadmaps.map((r) => {
                  const pct = roadmapPct(r);
                  return (
                    <div key={r.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium">{r.title}</span>
                        <span className="text-[12px] text-muted-foreground">
                          {hydrated ? `${pct}%` : "—"}
                        </span>
                      </div>
                      <ProgressBar value={hydrated ? pct : 0} tone="gradient" />
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Projects" />
          <Card>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="text-center text-[12.5px] text-muted-foreground">
                  No projects yet.
                </div>
              ) : (
                projects.map((p) => (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">{p.title}</span>
                      <span className="text-[11.5px] text-muted-foreground">{p.progress}%</span>
                    </div>
                    <ProgressBar value={p.progress} tone="gradient" />
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
