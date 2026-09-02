/**
 * Chart math — pure, dependency-free helpers used by the SVG chart components.
 *
 * Everything here is a pure function so the geometry is unit-testable and the
 * React components stay thin. Coordinates are computed in a normalised
 * viewBox (0..1) and scaled by the component, which keeps responsive sizing
 * trivial and avoids layout-dependent recomputation.
 */

export type ChartPoint = { x: number; y: number };

/** Clamp a value into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Normalise a value in [lo, hi] onto [0, 1]. Falls back to 0 on a flat range. */
export function normalize(value: number, lo: number, hi: number): number {
  if (hi - lo === 0) return 0;
  return clamp((value - lo) / (hi - lo), 0, 1);
}

/** Map a value onto a pixel band [top, bottom] of height `h`. */
export function projectY(value: number, max: number, h: number, pad = 4): number {
  const t = normalize(value, 0, max);
  return h - pad - t * (h - pad * 2);
}

/** Convert an array of `{ label, value }` into normalised SVG points, given w/h. */
export function toPoints(
  data: { label: string; value: number }[],
  w: number,
  h: number,
): ChartPoint[] {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  return data.map((d, i) => ({
    x: n <= 1 ? w / 2 : (i / (n - 1)) * w,
    y: projectY(d.value, max, h),
  }));
}

/**
 * Build a smooth cubic-bezier path through a set of points (Catmull-Rom → Bezier).
 * Provides a genuinely premium line/area look without pulling in a chart lib.
 */
export function smoothPath(points: ChartPoint[], tension = 0.2): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 6;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 6;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 6;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** A straight line path through the points (fallback for spiky data). */
export function linePath(points: ChartPoint[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/** The closed path for an area chart (line + baseline). */
export function areaPath(points: ChartPoint[], h: number): string {
  if (points.length === 0) return "";
  const line = smoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${h} L ${first.x} ${h} Z`;
}

/** Build a donut arc path for a segment given its angle span. */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Convert a list of `{ value, color }` into donut segments (percentages + arcs). */
export function donutSegments(
  segments: { label: string; value: number; color: string }[],
  cx: number,
  cy: number,
  r: number,
  gap = 2,
) {
  const total = segments.reduce((s, v) => s + v.value, 0) || 1;
  let angle = 0;
  return segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const span = (s.value / total) * 360;
      const start = angle + gap / 2;
      const end = angle + span - gap / 2;
      angle += span;
      return {
        ...s,
        pct: Math.round((s.value / total) * 100),
        d: arcPath(cx, cy, r, start, Math.max(start + 0.001, end)),
      };
    });
}

/** Short human label for a date (e.g. "Sep 12") for x-axis ticks. */
export function axisLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

/** Compact number formatting (1.2k, 850). */
export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${n}`;
}
