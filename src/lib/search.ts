import type { AppData } from "./schema";
import { roadmapPct } from "./progress";

/**
 * Unified workspace search ("command palette") across every domain.
 * Pure and offline — no index, just a ranked scan of the in-memory store.
 */

export type SearchResult =
  | { kind: "roadmap"; id: string; title: string; subtitle: string; pct: number }
  | {
      kind: "topic";
      roadmapId: string;
      topicId: string;
      phaseId: string;
      title: string;
      subtitle: string;
      done: boolean;
    }
  | { kind: "project"; id: string; title: string; subtitle: string }
  | { kind: "note"; id: string; title: string; subtitle: string }
  | { kind: "planner"; id: string; title: string; subtitle: string; done: boolean }
  | { kind: "habit"; id: string; title: string; subtitle: string }
  | { kind: "subject"; id: string; title: string; subtitle: string }
  | { kind: "coding"; id: string; title: string; subtitle: string; difficulty: string }
  | { kind: "job"; id: string; title: string; subtitle: string; status: string }
  | { kind: "page"; to: string; title: string; subtitle: string };

const PAGES: SearchResult[] = [
  { kind: "page", to: "/", title: "Dashboard", subtitle: "Overview" },
  { kind: "page", to: "/learn", title: "Learn", subtitle: "Roadmaps & topics" },
  { kind: "page", to: "/projects", title: "Projects", subtitle: "Builds in progress" },
  { kind: "page", to: "/planner", title: "Planner", subtitle: "Tasks & deadlines" },
  { kind: "page", to: "/goals", title: "Aims", subtitle: "The goals you are working on" },
  { kind: "page", to: "/habits", title: "Habits", subtitle: "Operation Rebirth" },
  { kind: "page", to: "/notes", title: "Notes", subtitle: "Local-first notes" },
  { kind: "page", to: "/focus", title: "Focus", subtitle: "Pomodoro deep work" },
  { kind: "page", to: "/cgpa", title: "CGPA", subtitle: "Grade tracker" },
  { kind: "page", to: "/analytics", title: "Analytics", subtitle: "Trends & heatmaps" },
  { kind: "page", to: "/notifications", title: "Notifications", subtitle: "Alerts & digest" },
  { kind: "page", to: "/attendance", title: "Attendance", subtitle: "Class attendance" },
  { kind: "page", to: "/expenses", title: "Expenses", subtitle: "Spending tracker" },
  { kind: "page", to: "/coding", title: "Code", subtitle: "DSA problem solving" },
  { kind: "page", to: "/career", title: "Career", subtitle: "Job & placement tracking" },
  { kind: "page", to: "/profile", title: "Profile", subtitle: "You & preferences" },
];

type Scored = { result: SearchResult; score: number };

function score(hay: string, q: string): number {
  const h = hay.toLowerCase();
  const needle = q.toLowerCase();
  if (needle.length === 0) return 0;
  const idx = h.indexOf(needle);
  if (idx === -1) return -1;
  // Exact prefix beats contained; shorter strings rank above longer ones.
  return idx === 0 ? 1000 - h.length : 100 - idx - h.length / 100;
}

export function searchAll(data: AppData, query: string, limit = 30): SearchResult[] {
  const q = query.trim();
  if (q.length === 0) {
    // Empty query → top-level destinations + in-progress items, handy as a launcher.
    return PAGES.slice(0, 12);
  }

  const scored = new Map<string, Scored>();

  const add = (result: SearchResult, score: number) => {
    if (score < 0) return;
    const id = "id" in result ? (result as { id: string }).id : (result as { to: string }).to;
    const key = `${result.kind}:${id}`;
    const prev = scored.get(key);
    if (!prev || prev.score < score) scored.set(key, { result, score });
  };

  for (const p of PAGES) add(p, score(p.title, q) * 0.7);

  for (const r of data.roadmaps) {
    add(
      {
        kind: "roadmap",
        id: r.id,
        title: r.title,
        subtitle: r.subtitle || "Roadmap",
        pct: roadmapPct(r),
      },
      score(r.title, q),
    );
    for (const ph of r.phases) {
      for (const t of ph.topics) {
        const s = Math.max(score(t.title, q), score(ph.title, q) * 0.4);
        add(
          {
            kind: "topic",
            roadmapId: r.id,
            topicId: t.id,
            phaseId: ph.id,
            title: t.title,
            subtitle: `${r.title} · ${ph.title}`,
            done: t.done,
          },
          s,
        );
      }
    }
  }

  for (const p of data.projects) {
    add(
      { kind: "project", id: p.id, title: p.title, subtitle: p.description || "Project" },
      Math.max(score(p.title, q), score(p.description, q) * 0.5),
    );
  }

  for (const n of data.notes) {
    add(
      { kind: "note", id: n.id, title: n.title, subtitle: n.body || "Note" },
      Math.max(score(n.title, q), score(n.body, q) * 0.4),
    );
  }

  for (const t of data.planner) {
    add(
      { kind: "planner", id: t.id, title: t.title, subtitle: t.date, done: t.done },
      score(t.title, q),
    );
  }

  for (const h of data.habits) {
    add(
      { kind: "habit", id: h.id, title: `${h.emoji} ${h.title}`, subtitle: "Habit" },
      score(h.title, q),
    );
  }

  for (const s of data.attendance.subjects) {
    add(
      { kind: "subject", id: s.id, title: s.name, subtitle: `Attendance · Sem ${s.semester}` },
      score(s.name, q),
    );
  }

  for (const p of data.coding.problems) {
    add(
      {
        kind: "coding",
        id: p.id,
        title: p.title,
        subtitle: `${capitalize(p.platform)} · ${capitalize(p.difficulty)}${p.tags.length ? ` · ${p.tags.slice(0, 3).join(", ")}` : ""}`,
        difficulty: p.difficulty,
      },
      Math.max(score(p.title, q), score(p.tags.join(" "), q) * 0.4),
    );
  }

  for (const a of data.career.applications) {
    add(
      {
        kind: "job",
        id: a.id,
        title: a.company,
        subtitle: `${a.role || "Role"} · ${a.status}`,
        status: a.status,
      },
      Math.max(score(a.company, q), score(a.role, q) * 0.6),
    );
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .map((s) => s.result)
    .slice(0, limit);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
