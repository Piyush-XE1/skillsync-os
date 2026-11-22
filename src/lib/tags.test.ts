import { describe, expect, it } from "vitest";
import { mergeTags, normalizeTag, toggleTag } from "@/lib/tags";

describe("shared tag hygiene", () => {
  it("normalises typed tags without inventing variants", () => {
    expect(normalizeTag("  #College   trips ")).toBe("College trips");
    expect(normalizeTag("   ")).toBe("");
  });

  it("deduplicates case-insensitively and keeps the first spelling", () => {
    expect(mergeTags(["College", "travel"], ["college", "Travel", " Food "])).toEqual([
      "College",
      "travel",
      "Food",
    ]);
  });

  it("toggles a tag without duplicating it", () => {
    expect(toggleTag(["College"], "college")).toEqual([]);
    expect(toggleTag(["College"], "Travel")).toEqual(["College", "Travel"]);
  });
});
