/**
 * Week in Review — a pure, deterministic model of the last 7 days.
 *
 * It reads the same store slices the rest of the app uses and produces a
 * score, per-day activity, week-over-week deltas and a handful of plain-English
 * highlights / suggestions. Because it's pure, it's trivially unit-testable and
 * can be regenerated live as the user keeps working.
 */
import type { AppData } from "./schema";
import { todayISO, addDaysISO, dateISO } from "./date";
import { roadmapCounts, roadmapPct } from "./progress";

export type ReviewDay = {
  date: string;
  label: string;
  score: number;
};

export type ReviewMetric = {
  key: string;
  label: string;
  value: number;
  /** Week-over-week change (this week − last week). */
  delta: number;
  emoji: string;
};

export type WeekReview = {
  start: string;
  end: string;
  dayCount: number;
  days: ReviewDay[];
  score: number;
  grade: string;
  gradeEmoji: string;
  headline: string;
  metrics: ReviewMetric[];
  highlights: string[];
  suggestions: string[];
  bestDay: ReviewDay | null;
};

/* ------------------------------------------------------------------ *
 * Activity score model (pure).
 * ------------------------------------------------------------------ */

/** Weight of each activity type in the daily "effort score". */
const WEIGHTS = {
  habit: 2,
  focusMinute: 0.05,
  topicDone: 5,
  taskDone: 2,
  solve: 3,
} as const;

type DailyCounts = {
  habit: number;
  focusMinutes: number;
  topicDone: number;
  taskDone: number;
  solve: number;
};

function emptyDaily(): DailyCounts {
  return { habit: 0, focusMinutes: 0, topicDone: 0, taskDone: 0, solve: 0 };
}

function dailyScore(c: DailyCounts): number {
  return (
    c.habit * WEIGHTS.habit +
    c.focusMinutes * WEIGHTS.focusMinute +
    c.topicDone * WEIGHTS.topicDone +
    c.taskDone * WEIGHTS.taskDone +
    c.solve * WEIGHTS.solve
  );
}

