import { describe, it, expect } from "vitest";
import {
  clamp,
  normalize,
  projectY,
  toPoints,
  smoothPath,
  areaPath,
  linePath,
  donutSegments,
  arcPath,
  axisLabel,
  formatCompact,
} from "./charts";

describe("charts", () => {
  it("clamps and normalises values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(normalize(5, 0, 10)).toBe(0.5);
    expect(normalize(0, 5, 5)).toBe(0); // flat range
  });

  it("projects y so bigger values are higher", () => {
    const low = projectY(0, 10, 100);
    const high = projectY(10, 10, 100);
    expect(high).toBeLessThan(low);
  });

  it("builds normalised points spanning the width", () => {
    const pts = toPoints(
      [
        { label: "a", value: 2 },
        { label: "b", value: 4 },
        { label: "c", value: 6 },
      ],
      120,
      40,
    );
    expect(pts).toHaveLength(3);
    expect(pts[0].x).toBe(0);
    expect(pts[2].x).toBe(120);
    // y decreases as value increases
    expect(pts[2].y).toBeLessThan(pts[0].y);
  });

  it("produces path strings for line, smooth and area", () => {
    const pts = toPoints(
      [
        { label: "a", value: 1 },
        { label: "b", value: 3 },
        { label: "c", value: 2 },
      ],
      100,
      40,
    );
    expect(linePath(pts)).toMatch(/^M/);
    expect(smoothPath(pts)).toMatch(/C/);
    expect(areaPath(pts, 40)).toContain("Z");
  });

  it("handles single-point edge cases", () => {
    const one = [{ label: "a", value: 5 }];
    expect(smoothPath(toPoints(one, 100, 40))).toMatch(/^M/);
    // A single point still produces a closed, degenerate area (no crash).
    expect(areaPath(toPoints(one, 100, 40), 40)).toContain("Z");
    expect(areaPath([], 40)).toBe("");
  });

  it("builds donut arcs summing to ~360 deg", () => {
    const segs = donutSegments(
      [
        { label: "x", value: 1, color: "#111" },
        { label: "y", value: 3, color: "#222" },
      ],
      50,
      50,
      30,
    );
    expect(segs).toHaveLength(2);
    expect(segs[0].d).toMatch(/^M .* A /);
    expect(segs.reduce((s, v) => s + v.pct, 0)).toBe(100);
  });

  it("arcPath returns an SVG arc command", () => {
    expect(arcPath(0, 0, 10, 0, 90)).toMatch(/^M .* A 10 10/);
  });

  it("formats dates and compact numbers", () => {
    expect(axisLabel("2026-09-03")).toBe("Sep 3");
    expect(formatCompact(850)).toBe("850");
    expect(formatCompact(1200)).toBe("1.2k");
  });
});
