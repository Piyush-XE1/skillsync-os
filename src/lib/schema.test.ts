import { describe, it, expect } from "vitest";
import { AppDataSchema, CURRENT_SCHEMA_VERSION } from "@/lib/schema";
import { createInitialData } from "@/lib/seed";

describe("schema", () => {
  it("accepts seed data and round-trips it", () => {
    const data = createInitialData();
    const parsed = AppDataSchema.parse(data);
    expect(parsed).toEqual(data);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("applies defaults for missing optional fields", () => {
    const parsed = AppDataSchema.parse({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      roadmaps: [],
      notes: [],
      projects: [],
      planner: [],
      habits: [],
      habitLogs: [],
    });
    expect(parsed.profile).toEqual({ name: "Learner", avatar: "" });
    expect(parsed.preferences.background).toBe("aurora");
    expect(parsed.preferences.accent).toBe("#7c3aed");
    expect(parsed.preferences.modules).toEqual({
      attendance: false,
      expenses: false,
      focus: true,
      cgpa: true,
      coding: true,
      career: true,
    });
    // The reward system is gone: no XP, levels or badges anywhere.
    expect(parsed.goals).toEqual([]);
    expect("stats" in parsed).toBe(false);
    expect(parsed.attendance).toEqual({ subjects: [] });
    expect(parsed.expenses).toEqual({ transactions: [] });
    expect(parsed.focus.sessions).toEqual([]);
    expect(parsed.cgpa.semesters).toEqual([]);
    // The Resume builder was removed in v12: no record block anywhere.
    expect("resume" in parsed).toBe(false);
    expect(parsed.notifications.items).toEqual([]);
    expect(parsed.coding).toEqual({ problems: [], rating: 0, maxRating: 0, ratingHistory: [] });
    expect(parsed.career).toEqual({ applications: [] });
  });

  it("rejects data without a schema version", () => {
    const result = AppDataSchema.safeParse({ roadmaps: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid background value", () => {
    const data = createInitialData();
    (data.preferences as { background: string }).background = "neon";
    const result = AppDataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
