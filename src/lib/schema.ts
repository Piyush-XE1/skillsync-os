import { z } from "zod";
import { NotificationsStateSchema, createDefaultNotifications } from "./notifications/types";

export const CURRENT_SCHEMA_VERSION = 6;

export const ChecklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().default(false),
  createdAt: z.number(),
});

export const ResourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
});

export const SubtopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().default(false),
  notes: z.string().default(""),
  resources: z.array(ResourceSchema).default([]),
  checklist: z.array(ChecklistItemSchema).default([]),
  createdAt: z.number(),
});

export const TopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().default(false),
  notes: z.string().default(""),
  resources: z.array(ResourceSchema).default([]),
  subtopics: z.array(SubtopicSchema).default([]),
  checklist: z.array(ChecklistItemSchema).default([]),
  createdAt: z.number(),
});

export const PhaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  topics: z.array(TopicSchema).default([]),
  createdAt: z.number(),
});

export const RoadmapSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().default(""),
  color: z.string().default("#7c3aed"),
  phases: z.array(PhaseSchema).default([]),
  createdAt: z.number(),
});

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().default(""),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  linkedTo: z
    .object({ type: z.enum(["topic", "subtopic", "project"]), id: z.string() })
    .nullable()
    .default(null),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const ProjectTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().default(false),
});

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  status: z.enum(["planning", "active", "done"]).default("planning"),
  progress: z.number().min(0).max(100).default(0),
  deadline: z.string().nullable().default(null),
  techStack: z.array(z.string()).default([]),
  tasks: z.array(ProjectTaskSchema).default([]),
  notes: z.string().default(""),
  githubUrl: z.string().default(""),
  createdAt: z.number(),
});

export const PlannerTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  time: z.string().default(""),
  done: z.boolean().default(false),
  createdAt: z.number(),
});

export const HabitSchema = z.object({
  id: z.string(),
  title: z.string(),
  emoji: z.string().default("✨"),
  createdAt: z.number(),
  startDate: z.string().nullable().default(null),
});

export const HabitLogSchema = z.object({
  habitId: z.string(),
  date: z.string(),
});

export const ProfileSchema = z.object({
  name: z.string().default("Learner"),
  avatar: z.string().default(""),
});

export const ModuleFlagsSchema = z.object({
  attendance: z.boolean().default(false),
  expenses: z.boolean().default(false),
});

export const PreferencesSchema = z.object({
  notifications: z.boolean().default(true),
  developerMode: z.boolean().default(false),
  modules: ModuleFlagsSchema.default({ attendance: false, expenses: false }),
  /**
   * The single source of truth for the app's appearance. "light" activates the
   * Minimalist Light visual system; every other value is a dark variant.
   * (Removed v5 values "gradient"/"atmospheric" are migrated to "aurora".)
   */
  background: z.enum(["aurora", "light", "atelier"]).default("aurora"),
  /** Tactile feedback on supported devices. */
  haptics: z.boolean().default(true),
  hapticIntensity: z.enum(["light", "standard", "strong"]).default("standard"),
});

export const StatsSchema = z.object({
  xp: z.number().default(0),
  level: z.number().default(1),
  streak: z.number().default(0),
  lastActive: z.string().default(""),
});

export const SubjectSchema = z.object({
  id: z.string(),
  semester: z.number().int().min(1).max(8),
  name: z.string(),
  faculty: z.string().default(""),
  minRequired: z.number().min(0).max(100).default(75),
  present: z.number().int().min(0).default(0),
  absent: z.number().int().min(0).default(0),
  createdAt: z.number(),
});

export const AttendanceSchema = z.object({
  subjects: z.array(SubjectSchema).default([]),
});

export const TransactionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  amount: z.number(),
  type: z.enum(["credit", "debit"]),
  tags: z.array(z.string()).default([]),
  /** Timestamp of the expense date. */
  at: z.number(),
  /** Manual ordering: ascending, lower shows first. */
  position: z.number().default(0),
  updatedAt: z.number().default(0),
});

export const ExpensesSchema = z.object({
  transactions: z.array(TransactionSchema).default([]),
});

export const AppDataSchema = z.object({
  schemaVersion: z.number(),
  roadmaps: z.array(RoadmapSchema).default([]),
  notes: z.array(NoteSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  planner: z.array(PlannerTaskSchema).default([]),
  habits: z.array(HabitSchema).default([]),
  habitLogs: z.array(HabitLogSchema).default([]),
  profile: ProfileSchema.default({ name: "Learner", avatar: "" }),
  preferences: PreferencesSchema.default({
    notifications: true,
    developerMode: false,
    modules: { attendance: false, expenses: false },
    background: "aurora",
    haptics: true,
    hapticIntensity: "standard",
  }),
  stats: StatsSchema.default({ xp: 0, level: 1, streak: 0, lastActive: "" }),
  attendance: AttendanceSchema.default({ subjects: [] }),
  expenses: ExpensesSchema.default({ transactions: [] }),
  notifications: NotificationsStateSchema.default(() => createDefaultNotifications()),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Subtopic = z.infer<typeof SubtopicSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Roadmap = z.infer<typeof RoadmapSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectTask = z.infer<typeof ProjectTaskSchema>;
export type PlannerTask = z.infer<typeof PlannerTaskSchema>;
export type Habit = z.infer<typeof HabitSchema>;
export type HabitLog = z.infer<typeof HabitLogSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type Subject = z.infer<typeof SubjectSchema>;
export type Attendance = z.infer<typeof AttendanceSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Expenses = z.infer<typeof ExpensesSchema>;
export type AppData = z.infer<typeof AppDataSchema>;
