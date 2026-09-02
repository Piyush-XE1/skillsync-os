import { describe, it, expect } from "vitest";
import {
  ACCENT_PRESETS,
  ACCENT_DEFAULTS,
  DEFAULT_ACCENT,
  defaultAccentFor,
  accentPalette,
  safeAccent,
} from "./accent";

describe("accent", () => {
  it("defaults resolve per background and fall back to violet", () => {
    expect(defaultAccentFor("aurora")).toBe("#7c3aed");
    expect(defaultAccentFor("light")).toBe("#20573f");
    expect(defaultAccentFor("atelier")).toBe("#c9a35c");
    expect(defaultAccentFor(undefined)).toBe(ACCENT_DEFAULTS.aurora);
    expect(DEFAULT_ACCENT).toBe("#7c3aed");
  });

  it("exposes curated presets with valid hex colours", () => {
    expect(ACCENT_PRESETS.length).toBeGreaterThanOrEqual(8);
    for (const preset of ACCENT_PRESETS) {
      expect(preset.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });

  it("derives a cohesive palette from an accent", () => {
    const p = accentPalette("#7c3aed");
    expect(p.primary).toBe("#7c3aed");
    // secondary is a computed hex (hue-shifted), glow is a color-mix string.
    expect(p.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(p.glow).toContain("color-mix");
  });

  it("derives a different companion for different accents", () => {
    expect(accentPalette("#7c3aed").secondary).not.toBe(accentPalette("#059669").secondary);
  });

  it("safeAccent only permits hex colours and falls back otherwise", () => {
    expect(safeAccent("#ff00aa")).toBe("#ff00aa");
    expect(safeAccent("#fff")).toBe("#fff");
    expect(safeAccent("  #123456  ")).toBe("#123456");
    expect(safeAccent("red")).toBe(DEFAULT_ACCENT);
    expect(safeAccent("url(javascript:alert(1))")).toBe(DEFAULT_ACCENT);
  });
});
