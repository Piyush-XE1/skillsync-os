import {
  Award,
  BookOpen,
  Braces,
  Briefcase,
  CalendarRange,
  Flame,
  FolderKanban,
  GraduationCap,
  StickyNote,
  Timer,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppData, ModuleKey } from "@/lib/schema";

export type ModuleRoute =
  | "/expenses"
  | "/focus"
  | "/cgpa"
  | "/coding"
  | "/career"
  | "/habits"
  | "/notes"
  | "/learn"
  | "/projects"
  | "/planner";

export type ModuleDefinition = {
  key: ModuleKey;
  title: string;
  navLabel: string;
  description: string;
  route: ModuleRoute;
  icon: LucideIcon;
};

/** One catalogue drives onboarding, settings, and both primary navigations. */
export const MODULE_CATALOG: readonly ModuleDefinition[] = [
  {
    key: "expenses",
    title: "Expense Manager",
    navLabel: "Expenses",
    description: "Log daily spending and stay on pace with a monthly budget.",
    route: "/expenses",
    icon: Wallet,
  },
  {
    key: "focus",
    title: "Focus",
    navLabel: "Focus",
    description: "Pomodoro deep-work timer with session history.",
    route: "/focus",
    icon: Timer,
  },
  {
    key: "cgpa",
    title: "CGPA Tracker",
    navLabel: "CGPA",
    description: "Semester-wise grades, cumulative GPA, and target planning.",
    route: "/cgpa",
    icon: Award,
  },
  {
    key: "coding",
    title: "LeetCode · Coding",
    navLabel: "LeetCode",
    description: "Track LeetCode, DSA, and contest progress.",
    route: "/coding",
    icon: Braces,
  },
  {
    key: "career",
    title: "Career · Placements",
    navLabel: "Career",
    description: "Manage applications, referrals, and interview rounds.",
    route: "/career",
    icon: Briefcase,
  },
  {
    key: "habits",
    title: "Habits",
    navLabel: "Habits",
    description: "Build daily routines and protect your streaks.",
    route: "/habits",
    icon: Flame,
  },
  {
    key: "notes",
    title: "Notes",
    navLabel: "Notes",
    description: "Capture ideas, study notes, and quick inbox drafts.",
    route: "/notes",
    icon: StickyNote,
  },
  {
    key: "roadmaps",
    title: "Roadmaps",
    navLabel: "Roadmaps",
    description: "Follow structured learning paths and track progress.",
    route: "/learn",
    icon: BookOpen,
  },
  {
    key: "projects",
    title: "Projects",
    navLabel: "Projects",
    description: "Plan, build, and ship the things you are learning.",
    route: "/projects",
    icon: FolderKanban,
  },
  {
    key: "planner",
    title: "Planner",
    navLabel: "Planner",
    description: "Plan tasks and build a calmer, more intentional week.",
    route: "/planner",
    icon: CalendarRange,
  },
] as const;

export type FocusTrackId = "academics" | "tech-career" | "daily-life" | "full-power";

export type FocusTrack = {
  id: FocusTrackId;
  title: string;
  description: string;
  modules: readonly ModuleKey[] | "all";
};

export const FOCUS_TRACKS: readonly FocusTrack[] = [
  {
    id: "academics",
    title: "College & Academics",
    description: "Keep classes, study notes, and daily routines in one calm space.",
    modules: ["focus", "roadmaps", "notes", "planner"],
  },
  {
    id: "tech-career",
    title: "Tech Career & Placements",
    description: "Make steady progress on skills, projects, and placement prep.",
    modules: ["roadmaps", "coding", "projects", "notes"],
  },
  {
    id: "daily-life",
    title: "Daily Life & Discipline",
    description: "Build routines, manage spending, and keep your day on track.",
    modules: ["habits", "expenses", "planner", "notes"],
  },
  {
    id: "full-power",
    title: "Full Power",
    description: "Bring every SkillSync workspace into your primary navigation.",
    modules: "all",
  },
] as const;

export function modulesForFocusTrack(trackId: FocusTrackId): Record<ModuleKey, boolean> {
  const track = FOCUS_TRACKS.find((candidate) => candidate.id === trackId);
  const enabled =
    track?.modules === "all" ? MODULE_CATALOG.map(({ key }) => key) : (track?.modules ?? []);
  return Object.fromEntries(
    MODULE_CATALOG.map(({ key }) => [key, enabled.includes(key)]),
  ) as Record<ModuleKey, boolean>;
}

/** Strip disabled module records from cross-module dashboard summaries. */
export function dataForEnabledModules(
  data: AppData,
  modules: Partial<Record<ModuleKey, boolean>>,
): AppData {
  return {
    ...data,
    habits: modules.habits ? data.habits : [],
    habitLogs: modules.habits ? data.habitLogs : [],
    planner: modules.planner ? data.planner : [],
    roadmaps: modules.roadmaps ? data.roadmaps : [],
    focus: modules.focus ? data.focus : { ...data.focus, sessions: [] },
    coding: modules.coding
      ? data.coding
      : { ...data.coding, problems: [], rating: 0, maxRating: 0, ratingHistory: [] },
  };
}
