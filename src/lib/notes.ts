import type { Note } from "@/lib/schema";

export const DEFAULT_NOTEBOOK = "General";

export type NoteTemplate = {
  id: "blank" | "study" | "meeting" | "daily" | "project";
  name: string;
  description: string;
  title: string;
  body: string;
  tags: string[];
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    name: "Blank page",
    description: "Start with a clear page.",
    title: "Untitled note",
    body: "",
    tags: [],
  },
  {
    id: "study",
    name: "Study notes",
    description: "Concepts, questions, and a concise recall section.",
    title: "Study notes",
    body: "## Topic\n\nWrite the central idea here.\n\n### Key concepts\n\n- \n\n### Questions\n\n- [ ] \n\n### Recall\n\n> Explain this in your own words.\n",
    tags: ["study"],
  },
  {
    id: "meeting",
    name: "Meeting record",
    description: "Agenda, decisions, and accountable next actions.",
    title: "Meeting notes",
    body: "## Agenda\n\n- \n\n## Notes\n\n\n## Decisions\n\n- \n\n## Actions\n\n- [ ] \n",
    tags: ["meeting"],
  },
  {
    id: "daily",
    name: "Daily page",
    description: "Priorities, observations, and a short reflection.",
    title: "Daily note",
    body: "## Priorities\n\n- [ ] \n- [ ] \n- [ ] \n\n## Notes\n\n\n## Reflection\n\n",
    tags: ["daily"],
  },
  {
    id: "project",
    name: "Project brief",
    description: "Outcome, scope, decisions, and open tasks.",
    title: "Project brief",
    body: "## Outcome\n\n\n## Scope\n\n### Included\n\n- \n\n### Not included\n\n- \n\n## Decisions\n\n- \n\n## Next actions\n\n- [ ] \n",
    tags: ["project"],
  },
];

export function normalizeNotebook(value: string): string {
  return value.trim().replace(/\s+/g, " ") || DEFAULT_NOTEBOOK;
}

