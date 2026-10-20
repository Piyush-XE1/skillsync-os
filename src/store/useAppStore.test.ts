// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAppStore, STORAGE_KEY } from "@/store/useAppStore";
import { createInitialData } from "@/lib/seed";
import { CURRENT_SCHEMA_VERSION } from "@/lib/schema";
import { HISTORY_LIMIT } from "@/lib/notifications/types";

function resetStore() {
  const data = createInitialData();
  useAppStore.setState({ ...data, _hydrated: true });
}

describe("useAppStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hydrates with the seed data", () => {
    const s = useAppStore.getState();
    expect(s.roadmaps.length).toBeGreaterThan(0);
    expect(s.habits.length).toBeGreaterThan(0);
    expect(s._hydrated).toBe(true);
  });

  it("adds a habit with a start date of today", () => {
    useAppStore.getState().addHabit("Run", "footprints");
    const habit = useAppStore.getState().habits.find((h) => h.title === "Run");
    expect(habit).toBeTruthy();
    expect(habit?.emoji).toBe("footprints");
    expect(habit?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("adds an aim with a default glyph", () => {
    const goal = useAppStore.getState().addGoal({ title: "  Gym  " });
    expect(goal.title).toBe("Gym");
    expect(goal.emoji).toBe("target");
    expect(useAppStore.getState().goals.at(-1)?.id).toBe(goal.id);
  });

  it("updates, reorders and deletes aims", () => {
    const a = useAppStore.getState().addGoal({ title: "Gym", icon: "dumbbell" });
    const b = useAppStore.getState().addGoal({ title: "No junk food", icon: "salad" });
    useAppStore.getState().updateGoal(a.id, { title: "  Gym   daily ", note: "  5x a week " });
    const updated = useAppStore.getState().goals.find((g) => g.id === a.id);
    expect(updated?.title).toBe("Gym daily");
    expect(updated?.note).toBe("5x a week");

    useAppStore.getState().reorderGoals([b.id, a.id]);
    const order = useAppStore.getState().goals.map((g) => g.id);
    expect(order.indexOf(b.id)).toBeLessThan(order.indexOf(a.id));

    useAppStore.getState().deleteGoal(a.id);
    expect(useAppStore.getState().goals.some((g) => g.id === a.id)).toBe(false);
  });

  it("toggles a habit log", () => {
    const habitId = useAppStore.getState().habits[0].id;
    useAppStore.getState().toggleHabitToday(habitId, "2026-08-27");
    let s = useAppStore.getState();
    expect(s.habitLogs.some((l) => l.habitId === habitId && l.date === "2026-08-27")).toBe(true);

    // Toggling again removes the log
    useAppStore.getState().toggleHabitToday(habitId, "2026-08-27");
    s = useAppStore.getState();
    expect(s.habitLogs.some((l) => l.habitId === habitId && l.date === "2026-08-27")).toBe(false);
  });

  it("uses one emergency freeze to bridge a missed day, then enforces the cooldown", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 11, 12, 0));
    useAppStore.setState({
      habits: [
        {
          id: "h-freeze",
          title: "Walk",
          emoji: "footprints",
          createdAt: 1,
          startDate: "2025-01-01",
        },
      ],
      habitLogs: [{ habitId: "h-freeze", date: "2025-03-09", kind: "check-in" }],
    });

    expect(useAppStore.getState().applyEmergencyFreeze("h-freeze")).toBe(true);
    expect(useAppStore.getState().habitLogs).toContainEqual({
      habitId: "h-freeze",
      date: "2025-03-10",
      kind: "freeze",
      freezeUsedAt: "2025-03-11",
    });
    expect(useAppStore.getState().applyEmergencyFreeze("h-freeze")).toBe(false);
  });

  it("keeps a chosen date when adding an expense", () => {
    const at = new Date(2026, 8, 14, 10, 30).getTime();
    const transaction = useAppStore.getState().addTransaction({
      title: "Train",
      amount: 480,
      type: "debit",
      at,
    });

    expect(transaction.at).toBe(at);
    expect(useAppStore.getState().expenses.transactions[0].at).toBe(at);
  });

  it("creates, organizes, duplicates, and deletes a note", () => {
    const note = useAppStore.getState().addNote({ title: "Idea", body: "hello" });
    expect(useAppStore.getState().notes[0]).toMatchObject({
      id: note.id,
      notebook: "General",
      archived: false,
    });

    useAppStore.getState().updateNote(note.id, {
      title: "Updated",
      notebook: "Research",
      archived: true,
    });
    expect(useAppStore.getState().notes.find((item) => item.id === note.id)).toMatchObject({
      title: "Updated",
      notebook: "Research",
      archived: true,
    });

    const copy = useAppStore.getState().duplicateNote(note.id);
    expect(copy).toMatchObject({
      title: "Updated copy",
      body: "hello",
      notebook: "Research",
      archived: false,
      pinned: false,
    });
    expect(copy?.id).not.toBe(note.id);

    useAppStore.getState().deleteNote(note.id);
    expect(useAppStore.getState().notes.find((item) => item.id === note.id)).toBeUndefined();
    expect(useAppStore.getState().notes.find((item) => item.id === copy?.id)).toBeTruthy();
  });

  it("deleting a habit also deletes its logs", () => {
    const habitId = useAppStore.getState().habits[0].id;
    useAppStore.getState().toggleHabitToday(habitId, "2026-08-27");
    useAppStore.getState().deleteHabit(habitId);
    const s = useAppStore.getState();
    expect(s.habits.some((h) => h.id === habitId)).toBe(false);
    expect(s.habitLogs.some((l) => l.habitId === habitId)).toBe(false);
  });

  it("supports roadmap create / delete", () => {
    useAppStore.getState().addRoadmap("My roadmap");
    const roadmap = useAppStore.getState().roadmaps.find((r) => r.title === "My roadmap");
    expect(roadmap).toBeTruthy();
    useAppStore.getState().deleteRoadmap(roadmap!.id);
    expect(useAppStore.getState().roadmaps.some((r) => r.id === roadmap!.id)).toBe(false);
  });

  it("creates and deletes a project", () => {
    const project = useAppStore.getState().addProject({ title: "Ship it", status: "active" });
    expect(useAppStore.getState().projects.some((p) => p.id === project.id)).toBe(true);
    useAppStore.getState().deleteProject(project.id);
    expect(useAppStore.getState().projects.some((p) => p.id === project.id)).toBe(false);
  });

  it("pushNotification dedupes on sourceId", () => {
    const input = {
      category: "habits" as const,
      title: "Habit pending",
      body: "",
      priority: "normal" as const,
      action: null,
      sourceId: "habits:pending:2026-08-27",
    };
    const first = useAppStore.getState().pushNotification(input);
    const second = useAppStore.getState().pushNotification(input);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("caps notification history at HISTORY_LIMIT", () => {
    const store = useAppStore.getState();
    for (let i = 0; i < HISTORY_LIMIT + 25; i++) {
      store.pushNotification({
        category: "learn",
        title: `n ${i}`,
        body: "",
        priority: "normal",
        action: null,
        sourceId: `n:${i}`,
      });
    }
    expect(useAppStore.getState().notifications.items.length).toBe(HISTORY_LIMIT);
  });

  it("exportJSON produces a schema-valid payload that importJSON accepts", () => {
    const json = useAppStore.getState().exportJSON();
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const res = useAppStore.getState().importJSON(json);
    expect(res).toEqual({ ok: true });
  });

  it("importJSON rejects a payload that is not a SkillSync export", () => {
    const res = useAppStore.getState().importJSON(JSON.stringify({ hello: "world" }));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/schema version/);
  });

  it("resetAll clears backup artifacts and restores seed data", () => {
    // Give the workspace some non-seed content
    useAppStore.getState().addNote({ title: "Temp" });
    expect(useAppStore.getState().notes.length).toBeGreaterThan(0);
    useAppStore.getState().resetAll();
    const s = useAppStore.getState();
    expect(s.notes.length).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});

describe("useAppStore — roadmap completion & modules", () => {
  beforeEach(() => {
    localStorage.clear();
    const data = createInitialData();
    useAppStore.setState({ ...data, _hydrated: true });
  });

  it("stamps completedAt when a topic crosses 100%", () => {
    const roadmap = useAppStore.getState().roadmaps[0];
    const phase = roadmap.phases[0];
    const topic = phase.topics[0];
    // Give the topic a single checklist item
    useAppStore
      .getState()
      .addChecklistItem(
        { roadmapId: roadmap.id, phaseId: phase.id, topicId: topic.id },
        "Read the docs",
      );
    useAppStore
      .getState()
      .updateChecklistItem(
        { roadmapId: roadmap.id, phaseId: phase.id, topicId: topic.id },
        useAppStore.getState().roadmaps[0].phases[0].topics[0].checklist[0].id,
        { done: true },
      );
    const s = useAppStore.getState();
    const updated = s.roadmaps[0].phases[0].topics[0];
    expect(updated.completedAt).not.toBeNull();
  });

  it("stamps and clears topic completion", () => {
    const { roadmaps } = useAppStore.getState();
    const topic = roadmaps[0].phases[0].topics[0];
    useAppStore
      .getState()
      .setTopicComplete(roadmaps[0].id, roadmaps[0].phases[0].id, topic.id, true);
    expect(useAppStore.getState().roadmaps[0].phases[0].topics[0].completedAt).not.toBeNull();
    useAppStore
      .getState()
      .setTopicComplete(roadmaps[0].id, roadmaps[0].phases[0].id, topic.id, false);
    expect(useAppStore.getState().roadmaps[0].phases[0].topics[0].completedAt).toBeNull();
  });

  it("records when a planner task is checked off", () => {
    useAppStore.getState().addPlannerTask({ title: "Ship it", date: "2026-09-01" });
    const id = useAppStore.getState().planner[0].id;
    useAppStore.getState().updatePlannerTask(id, { done: true });
    const s = useAppStore.getState();
    expect(s.planner[0].doneAt).not.toBeNull();
  });

  it("marks a project as shipped", () => {
    const project = useAppStore.getState().addProject({ title: "SkillSync" });
    useAppStore.getState().updateProject(project.id, { status: "done" });
    expect(useAppStore.getState().projects.find((p) => p.id === project.id)?.status).toBe("done");
  });

  it("records focus sessions and totals", () => {
    useAppStore.getState().addFocusSession({ minutes: 25, mode: "focus", task: "DSA" });
    useAppStore.getState().addFocusSession({ minutes: 5, mode: "break" });
    const s = useAppStore.getState();
    expect(s.focus.sessions.length).toBe(2);
    expect(s.focus.sessions[0].task).toBe("DSA");
  });

  it("manages CGPA semesters and subjects", () => {
    useAppStore.getState().addCgpaSemester(5);
    const semId = useAppStore.getState().cgpa.semesters[0].id;
    useAppStore.getState().addCgpaSubject(semId, { name: "DBMS", credits: 4, grade: "A+" });
    useAppStore.getState().addCgpaSubject(semId, { name: "OS", credits: 3, grade: "O" });
    expect(useAppStore.getState().cgpa.semesters[0].subjects.length).toBe(2);
    useAppStore
      .getState()
      .deleteCgpaSubject(semId, useAppStore.getState().cgpa.semesters[0].subjects[0].id);
    expect(useAppStore.getState().cgpa.semesters[0].subjects.length).toBe(1);
    useAppStore.getState().deleteCgpaSemester(semId);
    expect(useAppStore.getState().cgpa.semesters.length).toBe(0);
  });

  it("persists and manages the personal monograph records", () => {
    const store = useAppStore.getState();
    const quote = store.addCustomQuote({ quote: "Choose the essential.", author: "Me" });
    store.updateCustomQuote(quote.id, { author: "Private note" });
    store.setQuoteFilterPreference("mixed");
    expect(useAppStore.getState().customQuotes[0]).toMatchObject({
      id: quote.id,
      quote: "Choose the essential.",
      author: "Private note",
    });
    expect(useAppStore.getState().selectedCustomQuoteId).toBe(quote.id);
    expect(useAppStore.getState().quoteFilterPreference).toBe("mixed");

    const first = store.addArchetypeTrait({
      text: "I keep my word.",
      notes: "Especially when unseen.",
      subTenets: [{ id: "sub-a", text: "Make fewer promises." }],
    });
    const second = store.addArchetypeTrait({ text: "I choose the difficult truth." });
    store.reorderArchetypeTraits([second.id, first.id]);
    store.reflectOnArchetypeTrait(first.id, 1234);
    expect(useAppStore.getState().archetypeTraits.map((item) => item.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(
      useAppStore.getState().archetypeTraits.find((item) => item.id === first.id),
    ).toMatchObject({
      lastReflectedAt: 1234,
      reflectionCount: 1,
    });

    const inversion = store.addAntiSelfEntry({ text: "Careless speech.", notes: "Pause." });
    store.updateAntiSelfEntry(inversion.id, { notes: "Pause before speaking." });
    expect(useAppStore.getState().antiSelfEntries[0].notes).toBe("Pause before speaking.");
    store.deleteAntiSelfEntry(inversion.id);
    expect(useAppStore.getState().antiSelfEntries).toEqual([]);
  });

  it("uses timestamps as the stopwatch source of truth and records finished runs", () => {
    const timer = useAppStore.getState().addStopwatch({ title: "Deep Work", icon: "Brain" });
    useAppStore.getState().startStopwatch(timer.id, 1_000);
    useAppStore.getState().pauseStopwatch(timer.id, 6_000);
    let current = useAppStore.getState().stopwatches[0];
    expect(current.status).toBe("paused");
    expect(current.accumulatedMs).toBe(5_000);

    useAppStore.getState().startStopwatch(timer.id, 10_000);
    useAppStore.getState().finishStopwatch(timer.id, "Two focused segments", 18_000);
    current = useAppStore.getState().stopwatches[0];
    expect(current.status).toBe("idle");
    expect(current.startedAt).toBeNull();
    expect(current.accumulatedMs).toBe(0);
    expect(current.history).toHaveLength(1);
    expect(current.history[0]).toMatchObject({
      durationMs: 13_000,
      endedAt: 18_000,
      note: "Two focused segments",
    });

    useAppStore.getState().updateStopwatchRunNote(timer.id, current.history[0].id, "Revised note");
    expect(useAppStore.getState().stopwatches[0].history[0].note).toBe("Revised note");
  });
});
