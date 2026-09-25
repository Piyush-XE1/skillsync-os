import { describe, it, expect } from "vitest";
import { migrate } from "@/lib/migrations";
import { CURRENT_SCHEMA_VERSION, type AppData } from "@/lib/schema";
import { createInitialData } from "@/lib/seed";

describe("migrate", () => {
  it("returns the seed for null / undefined / non-object input", () => {
    const seed = createInitialData();
    expect(migrate(null)).toEqual(seed);
    expect(migrate(undefined)).toEqual(seed);
    expect(migrate("hi")).toEqual(seed);
    expect(migrate(42)).toEqual(seed);
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
      coding: true,
      career: true,
    });
    expect(result.coding).toEqual({ problems: [], rating: 0, maxRating: 0, ratingHistory: [] });
    expect(result.career).toEqual({ applications: [] });
  });

  it("migrates v7 data to v8: adds the coding and career modules", () => {
    const v7 = {
      schemaVersion: 7,
      preferences: { modules: { focus: true, cgpa: true, resume: true, coding: false } },
      coding: undefined,
      career: undefined,
    };
    const result = migrate(v7);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.coding).toEqual({ problems: [], rating: 0, maxRating: 0, ratingHistory: [] });
    expect(result.career).toEqual({ applications: [] });
    // Existing module flag is preserved; missing one defaults on.
    expect(result.preferences.modules.coding).toBe(false);
    expect(result.preferences.modules.career).toBe(true);
  });

  it("migrates v6 data: planner gains defaults and the reward block is dropped", () => {
    const v6 = {
      schemaVersion: 6,
      // Reward fields from the retired gamification system.
      stats: { xp: 130, level: 2, streak: 3, lastActive: "2026-08-30", achievements: ["x"] },
      planner: [{ id: "p1", title: "Old task", date: "2026-09-01", createdAt: 1 }],
    };
    const result = migrate(v6);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.planner[0].priority).toBe("medium");
    expect(result.planner[0].doneAt).toBeNull();
    expect(result.focus.sessions).toEqual([]);
    expect(result.cgpa.semesters).toEqual([]);
    // The Resume builder was removed in v12: no record block anywhere.
    expect("resume" in result).toBe(false);
    // XP, levels, streaks and badges are gone — not carried over, not hidden.
    expect("stats" in result).toBe(false);
  });

  it("migrates v10 to v11: drops stats, retires the achievements category, adds empty goals", () => {
    const v10 = {
      schemaVersion: 10,
      stats: { xp: 420, level: 5, streak: 12, lastActive: "2026-09-01" },
      notifications: {
        settings: {
          enabled: true,
          categories: {
            habits: { enabled: true, time: "21:00" },
            achievements: { enabled: false },
          },
        },
        items: [
          { id: "n1", createdAt: 1, category: "achievements", title: "7-day streak" },
          { id: "n2", createdAt: 2, category: "habits", title: "Check in" },
        ],
        scheduled: [{ id: "s1", category: "achievements", title: "x", dueAt: 1 }],
      },
    };
    const result = migrate(v10);
    expect("stats" in result).toBe(false);
    // The retired category survives nowhere: not as a setting, not in history.
    expect("achievements" in result.notifications.settings.categories).toBe(false);
    expect(result.notifications.items.map((i) => i.id)).toEqual(["n2"]);
    expect(result.notifications.scheduled).toEqual([]);
    expect(result.notifications.settings.categories.habits.enabled).toBe(true);
    // Aims start empty: they are never invented for an existing workspace…
    expect(result.goals).toEqual([]);
    // …but the Aims panel is inserted at the very top of the dashboard.
    expect(result.widgets[0].id).toBe("goals");
  });

  it("keeps the aims a workspace already has", () => {
    const result = migrate({
      schemaVersion: 11,
      goals: [{ id: "g1", title: "No fap", emoji: "🔒", note: "", createdAt: 1 }],
    });
    expect(result.goals.map((g) => g.title)).toEqual(["No fap"]);
  });

  it("migrates v11 to v12: drops the resume module and its data", () => {
    const v11 = {
      schemaVersion: 11,
      preferences: {
        modules: { focus: true, cgpa: true, resume: true, coding: true, career: true },
      },
      resume: {
        name: "Ada Lovelace",
        title: "Software Engineer",
        email: "ada@example.com",
        skills: ["TypeScript"],
        education: [{ id: "e1", institution: "IIT", degree: "B.Tech" }],
        experience: [],
        projects: [],
        certifications: [],
      },
      habits: [{ id: "h1", title: "Gym", emoji: "🏋️", createdAt: 1 }],
    };
    const result = migrate(v11);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    // The record block and the module flag are both gone…
    expect("resume" in result).toBe(false);
    expect("resume" in result.preferences.modules).toBe(false);
    // …while everything else survives untouched.
    expect(result.habits.map((h) => h.title)).toEqual(["Gym"]);
    expect(result.preferences.modules.focus).toBe(true);
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

  it("migrates v8 to v9: adds a per-background accent default", () => {
    const v8 = (bg: string) => ({
      schemaVersion: 8,
      preferences: { background: bg },
    });
    expect(migrate(v8("aurora")).preferences.accent).toBe("#7c3aed");
    expect(migrate(v8("atelier")).preferences.accent).toBe("#c9a35c");
    expect(migrate(v8("light")).preferences.accent).toBe("#20573f");
  });

  it("keeps a user-chosen accent when migrating", () => {
    const result = migrate({
      schemaVersion: 9,
      preferences: { background: "aurora", accent: "#e11d48" },
    });
    expect(result.preferences.accent).toBe("#e11d48");
  });

  it("falls back a blank accent to the theme default", () => {
    const result = migrate({
      schemaVersion: 9,
      preferences: { background: "aurora", accent: "" },
    });
    expect(result.preferences.accent).toBe("#7c3aed");
  });
});
