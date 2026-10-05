import { describe, expect, it } from "vitest";
import {
  FOCUS_TRACKS,
  MODULE_CATALOG,
  dataForEnabledModules,
  modulesForFocusTrack,
} from "@/lib/modules";
import { createInitialData } from "@/lib/seed";

describe("modular focus selection", () => {
  it("activates the exact first-run focus groups", () => {
    expect(FOCUS_TRACKS.map((track) => track.title)).toEqual([
      "College & Academics",
      "Tech Career & Placements",
      "Daily Life & Discipline",
      "Full Power",
    ]);
    expect(
      Object.entries(modulesForFocusTrack("academics"))
        .filter(([, enabled]) => enabled)
        .map(([key]) => key),
    ).toEqual(["focus", "notes", "roadmaps", "planner"]);
    expect(
      Object.entries(modulesForFocusTrack("tech-career"))
        .filter(([, enabled]) => enabled)
        .map(([key]) => key),
    ).toEqual(["coding", "notes", "roadmaps", "projects"]);
    expect(
      Object.entries(modulesForFocusTrack("daily-life"))
        .filter(([, enabled]) => enabled)
        .map(([key]) => key),
    ).toEqual(["expenses", "habits", "notes", "planner"]);
  });

  it("has no retired Attendance module in its catalogue or focus flags", () => {
    expect(MODULE_CATALOG.some((module) => module.key === ("attendance" as never))).toBe(false);
    expect(modulesForFocusTrack("full-power")).not.toHaveProperty("attendance");
  });

  it("Full Power enables every module in the shared catalogue", () => {
    const enabled = modulesForFocusTrack("full-power");
    expect(Object.values(enabled).every(Boolean)).toBe(true);
    expect(Object.keys(enabled)).toHaveLength(MODULE_CATALOG.length);
  });

  it("omits disabled module records from cross-module summaries without mutating the workspace", () => {
    const workspace = createInitialData();
    const before = {
      habits: workspace.habits.length,
      habitLogs: workspace.habitLogs.length,
      planner: workspace.planner.length,
      focus: workspace.focus.sessions.length,
      coding: workspace.coding.problems.length,
      roadmaps: workspace.roadmaps.length,
    };
    const summaryData = dataForEnabledModules(workspace, {
      habits: false,
      planner: true,
      focus: false,
      coding: true,
      roadmaps: false,
    });

    expect(summaryData.habits).toEqual([]);
    expect(summaryData.habitLogs).toEqual([]);
    expect(summaryData.planner).toHaveLength(before.planner);
    expect(summaryData.focus.sessions).toEqual([]);
    expect(summaryData.coding.problems).toHaveLength(before.coding);
    expect(summaryData.roadmaps).toEqual([]);
    expect(workspace.habits).toHaveLength(before.habits);
    expect(workspace.habitLogs).toHaveLength(before.habitLogs);
    expect(workspace.focus.sessions).toHaveLength(before.focus);
    expect(workspace.roadmaps).toHaveLength(before.roadmaps);
  });
});
