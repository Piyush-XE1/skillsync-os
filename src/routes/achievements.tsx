import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Zap, Lock, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  Chip,
  CircularProgress,
  ProgressBar,
  SectionHeader,
} from "@/components/ui/primitives";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { ACHIEVEMENTS, allAchievements } from "@/lib/achievements";
import type { AppData } from "@/lib/schema";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — SkillSync" },
      { name: "description", content: "Your SkillSync badge collection and XP milestones." },
      { property: "og:title", content: "Achievements — SkillSync" },
      { property: "og:description", content: "Every badge you've earned on your growth journey." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const hydrated = useHydrated();
  const stats = useAppStore((s) => s.stats);

  // Fresh snapshot each render; re-renders whenever `stats` (achievements) change.
  const data = useAppStore.getState() as unknown as AppData;
  const unlockedSet = useMemo(() => new Set(stats.achievements), [stats.achievements]);
  const ordered = allAchievements(data);
  const unlockedCount = stats.achievements.length;
  const total = ACHIEVEMENTS.length;
  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const xpEarned = useMemo(
    () => ordered.reduce((s, a) => s + (unlockedSet.has(a.id) ? a.xp : 0), 0),
    [ordered, unlockedSet],
  );
  const xpPossible = useMemo(() => ACHIEVEMENTS.reduce((s, a) => s + a.xp, 0), []);

  // Player titles unlocked at milestones — a fun level of "flex".
  const titles = [
    { at: 1, label: "Explorer" },
    { at: 8, label: "Builder" },
    { at: 16, label: "Achiever" },
    { at: 24, label: "Grandmaster" },
  ];
  const currentTitle = [...titles].reverse().find((t) => unlockedCount >= t.at)?.label ?? "Rookie";

  const nextBadge = ACHIEVEMENTS.filter((a) => !unlockedSet.has(a.id)).slice(0, 3);

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
          Collection
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Achievements.
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Every badge, earned the hard way.
        </p>
      </div>

      <div className="space-y-6 px-5 lg:px-2 lg:auto-grid-wide lg:space-y-0 lg:items-start">
        {/* HERO */}
        <Card className="relative overflow-hidden p-5 lg:col-span-full">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--primary)]/20 blur-3xl" />
          <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <CircularProgress
                value={pct}
                size={92}
                stroke={8}
                label={<span className="text-[22px]">{hydrated ? `${pct}%` : "—"}</span>}
              />
              <div>
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Trophy className="h-3.5 w-3.5 text-[var(--warning)]" strokeWidth={1.75} />
                  <span>{currentTitle}</span>
                </div>
                <div className="mt-1 text-[26px] font-semibold leading-none tracking-tight">
                  {hydrated ? unlockedCount : "—"}
                  <span className="text-[15px] text-muted-foreground"> / {total} badges</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-[var(--primary)]" strokeWidth={2} />
                  {hydrated ? `${xpEarned}` : "—"} / {xpPossible} badge XP
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="text-[20px] font-semibold tracking-tight">
                  {hydrated ? unlockedCount : "—"}
                </div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  Unlocked
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="text-[20px] font-semibold tracking-tight">
                  {hydrated ? stats.level : "—"}
                </div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  Level
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="text-[20px] font-semibold tracking-tight">
                  {hydrated ? stats.streak : "—"}
                </div>
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  Streak
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* CLOSEST BADGES */}
        {nextBadge.length > 0 ? (
          <section className="space-y-3 lg:col-span-full">
            <SectionHeader title="Closest to unlock" />
            <div className="grid gap-3 sm:grid-cols-3">
              {nextBadge.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-[20px] grayscale">
                      {a.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold tracking-tight">
                        {a.title}
                      </div>
                      <div className="truncate text-[11.5px] text-muted-foreground">
                        {a.description}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={badgeProgress(a, data)} tone="gradient" />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {a.progressHint ? a.progressHint(data) : `+${a.xp} XP`}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {/* ALL BADGES */}
        <section className="space-y-3 lg:col-span-full">
          <SectionHeader title="All badges" />
          <div className="auto-grid">
            {ordered.map((a) => {
              const unlocked = unlockedSet.has(a.id);
              return (
                <Card
                  key={a.id}
                  className={
                    "relative overflow-hidden p-4 " +
                    (unlocked ? "border-[color-mix(in_oklab,var(--primary)_40%,transparent)]" : "")
                  }
                >
                  {unlocked ? (
                    <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[var(--primary)]/25 blur-2xl" />
                  ) : null}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div
                        className={
                          "flex h-11 w-11 items-center justify-center rounded-2xl text-[22px] " +
                          (unlocked
                            ? "bg-[var(--primary)]/15"
                            : "bg-white/[0.04] grayscale opacity-60")
                        }
                      >
                        {a.icon}
                      </div>
                    </div>
                    {unlocked ? (
                      <Chip tone="primary">+{a.xp} XP</Chip>
                    ) : (
                      <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        Locked
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-[14px] font-semibold tracking-tight">{a.title}</div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                    {a.description}
                  </div>
                  {!unlocked && a.progressHint ? (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {a.progressHint(data)}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/** Progress toward an achievement, if its check exposes a numeric target. */
function badgeProgress(a: (typeof ACHIEVEMENTS)[number], data: AppData): number {
  if (isUnlocked(a, data)) return 100;
  const hint = a.progressHint?.(data) ?? "";
  const match = hint.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const cur = Number(match[1]);
    const max = Number(match[2]);
    if (max > 0) return Math.min(100, Math.round((cur / max) * 100));
  }
  return 0;
}

function isUnlocked(a: (typeof ACHIEVEMENTS)[number], data: AppData): boolean {
  return data.stats.achievements.includes(a.id);
}