export function normalizeTags(values: string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of values) {
    const tag = raw.trim().replace(/^#+/, "").replace(/\s+/g, " ");
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?|```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-+*]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function noteWordCount(body: string): number {
  const plain = stripMarkdown(body);
  return plain ? plain.split(/\s+/u).filter(Boolean).length : 0;
}

export function noteReadingMinutes(body: string): number {
  const words = noteWordCount(body);
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / 220));
}

export function noteExcerpt(body: string, limit = 180): string {
  const plain = stripMarkdown(body);
  if (plain.length <= limit) return plain;
  return `${plain.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

export function collectNotebooks(notes: Note[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, { name: string; count: number }>();
  for (const note of notes) {
    const notebook = normalizeNotebook(note.notebook);
    const key = notebook.toLocaleLowerCase();
    const previous = counts.get(key);
    counts.set(key, { name: previous?.name ?? notebook, count: (previous?.count ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => {
    if (a.name === DEFAULT_NOTEBOOK) return -1;
    if (b.name === DEFAULT_NOTEBOOK) return 1;
    return a.name.localeCompare(b.name);
  });
}

export type NoteHeading = { level: number; text: string; id: string };

export function slugifyHeading(value: string): string {
  return (
    stripMarkdown(value)
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-") || "section"
  );
}

export function extractHeadings(markdown: string): NoteHeading[] {
  const used = new Map<string, number>();
  const headings: NoteHeading[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^(#{1,4})\s+(.+?)\s*#*$/.exec(line.trim());
    if (!match) continue;
    const text = stripMarkdown(match[2]);
    if (!text) continue;
    const base = slugifyHeading(text);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    headings.push({ level: match[1].length, text, id: seen ? `${base}-${seen + 1}` : base });
  }
  return headings;
}

export function extractWikiLinks(markdown: string): string[] {
  return normalizeTags([...markdown.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((match) => match[1]));
}

export function resolveWikiLinks(markdown: string, notes: Note[]): string {
  const byTitle = new Map(
    notes
      .filter((note) => note.title.trim())
      .map((note) => [note.title.trim().toLocaleLowerCase(), note]),
  );
  return markdown.replace(/\[\[([^\]\n]+)\]\]/g, (source, rawTitle: string) => {
    const title = rawTitle.trim();
    const match = byTitle.get(title.toLocaleLowerCase());
    const safeLabel = title.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
    return match ? `[${safeLabel}](/notes/${encodeURIComponent(match.id)})` : source;
  });
}

export function relatedNotes(note: Note, notes: Note[], limit = 5): Note[] {
  const tags = new Set(note.tags.map((tag) => tag.toLocaleLowerCase()));
  const title = note.title.trim().toLocaleLowerCase();
  return notes
    .filter((candidate) => candidate.id !== note.id && !candidate.archived)
    .map((candidate) => {
      const sharedTags = candidate.tags.reduce(
        (score, tag) => score + (tags.has(tag.toLocaleLowerCase()) ? 3 : 0),
        0,
      );
      const sameNotebook =
        normalizeNotebook(candidate.notebook).toLocaleLowerCase() ===
        normalizeNotebook(note.notebook).toLocaleLowerCase()
          ? 1
          : 0;
      const backlinks = extractWikiLinks(candidate.body).some(
        (link) => link.toLocaleLowerCase() === title,
      )
        ? 5
        : 0;
      return { candidate, score: sharedTags + sameNotebook + backlinks };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.candidate.updatedAt - a.candidate.updatedAt)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function toggleMarkdownTask(markdown: string, taskIndex: number, done: boolean): string {
  let current = -1;
  return markdown
    .split("\n")
    .map((line) =>
      line.replace(/^(\s*[-+*]\s+\[)[ xX](\])/, (source, before: string, after: string) => {
        current += 1;
        return current === taskIndex ? `${before}${done ? "x" : " "}${after}` : source;
      }),
    )
    .join("\n");
}

export function noteMarkdownFile(note: Note): { filename: string; text: string } {
  const safeTitle = (note.title || "Untitled note")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const metadata = [
    `Notebook: ${normalizeNotebook(note.notebook)}`,
    note.tags.length ? `Tags: ${note.tags.map((tag) => `#${tag}`).join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const title = note.title.trim() || "Untitled note";
  return {
    filename: `${safeTitle || "Untitled note"}.md`,
    text: `# ${title}\n\n${metadata}\n\n---\n\n${note.body}`.trimEnd() + "\n",
  };
}

export function downloadNoteMarkdown(note: Note): void {
  const { filename, text } = noteMarkdownFile(note);
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type MarkdownFormat =
  | "bold"
  | "italic"
  | "strike"
  | "link"
  | "code"
  | "heading-1"
  | "heading-2"
  | "bullet"
  | "numbered"
  | "task"
  | "quote"
  | "divider";

export type MarkdownEdit = { value: string; selectionStart: number; selectionEnd: number };

export function applyMarkdownFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: MarkdownFormat,
): MarkdownEdit {
  const selected = value.slice(selectionStart, selectionEnd);

  const replace = (replacement: string, innerStart: number, innerEnd: number): MarkdownEdit => ({
    value: `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`,
    selectionStart: selectionStart + innerStart,
    selectionEnd: selectionStart + innerEnd,
  });

  const wrap = (before: string, after: string, placeholder: string) => {
    const inner = selected || placeholder;
    return replace(`${before}${inner}${after}`, before.length, before.length + inner.length);
  };

  if (format === "bold") return wrap("**", "**", "bold text");
  if (format === "italic") return wrap("_", "_", "italic text");
  if (format === "strike") return wrap("~~", "~~", "strikethrough");
  if (format === "code") {
    return selected.includes("\n") ? wrap("```\n", "\n```", "code") : wrap("`", "`", "code");
  }
  if (format === "link") {
    const label = selected || "link text";
    const replacement = `[${label}](https://)`;
    const urlStart = replacement.indexOf("https://");
    return replace(replacement, urlStart, urlStart + "https://".length);
  }
  if (format === "divider") {
    const prefix = selectionStart > 0 && !value.slice(0, selectionStart).endsWith("\n") ? "\n" : "";
    const replacement = `${prefix}---\n`;
    return replace(replacement, replacement.length, replacement.length);
  }

  const lineStart = value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextBreak = value.indexOf("\n", selectionEnd);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const block = value.slice(lineStart, lineEnd);
  const lines = (block || "").split("\n");
  const prefix =
    format === "heading-1"
      ? "# "
      : format === "heading-2"
        ? "## "
        : format === "bullet"
          ? "- "
          : format === "numbered"
            ? "1. "
            : format === "task"
              ? "- [ ] "
              : "> ";
  const formatted = lines
    .map((line, index) => {
      const clean = line.replace(/^\s*(?:#{1,6}\s+|[-+*]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|>\s*)/, "");
      if (format === "numbered") return `${index + 1}. ${clean}`;
      return `${prefix}${clean}`;
    })
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${formatted}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + formatted.length,
  };
}
