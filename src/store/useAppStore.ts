import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type {
  AppData,
  Roadmap,
  Phase,
  Topic,
  Subtopic,
  ChecklistItem,
  Note,
  Project,
  ProjectTask,
  PlannerTask,
  Habit,
  Preferences,
  Profile,
  Subject,
  Transaction,
  Stats,
  FocusSession,
  FocusSettings,
  CgpaSemester,
  CgpaSubject,
  ResumeData,
  CodingProblem,
  RatingPoint,
  JobApplication,
  InterviewRound,
  WidgetPlacement,
} from "@/lib/schema";
import { AppDataSchema } from "@/lib/schema";
import { createInitialData } from "@/lib/seed";
import { migrate } from "@/lib/migrations";
import { setLastBackupMeta } from "@/lib/backup/advanced-backup";
import { newId } from "@/lib/id";
import { todayISO, addDaysISO } from "@/lib/date";
import { errorMessage } from "@/lib/utils";
import { topicPct, subtopicPct } from "@/lib/progress";
import { applyOrder } from "@/lib/drag-sort";
import {
  applyWidgetOrder,
  moveWidget,
  nextWidgetSize,
  normalizeWidgetLayout,
  resetWidgetLayout,
  setWidgetSize,
  setWidgetVisible,
  type WidgetId,
} from "@/lib/widgets";
import { focusXp } from "@/lib/focus";
import {
  HISTORY_LIMIT,
  type CategoryKey,
  type NotificationItem,
  type NotificationSettings,
  type ScheduledNotification,
} from "@/lib/notifications/types";

type ModuleKey = "attendance" | "expenses" | "focus" | "cgpa" | "resume" | "coding" | "career";

