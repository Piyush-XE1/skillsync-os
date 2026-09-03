/**
 * Trend / momentum helpers that turn the raw store slices into chart-ready
 * series. Pure and unit-testable — the Analytics page just maps these straight
 * into the SVG chart components.
 */
import type { AppData } from "./schema";
import { todayISO, addDaysISO, dateISO } from "./date";
import { minutesByDay } from "./focus";
import { solvedByWeek, problemsByDay, solveStreak } from "./coding";

/** Daily "effort score" (a weighted activity index) for the last `days` days. */
export function effortByDay(data: AppData, days = 30): { label: string; value: number }[] {
  const perDay = new Map<string, number>();
  const bump = (iso: string, w: number) => perDay.set(iso, (perDay.get(iso) ?? 0) + w);
  for (const l of data.habitLogs) bump(l.date, 2);
  for (const s of data.focus.sessions)
    if (s.mode === "focus") bump(dateISO(new Date(s.startedAt)), 2);
  for (const t of data.planner) if (t.doneAt) bump(dateISO(new Date(t.doneAt)), 2);
  for (const r of data.roadmaps)
    for (const p of r.phases)
      for (const t of p.topics) if (t.completedAt) bump(dateISO(new Date(t.completedAt)), 4);
  for (const c of data.coding.problems) bump(dateISO(new Date(c.solvedAt)), 3);

  const today = todayISO();
  return Array.from({ length: days }).map((_, i) => {
    const d = addDaysISO(today, -(days - 1 - i));
    return { label: d, value: perDay.get(d) ?? 0 };
  });
}

/** Focus minutes per day, mapped to `{label, value}` (uses `minutesByDay`). */
export function focusDaily(data: AppData, days = 30): { label: string; value: number }[] {
  return minutesByDay(data.focus.sessions, days).map((m) => ({ label: m.date, value: m.minutes }));
}

/** Coding problems solved per platform, for a donut/legend. */
export function platformBreakdown(
  data: AppData,
): { label: string; value: number; color: string }[] {
  const counts = new Map<string, number>();
  for (const p of data.coding.problems) counts.set(p.platform, (counts.get(p.platform) ?? 0) + 1);
  const labels: Record<string, string> = {
    leetcode: "LeetCode",
    codeforces: "Codeforces",
    codechef: "CodeChef",
    gfg: "GeeksforGeeks",
    hackerrank: "HackerRank",
    other: "Other",
  };
  const colors = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#e11d48", "#64748b"];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v], i) => ({
      label: labels[k] ?? k,
      value: v,
      color: colors[i % colors.length],
    }));
}

/** Difficulty breakdown for a donut/legend. */
export function difficultyBreakdown(
  data: AppData,
): { label: string; value: number; color: string }[] {
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const p of data.coding.problems) counts[p.difficulty]++;
  return [
    { label: "Easy", value: counts.easy, color: "#22c55e" },
    { label: "Medium", value: counts.medium, color: "#f59e0b" },
    { label: "Hard", value: counts.hard, color: "#ef4444" },
  ];
}

/** Weekly solved counts (last 8 weeks), mapped to chart series. */
export function codingWeekly(data: AppData, weeks = 8): { label: string; value: number }[] {
  return solvedByWeek(data.coding.problems, weeks).map((w) => ({ label: w.label, value: w.count }));
}

/** Learning completion breakdown across all roadmaps -> donut segments. */
export function learningBreakdown(data: AppData): { label: string; value: number }[] {
  let done = 0;
  let total = 0;
  for (const r of data.roadmaps)
    for (const p of r.phases)
      for (const t of p.topics) {
        // Count a completed topic (100% leaves) as "done".
        const any = t.checklist.length > 0 || t.subtopics.length > 0;
        if (!any) {
          total++;
          if (t.done) done++;
          continue;
        }
      }
  // Fall back to roadmap-level completion if topics are empty leaves.
  const roadmaps = data.roadmaps;
  if (total === 0 && roadmaps.length > 0) {
    for (const r of roadmaps) {
      const leaves = countLeaves(r);
      done += leaves.done;
      total += leaves.total;
    }
  }
  return [
    { label: "Completed", value: done },
    { label: "Remaining", value: Math.max(0, total - done) },
  ];
}

/** Best solve streak — a pure numeric trend for a stat card. */
export function codingStreak(data: AppData): { current: number; best: number } {
  return solveStreak(data.coding.problems);
}

function countLeaves(r: AppData["roadmaps"][number]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const p of r.phases)
    for (const t of p.topics) {
      let d = 0;
      let n = 0;
      if (t.checklist.length > 0) {
        d += t.checklist.filter((c) => c.done).length;
        n += t.checklist.length;
      }
      for (const s of t.subtopics) {
        if (s.checklist.length > 0) {
          d += s.checklist.filter((c) => c.done).length;
          n += s.checklist.length;
        } else {
          n++;
          if (s.done) d++;
        }
      }
      if (n === 0) {
        n = 1;
        if (t.done) d = 1;
      }
      done += d;
      total += n;
    }
  return { done, total };
}
