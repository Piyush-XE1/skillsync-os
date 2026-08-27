import { describe, it, expect } from "vitest";
import {
  parseImportJSON,
  buildRoadmapFromImport,
  countRoadmap,
  type RoadmapImportItem,
} from "@/lib/roadmap-import";
import { AppDataSchema } from "@/lib/schema";
import { createInitialData } from "@/lib/seed";

describe("roadmap import - parseImportJSON", () => {
  it("accepts a well-formed multi-roadmap file", () => {
    const file = {
      version: 1,
      roadmaps: [
        {
          title: "Python",
          description: "Foundations",
          color: "#7c3aed",
          phases: [
            {
              title: "Basics",
              topics: [
                {
                  title: "Syntax",
                  checklist: ["variables", { title: "operators" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const res = parseImportJSON(JSON.stringify(file));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.file.roadmaps).toHaveLength(1);
  });

  it("wraps a single roadmap object as a convenience", () => {
    const res = parseImportJSON(JSON.stringify({ title: "DSA", phases: [] }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.file.roadmaps).toHaveLength(1);
      expect(res.file.roadmaps[0].title).toBe("DSA");
    }
  });

  it("rejects invalid JSON", () => {
    expect(parseImportJSON("{not json").ok).toBe(false);
  });

  it("rejects a file with no roadmaps", () => {
    const res = parseImportJSON(JSON.stringify({ version: 1 }));
    expect(res.ok).toBe(false);
  });

  it("rejects a roadmap with an empty title", () => {
    const res = parseImportJSON(JSON.stringify({ roadmaps: [{ title: "" }] }));
    expect(res.ok).toBe(false);
  });

  it("reports a useful schema error path", () => {
    const res = parseImportJSON(
      JSON.stringify({ roadmaps: [{ title: "x", phases: [{ title: "" }] }] }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Invalid schema/);
  });
});

describe("roadmap import - buildRoadmapFromImport", () => {
  it("produces a schema-valid Roadmap", () => {
    const roadmap = buildRoadmapFromImport({
      title: "Web Dev",
      description: "Front to back",
      color: "#db2777",
      phases: [
        {
          title: "Frontend",
          topics: [
            {
              title: "HTML",
              subtopics: [{ title: "Semantics", checklist: ["a", "b"] }],
              checklist: [],
            },
          ],
        },
      ],
    });
    // Round-trips through the app schema
    const app = createInitialData();
    app.roadmaps = [roadmap];
    expect(() => AppDataSchema.parse(app)).not.toThrow();
    expect(roadmap.subtitle).toBe("Front to back");
    expect(roadmap.phases[0].topics[0].subtopics[0].checklist).toHaveLength(2);
  });

  it("applies defaults when optional fields are omitted", () => {
    const roadmap = buildRoadmapFromImport({ title: "Minimal" } as RoadmapImportItem);
    expect(roadmap.color).toBe("#7c3aed");
    expect(roadmap.subtitle).toBe("");
    expect(roadmap.phases).toEqual([]);
  });

  it("counts phases, topics, subtopics and checklists", () => {
    const counts = countRoadmap({
      title: "x",
      description: "",
      phases: [
        {
          title: "p1",
          topics: [
            { title: "t1", checklist: ["a"], subtopics: [{ title: "s1", checklist: ["b", "c"] }] },
          ],
        },
      ],
    } as RoadmapImportItem);
    expect(counts).toEqual({ phases: 1, topics: 1, subtopics: 1, checklists: 3 });
  });
});
