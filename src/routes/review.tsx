import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  Award,
  CalendarRange,
  ChevronRight,
  Flame,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { AreaChart, BarChart, DonutChart, Sparkline } from "@/components/common/Charts";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { composeReview } from "@/lib/review";
import { focusDaily } from "@/lib/trends";
import { getAxisLabel } from "@/components/common/Charts";
import { effortByDay } from "@/lib/trends";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { fireConfetti } from "@/lib/confetti";
import type { AppData } from "@/lib/schema";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Week in Review — SkillSync" },
      {
        name: "description",
        content: "A weekly report card for your growth: streaks, wins, deltas and next-up nudges.",
      },
      { property: "og:title", content: "Week in Review — SkillSync" },
      { property: "og:description", content: "Your week, reviewed & measured." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

function weekLabel(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function ReviewPage() {
  const hydrated = useHydrated();
  const data = useAppStore((s) => s);
  const review = useMemo(() => composeReview(data as unknown as AppData), [data]);
  const activeDays = review.days.filter((d) => d.score > 0).length;

  // Small chart series so the review feels alive.
  const focusSeries = useMemo(
    () =>
      focusDaily(data as unknown as AppData, 7).map((d) => ({
        label: getAxisLabel(d.label),
        value: d.value,
      })),
    [data],
  );
  const effortSeries = useMemo(
    () =>
      effortByDay(data as unknown as AppData, 7).map((d) => ({
        label: getAxisLabel(d.label),
        value: d.value,
      })),
    [data],
  );
  const solvedSeries = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const p of data.coding.problems) {
      const iso = new Date(p.solvedAt).toISOString().slice(0, 10);
      perDay.set(iso, (perDay.get(iso) ?? 0) + 1);
    }
    const today = new Date().toISOString().slice(0, 10);
    return Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - (6 - i));
      const iso = dt.toISOString().slice(0, 10);
      return { label: getAxisLabel(iso), value: perDay.get(iso) ?? 0 };
    });
  }, [data.coding.problems]);

  const goodWeek = review.score >= 90;

  const celebrate = () => {
    haptics.success();
    sound.streak();
    fireConfetti({ count: 120, origin: { x: 0.5, y: 0.35 }, ttl: 2 });
  };

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <button
          onClick={celebrate}
          className="glass flex h-10 items-center gap-2 rounded-full px-4 text-[12px] font-medium text-muted-foreground transition-transform active:scale-95"
        >
          <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
          Celebrate
        </button>
      </header>

      <div className="mb-6 px-5 lg:px-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Week in Review
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          {weekLabel(review.start, review.end)}.
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Your growth, reviewed & measured.
        </p>
      </div>

      <div className="space-y-5 px-5 lg:px-2 lg:auto-grid-wide lg:space-y-0 lg:items-start">
        {/* HERO */}
        <Card className="relative overflow-hidden p-5 lg:col-span-full">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--primary)]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[var(--secondary)]/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg viewBox="0 0 96 96" width={96} height={96} className="-rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="oklch(1 0 0 / 0.07)"
                    strokeWidth={9}
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="url(#rg)"
                    strokeWidth={9}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - Math.min(1, review.score / 260))}
                    style={{ transition: "stroke-dashoffset 900ms var(--ease-out-soft)" }}
                  />
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--secondary)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[26px] font-semibold leading-none tracking-tight">
                    {hydrated ? review.score : "—"}
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    pts
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-[var(--warning)]" strokeWidth={1.75} />
                  {review.gradeEmoji} {review.grade}
                </div>
                <div className="mt-1.5 text-fluid-title font-semibold leading-[1.1] tracking-[-0.025em]">
                  {review.headline}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarRange className="h-3.5 w-3.5 text-[var(--warning)]" strokeWidth={2} />
                    {activeDays} active day{activeDays === 1 ? "" : "s"}
                  </span>
                  <span className="text-white/10">·</span>
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-[var(--primary-glow)]" strokeWidth={2} />
                    {data.goals.length} aim{data.goals.length === 1 ? "" : "s"} in focus
                  </span>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
              <MiniStat label="Best day" value={review.bestDay ? review.bestDay.label : "—"} />
              <MiniStat
                label="Active days"
                value={`${review.days.filter((d) => d.score > 0).length}/7`}
              />
              <MiniStat
                label="Grade"
                value={`${review.score >= 90 ? "A" : review.score >= 45 ? "B" : "C"}`}
              />
            </div>
          </div>
        </Card>

        {/* DAY BARS */}
        <section className="space-y-3 lg:col-span-full">
          <SectionHeader title="Day by day" />
          <Card className="p-4 sm:p-5">
            <div className="flex items-end gap-2">
              {review.days.map((d) => {
                const max = Math.max(10, ...review.days.map((x) => x.score));
                const h = Math.max(4, (d.score / max) * 110);
                const best = review.bestDay?.date === d.date;
                return (
                  <div
                    key={d.date}
                    className="group relative flex flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      className={cn(
                        "w-full rounded-lg transition-all duration-300",
                        d.score === 0
                          ? "bg-white/[0.05]"
                          : best
                            ? "gradient-primary shadow-[var(--shadow-glow)]"
                            : "bg-gradient-to-t from-[var(--primary)]/30 to-[var(--primary)]/80",
                      )}
                      style={{ height: `${h}px` }}
                    >
                      <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-[var(--popover)] px-2 py-1 text-[10.5px] font-medium opacity-0 shadow-[var(--shadow-float)] transition-opacity group-hover:opacity-100">
                        {d.score} pts
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" strokeWidth={2} />
                {review.days.filter((d) => d.score > 0).length} active day
                {review.days.filter((d) => d.score > 0).length === 1 ? "" : "s"}
              </span>
              {review.bestDay ? (
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-[var(--warning)]" strokeWidth={2} />
                  Best: {review.bestDay.label} · {review.bestDay.score} pts
                </span>
              ) : null}
            </div>
          </Card>
        </section>

        {/* METRICS */}
        <section className="space-y-3 lg:col-span-full">
          <SectionHeader title="This week vs last week" />
          <div className="auto-grid">
            {review.metrics.map((m) => {
              const up = m.delta > 0;
              const down = m.delta < 0;
              return (
                <Card key={m.key} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px]">{m.emoji}</span>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[11.5px] font-medium",
                        up ? "text-success" : down ? "text-danger" : "text-muted-foreground",
                      )}
                    >
                      {up ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : down ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : null}
                      {up ? `+${m.delta}` : down ? `${m.delta}` : "0"}
                    </span>
                  </div>
                  <div className="mt-2 text-[22px] font-semibold leading-none tracking-tight tabular-nums">
                    {hydrated ? m.value : "—"}
                  </div>
                  <div className="mt-1 text-[11.5px] text-muted-foreground">{m.label}</div>
                  <div className="mt-2.5">
                    <ProgressBar
                      value={Math.min(100, m.value > 0 ? m.value * 8 : 0)}
                      tone={up ? "gradient" : down ? "danger" : "muted"}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* NARRATIVE */}
        <section className="space-y-3">
          <SectionHeader title="Highlights" />
          <Card className="p-5">
            {review.highlights.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">
                No wins yet this week — the first one is one small action away.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {review.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary-glow)]">
                      <Award className="h-3 w-3" strokeWidth={2.25} />
                    </span>
                    <span className="text-foreground/90">{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeader title="What to focus on" />
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" strokeWidth={2} />
              Small nudges, big compounding.
            </div>
            <ul className="space-y-2.5">
              {review.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]/15 text-[var(--secondary-foreground)]">
                    <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* CHARTS */}
        <section className="space-y-3 lg:col-span-full">
          <SectionHeader title="Week at a glance" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>Effort</span>
                <span>{effortSeries.reduce((s, d) => s + d.value, 0)} pts</span>
              </div>
              <div className="h-16">
                <Sparkline data={effortSeries} color="var(--primary-glow)" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>Deep work</span>
                <span>{focusSeries.reduce((s, d) => s + d.value, 0)} min</span>
              </div>
              <div className="h-16">
                <Sparkline data={focusSeries} color="var(--secondary)" />
              </div>
            </Card>
            <Card className="p-4 sm:col-span-2">
              <div className="mb-2 flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>Problems solved</span>
                <span>{solvedSeries.reduce((s, d) => s + d.value, 0)} this week</span>
              </div>
              <BarChart data={solvedSeries} height={120} color="var(--primary)" showAxis={false} />
            </Card>
          </div>
        </section>

        {goodWeek ? (
          <button
            onClick={celebrate}
            className="card-surface flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-[13.5px] font-semibold text-foreground transition-transform active:scale-[0.98] lg:col-span-full"
          >
            <Flame className="h-4 w-4 text-[var(--warning)]" strokeWidth={2} />
            Solid week — celebrate it
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[15px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}
