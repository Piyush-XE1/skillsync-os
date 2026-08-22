import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Flame } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { roadmapPct } from "@/lib/progress";
import { todayISO, addDaysISO } from "@/lib/date";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — SkillSync" },
      { name: "description", content: "Learning, projects and habit trends." },
      { property: "og:title", content: "Analytics — SkillSync" },
      { property: "og:description", content: "Growth, measured." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const hydrated = useHydrated();
  const roadmaps = useAppStore((s) => s.roadmaps);
  const projects = useAppStore((s) => s.projects);
  const habits = useAppStore((s) => s.habits);
  const habitLogs = useAppStore((s) => s.habitLogs);
  const stats = useAppStore((s) => s.stats);

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

  const last7 = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDaysISO(todayISO(), -6 + i)),
    [],
  );
  const habitBars = last7.map((d) => {
    const done = habitLogs.filter((l) => l.date === d).length;
    const pct = habits.length > 0 ? (done / habits.length) * 100 : 0;
    return { d, pct };
  });

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
          <Card className="p-4">
            <div className="text-[12px] text-muted-foreground">XP</div>
            <div className="mt-2 text-[28px] font-semibold tracking-tight">
              {hydrated ? stats.xp : 0}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Level {hydrated ? stats.level : 0}
            </div>
          </Card>
        </div>

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
          <SectionHeader title="Habit consistency (7 days)" />
          <Card>
            <div className="grid grid-cols-7 items-end gap-2 pt-2">
              {habitBars.map(({ d, pct }) => (
                <div key={d} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-[var(--primary)]/40 to-[var(--primary)]/80"
                    style={{ height: `${8 + pct * 0.6}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{new Date(d).getDate()}</span>
                </div>
              ))}
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
