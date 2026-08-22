import { z } from "zod";
import { newId } from "./id";
import type { Roadmap, Phase, Topic, Subtopic, ChecklistItem } from "./schema";

// Official SkillSync Roadmap Import Schema (v1)
// Ignores unknown fields; optional fields default gracefully.
const ChecklistImportSchema = z.union([z.string(), z.object({ title: z.string() }).passthrough()]);

const SubtopicImportSchema = z
  .object({
    title: z.string().min(1),
    checklist: z.array(ChecklistImportSchema).optional().default([]),
  })
  .passthrough();

const TopicImportSchema = z
  .object({
    title: z.string().min(1),
    subtopics: z.array(SubtopicImportSchema).optional().default([]),
    checklist: z.array(ChecklistImportSchema).optional().default([]),
  })
  .passthrough();

const PhaseImportSchema = z
  .object({
    title: z.string().min(1),
    topics: z.array(TopicImportSchema).optional().default([]),
  })
  .passthrough();

const RoadmapImportSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional().default(""),
    color: z.string().optional(),
    phases: z.array(PhaseImportSchema).optional().default([]),
  })
  .passthrough();

export const RoadmapImportFileSchema = z
  .object({
    version: z.union([z.number(), z.string()]).optional(),
    roadmaps: z.array(RoadmapImportSchema).min(1),
  })
  .passthrough();

export type RoadmapImportFile = z.infer<typeof RoadmapImportFileSchema>;
export type RoadmapImportItem = z.infer<typeof RoadmapImportSchema>;

export type ParseResult = { ok: true; file: RoadmapImportFile } | { ok: false; error: string };

export function parseImportJSON(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: "File is not valid JSON." };
  }
  // Allow a single roadmap object as a convenience.
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (!obj.roadmaps && (obj.title || obj.phases)) {
      data = { version: 1, roadmaps: [obj] };
    }
  }
  const parsed = RoadmapImportFileSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.join(".") || "root";
    return {
      ok: false,
      error: `Invalid schema at "${path}": ${first?.message ?? "unknown error"}`,
    };
  }
  return { ok: true, file: parsed.data };
}

function buildChecklist(items: Array<string | { title: string }>): ChecklistItem[] {
  const now = Date.now();
  return items.map((it) => ({
    id: newId(),
    title: typeof it === "string" ? it : it.title,
    done: false,
    createdAt: now,
  }));
}

export function buildRoadmapFromImport(item: RoadmapImportItem): Roadmap {
  const now = Date.now();
  const phases: Phase[] = (item.phases ?? []).map((p) => {
    const topics: Topic[] = (p.topics ?? []).map((t) => {
      const subtopics: Subtopic[] = (t.subtopics ?? []).map((s) => ({
        id: newId(),
        title: s.title,
        done: false,
        notes: "",
        resources: [],
        checklist: buildChecklist(s.checklist ?? []),
        createdAt: now,
      }));
      return {
        id: newId(),
        title: t.title,
        done: false,
        notes: "",
        resources: [],
        subtopics,
        checklist: buildChecklist(t.checklist ?? []),
        createdAt: now,
      };
    });
    return { id: newId(), title: p.title, topics, createdAt: now };
  });
  return {
    id: newId(),
    title: item.title,
    subtitle: item.description ?? "",
    color: item.color ?? "#7c3aed",
    phases,
    createdAt: now,
  };
}

export function countRoadmap(item: RoadmapImportItem) {
  let phases = 0;
  let topics = 0;
  let subtopics = 0;
  let checklists = 0;
  for (const p of item.phases ?? []) {
    phases++;
    for (const t of p.topics ?? []) {
      topics++;
      checklists += (t.checklist ?? []).length;
      for (const s of t.subtopics ?? []) {
        subtopics++;
        checklists += (s.checklist ?? []).length;
      }
    }
  }
  return { phases, topics, subtopics, checklists };
}