type State = AppData & {
  _hydrated: boolean;
  markHydrated: () => void;

  // roadmap ops
  addRoadmap: (title: string) => void;
  renameRoadmap: (id: string, title: string) => void;
  deleteRoadmap: (id: string) => void;
  importRoadmap: (roadmap: Roadmap) => void;
  replaceRoadmap: (id: string, roadmap: Roadmap) => void;

  addPhase: (roadmapId: string, title: string) => void;
  renamePhase: (roadmapId: string, phaseId: string, title: string) => void;
  deletePhase: (roadmapId: string, phaseId: string) => void;
  movePhase: (roadmapId: string, phaseId: string, dir: -1 | 1) => void;

  addTopic: (roadmapId: string, phaseId: string, title: string) => void;
  updateTopic: (roadmapId: string, phaseId: string, topicId: string, patch: Partial<Topic>) => void;
  deleteTopic: (roadmapId: string, phaseId: string, topicId: string) => void;
  moveTopic: (roadmapId: string, phaseId: string, topicId: string, dir: -1 | 1) => void;

  addSubtopic: (roadmapId: string, phaseId: string, topicId: string, title: string) => void;
  updateSubtopic: (
    roadmapId: string,
    phaseId: string,
    topicId: string,
    subtopicId: string,
    patch: Partial<Subtopic>,
  ) => void;
  deleteSubtopic: (roadmapId: string, phaseId: string, topicId: string, subtopicId: string) => void;

  addChecklistItem: (
    path: {
      roadmapId: string;
      phaseId: string;
      topicId: string;
      subtopicId?: string;
    },
    title: string,
  ) => void;
  updateChecklistItem: (
    path: {
      roadmapId: string;
      phaseId: string;
      topicId: string;
      subtopicId?: string;
    },
    itemId: string,
    patch: Partial<ChecklistItem>,
  ) => void;
  deleteChecklistItem: (
    path: {
      roadmapId: string;
      phaseId: string;
      topicId: string;
      subtopicId?: string;
    },
    itemId: string,
  ) => void;

  // hierarchical completion cascades
  setPhaseComplete: (roadmapId: string, phaseId: string, done: boolean) => void;
  setTopicComplete: (roadmapId: string, phaseId: string, topicId: string, done: boolean) => void;
  setSubtopicComplete: (
    roadmapId: string,
    phaseId: string,
    topicId: string,
    subtopicId: string,
    done: boolean,
  ) => void;

  // notes
  addNote: (partial?: Partial<Note>) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // projects
  addProject: (partial?: Partial<Project>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addProjectTask: (projectId: string, title: string) => void;
  updateProjectTask: (projectId: string, taskId: string, patch: Partial<ProjectTask>) => void;
  deleteProjectTask: (projectId: string, taskId: string) => void;

  // planner
  addPlannerTask: (partial: Partial<PlannerTask> & { date: string }) => void;
  updatePlannerTask: (id: string, patch: Partial<PlannerTask>) => void;
  deletePlannerTask: (id: string) => void;

  // habits
  addHabit: (title: string, emoji?: string) => void;
  renameHabit: (id: string, title: string) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitToday: (id: string, dateISO?: string) => void;

  // profile / prefs / stats
  updateProfile: (patch: Partial<Profile>) => void;
  updatePreferences: (patch: Partial<Preferences>) => void;
  setModuleEnabled: (key: ModuleKey, enabled: boolean) => void;
  addXp: (amount: number) => void;
  touchStreak: () => void;
  unlockAchievements: (ids: string[]) => string[];

  // focus (Pomodoro)
  addFocusSession: (input: {
    minutes: number;
    mode: "focus" | "break";
    task?: string;
    startedAt?: number;
  }) => FocusSession;
  updateFocusSettings: (patch: Partial<FocusSettings>) => void;

  // cgpa
  addCgpaSemester: (number: number) => CgpaSemester;
  updateCgpaSemester: (id: string, patch: Partial<Pick<CgpaSemester, "number">>) => void;
  deleteCgpaSemester: (id: string) => void;
  addCgpaSubject: (
    semesterId: string,
    partial: Pick<CgpaSubject, "name"> & Partial<CgpaSubject>,
  ) => CgpaSubject;
  updateCgpaSubject: (semesterId: string, subjectId: string, patch: Partial<CgpaSubject>) => void;
  deleteCgpaSubject: (semesterId: string, subjectId: string) => void;

  // resume
  updateResume: (patch: Partial<ResumeData>) => void;
  setResume: (resume: ResumeData) => void;

  // coding / DSA prep
  addCodingProblem: (
    partial: Pick<CodingProblem, "title" | "solvedAt"> & Partial<CodingProblem>,
  ) => CodingProblem;
  updateCodingProblem: (id: string, patch: Partial<CodingProblem>) => void;
  deleteCodingProblem: (id: string) => void;
  setCodeRating: (rating: number) => void;

  // career / placements
  addJobApplication: (
    partial: Pick<JobApplication, "company"> & Partial<JobApplication>,
  ) => JobApplication;
  updateJobApplication: (id: string, patch: Partial<JobApplication>) => void;
  deleteJobApplication: (id: string) => void;
  addInterviewRound: (applicationId: string, partial: Partial<InterviewRound>) => InterviewRound;
  updateInterviewRound: (
    applicationId: string,
    roundId: string,
    patch: Partial<InterviewRound>,
  ) => void;
  deleteInterviewRound: (applicationId: string, roundId: string) => void;

  // attendance
  addSubject: (
    partial: Omit<Subject, "id" | "createdAt" | "present" | "absent"> & Partial<Subject>,
  ) => Subject;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // expenses
  addTransaction: (
    partial: Pick<Transaction, "title" | "amount" | "type"> & Partial<Transaction>,
  ) => Transaction;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  /**
   * Persist a manual order for the given transaction ids.
   *
   * The ids may be a *subset* (a filtered month, a search result): they simply
   * swap the positions they already own, so hidden rows never move.
   */
  setTransactionOrder: (ids: string[]) => void;

  // dashboard widgets
  /** Replace the whole layout (already normalised by the caller or not). */
  setWidgets: (layout: WidgetPlacement[]) => void;
  /** Show/hide a widget. */
  toggleWidget: (id: WidgetId, visible?: boolean) => void;
  /** Cycle a widget through its allowed sizes. */
  resizeWidget: (id: WidgetId) => void;
  /** Apply a drag-sort result (visible ids only). */
  reorderWidgets: (orderedIds: string[]) => void;
  /** Move a widget to an absolute index (used by the a11y list controls). */
  moveWidgetTo: (id: WidgetId, index: number) => void;
  /** Restore the shipped dashboard. */
  resetWidgets: () => void;

  // notifications
  pushNotification: (
    input: Omit<NotificationItem, "id" | "createdAt" | "read" | "delivered" | "origin"> &
      Partial<Pick<NotificationItem, "read" | "delivered" | "origin">>,
  ) => NotificationItem | null;
  markNotificationRead: (id: string, read?: boolean) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
  setNotificationCategory: (
    key: CategoryKey,
    patch: Partial<{ enabled: boolean; time: string }>,
  ) => void;
  scheduleNotification: (
    input: Omit<ScheduledNotification, "id" | "status" | "origin"> &
      Partial<Pick<ScheduledNotification, "status" | "origin">>,
  ) => ScheduledNotification;
  cancelScheduled: (id: string) => void;

  // backup
  exportJSON: () => string;
  importJSON: (input: string) => { ok: boolean; error?: string };
  resetAll: () => void;
};

export const STORAGE_KEY = "skillsync:data:v1";

/**
 * XP awarded per meaningful action. One level = 100 XP; the curve is
 * deliberately linear so progress stays legible on the dashboard.
 */
export const XP_AWARDS = {
  topicCompletion: 15,
  subtopicCompletion: 10,
  checklistCompletion: 15,
  plannerTask: 5,
  habit: 5,
  projectDone: 40,
  achievement: 25,
  codingProblem: 8,
  codeRating: 30,
} as const;

/** Pure XP helper: applies a gain (clamped ≥ 0) and recomputes the level. */
export function addXpToStats(stats: Stats, amount: number): Stats {
  const gain = Math.max(0, amount);
  const xp = Math.max(0, stats.xp + amount);
  const level = 1 + Math.floor(xp / 100);
  return { ...stats, xp, level, totalXp: stats.totalXp + gain };
}

/** Pure streak helper: extends the streak on consecutive-day activity. */
export function touchStreakStats(stats: Stats, today: string = todayISO()): Stats {
  if (stats.lastActive === today) return stats;
  const yesterday = addDaysISO(today, -1);
  const streak = stats.lastActive === yesterday ? stats.streak + 1 : 1;
  return { ...stats, streak, lastActive: today };
}

/** Current visibility of a widget in a layout. */
function isVisible(layout: WidgetPlacement[], id: string): boolean {
  return layout.find((entry) => entry.id === id)?.visible ?? true;
}

/** Current size of a widget in a layout. */
function sizeOf(layout: WidgetPlacement[], id: string): WidgetPlacement["size"] {
  return layout.find((entry) => entry.id === id)?.size ?? "tile";
}

function findTopic(
  state: AppData,
  roadmapId: string,
  phaseId: string,
  topicId: string,
): Topic | undefined {
  return state.roadmaps
    .find((r) => r.id === roadmapId)
    ?.phases.find((p) => p.id === phaseId)
    ?.topics.find((t) => t.id === topicId);
}

// ---------- helpers ----------
function updateRoadmap(state: State, id: string, fn: (r: Roadmap) => Roadmap): Partial<State> {
  return {
    roadmaps: state.roadmaps.map((r) => (r.id === id ? fn(r) : r)),
  };
}

function updatePhase(
  state: State,
  roadmapId: string,
  phaseId: string,
  fn: (p: Phase) => Phase,
): Partial<State> {
  return updateRoadmap(state, roadmapId, (r) => ({
    ...r,
    phases: r.phases.map((p) => (p.id === phaseId ? fn(p) : p)),
  }));
}

function updateTopicIn(
  state: State,
  roadmapId: string,
  phaseId: string,
  topicId: string,
  fn: (t: Topic) => Topic,
): Partial<State> {
  return updatePhase(state, roadmapId, phaseId, (p) => ({
    ...p,
    topics: p.topics.map((t) => (t.id === topicId ? fn(t) : t)),
  }));
}

function move<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(idx, 1);
  copy.splice(j, 0, item);
  return copy;
}

