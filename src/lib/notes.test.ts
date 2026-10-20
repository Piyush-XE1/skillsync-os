import { describe, expect, it } from "vitest";
import {
  applyMarkdownFormat,
  collectNotebooks,
  extractHeadings,
  extractWikiLinks,
  normalizeTags,
  noteExcerpt,
  noteMarkdownFile,
  noteReadingMinutes,
  noteWordCount,
  relatedNotes,
  resolveWikiLinks,
  toggleMarkdownTask,
} from "@/lib/notes";
import type { Note } from "@/lib/schema";

function note(partial: Partial<Note> & Pick<Note, "id" | "title">): Note {
  return {
    id: partial.id,
    title: partial.title,
    body: partial.body ?? "",
    tags: partial.tags ?? [],
    pinned: partial.pinned ?? false,
    notebook: partial.notebook ?? "General",
    archived: partial.archived ?? false,
    linkedTo: partial.linkedTo ?? null,
    createdAt: partial.createdAt ?? 1,
    updatedAt: partial.updatedAt ?? 1,
  };
}

describe("notebook text helpers", () => {
  it("derives useful reading metadata without leaking Markdown punctuation", () => {
    const body = "## Systems\n\n**Local-first** notes with [useful links](https://example.com).";
    expect(noteWordCount(body)).toBe(6);
    expect(noteReadingMinutes(body)).toBe(1);
    expect(noteExcerpt(body)).toBe("Systems Local-first notes with useful links.");
    expect(noteWordCount("- [ ] One task\n- [x] Done task")).toBe(4);
  });

  it("normalizes case-insensitive duplicate tags and notebook counts", () => {
    expect(normalizeTags([" #Study ", "study", "Deep Work", ""])).toEqual(["Study", "Deep Work"]);
    expect(
      collectNotebooks([
        note({ id: "1", title: "One" }),
        note({ id: "2", title: "Two", notebook: "Research" }),
        note({ id: "3", title: "Three", notebook: "Research" }),
        note({ id: "4", title: "Four", notebook: "research" }),
      ]),
    ).toEqual([
      { name: "General", count: 1 },
      { name: "Research", count: 3 },
    ]);
  });

  it("builds stable duplicate-safe heading anchors", () => {
    expect(extractHeadings("# Plan\n\n## Next step\n\n## Next step")).toEqual([
      { level: 1, text: "Plan", id: "plan" },
      { level: 2, text: "Next step", id: "next-step" },
      { level: 2, text: "Next step", id: "next-step-2" },
    ]);
  });
});

describe("Markdown editing", () => {
  it("wraps a selection and leaves the new selection inside the markers", () => {
    const edit = applyMarkdownFormat("make this clear", 5, 9, "bold");
    expect(edit.value).toBe("make **this** clear");
    expect(edit.value.slice(edit.selectionStart, edit.selectionEnd)).toBe("this");
  });

  it("formats every selected line as a task list", () => {
    const edit = applyMarkdownFormat("first\nsecond", 0, 12, "task");
    expect(edit.value).toBe("- [ ] first\n- [ ] second");
  });

  it("inserts a link and selects the URL for immediate replacement", () => {
    const edit = applyMarkdownFormat("SkillSync", 0, 9, "link");
    expect(edit.value).toBe("[SkillSync](https://)");
    expect(edit.value.slice(edit.selectionStart, edit.selectionEnd)).toBe("https://");
  });

  it("toggles one Markdown task without changing neighboring writing", () => {
    const body = "- [ ] First\nA paragraph\n* [x] Second";
    expect(toggleMarkdownTask(body, 1, false)).toBe("- [ ] First\nA paragraph\n* [ ] Second");
    expect(toggleMarkdownTask(body, 0, true)).toBe("- [x] First\nA paragraph\n* [x] Second");
  });
});

describe("note connections and export", () => {
  const source = note({
    id: "source",
    title: "Source",
    body: "Continue in [[Research Plan]].",
    tags: ["systems"],
    notebook: "Work",
  });
  const target = note({
    id: "target",
    title: "Research Plan",
    body: "# Plan",
    tags: ["systems"],
    notebook: "Work",
  });

  it("extracts and resolves wiki-style links to local note routes", () => {
    expect(extractWikiLinks(source.body)).toEqual(["Research Plan"]);
    expect(resolveWikiLinks(source.body, [source, target])).toBe(
      "Continue in [Research Plan](/notes/target).",
    );
  });

  it("discovers related notes through tags, notebooks, and backlinks", () => {
    expect(relatedNotes(target, [source, target]).map((item) => item.id)).toEqual(["source"]);
  });

  it("exports portable Markdown with notebook and tags", () => {
    const exported = noteMarkdownFile(target);
    expect(exported.filename).toBe("Research Plan.md");
    expect(exported.text).toContain("# Research Plan");
    expect(exported.text).toContain("Notebook: Work");
    expect(exported.text).toContain("Tags: #systems");
    expect(exported.text).toContain("# Plan");
  });
});
