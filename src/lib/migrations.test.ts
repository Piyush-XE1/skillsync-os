import { describe, it, expect } from "vitest";
import { migrate } from "@/lib/migrations";
import { CURRENT_SCHEMA_VERSION, type AppData } from "@/lib/schema";
import { createInitialData } from "@/lib/seed";

describe("migrate", () => {
  /** Seed timestamps are non-deterministic; normalize them for equality checks. */
  function normalize(data: AppData): AppData {
    return { ...data, stats: { ...data.stats, joinedAt: 0 } };
  }

  it("returns the seed for null / undefined / non-object input", () => {
    const seed = createInitialData();
    expect(normalize(migrate(null))).toEqual(normalize(seed));
    expect(normalize(migrate(undefined))).toEqual(normalize(seed));
    expect(normalize(migrate("hi"))).toEqual(normalize(seed));
    expect(normalize(migrate(42))).toEqual(normalize(seed));
  });

  it("returns a valid AppData with the current schema version", () => {
    const result = migrate({ schemaVersion: 1, roadmaps: [], habits: [] });
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("round-trips an already-current export unchanged (with defaults applied)", () => {
    const data = createInitialData();
    const result = migrate(JSON.parse(JSON.stringify(data)));
    expect(result).toEqual(data);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("migrates v1 data to add habit.startDate, modules and preferences", () => {
    const v1 = {
      schemaVersion: 1,
      habits: [{ id: "h1", title: "Sleep", emoji: "😴", createdAt: 1_700_000_000_000 }],
    };
    const result = migrate(v1);
    expect(result.habits[0].startDate).toBeTruthy();
    expect(result.attendance).toEqual({ subjects: [] });
    expect(result.expenses).toEqual({ transactions: [] });
    expect(result.preferences.modules).toEqual({
      attendance: false,
      expenses: false,
      focus: true,
      cgpa: true,
      resume: true,
    });
  });

  it("migrates v6 data to v7: stats gains totalXp / joinedAt / achievements", () => {
    const v6 = {
      schemaVersion: 6,
      stats: { xp: 130, level: 2, streak: 3, lastActive: "2026-08-30" },
      planner: [{ id: "p1", title: "Old task", date: "2026-09-01", createdAt: 1 }],
    };
    const result = migrate(v6);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.stats.totalXp).toBe(0);
    expect(result.stats.joinedAt).toBeGreaterThan(0);
    expect(result.stats.achievements).toEqual([]);
    expect(result.planner[0].priority).toBe("medium");
    expect(result.planner[0].doneAt).toBeNull();
    expect(result.focus.sessions).toEqual([]);
    expect(result.cgpa.semesters).toEqual([]);
    expect(result.resume.experience).toEqual([]);
    // Existing stats survive untouched.
    expect(result.stats.xp).toBe(130);
    expect(result.stats.streak).toBe(3);
  });

  it("migrates legacy theme light → background light", () => {
    const result = migrate({
      schemaVersion: 4,
      preferences: { theme: "light" },
    });
    expect(result.preferences.background).toBe("light");
    expect((result.preferences as Record<string, unknown>).theme).toBeUndefined();
  });

  it("falls back retired backgrounds to aurora", () => {
    for (const bg of ["gradient", "atmospheric"]) {
      const result = migrate({ schemaVersion: 6, preferences: { background: bg } });
      expect(result.preferences.background).toBe("aurora");
    }
  });

  it("keeps an unknown-but-dark future background as fallback aurora", () => {
    const result = migrate({ schemaVersion: 6, preferences: { background: "neon" } });
    expect(result.preferences.background).toBe("aurora");
  });

  it("salvages valid top-level fields when one module is corrupted", () => {
    const data = createInitialData();
    const notes = [
      { id: "n1", title: "Hi", body: "", tags: [], pinned: false, updatedAt: 1, createdAt: 1 },
    ];
    const corrupt = {
      ...data,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      notes,
      roadmaps: "not-an-array", // corrupted field
    };
    const result = migrate(corrupt);
    // notes survive (with defaults applied by the schema); roadmaps fall back
    // to the seed (non-empty, valid)
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatchObject({ id: "n1", title: "Hi" });
    expect(result.notes[0].linkedTo).toBeNull();
    expect(Array.isArray(result.roadmaps)).toBe(true);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("never returns an invalid runtime shape", () => {
    const result = migrate({ schemaVersion: CURRENT_SCHEMA_VERSION, roadmaps: 123 });
    const app: AppData = result;
    expect(app).toBeTruthy();
  });
});
