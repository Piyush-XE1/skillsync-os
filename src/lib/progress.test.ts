import { describe, it, expect } from "vitest";
import {
  subtopicLeaves,
  topicLeaves,
  phaseLeaves,
  roadmapLeaves,
  subtopicPct,
  topicPct,
  phasePct,
  roadmapPct,
  roadmapCounts,
} from "@/lib/progress";
import type { Roadmap, Phase, Topic, Subtopic } from "@/lib/schema";

function sub(over: Partial<Subtopic>): Subtopic {
  return {
    id: "s",
    title: "s",
    done: false,
    notes: "",
    resources: [],
    checklist: [],
    createdAt: 0,
    ...over,
  };
}
function topic(over: Partial<Topic>): Topic {
  return {
    id: "t",
    title: "t",
    done: false,
    notes: "",
    resources: [],
    subtopics: [],
    checklist: [],
    createdAt: 0,
    completedAt: null,
    ...over,
  };
}
function phase(over: Partial<Phase>): Phase {
  return { id: "p", title: "p", topics: [], createdAt: 0, ...over };
}
function roadmap(over: Partial<Roadmap>): Roadmap {
  return { id: "r", title: "r", subtitle: "", color: "#000", phases: [], createdAt: 0, ...over };
}

describe("progress - leaf counting", () => {
  it("counts checklist leaves when a subtopic has items", () => {
    const s = sub({
      checklist: [
        { id: "a", title: "a", done: true, createdAt: 0 },
        { id: "b", title: "b", done: false, createdAt: 0 },
      ],
    });
    expect(subtopicLeaves(s)).toEqual({ done: 1, total: 2 });
  });

  it("falls back to a synthetic leaf when a subtopic has no checklist", () => {
    expect(subtopicLeaves(sub({ done: true }))).toEqual({ done: 1, total: 1 });
    expect(subtopicLeaves(sub({ done: false }))).toEqual({ done: 0, total: 1 });
  });

  it("aggregates checklist + subtopic leaves for a topic", () => {
    const t = topic({
      checklist: [{ id: "a", title: "a", done: true, createdAt: 0 }],
      subtopics: [
        sub({
          checklist: [
            { id: "b", title: "b", done: true, createdAt: 0 },
            { id: "c", title: "c", done: false, createdAt: 0 },
          ],
        }),
      ],
    });
    expect(topicLeaves(t)).toEqual({ done: 2, total: 3 });
  });

  it("falls back to topic.done when there are no leaves anywhere", () => {
    expect(topicLeaves(topic({ done: true }))).toEqual({ done: 1, total: 1 });
    expect(topicLeaves(topic({ done: false }))).toEqual({ done: 0, total: 1 });
  });
});

describe("progress - percentages and counts", () => {
  it("completes only when all leaves are done", () => {
    const t = topic({
      checklist: [
        { id: "a", title: "a", done: true, createdAt: 0 },
        { id: "b", title: "b", done: true, createdAt: 0 },
      ],
    });
    expect(topicPct(t)).toBe(100);
  });

  it("rounds partial percentages", () => {
    const t = topic({
      checklist: [
        { id: "a", title: "a", done: true, createdAt: 0 },
        { id: "b", title: "b", done: false, createdAt: 0 },
        { id: "c", title: "c", done: false, createdAt: 0 },
      ],
    });
    expect(topicPct(t)).toBe(33);
  });

  it("rolls up phase and roadmap percentages", () => {
    const r = roadmap({
      phases: [
        phase({
          topics: [
            topic({
              checklist: [
                { id: "a", title: "a", done: true, createdAt: 0 },
                { id: "b", title: "b", done: false, createdAt: 0 },
              ],
            }),
            topic({ done: true }),
          ],
        }),
      ],
    });
    // phase: topic1 = 1/2, topic2 = 1/1 → total 2/3
    expect(phaseLeaves(r.phases[0])).toEqual({ done: 2, total: 3 });
    expect(roadmapLeaves(r)).toEqual({ done: 2, total: 3 });
    expect(phasePct(r.phases[0])).toBe(67);
    expect(roadmapPct(r)).toBe(67);
  });

  it("roadmapCounts counts topics and completed topics", () => {
    const r = roadmap({
      phases: [
        phase({
          topics: [
            topic({
              checklist: [
                { id: "a", title: "a", done: true, createdAt: 0 },
                { id: "b", title: "b", done: true, createdAt: 0 },
              ],
            }),
            topic({ done: false }),
          ],
        }),
      ],
    });
    expect(roadmapCounts(r)).toEqual({ topics: 2, done: 1 });
  });

  it("returns 0 for an empty roadmap", () => {
    expect(roadmapPct(roadmap({}))).toBe(0);
    expect(roadmapCounts(roadmap({}))).toEqual({ topics: 0, done: 0 });
  });
});
