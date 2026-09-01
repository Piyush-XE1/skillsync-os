import type { AppData } from "./schema";
import { roadmapPct, roadmapCounts } from "./progress";
import { habitStreak } from "./habit-streaks";
import { cumulativeGpa } from "./cgpa";
import { focusTotals } from "./focus";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  /** Emoji rendered as the badge glyph. */
  icon: string;
  /** How much XP unlocking the achievement awards. */
  xp: number;
  /** Optional hint shown while locked, e.g. "3 / 7 days". */
  progressHint?: (data: AppData) => string;
  check: (data: AppData) => boolean;
};

function topicsCompleted(data: AppData): number {
  let done = 0;
  for (const r of data.roadmaps) {
    done += roadmapCounts(r).done;
  }
  return done;
}

function topicCount(data: AppData): number {
  let total = 0;
  for (const r of data.roadmaps) {
    total += roadmapCounts(r).topics;
  }
  return total;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-topic",
    title: "First Light",
    description: "Complete your first topic",
    icon: "💡",
    xp: 25,
    check: (d) => topicsCompleted(d) >= 1,
  },
  {
    id: "topics-10",
    title: "Scholar",
    description: "Complete 10 topics",
    icon: "🎓",
    xp: 50,
    progressHint: (d) => `${Math.min(10, topicsCompleted(d))} / 10 topics`,
    check: (d) => topicsCompleted(d) >= 10,
  },
  {
    id: "topics-50",
    title: "Mastermind",
    description: "Complete 50 topics",
    icon: "🧠",
    xp: 100,
    progressHint: (d) => `${Math.min(50, topicsCompleted(d))} / 50 topics`,
    check: (d) => topicsCompleted(d) >= 50,
  },
  {
    id: "roadmap-100",
    title: "Completionist",
    description: "Finish an entire roadmap",
    icon: "🏆",
    xp: 100,
    check: (d) => d.roadmaps.some((r) => roadmapPct(r) === 100 && topicCountOf(r) > 0),
  },
  {
    id: "first-habit",
    title: "First Step",
    description: "Check in your first habit",
    icon: "✅",
    xp: 20,
    check: (d) => d.habitLogs.length >= 1,
  },
  {
    id: "streak-7",
    title: "Consistency",
    description: "Reach a 7-day streak",
    icon: "🔥",
    xp: 50,
    progressHint: (d) => `${Math.min(7, d.stats.streak)} / 7 days`,
    check: (d) => d.stats.streak >= 7,
  },
  {
    id: "streak-30",
    title: "Unstoppable",
    description: "Reach a 30-day streak",
    icon: "⚡",
    xp: 150,
    progressHint: (d) => `${Math.min(30, d.stats.streak)} / 30 days`,
    check: (d) => d.stats.streak >= 30,
  },
  {
    id: "habit-hero",
    title: "Habit Hero",
    description: "100 habit check-ins in total",
    icon: "📅",
    xp: 75,
    progressHint: (d) => `${Math.min(100, d.habitLogs.length)} / 100 check-ins`,
    check: (d) => d.habitLogs.length >= 100,
  },
  {
    id: "habit-best-21",
    title: "21 Days",
    description: "A 21-day streak on any single habit",
    icon: "🌱",
    xp: 75,
    check: (d) => d.habits.some((h) => habitStreak(h.id, d.habitLogs).best >= 21),
  },
  {
    id: "first-project",
    title: "Builder",
    description: "Create your first project",
    icon: "🚀",
    xp: 25,
    check: (d) => d.projects.length >= 1,
  },
  {
    id: "project-shipped",
    title: "Shipped",
    description: "Mark a project as done",
    icon: "📦",
    xp: 60,
    check: (d) => d.projects.some((p) => p.status === "done"),
  },
  {
    id: "projects-5",
    title: "Product Line",
    description: "Ship 5 projects",
    icon: "🏭",
    xp: 120,
    progressHint: (d) =>
      `${Math.min(5, d.projects.filter((p) => p.status === "done").length)} / 5 shipped`,
    check: (d) => d.projects.filter((p) => p.status === "done").length >= 5,
  },
  {
    id: "first-focus",
    title: "Deep Work",
    description: "Complete your first focus session",
    icon: "⏱️",
    xp: 25,
    check: (d) => d.focus.sessions.some((s) => s.mode === "focus"),
  },
  {
    id: "focus-10h",
    title: "In the Zone",
    description: "Log 10 hours of focus time",
    icon: "🧘",
    xp: 100,
    progressHint: (d) =>
      `${Math.min(600, Math.round(focusTotals(d.focus.sessions).totalMinutes))} / 600 min`,
    check: (d) => focusTotals(d.focus.sessions).totalMinutes >= 600,
  },
  {
    id: "notes-25",
    title: "Notesmith",
    description: "Write 25 notes",
    icon: "📝",
    xp: 50,
    progressHint: (d) => `${Math.min(25, d.notes.length)} / 25 notes`,
    check: (d) => d.notes.length >= 25,
  },
  {
    id: "cgpa-9",
    title: "Dean's List",
    description: "Hold a 9+ CGPA with at least one semester logged",
    icon: "🎯",
    xp: 75,
    check: (d) => {
      const { cgpa } = cumulativeGpa(d.cgpa.semesters);
      return cgpa !== null && cgpa >= 9;
    },
  },
  {
    id: "resume-ready",
    title: "Hireable",
    description: "Complete your resume with experience, projects and skills",
    icon: "📄",
    xp: 60,
    check: (d) => {
      const r = d.resume;
      return (
        r.name.trim().length > 0 &&
        r.summary.trim().length > 0 &&
        r.experience.length >= 1 &&
        r.projects.length >= 1 &&
        r.skills.length >= 3
      );
    },
  },
  {
    id: "level-5",
    title: "Ascendant",
    description: "Reach level 5",
    icon: "🎮",
    xp: 50,
    progressHint: (d) => `Level ${Math.min(5, d.stats.level)} / 5`,
    check: (d) => d.stats.level >= 5,
  },
];

function topicCountOf(r: AppData["roadmaps"][number]): number {
  return roadmapCounts(r).topics;
}

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Every achievement whose condition currently holds. */
export function computeUnlocked(data: AppData): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(data)).map((a) => a.id);
}

/**
 * Achievements whose condition holds but that have not been awarded yet.
 * The engine uses this to fire one-time XP + notifications.
 */
export function newlyUnlocked(data: AppData): Achievement[] {
  const awarded = new Set(data.stats.achievements);
  return ACHIEVEMENTS.filter((a) => !awarded.has(a.id) && a.check(data));
}

/** Best display order: unlocked first, then by id. */
export function allAchievements(data: AppData): Achievement[] {
  const awarded = new Set(data.stats.achievements);
  return [
    ...ACHIEVEMENTS.filter((a) => awarded.has(a.id)),
    ...ACHIEVEMENTS.filter((a) => !awarded.has(a.id)),
  ];
}
