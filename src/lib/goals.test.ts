import { describe, it, expect } from "vitest";
import {
  GOAL_PRESETS,
  GOAL_TITLE_MAX,
  cleanGoalText,
  createGoal,
  goalFromPreset,
  hasGoalNamed,
  unusedPresets,
} from "@/lib/goals";

describe("goals", () => {
  it("ships the aims people actually ask for", () => {
    const titles = GOAL_PRESETS.map((p) => p.title);
    expect(titles).toContain("Gym");
    expect(titles).toContain("No junk food");
    expect(titles).toContain("Good at academics");
    expect(titles).toContain("No fap");
  });

  it("keeps preset titles and emoji unique", () => {
    const titles = GOAL_PRESETS.map((p) => p.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
    const emoji = GOAL_PRESETS.map((p) => p.emoji);
    expect(new Set(emoji).size).toBe(emoji.length);
  });

  it("creates a trimmed goal with a default glyph", () => {
    const goal = createGoal({ title: "  No   junk food  " });
    expect(goal.title).toBe("No junk food");
    expect(goal.emoji).toBe("🎯");
    expect(goal.note).toBe("");
    expect(goal.id.length).toBeGreaterThan(0);
    expect(goal.createdAt).toBeGreaterThan(0);
  });

  it("caps runaway titles and notes", () => {
    const goal = createGoal({ title: "x".repeat(200), note: "y".repeat(500) });
    expect(goal.title.length).toBe(GOAL_TITLE_MAX);
    expect(goal.note.length).toBeLessThanOrEqual(160);
  });

  it("falls back to a usable title for blank input", () => {
    expect(createGoal({ title: "   " }).title).toBe("New aim");
  });

  it("turns a preset into a goal, keeping its note", () => {
    const gym = GOAL_PRESETS.find((p) => p.title === "Gym")!;
    const goal = goalFromPreset(gym);
    expect(goal.title).toBe("Gym");
    expect(goal.emoji).toBe("🏋️");
    expect(goal.note).toBe(gym.note);
  });

  it("matches existing aims case-insensitively", () => {
    const goals = [createGoal({ title: "No Junk Food" })];
    expect(hasGoalNamed(goals, "no junk food")).toBe(true);
    expect(hasGoalNamed(goals, "Gym")).toBe(false);
  });

  it("offers only the presets the user has not added yet", () => {
    const goals = [createGoal({ title: "Gym" })];
    const left = unusedPresets(goals).map((p) => p.title);
    expect(left).not.toContain("Gym");
    expect(left).toContain("No fap");
  });

  it("collapses whitespace in free text", () => {
    expect(cleanGoalText("  stay   off\n\nsocial media ", 48)).toBe("stay off social media");
  });
});
