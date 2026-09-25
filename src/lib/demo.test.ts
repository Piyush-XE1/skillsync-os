// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDemoSnapshot,
  createDemoData,
  DEMO_SNAPSHOT_KEY,
  readDemoSnapshot,
  saveDemoSnapshot,
} from "./demo";
import { AppDataSchema } from "./schema";

const NOW = new Date(2026, 8, 25, 15, 0);

describe("createDemoData", () => {
  it("produces a workspace that satisfies the strict schema", () => {
    const data = createDemoData(NOW);
    expect(AppDataSchema.safeParse(data).success).toBe(true);
    expect(data.schemaVersion).toBe(AppDataSchema.parse(data).schemaVersion);
  });

  it("is deterministic for a given clock", () => {
    const a = createDemoData(NOW);
    const b = createDemoData(NOW);
    expect(a.habitLogs.length).toBe(b.habitLogs.length);
    expect(a.coding.rating).toBe(b.coding.rating);
    expect(a.coding.problems.map((p) => p.title)).toEqual(b.coding.problems.map((p) => p.title));
    expect(a.planner.map((t) => t.title)).toEqual(b.planner.map((t) => t.title));
  });

  it("fills every module so the app never looks empty in a demo", () => {
    const data = createDemoData(NOW);
    expect(data.goals.length).toBeGreaterThanOrEqual(5);
    expect(data.habits.length).toBeGreaterThanOrEqual(5);
    expect(data.habitLogs.length).toBeGreaterThan(200);
    expect(data.roadmaps.length).toBe(3);
    expect(data.roadmaps.flatMap((r) => r.phases).length).toBeGreaterThanOrEqual(6);
    expect(data.planner.length).toBeGreaterThanOrEqual(8);
    expect(data.projects.length).toBe(3);
    expect(data.coding.problems.length).toBeGreaterThan(100);
    expect(data.cgpa.semesters.length).toBe(6);
    expect(data.career.applications.length).toBeGreaterThanOrEqual(6);
    expect(data.attendance.subjects.length).toBe(5);
    expect(data.expenses.transactions.length).toBeGreaterThan(10);
    expect(data.focus.sessions.length).toBeGreaterThan(20);
    expect(data.notifications.items.length).toBeGreaterThanOrEqual(3);
    expect(data.notes.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps today's telemetry alive — habits checked, focus logged, a solve recorded", () => {
    const data = createDemoData(NOW);
    const today = "2026-09-25";
    expect(data.habitLogs.some((log) => log.date === today)).toBe(true);
    expect(
      data.focus.sessions.some((s) => new Date(s.startedAt).toDateString() === NOW.toDateString()),
    ).toBe(true);
    expect(data.planner.filter((t) => t.date === today).length).toBeGreaterThan(0);
  });

  it("leaves the visitor's own name out of the demo persona", () => {
    expect(createDemoData(NOW).profile.name).toBe("Aditya Sharma");
  });
});

describe("demo snapshot", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a workspace through the snapshot slot", () => {
    const real = createDemoData(NOW);
    real.profile.name = "Real User";
    expect(saveDemoSnapshot(real)).toBe(true);
    expect(window.localStorage.getItem(DEMO_SNAPSHOT_KEY)).not.toBeNull();

    const restored = readDemoSnapshot();
    expect(restored?.profile.name).toBe("Real User");
    expect(restored?.goals.length).toBe(real.goals.length);

    clearDemoSnapshot();
    expect(readDemoSnapshot()).toBeNull();
  });

  it("returns null instead of throwing on corrupted snapshots", () => {
    window.localStorage.setItem(DEMO_SNAPSHOT_KEY, "{not json");
    expect(readDemoSnapshot()).toBeNull();
  });

  it("fails soft when storage throws (private mode)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveDemoSnapshot(createDemoData(NOW))).toBe(false);
    spy.mockRestore();
  });
});
