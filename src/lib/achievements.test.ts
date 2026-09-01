import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, computeUnlocked, newlyUnlocked, achievementById } from "@/lib/achievements";
import { createInitialData } from "@/lib/seed";
import { addDaysISO } from "@/lib/date";
import type { AppData } from "@/lib/schema";

function data(over: (d: AppData) => void): AppData {
  const d = createInitialData();
  over(d);
  return d;
}

describe("achievements", () => {
  it("defines unique achievement ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("unlocks nothing on a fresh seed", () => {
    expect(computeUnlocked(createInitialData())).toEqual([]);
  });

  it("unlocks the first topic achievement", () => {
    const d = data((x) => {
      x.roadmaps[0].phases[0].topics[0].done = true;
      x.roadmaps[0].phases[0].topics[0].checklist = [
        { id: "c1", title: "x", done: true, createdAt: 1 },
      ];
    });
    const unlocked = computeUnlocked(d);
    expect(unlocked).toContain("first-topic");
  });

  it("unlocks the 7-day streak at 7 days", () => {
    const d = data((x) => {
      x.stats.streak = 7;
    });
    expect(computeUnlocked(d)).toContain("streak-7");
  });

  it("unlocks Dean's List at 9+ CGPA", () => {
    const d = data((x) => {
      x.cgpa.semesters = [
        {
          id: "s1",
          number: 1,
          subjects: [
            { id: "a", name: "Math", code: "", credits: 4, grade: "O" },
            { id: "b", name: "Physics", code: "", credits: 4, grade: "A+" },
          ],
        },
      ];
    });
    expect(computeUnlocked(d)).toContain("cgpa-9");
  });

  it("newlyUnlocked excludes already-awarded ids", () => {
    const d = data((x) => {
      x.roadmaps[0].phases[0].topics[0].done = true;
      x.roadmaps[0].phases[0].topics[0].checklist = [
        { id: "c1", title: "x", done: true, createdAt: 1 },
      ];
      x.stats.achievements = ["first-topic"];
    });
    expect(newlyUnlocked(d).map((a) => a.id)).not.toContain("first-topic");
  });

  it("tracks habit best streaks from log history", () => {
    const d = data((x) => {
      const today = new Date().toISOString().slice(0, 10);
      for (let i = 0; i < 21; i++) {
        x.habitLogs.push({ habitId: x.habits[0].id, date: addDaysISO(today, -i) });
      }
    });
    expect(computeUnlocked(d)).toContain("habit-best-21");
  });

  it("looks achievements up by id", () => {
    expect(achievementById("first-focus")?.title).toBe("Deep Work");
    expect(achievementById("nope")).toBeUndefined();
  });
});
