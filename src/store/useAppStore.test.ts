// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAppStore, STORAGE_KEY } from "@/store/useAppStore";
import { createInitialData } from "@/lib/seed";
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
    useAppStore.getState().addHabit("Run", "🏃");
    const habit = useAppStore.getState().habits.find((h) => h.title === "Run");
    expect(habit).toBeTruthy();
    expect(habit?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("adds XP and recomputes the level", () => {
    useAppStore.getState().addXp(250);
    const s = useAppStore.getState();
    expect(s.stats.xp).toBe(250);
    // level = 1 + floor(250 / 100) = 3
    expect(s.stats.level).toBe(3);
  });

  it("never lets XP drop below zero", () => {
    useAppStore.getState().addXp(-1000);
    expect(useAppStore.getState().stats.xp).toBe(0);
  });

  it("toggles a habit log and grants XP / extends streak", () => {
    const habitId = useAppStore.getState().habits[0].id;
    useAppStore.getState().toggleHabitToday(habitId, "2026-08-27");
    let s = useAppStore.getState();
    expect(s.habitLogs.some((l) => l.habitId === habitId && l.date === "2026-08-27")).toBe(true);
    expect(s.stats.xp).toBe(5);
    expect(s.stats.streak).toBe(1);

    // Toggling again removes the log
    useAppStore.getState().toggleHabitToday(habitId, "2026-08-27");
    s = useAppStore.getState();
    expect(s.habitLogs.some((l) => l.habitId === habitId && l.date === "2026-08-27")).toBe(false);
  });

  it("streak continues when checked on consecutive real days", () => {
    vi.useFakeTimers();
    const habitId = useAppStore.getState().habits[0].id;

    vi.setSystemTime(new Date(2026, 7, 26, 10, 0, 0)); // Aug 26
    useAppStore.getState().toggleHabitToday(habitId);
    expect(useAppStore.getState().stats.streak).toBe(1);

    vi.setSystemTime(new Date(2026, 7, 27, 10, 0, 0)); // Aug 27
    useAppStore.getState().toggleHabitToday(habitId);
    expect(useAppStore.getState().stats.streak).toBe(2);
  });

  it("creates, updates, and deletes a note", () => {
    const note = useAppStore.getState().addNote({ title: "Idea", body: "hello" });
    expect(useAppStore.getState().notes[0].id).toBe(note.id);

    useAppStore.getState().updateNote(note.id, { title: "Updated" });
    expect(useAppStore.getState().notes.find((n) => n.id === note.id)?.title).toBe("Updated");

    useAppStore.getState().deleteNote(note.id);
    expect(useAppStore.getState().notes.find((n) => n.id === note.id)).toBeUndefined();
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
    expect(parsed.schemaVersion).toBe(6);
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