/** Per-day counts over an inclusive ISO range [startIso, endIso] (oldest first). */
export function dailyCounts(
  data: AppData,
  startIso: string,
  endIso: string,
): { date: string; counts: DailyCounts }[] {
  const out = new Map<string, DailyCounts>();
  const inRange = (iso: string) => iso >= startIso && iso <= endIso && iso.length === 10;
  const cell = (iso: string) => {
    if (!out.has(iso)) out.set(iso, emptyDaily());
    return out.get(iso)!;
  };

  for (const l of data.habitLogs) if (inRange(l.date)) cell(l.date).habit += 1;
  for (const s of data.focus.sessions) {
    const iso = dateISO(new Date(s.startedAt));
    if (inRange(iso)) cell(iso).focusMinutes += s.minutes;
  }
  for (const r of data.roadmaps)
    for (const p of r.phases)
      for (const t of p.topics)
        if (t.completedAt) {
          const iso = dateISO(new Date(t.completedAt));
          if (inRange(iso)) cell(iso).topicDone += 1;
        }
  for (const t of data.planner)
    if (t.doneAt) {
      const iso = dateISO(new Date(t.doneAt));
      if (inRange(iso)) cell(iso).taskDone += 1;
    }
  for (const c of data.coding.problems) {
    const iso = dateISO(new Date(c.solvedAt));
    if (inRange(iso)) cell(iso).solve += 1;
  }

  // Materialize in ISO order (oldest → newest).
  const days: string[] = [];
  let cursor = startIso;
  while (cursor <= endIso) {
    days.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return days.map((date) => ({ date, counts: out.get(date) ?? emptyDaily() }));
}

/* ------------------------------------------------------------------ *
 * Week review composition.
 * ------------------------------------------------------------------ */

/** Human short label for a day, e.g. "Mon". */
function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function gradeFor(score: number): { grade: string; emoji: string } {
  if (score >= 220) return { grade: "Outstanding", emoji: "🏆" };
  if (score >= 150) return { grade: "Great week", emoji: "🔥" };
  if (score >= 90) return { grade: "Solid week", emoji: "⚡" };
  if (score >= 45) return { grade: "Building momentum", emoji: "🌱" };
  return { grade: "Warming up", emoji: "🌤️" };
}

function weekTotals(data: AppData, start: string, end: string) {
  let topics = 0;
  let solves = 0;
  let focus = 0;
  let habits = 0;
  let tasks = 0;
  for (const d of dailyCounts(data, start, end)) {
    habits += d.counts.habit;
    focus += d.counts.focusMinutes;
    topics += d.counts.topicDone;
    tasks += d.counts.taskDone;
    solves += d.counts.solve;
  }
  return { topics, solves, focus, habits, tasks };
}

/** A short narrative sentence describing the week, based on real numbers. */
function buildHeadline(metrics: ReviewMetric[], score: number): string {
  const top = [...metrics].sort((a, b) => b.value - a.value)[0];
  const byDelta = [...metrics].sort((a, b) => b.delta - a.delta)[0];
  const strong = byDelta && byDelta.delta > 0 ? byDelta : top;

  if (score === 0) {
    return "A quiet week — small steps now set up a big leap next week.";
  }
  if (strong) {
    const improving = strong.delta > 0;
    return `Your strongest area this week was ${strong.label.toLowerCase()}${improving ? ` (+${strong.delta} vs last week)` : ""}. ${score >= 150 ? "Serious momentum." : "Keep stacking them."}`;
  }
  return "Steady and consistent — the compound effect is on your side.";
}

/** Assemble the full review. */
export function composeReview(data: AppData, now: Date = new Date()): WeekReview {
  const end = todayISO(now);
  const start = addDaysISO(end, -6);
  const prevEnd = addDaysISO(start, -1);
  const prevStart = addDaysISO(start, -7);

  const thisDays = dailyCounts(data, start, end);
  const days: ReviewDay[] = thisDays.map((d) => ({
    date: d.date,
    label: dayLabel(d.date),
    score: dailyScore(d.counts),
  }));
  const score = days.reduce((s, d) => s + d.score, 0);
  const grade = gradeFor(score);

  const thisW = weekTotals(data, start, end);
  const lastW = weekTotals(data, prevStart, prevEnd);

  const metrics: ReviewMetric[] = [
    {
      key: "topics",
      label: "Topics learned",
      value: thisW.topics,
      delta: thisW.topics - lastW.topics,
      emoji: "🎓",
    },
    {
      key: "solves",
      label: "Problems solved",
      value: thisW.solves,
      delta: thisW.solves - lastW.solves,
      emoji: "💻",
    },
    {
      key: "focus",
      label: "Deep-work minutes",
      value: Math.round(thisW.focus),
      delta: Math.round(thisW.focus) - Math.round(lastW.focus),
      emoji: "🧠",
    },
    {
      key: "habits",
      label: "Habit check-ins",
      value: thisW.habits,
      delta: thisW.habits - lastW.habits,
      emoji: "✅",
    },
    {
      key: "tasks",
      label: "Tasks done",
      value: thisW.tasks,
      delta: thisW.tasks - lastW.tasks,
      emoji: "📋",
    },
  ];

  // The best day is only meaningful if the user actually did something.
  const bestDay = days.reduce<ReviewDay | null>((best, d) => {
    if (d.score <= 0) return best;
    if (best === null || d.score > best.score) return d;
    return best;
  }, null);

  const highlights: string[] = [];
  if (thisW.topics > 0)
    highlights.push(`You completed ${thisW.topics} topic${thisW.topics === 1 ? "" : "s"}.`);
  if (thisW.solves > 0)
    highlights.push(`${thisW.solves} problem${thisW.solves === 1 ? "" : "s"} solved — grind on.`);
  if (thisW.focus >= 60) highlights.push(`${Math.round(thisW.focus)} minutes of deep work logged.`);
  if (thisW.habits > 0)
    highlights.push(`${thisW.habits} habit check-in${thisW.habits === 1 ? "" : "s"} kept.`);
  if (thisW.tasks > 0)
    highlights.push(`${thisW.tasks} task${thisW.tasks === 1 ? "" : "s"} checked off.`);
  const shipped = data.projects.filter((p) => p.status === "done").length;
  if (shipped > 0)
    highlights.push(`${shipped} project${shipped === 1 ? "" : "s"} shipped this week.`);
  if (bestDay && bestDay.score > 0)
    highlights.push(`Best day: ${bestDay.label} (score ${bestDay.score}).`);

  const suggestions: string[] = [];
  const roadmap = data.roadmaps.find((r) => roadmapPct(r) > 0 && roadmapPct(r) < 100);
  if (roadmap) suggestions.push(`Next up: keep the "${roadmap.title}" roadmap moving.`);
  if (thisW.focus < 60) suggestions.push("Aim for 60+ focused minutes — even one pomodoro counts.");
  if (thisW.solves < 3) suggestions.push("Solve 2–3 problems this week to keep the streak alive.");
  if (data.habits.length > 0 && thisW.habits < data.habits.length * 3)
    suggestions.push("Tighten your habit check-ins — every day adds up.");
  if (data.career.applications.length === 0)
    suggestions.push("Send your first job application — momentum builds fast.");
  if (suggestions.length === 0) suggestions.push("Great pace — now raise the bar a notch.");

  return {
    start,
    end,
    dayCount: days.length,
    days,
    score,
    grade: grade.grade,
    gradeEmoji: grade.emoji,
    headline: buildHeadline(metrics, score),
    metrics,
    highlights: highlights.slice(0, 5),
    suggestions: suggestions.slice(0, 4),
    bestDay,
  };
}

/** Quick sanity: total roadmap topics completed lifetime (unused by UI, handy for tests). */
export function lifetimeTopics(data: AppData): number {
  return data.roadmaps.reduce((s, r) => s + roadmapCounts(r).done, 0);
}
