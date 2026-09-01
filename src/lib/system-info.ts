import type { AppData } from "./schema";
import { CURRENT_SCHEMA_VERSION } from "./schema";
import { roadmapCounts } from "./progress";
import { cumulativeGpa } from "./cgpa";
import { focusTotals } from "./focus";
import { allHabitStreaks } from "./habit-streaks";
import { APP_VERSION } from "./version";

/** Human-readable workspace diagnostics for Profile → System. */
export type SystemSnapshot = {
  appVersion: string;
  schemaVersion: number;
  storageBytes: number;
  records: {
    roadmaps: number;
    topics: number;
    topicsDone: number;
    notes: number;
    projects: number;
    projectsDone: number;
    plannerTasks: number;
    plannerDone: number;
    habits: number;
    habitCheckIns: number;
    subjects: number;
    transactions: number;
    focusSessions: number;
    focusMinutes: number;
    cgpaSemesters: number;
    notifications: number;
    scheduled: number;
  };
  totals: {
    xp: number;
    totalXp: number;
    level: number;
    streak: number;
    bestHabitStreak: number;
    cgpa: number | null;
    credits: number;
  };
};

export function systemSnapshot(data: AppData): SystemSnapshot {
  let topics = 0;
  let topicsDone = 0;
  for (const r of data.roadmaps) {
    const c = roadmapCounts(r);
    topics += c.topics;
    topicsDone += c.done;
  }
  const focus = focusTotals(data.focus.sessions);
  const { cgpa, credits } = cumulativeGpa(data.cgpa.semesters);
  const { best } = allHabitStreaks(
    data.habits.map((h) => h.id),
    data.habitLogs,
  );
  return {
    appVersion: APP_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    storageBytes: JSON.stringify(data).length,
    records: {
      roadmaps: data.roadmaps.length,
      topics,
      topicsDone,
      notes: data.notes.length,
      projects: data.projects.length,
      projectsDone: data.projects.filter((p) => p.status === "done").length,
      plannerTasks: data.planner.length,
      plannerDone: data.planner.filter((t) => t.done).length,
      habits: data.habits.length,
      habitCheckIns: data.habitLogs.length,
      subjects: data.attendance.subjects.length,
      transactions: data.expenses.transactions.length,
      focusSessions: focus.totalSessions,
      focusMinutes: focus.totalMinutes,
      cgpaSemesters: data.cgpa.semesters.length,
      notifications: data.notifications?.items?.length ?? 0,
      scheduled: data.notifications?.scheduled?.length ?? 0,
    },
    totals: {
      xp: data.stats.xp,
      totalXp: data.stats.totalXp,
      level: data.stats.level,
      streak: data.stats.streak,
      bestHabitStreak: best,
      cgpa,
      credits,
    },
  };
}
