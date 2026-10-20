import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOAL_ICON,
  resolveSemanticIcon,
  SEMANTIC_ICON_OPTIONS,
} from "@/lib/semantic-icons";

describe("semantic line icons", () => {
  it("keeps every selectable icon key and label unique", () => {
    const keys = SEMANTIC_ICON_OPTIONS.map((option) => option.key);
    const labels = SEMANTIC_ICON_OPTIONS.map((option) => option.label);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("resolves canonical icon identifiers", () => {
    expect(resolveSemanticIcon("dumbbell", DEFAULT_GOAL_ICON)).toBe("dumbbell");
    expect(resolveSemanticIcon("  BOOK-OPEN  ")).toBe("book-open");
  });

  it("translates legacy persisted glyphs without rendering them", () => {
    expect(resolveSemanticIcon("\u{1f3cb}\ufe0f", DEFAULT_GOAL_ICON)).toBe("dumbbell");
    expect(resolveSemanticIcon("\u{1f512}", DEFAULT_GOAL_ICON)).toBe("lock-keyhole");
    expect(resolveSemanticIcon("\u{1f634}", DEFAULT_GOAL_ICON)).toBe("moon");
  });

  it("uses the caller's safe fallback for unknown historical values", () => {
    expect(resolveSemanticIcon("unknown-glyph", DEFAULT_GOAL_ICON)).toBe("target");
  });
});
