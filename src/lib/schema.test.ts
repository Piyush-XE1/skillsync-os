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
    expect(parsed.preferences.modules).toEqual({
      attendance: false,
      expenses: false,
      focus: true,
      cgpa: true,
      resume: true,
    });
    expect(parsed.stats).toEqual({
      xp: 0,
      level: 1,
      streak: 0,
      lastActive: "",
      totalXp: 0,
      joinedAt: 0,
      achievements: [],
    });
    expect(parsed.attendance).toEqual({ subjects: [] });
    expect(parsed.expenses).toEqual({ transactions: [] });
    expect(parsed.focus.sessions).toEqual([]);
    expect(parsed.cgpa.semesters).toEqual([]);
    expect(parsed.resume.skills).toEqual([]);
    expect(parsed.notifications.items).toEqual([]);
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