// Cascade: set every checklist item + subtopic.done inside a subtopic.
function propagateSubtopic(sub: Subtopic, done: boolean): Subtopic {
  return {
    ...sub,
    done,
    checklist: sub.checklist.map((c) => ({ ...c, done })),
  };
}
// Cascade: set every checklist + subtopics under a topic.
function propagateTopic(topic: Topic, done: boolean): Topic {
  return {
    ...topic,
    done,
    checklist: topic.checklist.map((c) => ({ ...c, done })),
    subtopics: topic.subtopics.map((s) => propagateSubtopic(s, done)),
  };
}
// Reverse-sync: subtopic.done ↔ all its checklist items done.
function normalizeSubtopic(sub: Subtopic): Subtopic {
  if (sub.checklist.length === 0) return sub;
  const allDone = sub.checklist.every((c) => c.done);
  if (sub.done === allDone) return sub;
  return { ...sub, done: allDone };
}
// Reverse-sync: topic.done ↔ (all its checklist done AND all subtopics done).
function normalizeTopic(topic: Topic): Topic {
  const next: Topic = {
    ...topic,
    subtopics: topic.subtopics.map(normalizeSubtopic),
  };
  const checksAllDone = next.checklist.length === 0 || next.checklist.every((c) => c.done);
  const subsAllDone = next.subtopics.length === 0 || next.subtopics.every((s) => s.done);
  const hasAny = next.checklist.length > 0 || next.subtopics.length > 0;
  const allDone = hasAny && checksAllDone && subsAllDone;
  if (next.done === allDone) return next;
  return { ...next, done: allDone };
}

/** The plain-data subset of the store — what gets persisted and exported. */
export function toAppData(state: AppData): AppData {
  return {
    schemaVersion: state.schemaVersion,
    roadmaps: state.roadmaps,
    notes: state.notes,
    projects: state.projects,
    planner: state.planner,
    habits: state.habits,
    habitLogs: state.habitLogs,
    profile: state.profile,
    preferences: state.preferences,
    stats: state.stats,
    attendance: state.attendance,
    expenses: state.expenses,
    focus: state.focus,
    cgpa: state.cgpa,
    resume: state.resume,
    notifications: state.notifications,
    coding: state.coding,
    career: state.career,
    widgets: state.widgets,
  };
}

