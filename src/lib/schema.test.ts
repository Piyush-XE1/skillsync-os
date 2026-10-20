import { describe, it, expect } from "vitest";
import { AppDataSchema, CURRENT_SCHEMA_VERSION, NoteSchema } from "@/lib/schema";
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
    expect(parsed.preferences.background).toBe("atelier");
    expect(parsed.preferences.accent).toBe("#C29F62");
    expect(parsed.preferences.modules).toEqual({
      expenses: false,
      focus: true,
      cgpa: true,
      coding: true,
      career: true,
      habits: true,
      notes: true,
      roadmaps: true,
      projects: true,
      planner: true,
    });
    expect(parsed.preferences.hasCompletedFirstLaunch).toBe(false);
    expect(parsed.preferences.onboardingCompleted).toBe(false);
    expect(parsed.preferences.graphicsQuality).toBe("automatic");
    // The reward system is gone: no XP, levels or badges anywhere.
    expect(parsed.goals).toEqual([]);
    expect(parsed.archetypeTraits).toEqual([]);
    expect(parsed.customQuotes).toEqual([]);
    expect(parsed.quoteFilterPreference).toBe("stoic");
    expect(parsed.antiSelfEntries).toEqual([]);
    expect(parsed.birthDate).toBeNull();
    expect(parsed.stopwatches).toEqual([]);
    expect(parsed.stopwatchEnabled).toBe(false);
    expect("stats" in parsed).toBe(false);
    expect(parsed).not.toHaveProperty("attendance");
    expect(parsed.expenses).toEqual({ transactions: [], monthlyBudget: 0 });
    expect(parsed.focus.sessions).toEqual([]);
    expect(parsed.cgpa.semesters).toEqual([]);
    // The Resume builder was removed in v12: no record block anywhere.
    expect("resume" in parsed).toBe(false);
    expect(parsed.notifications.items).toEqual([]);
    expect(parsed.coding).toEqual({ problems: [], rating: 0, maxRating: 0, ratingHistory: [] });
    expect(parsed.career).toEqual({ applications: [] });
  });

  it("gives legacy-shaped notes additive notebook defaults", () => {
    const parsed = NoteSchema.parse({
      id: "legacy",
      title: "Existing note",
      body: "Never overwrite this body",
      createdAt: 1,
      updatedAt: 2,
    });

    expect(parsed).toMatchObject({
      id: "legacy",
      body: "Never overwrite this body",
      tags: [],
      pinned: false,
      notebook: "General",
      archived: false,
    });
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
