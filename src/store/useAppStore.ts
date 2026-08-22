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
} from "@/lib/schema";
import { AppDataSchema } from "@/lib/schema";
import { createInitialData } from "@/lib/seed";
import { migrate } from "@/lib/migrations";
import { newId } from "@/lib/id";
import { todayISO } from "@/lib/date";
import { errorMessage } from "@/lib/utils";
import {
  HISTORY_LIMIT,
  type CategoryKey,
  type NotificationItem,
  type NotificationSettings,
  type ScheduledNotification,
} from "@/lib/notifications/types";

type ModuleKey = "attendance" | "expenses";

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
  /** Persist a manual order for the given transaction ids (ascending). */
  setTransactionOrder: (ids: string[]) => void;

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
    notifications: state.notifications,
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
        set((s) =>
          updateTopicIn(s, path.roadmapId, path.phaseId, path.topicId, (t) => {
            if (path.subtopicId) {
              return normalizeTopic({
                ...t,
                subtopics: t.subtopics.map((sub) =>
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
            }
            return normalizeTopic({
              ...t,
              checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, ...patch } : c)),
            });
          }),
        ),
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
        set((s) =>
          updateTopicIn(s, roadmapId, phaseId, topicId, (t) =>
            normalizeTopic({
              ...t,
              subtopics: t.subtopics.map((sub) =>
                sub.id === subtopicId ? propagateSubtopic(sub, done) : sub,
              ),
            }),
          ),
        ),
      setTopicComplete: (roadmapId, phaseId, topicId, done) =>
        set((s) => updateTopicIn(s, roadmapId, phaseId, topicId, (t) => propagateTopic(t, done))),
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
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
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
              createdAt: Date.now(),
            },
          ],
        })),
      updatePlannerTask: (id, patch) =>
        set((s) => ({
          planner: s.planner.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
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
          }));
          get().touchStreak();
          get().addXp(5);
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
      addXp: (amount) =>
        set((s) => {
          const xp = Math.max(0, s.stats.xp + amount);
          const level = 1 + Math.floor(xp / 100);
          return { stats: { ...s.stats, xp, level } };
        }),
      touchStreak: () =>
        set((s) => {
          const today = todayISO();
          if (s.stats.lastActive === today) return {};
          const yesterday = todayISO(new Date(Date.now() - 86400000));
          const streak = s.stats.lastActive === yesterday ? s.stats.streak + 1 : 1;
          return {
            stats: { ...s.stats, streak, lastActive: today },
          };
        }),

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
        set((s) => {
          const order = new Map(ids.map((id, i) => [id, i]));
          const base = s.expenses.transactions.reduce((m, t) => Math.min(m, t.position ?? 0), 0);
          return {
            expenses: {
              ...s.expenses,
              transactions: s.expenses.transactions.map((t) =>
                order.has(t.id) ? { ...t, position: base + (order.get(t.id) as number) } : t,
              ),
            },
          };
        }),
      deleteTransaction: (id) =>
        set((s) => ({
          expenses: {
            ...s.expenses,
            transactions: s.expenses.transactions.filter((t) => t.id !== id),
          },
        })),

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
          const parsed = JSON.parse(input);
          const migrated = migrate(parsed);
          const valid = AppDataSchema.parse(migrated);
          set({ ...valid });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: errorMessage(e, "Invalid file") };
        }
      },
      resetAll: () => set({ ...createInitialData() }),
    }),
    {
      name: STORAGE_KEY,
      version: 5,
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