export const useAppStore = create<State>()(
  persist<State, [], [], AppData>(
    (set, get) => ({
      ...createInitialData(),
      _hydrated: false,
      markHydrated: () => set({ _hydrated: true }),

      addRoadmap: (title) =>
        set((s) => ({
          roadmaps: [
            ...s.roadmaps,
            {
              id: newId(),
              title,
              subtitle: "",
              color: "#7c3aed",
              phases: [],
              createdAt: Date.now(),
            },
          ],
        })),
      renameRoadmap: (id, title) => set((s) => updateRoadmap(s, id, (r) => ({ ...r, title }))),
      deleteRoadmap: (id) => set((s) => ({ roadmaps: s.roadmaps.filter((r) => r.id !== id) })),
      importRoadmap: (roadmap) => set((s) => ({ roadmaps: [...s.roadmaps, roadmap] })),
      replaceRoadmap: (id, roadmap) =>
        set((s) => ({
          roadmaps: s.roadmaps.map((r) => (r.id === id ? roadmap : r)),
        })),

      addPhase: (roadmapId, title) =>
        set((s) =>
          updateRoadmap(s, roadmapId, (r) => ({
            ...r,
            phases: [...r.phases, { id: newId(), title, topics: [], createdAt: Date.now() }],
          })),
        ),
      renamePhase: (roadmapId, phaseId, title) =>
        set((s) => updatePhase(s, roadmapId, phaseId, (p) => ({ ...p, title }))),
      deletePhase: (roadmapId, phaseId) =>
        set((s) =>
          updateRoadmap(s, roadmapId, (r) => ({
            ...r,
            phases: r.phases.filter((p) => p.id !== phaseId),
          })),
        ),
      movePhase: (roadmapId, phaseId, dir) =>
        set((s) =>
          updateRoadmap(s, roadmapId, (r) => {
            const idx = r.phases.findIndex((p) => p.id === phaseId);
            if (idx < 0) return r;
            return { ...r, phases: move(r.phases, idx, dir) };
          }),
        ),

      addTopic: (roadmapId, phaseId, title) =>
        set((s) =>
          updatePhase(s, roadmapId, phaseId, (p) => ({
            ...p,
            topics: [
              ...p.topics,
              {
                id: newId(),
                title,
                done: false,
                notes: "",
                resources: [],
                subtopics: [],
                checklist: [],
                createdAt: Date.now(),
                completedAt: null,
              },
            ],
          })),
        ),
      updateTopic: (roadmapId, phaseId, topicId, patch) =>
        set((s) =>
          updateTopicIn(s, roadmapId, phaseId, topicId, (t) => ({
            ...t,
            ...patch,
          })),
        ),
      deleteTopic: (roadmapId, phaseId, topicId) =>
        set((s) =>
          updatePhase(s, roadmapId, phaseId, (p) => ({
            ...p,
            topics: p.topics.filter((t) => t.id !== topicId),
          })),
        ),
      moveTopic: (roadmapId, phaseId, topicId, dir) =>
        set((s) =>
          updatePhase(s, roadmapId, phaseId, (p) => {
            const idx = p.topics.findIndex((t) => t.id === topicId);
            if (idx < 0) return p;
            return { ...p, topics: move(p.topics, idx, dir) };
          }),
        ),

      addSubtopic: (roadmapId, phaseId, topicId, title) =>
        set((s) =>
          updateTopicIn(s, roadmapId, phaseId, topicId, (t) => ({
            ...t,
            subtopics: [
              ...t.subtopics,
              {
                id: newId(),
                title,
                done: false,
                notes: "",
                resources: [],
                checklist: [],
                createdAt: Date.now(),
              },
            ],
          })),
        ),
      updateSubtopic: (roadmapId, phaseId, topicId, subtopicId, patch) =>
        set((s) =>
          updateTopicIn(s, roadmapId, phaseId, topicId, (t) =>
            normalizeTopic({
              ...t,
              subtopics: t.subtopics.map((sub) =>
                sub.id === subtopicId ? { ...sub, ...patch } : sub,
              ),
            }),
          ),
        ),
      deleteSubtopic: (roadmapId, phaseId, topicId, subtopicId) =>
        set((s) =>
          updateTopicIn(s, roadmapId, phaseId, topicId, (t) =>
            normalizeTopic({
              ...t,
              subtopics: t.subtopics.filter((sub) => sub.id !== subtopicId),
            }),
          ),
        ),

      addChecklistItem: (path, title) =>
        set((s) =>
          updateTopicIn(s, path.roadmapId, path.phaseId, path.topicId, (t) => {
            const item: ChecklistItem = {
              id: newId(),
              title,
              done: false,
              createdAt: Date.now(),
            };
            if (path.subtopicId) {
              return normalizeTopic({
                ...t,
                subtopics: t.subtopics.map((sub) =>
                  sub.id === path.subtopicId
                    ? { ...sub, checklist: [...sub.checklist, item] }
                    : sub,
                ),
              });
            }
            return normalizeTopic({
              ...t,
              checklist: [...t.checklist, item],
            });
          }),
        ),
      updateChecklistItem: (path, itemId, patch) =>
        set((s) => {
          const topic = findTopic(s, path.roadmapId, path.phaseId, path.topicId);
          if (!topic) return {};
          const prevPct = topicPct(topic);
          let nextTopic: Topic;
          if (path.subtopicId) {
            nextTopic = normalizeTopic({
              ...topic,
              subtopics: topic.subtopics.map((sub) =>
                sub.id === path.subtopicId
                  ? {
                      ...sub,
                      checklist: sub.checklist.map((c) =>
                        c.id === itemId ? { ...c, ...patch } : c,
                      ),
                    }
                  : sub,
              ),
            });
          } else {
            nextTopic = normalizeTopic({
              ...topic,
              checklist: topic.checklist.map((c) => (c.id === itemId ? { ...c, ...patch } : c)),
            });
          }
          const nextPct = topicPct(nextTopic);
          const crossed = prevPct < 100 && nextPct === 100;
          const withStamp: Topic = crossed
            ? { ...nextTopic, completedAt: Date.now() }
            : nextPct < 100
              ? { ...nextTopic, completedAt: null }
              : nextTopic;
          return {
            ...updateTopicIn(s, path.roadmapId, path.phaseId, path.topicId, () => withStamp),
            stats: crossed ? addXpToStats(s.stats, XP_AWARDS.checklistCompletion) : s.stats,
          };
        }),
      deleteChecklistItem: (path, itemId) =>
        set((s) =>
          updateTopicIn(s, path.roadmapId, path.phaseId, path.topicId, (t) => {
            if (path.subtopicId) {
              return normalizeTopic({
                ...t,
                subtopics: t.subtopics.map((sub) =>
                  sub.id === path.subtopicId
                    ? {
                        ...sub,
                        checklist: sub.checklist.filter((c) => c.id !== itemId),
                      }
                    : sub,
                ),
              });
            }
            return normalizeTopic({
              ...t,
              checklist: t.checklist.filter((c) => c.id !== itemId),
            });
          }),
        ),

      setSubtopicComplete: (roadmapId, phaseId, topicId, subtopicId, done) =>
        set((s) => {
          const topic = findTopic(s, roadmapId, phaseId, topicId);
          const sub = topic?.subtopics.find((x) => x.id === subtopicId);
          if (!topic || !sub) return {};
          const award = done && subtopicPct(sub) < 100;
          const nextTopic = normalizeTopic({
            ...topic,
            subtopics: topic.subtopics.map((x) =>
              x.id === subtopicId ? propagateSubtopic(x, done) : x,
            ),
          });
          const crossed = topicPct(topic) < 100 && topicPct(nextTopic) === 100;
          const withStamp = crossed ? { ...nextTopic, completedAt: Date.now() } : nextTopic;
          return {
            ...updateTopicIn(s, roadmapId, phaseId, topicId, () => withStamp),
            stats: award ? addXpToStats(s.stats, XP_AWARDS.subtopicCompletion) : s.stats,
          };
        }),
      setTopicComplete: (roadmapId, phaseId, topicId, done) =>
        set((s) => {
          const topic = findTopic(s, roadmapId, phaseId, topicId);
          if (!topic) return {};
          const award = done && topicPct(topic) < 100;
          const next: Topic = {
            ...propagateTopic(topic, done),
            completedAt: done ? Date.now() : null,
          };
          return {
            ...updateTopicIn(s, roadmapId, phaseId, topicId, () => next),
            stats: award ? addXpToStats(s.stats, XP_AWARDS.topicCompletion) : s.stats,
          };
        }),
      setPhaseComplete: (roadmapId, phaseId, done) =>
        set((s) =>
          updatePhase(s, roadmapId, phaseId, (p) => ({
            ...p,
            topics: p.topics.map((t) => propagateTopic(t, done)),
          })),
        ),

      addNote: (partial) => {
        const now = Date.now();
        const note: Note = {
          id: newId(),
          title: partial?.title ?? "Untitled note",
          body: partial?.body ?? "",
          tags: partial?.tags ?? [],
          pinned: partial?.pinned ?? false,
          linkedTo: partial?.linkedTo ?? null,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ notes: [note, ...s.notes] }));
        return note;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
        })),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      addProject: (partial) => {
        const project: Project = {
          id: newId(),
          title: partial?.title ?? "New project",
          description: partial?.description ?? "",
          status: partial?.status ?? "planning",
          progress: partial?.progress ?? 0,
          deadline: partial?.deadline ?? null,
          techStack: partial?.techStack ?? [],
          tasks: partial?.tasks ?? [],
          notes: partial?.notes ?? "",
          githubUrl: partial?.githubUrl ?? "",
          createdAt: Date.now(),
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },
      updateProject: (id, patch) =>
        set((s) => {
          const project = s.projects.find((p) => p.id === id);
          const shipped = patch.status === "done" && project && project.status !== "done";
          return {
            projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
            stats: shipped
              ? touchStreakStats(addXpToStats(s.stats, XP_AWARDS.projectDone))
              : s.stats,
          };
        }),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      addProjectTask: (projectId, title) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: [...p.tasks, { id: newId(), title, done: false }],
                }
              : p,
          ),
        })),
      updateProjectTask: (projectId, taskId, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
                }
              : p,
          ),
        })),
      deleteProjectTask: (projectId, taskId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p,
          ),
        })),

      addPlannerTask: (partial) =>
        set((s) => ({
          planner: [
            ...s.planner,
            {
              id: newId(),
              title: partial.title ?? "New task",
              date: partial.date,
              time: partial.time ?? "",
              done: partial.done ?? false,
              priority: partial.priority ?? "medium",
              doneAt: partial.doneAt ?? null,
              createdAt: Date.now(),
            },
          ],
        })),
      updatePlannerTask: (id, patch) =>
        set((s) => {
          const task = s.planner.find((t) => t.id === id);
          const completing = patch.done === true && !task?.done;
          let doneAt = task?.doneAt ?? null;
          if (patch.done === true && !task?.done) doneAt = Date.now();
          if (patch.done === false) doneAt = null;
          return {
            planner: s.planner.map((t) => (t.id === id ? { ...t, ...patch, doneAt } : t)),
            stats: completing
              ? touchStreakStats(addXpToStats(s.stats, XP_AWARDS.plannerTask))
              : s.stats,
          };
        }),
      deletePlannerTask: (id) => set((s) => ({ planner: s.planner.filter((t) => t.id !== id) })),

      addHabit: (title, emoji = "✨") =>
        set((s) => ({
          habits: [
            ...s.habits,
            {
              id: newId(),
              title,
              emoji,
              createdAt: Date.now(),
              startDate: todayISO(),
            },
          ],
        })),
      renameHabit: (id, title) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, title } : h)),
        })),
      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),
      deleteHabit: (id) =>
        set((s) => ({
          habits: s.habits.filter((h) => h.id !== id),
          habitLogs: s.habitLogs.filter((l) => l.habitId !== id),
        })),
      toggleHabitToday: (id, dateISO) => {
        const date = dateISO ?? todayISO();
        const existing = get().habitLogs.find((l) => l.habitId === id && l.date === date);
        if (existing) {
          set((s) => ({
            habitLogs: s.habitLogs.filter((l) => !(l.habitId === id && l.date === date)),
          }));
        } else {
          set((s) => ({
            habitLogs: [...s.habitLogs, { habitId: id, date }],
            stats: touchStreakStats(addXpToStats(s.stats, XP_AWARDS.habit)),
          }));
        }
      },

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      updatePreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
      setModuleEnabled: (key, enabled) =>
        set((s) => ({
          preferences: {
            ...s.preferences,
            modules: { ...s.preferences.modules, [key]: enabled },
          },
        })),
      addXp: (amount) => set((s) => ({ stats: addXpToStats(s.stats, amount) })),
      touchStreak: () => set((s) => ({ stats: touchStreakStats(s.stats) })),
      unlockAchievements: (ids) => {
        const state = get();
        const awarded = new Set(state.stats.achievements);
        const fresh = ids.filter((id) => !awarded.has(id));
        if (fresh.length === 0) return [];
        set((s) => ({
          stats: addXpToStats(
            { ...s.stats, achievements: [...s.stats.achievements, ...fresh] },
            XP_AWARDS.achievement * fresh.length,
          ),
        }));
        return fresh;
      },

      addFocusSession: (input) => {
        const session: FocusSession = {
          id: newId(),
          startedAt: input.startedAt ?? Date.now(),
          minutes: input.minutes,
          mode: input.mode,
          task: input.task ?? "",
        };
        set((s) => ({
          focus: { ...s.focus, sessions: [...s.focus.sessions, session] },
          stats:
            session.mode === "focus"
              ? touchStreakStats(addXpToStats(s.stats, focusXp(session.minutes)))
              : s.stats,
        }));
        return session;
      },
      updateFocusSettings: (patch) =>
        set((s) => ({
          focus: { ...s.focus, settings: { ...s.focus.settings, ...patch } },
        })),

      addCgpaSemester: (number) => {
        const semester: CgpaSemester = { id: newId(), number, subjects: [] };
        set((s) => ({
          cgpa: { ...s.cgpa, semesters: [...s.cgpa.semesters, semester] },
        }));
        return semester;
      },
      updateCgpaSemester: (id, patch) =>
        set((s) => ({
          cgpa: {
            ...s.cgpa,
            semesters: s.cgpa.semesters.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          },
        })),
      deleteCgpaSemester: (id) =>
        set((s) => ({
          cgpa: { ...s.cgpa, semesters: s.cgpa.semesters.filter((x) => x.id !== id) },
        })),
      addCgpaSubject: (semesterId, partial) => {
        const subject: CgpaSubject = {
          id: newId(),
          name: partial.name,
          code: partial.code ?? "",
          credits: partial.credits ?? 3,
          grade: partial.grade ?? "O",
        };
        set((s) => ({
          cgpa: {
            ...s.cgpa,
            semesters: s.cgpa.semesters.map((x) =>
              x.id === semesterId ? { ...x, subjects: [...x.subjects, subject] } : x,
            ),
          },
        }));
        return subject;
      },
      updateCgpaSubject: (semesterId, subjectId, patch) =>
        set((s) => ({
          cgpa: {
            ...s.cgpa,
            semesters: s.cgpa.semesters.map((x) =>
              x.id === semesterId
                ? {
                    ...x,
                    subjects: x.subjects.map((sub) =>
                      sub.id === subjectId ? { ...sub, ...patch } : sub,
                    ),
                  }
                : x,
            ),
          },
        })),
      deleteCgpaSubject: (semesterId, subjectId) =>
        set((s) => ({
          cgpa: {
            ...s.cgpa,
            semesters: s.cgpa.semesters.map((x) =>
              x.id === semesterId
                ? { ...x, subjects: x.subjects.filter((sub) => sub.id !== subjectId) }
                : x,
            ),
          },
        })),

      updateResume: (patch) => set((s) => ({ resume: { ...s.resume, ...patch } })),
      setResume: (resume) => set({ resume }),

      addCodingProblem: (partial) => {
        const problem: CodingProblem = {
          id: newId(),
          title: partial.title,
          platform: partial.platform ?? "leetcode",
          difficulty: partial.difficulty ?? "medium",
          tags: partial.tags ?? [],
          url: partial.url ?? "",
          solvedAt: partial.solvedAt ?? Date.now(),
          notes: partial.notes ?? "",
          timeComplexity: partial.timeComplexity ?? "",
          spaceComplexity: partial.spaceComplexity ?? "",
        };
        set((s) => ({
          coding: { ...s.coding, problems: [problem, ...s.coding.problems] },
          stats: touchStreakStats(addXpToStats(s.stats, XP_AWARDS.codingProblem)),
        }));
        return problem;
      },
      updateCodingProblem: (id, patch) =>
        set((s) => ({
          coding: {
            ...s.coding,
            problems: s.coding.problems.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          },
        })),
      deleteCodingProblem: (id) =>
        set((s) => ({
          coding: { ...s.coding, problems: s.coding.problems.filter((p) => p.id !== id) },
        })),
      setCodeRating: (rating) =>
        set((s) => {
          const point: RatingPoint = { at: Date.now(), rating };
          return {
            coding: {
              ...s.coding,
              rating,
              maxRating: Math.max(s.coding.maxRating, rating),
              ratingHistory: [...s.coding.ratingHistory, point],
            },
            stats: addXpToStats(s.stats, XP_AWARDS.codeRating),
          };
        }),

      addJobApplication: (partial) => {
        const app: JobApplication = {
          id: newId(),
          company: partial.company,
          role: partial.role ?? "",
          location: partial.location ?? "",
          status: partial.status ?? "saved",
          appliedAt: partial.appliedAt ?? Date.now(),
          deadline: partial.deadline ?? null,
          referral: partial.referral ?? "",
          link: partial.link ?? "",
          salary: partial.salary ?? "",
          notes: partial.notes ?? "",
          rounds: partial.rounds ?? [],
        };
        set((s) => ({
          career: { ...s.career, applications: [app, ...s.career.applications] },
        }));
        return app;
      },
      updateJobApplication: (id, patch) =>
        set((s) => ({
          career: {
            ...s.career,
            applications: s.career.applications.map((a) => (a.id === id ? { ...a, ...patch } : a)),
          },
        })),
      deleteJobApplication: (id) =>
        set((s) => ({
          career: {
            ...s.career,
            applications: s.career.applications.filter((a) => a.id !== id),
          },
        })),
      addInterviewRound: (applicationId, partial) => {
        const round: InterviewRound = {
          id: newId(),
          name: partial.name ?? "Interview",
          date: partial.date ?? null,
          type: partial.type ?? "virtual",
          outcome: partial.outcome ?? "pending",
          notes: partial.notes ?? "",
        };
        set((s) => ({
          career: {
            ...s.career,
            applications: s.career.applications.map((a) =>
              a.id === applicationId ? { ...a, rounds: [...a.rounds, round] } : a,
            ),
          },
        }));
        return round;
      },
      updateInterviewRound: (applicationId, roundId, patch) =>
        set((s) => ({
          career: {
            ...s.career,
            applications: s.career.applications.map((a) =>
              a.id === applicationId
                ? {
                    ...a,
                    rounds: a.rounds.map((r) => (r.id === roundId ? { ...r, ...patch } : r)),
                  }
                : a,
            ),
          },
        })),
      deleteInterviewRound: (applicationId, roundId) =>
        set((s) => ({
          career: {
            ...s.career,
            applications: s.career.applications.map((a) =>
              a.id === applicationId
                ? { ...a, rounds: a.rounds.filter((r) => r.id !== roundId) }
                : a,
            ),
          },
        })),

      addSubject: (partial) => {
        const subject: Subject = {
          id: newId(),
          semester: partial.semester,
          name: partial.name,
          faculty: partial.faculty ?? "",
          minRequired: partial.minRequired ?? 75,
          present: partial.present ?? 0,
          absent: partial.absent ?? 0,
          createdAt: Date.now(),
        };
        set((s) => ({
          attendance: {
            ...s.attendance,
            subjects: [...s.attendance.subjects, subject],
          },
        }));
        return subject;
      },
      updateSubject: (id, patch) =>
        set((s) => ({
          attendance: {
            ...s.attendance,
            subjects: s.attendance.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          },
        })),
      deleteSubject: (id) =>
        set((s) => ({
          attendance: {
            ...s.attendance,
            subjects: s.attendance.subjects.filter((x) => x.id !== id),
          },
        })),

      addTransaction: (partial) => {
        const existing = get().expenses.transactions;
        const minPos = existing.reduce((m, t) => Math.min(m, t.position ?? 0), 0);
        const now = Date.now();
        const tx: Transaction = {
          id: newId(),
          title: partial.title,
          description: partial.description ?? "",
          amount: partial.amount,
          type: partial.type,
          tags: partial.tags ?? [],
          at: partial.at ?? now,
          position: partial.position ?? minPos - 1,
          updatedAt: now,
        };
        set((s) => ({
          expenses: {
            ...s.expenses,
            transactions: [tx, ...s.expenses.transactions],
          },
        }));
        return tx;
      },
      updateTransaction: (id, patch) =>
        set((s) => ({
          expenses: {
            ...s.expenses,
            transactions: s.expenses.transactions.map((t) =>
              t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
            ),
          },
        })),
      setTransactionOrder: (ids) =>
        set((s) => ({
          expenses: {
            ...s.expenses,
            transactions: applyOrder(s.expenses.transactions, ids),
          },
        })),
      deleteTransaction: (id) =>
        set((s) => ({
          expenses: {
            ...s.expenses,
            transactions: s.expenses.transactions.filter((t) => t.id !== id),
          },
        })),

      setWidgets: (layout) => set({ widgets: normalizeWidgetLayout(layout) }),
      toggleWidget: (id, visible) =>
        set((s) => ({
          widgets: setWidgetVisible(s.widgets, id, visible ?? !isVisible(s.widgets, id)),
        })),
      resizeWidget: (id) =>
        set((s) => ({
          widgets: setWidgetSize(s.widgets, id, nextWidgetSize(id, sizeOf(s.widgets, id))),
        })),
      reorderWidgets: (orderedIds) =>
        set((s) => ({ widgets: applyWidgetOrder(s.widgets, orderedIds) })),
      moveWidgetTo: (id, index) => set((s) => ({ widgets: moveWidget(s.widgets, id, index) })),
      resetWidgets: () => set({ widgets: resetWidgetLayout() }),

      pushNotification: (input) => {
        const state = get();
        const existing = state.notifications?.items ?? [];
        if (input.sourceId && existing.some((i) => i.sourceId === input.sourceId)) {
          return null;
        }
        const item: NotificationItem = {
          id: newId(),
          createdAt: Date.now(),
          read: false,
          delivered: false,
          origin: "rule",
          ...input,
        };
        set((s) => ({
          notifications: {
            ...s.notifications,
            items: [item, ...(s.notifications?.items ?? [])].slice(0, HISTORY_LIMIT),
          },
        }));
        return item;
      },
      markNotificationRead: (id, read = true) =>
        set((s) => ({
          notifications: {
            ...s.notifications,
            items: (s.notifications?.items ?? []).map((i) => (i.id === id ? { ...i, read } : i)),
          },
        })),
      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: {
            ...s.notifications,
            items: (s.notifications?.items ?? []).map((i) => ({ ...i, read: true })),
          },
        })),
      deleteNotification: (id) =>
        set((s) => ({
          notifications: {
            ...s.notifications,
            items: (s.notifications?.items ?? []).filter((i) => i.id !== id),
          },
        })),
      clearNotifications: () => set((s) => ({ notifications: { ...s.notifications, items: [] } })),
      updateNotificationSettings: (patch) =>
        set((s) => ({
          notifications: {
            ...s.notifications,
            settings: { ...s.notifications.settings, ...patch },
          },
        })),
      setNotificationCategory: (key, patch) =>
        set((s) => ({
          notifications: {
            ...s.notifications,
            settings: {
              ...s.notifications.settings,
              categories: {
                ...s.notifications.settings.categories,
                [key]: { ...s.notifications.settings.categories?.[key], ...patch },
              },
            },
          },
        })),
      scheduleNotification: (input) => {
        const entry: ScheduledNotification = {
          id: newId(),
          status: "pending",
          origin: "rule",
          ...input,
        };
        set((s) => ({
          notifications: {
            ...s.notifications,
            scheduled: [...(s.notifications?.scheduled ?? []), entry],
          },
        }));
        return entry;
      },
      cancelScheduled: (id) =>
        set((s) => ({
          notifications: {
            ...s.notifications,
            scheduled: (s.notifications?.scheduled ?? []).map((e) =>
              e.id === id ? { ...e, status: "cancelled" as const } : e,
            ),
          },
        })),

      exportJSON: () => JSON.stringify(toAppData(get()), null, 2),
      importJSON: (input) => {
        try {
          const parsed: unknown = JSON.parse(input);
          // Untrusted file input: reject anything that does not look like a
          // SkillSync export BEFORE touching the store. Without this guard a
          // random JSON object would migrate into seed data and silently wipe
          // the user's workspace with a "success" message.
          if (
            !parsed ||
            typeof parsed !== "object" ||
            typeof (parsed as Record<string, unknown>).schemaVersion !== "number"
          ) {
            return { ok: false, error: "Not a SkillSync export (missing schema version)." };
          }
          const migrated = migrate(parsed);
          const valid = AppDataSchema.parse(migrated);
          set({ ...valid });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: errorMessage(e, "Invalid file") };
        }
      },
      resetAll: () => {
        set({ ...createInitialData() });
        // A wipe must not leave the previous workspace's "backed up" badge
        // behind. Saved copies in the vault and any files stay untouched, so a
        // reset can still be undone by restoring a backup.
        setLastBackupMeta(null);
      },
    }),
    {
      name: STORAGE_KEY,
      version: 10,
      storage: createJSONStorage(() =>
        // No storage during SSR — persist skips hydration when this is undefined.
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as StateStorage),
      ),
      // Only persist plain data fields — never the action functions.
      partialize: toAppData,
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
      migrate: (persistedState) => migrate(persistedState),
    },
  ),
);

export function useHydrated() {
  return useAppStore((s) => s._hydrated);
}
