import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  areaPath,
  linePath,
  toPoints,
  normalize,
  axisLabel,
  formatCompact,
  donutSegments,
  type ChartPoint,
} from "@/lib/charts";

/* ------------------------------------------------------------------ *
 * Sparkline — tiny inline trend line.
 * ------------------------------------------------------------------ */
export function Sparkline({
  data,
  color = "var(--primary-glow)",
  height = 36,
  fill = true,
  className,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  fill?: boolean;
  className?: string;
}) {
  const id = useId();
  const w = 120;
  const points = useMemo(() => toPoints(data, w, height), [data, height]);
  const line = useMemo(() => linePath(points), [points]);
  const area = useMemo(() => areaPath(points, height), [points, height]);
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={cn("block h-full w-full", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#sp-${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * AreaChart — smooth area/line with grid, tooltip and axis.
 * ------------------------------------------------------------------ */
export function AreaChart({
  data,
  height = 180,
  color = "var(--primary)",
  valueSuffix = "",
  showAxis = true,
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueSuffix?: string;
  showAxis?: boolean;
  className?: string;
}) {
  const id = useId();
  const w = 640;
  const padX = 10;
  const padTop = 12;
  const padBottom = showAxis ? 26 : 8;
  const innerH = height - padTop - padBottom;
  const innerW = w - padX * 2;

  const max = Math.max(1, ...data.map((d) => d.value));
  const points: ChartPoint[] = useMemo(() => {
    const n = data.length;
    return data.map((d, i) => ({
      x: padX + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW),
      y: padTop + (1 - normalize(d.value, 0, max)) * innerH,
    }));
  }, [data, max, padX, padTop, innerH, innerW]);

  const line = useMemo(() => linePath(points), [points]);
  const area = useMemo(() => areaPath(points, height - padBottom), [points, height, padBottom]);
  const [hover, setHover] = useState<number | null>(null);

  // Decimate x-axis labels to ~6 ticks.
  const ticks = useMemo(() => {
    if (data.length <= 6) return data.map((d, i) => ({ label: d.label, i }));
    const step = Math.ceil(data.length / 6);
    return data.map((d, i) => (i % step === 0 ? { label: d.label, i } : null)).filter(Boolean) as {
      label: string;
      i: number;
    }[];
  }, [data]);

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="block h-full w-full"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`ac-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const y = padTop + g * innerH;
          return (
            <line
              key={g}
              x1={padX}
              x2={w - padX}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={g === 1 ? "0" : "3 4"}
              opacity={g === 1 ? 0.6 : 0.4}
            />
          );
        })}

        <path d={area} fill={`url(#ac-${id})`} opacity={0.95} />
        <path d={line} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" />

        {/* hover guide + dot */}
        {hover !== null && points[hover] ? (
          <g>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={padTop}
              y2={height - padBottom}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.5}
            />
            <circle
              cx={points[hover].x}
              cy={points[hover].y}
              r={5}
              fill="var(--surface-elevated)"
              stroke={color}
              strokeWidth={2.5}
            />
          </g>
        ) : null}

        {showAxis
          ? ticks.map((t) => (
              <text
                key={t.i}
                x={points[t.i]?.x ?? 0}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted-foreground)"
                opacity={0.8}
              >
                {t.label}
              </text>
            ))
          : null}
      </svg>

      {/* Hover tooltip */}
      {hover !== null && data[hover] ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl border border-border bg-[var(--popover)] px-2.5 py-1.5 text-center shadow-[var(--shadow-float)]"
          style={{
            left: `${(points[hover].x / w) * 100}%`,
            top: `${(points[hover].y / height) * 100}%`,
            transform: "translate(-50%, -115%)",
          }}
        >
          <div className="text-[10px] text-muted-foreground">{data[hover].label}</div>
          <div className="text-[13px] font-semibold tabular-nums text-foreground">
            {data[hover].value}
            {valueSuffix}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * BarChart — rounded bars with hover highlight.
 * ------------------------------------------------------------------ */
export function BarChart({
  data,
  height = 180,
  color = "var(--primary)",
  valueSuffix = "",
  showAxis = true,
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  valueSuffix?: string;
  showAxis?: boolean;
  className?: string;
}) {
  const w = 640;
  const padX = 10;
  const padTop = 12;
  const padBottom = showAxis ? 26 : 8;
  const innerH = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="block h-full w-full"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((g) => {
          const y = padTop + g * innerH;
          return (
            <line
              key={g}
              x1={padX}
              x2={w - padX}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={g === 1 ? "0" : "3 4"}
              opacity={g === 1 ? 0.6 : 0.4}
            />
          );
        })}
        {data.map((d, i) => {
          const barW = (innerW(data.length, padX, w) * 0.62) as number;
          const x = padX + (i + 0.5) * innerW(data.length, padX, w) - barW / 2;
          const h = Math.max(2, normalize(d.value, 0, max) * innerH);
          const y = padTop + innerH - h;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={padTop} width={barW} height={innerH} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={Math.min(5, barW / 2)}
                fill={hover === i ? color : "color-mix(in oklab, var(--primary) 68%, transparent)"}
                opacity={hover === i ? 1 : 0.85}
                className="transition-all duration-200"
              />
            </g>
          );
        })}
        {showAxis
          ? data.map((d, i) => (
              <text
                key={i}
                x={padX + (i + 0.5) * innerW(data.length, padX, w)}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted-foreground)"
                opacity={0.8}
              >
                {d.label}
              </text>
            ))
          : null}
      </svg>
      {hover !== null && data[hover] ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl border border-border bg-[var(--popover)] px-2.5 py-1.5 text-center shadow-[var(--shadow-float)]"
          style={{
            left: `${((padX + (hover + 0.5) * innerW(data.length, padX, w)) / w) * 100}%`,
            top: `${((padTop + (1 - normalize(data[hover].value, 0, max)) * innerH) / height) * 100}%`,
            transform: "translate(-50%, -125%)",
          }}
        >
          <div className="text-[10px] text-muted-foreground">{data[hover].label}</div>
          <div className="text-[13px] font-semibold tabular-nums text-foreground">
            {data[hover].value}
            {valueSuffix}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function innerW(n: number, padX: number, w: number): number {
  return (w - padX * 2) / n;
}

/* ------------------------------------------------------------------ *
 * DonutChart — radial segments with a centre label.
 * ------------------------------------------------------------------ */
export function DonutChart({
  segments,
  size = 140,
  stroke = 18,
  label,
  sublabel,
  className,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2 - 2;
  const arcs = useMemo(() => donutSegments(segments, cx, cy, r), [segments, cx, cy, r]);
  const total = segments.reduce((s, v) => s + v.value, 0);
  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="oklch(1 0 0 / 0.07)"
          strokeWidth={stroke}
        />
        {arcs.map((a) => (
          <path
            key={a.label}
            d={a.d}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            className="transition-all duration-300"
          >
            <title>{`${a.label} · ${a.pct}%`}</title>
          </path>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[20px] font-semibold leading-none tracking-tight text-foreground">
          {label ?? (total > 0 ? formatCompact(total) : "—")}
        </span>
        {sublabel ? (
          <span className="mt-1 max-w-[70%] text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * DonutLegend — labels next to a donut.
 * ------------------------------------------------------------------ */
export function Legend({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  return (
    <ul className="space-y-1.5">
      {segments.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-[12px]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
          <span className="flex-1 text-muted-foreground">{s.label}</span>
          <span className="font-semibold tabular-nums">{s.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Convenience: build a small helper to reuse `axisLabel` outside components. */
export const getAxisLabel = axisLabel;
