import type { CodingProblem, CodingPlatform, CodingDifficulty } from "./schema";
import { addDaysISO, todayISO, dateISO } from "./date";

export type CodingStats = {
  total: number;
  byDifficulty: Record<CodingDifficulty, number>;
  byPlatform: Record<CodingPlatform, number>;
  tags: { tag: string; count: number }[];
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalComplexity: number;
  currentStreak: number;
  bestStreak: number;
  currentRating: number;
  maxRating: number;
};

/**
 * Number of problems solved on a given calendar day (default today).
 */
export function solvedOn(problems: CodingProblem[], day: string = todayISO()): number {
  return problems.filter((p) => dateISO(new Date(p.solvedAt)) === day).length;
}

/**
 * Current and best "solve streak" — consecutive calendar days with at least
 * one problem solved. The current streak counts back from today (or yesterday
 * if nothing was solved today, so a streak isn't broken until a full day skips).
 */
export function solveStreak(problems: CodingProblem[]): { current: number; best: number } {
  if (problems.length === 0) return { current: 0, best: 0 };

  const days = new Set(problems.map((p) => dateISO(new Date(p.solvedAt))));
  const today = todayISO();

  let best = 0;
  let running = 0;
  // Walk backwards from today; if today has activity we start the streak at
  // today, otherwise allow it to start from yesterday (streak not yet broken).
  let cursor = days.has(today) ? today : addDaysISO(today, -1);
  while (days.has(cursor)) {
    running += 1;
    best = Math.max(best, running);
    cursor = addDaysISO(cursor, -1);
  }
  // Detect any historical streak longer than the tail run.
  if (days.size > 0) {
    const sorted = [...days].sort();
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const diffDays = Math.round(
        (new Date(`${cur}T00:00:00`).getTime() - new Date(`${prev}T00:00:00`).getTime()) /
          86_400_000,
      );
      if (diffDays === 1) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 1;
      }
    }
  }

  return { current: running, best: Math.max(best, running) };
}

/**
 * Aggregate coding stats across every problem. Pure — used by the dashboard,
 * analytics and the coding route.
 */
export function codingStats(problems: CodingProblem[]): CodingStats {
  const byDifficulty: Record<CodingDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const byPlatform: Record<CodingPlatform, number> = {
    leetcode: 0,
    codeforces: 0,
    codechef: 0,
    gfg: 0,
    hackerrank: 0,
    other: 0,
  };
  const tagCounts = new Map<string, number>();

  const today = todayISO();
  const weekAgo = addDaysISO(today, -6);
  const monthAgo = addDaysISO(today, -29);
  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  let totalComplexity = 0;

  for (const p of problems) {
    byDifficulty[p.difficulty] += 1;
    byPlatform[p.platform] += 1;
    for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    const day = dateISO(new Date(p.solvedAt));
    if (day === today) todayCount += 1;
    if (day >= weekAgo && day <= today) weekCount += 1;
    if (day >= monthAgo && day <= today) monthCount += 1;
    if (p.timeComplexity) totalComplexity += 1;
  }

  const streak = solveStreak(problems);

  return {
    total: problems.length,
    byDifficulty,
    byPlatform,
    tags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    totalComplexity,
    currentStreak: streak.current,
    bestStreak: streak.best,
    currentRating: 0,
    maxRating: 0,
  };
}

/** Total problems per day over the last `days` days — for the activity heatmap. */
export function problemsByDay(
  problems: CodingProblem[],
  days = 90,
): { date: string; count: number }[] {
  const perDay = new Map<string, number>();
  for (const p of problems) {
    const day = dateISO(new Date(p.solvedAt));
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const today = todayISO();
  return Array.from({ length: days }).map((_, i) => {
    const date = addDaysISO(today, -(days - 1 - i));
    return { date, count: perDay.get(date) ?? 0 };
  });
}

/** Weekly solved counts (last `weeks` weeks), oldest first. */
export function solvedByWeek(
  problems: CodingProblem[],
  weeks = 8,
): { label: string; count: number }[] {
  const out: { label: string; count: number }[] = [];
  const today = todayISO();
  for (let w = weeks - 1; w >= 0; w--) {
    // This week is the current calendar week; older weeks are 7-day blocks.
    const start = addDaysISO(today, -7 * (w + 1) + 1);
    const end = addDaysISO(today, -7 * w);
    const count = problems.filter((p) => {
      const d = dateISO(new Date(p.solvedAt));
      return d >= start && d <= end;
    }).length;
    out.push({ label: `${weeks - w}w`, count });
  }
  // The last bucket should extend to today, not a full 7 days out.
  const lastStart = addDaysISO(today, -6);
  const lastCount = problems.filter((p) => dateISO(new Date(p.solvedAt)) >= lastStart).length;
  out[out.length - 1] = { label: "this", count: lastCount };
  return out;
}
