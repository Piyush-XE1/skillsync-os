import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

export function Card({
  className,
  children,
  elevated = false,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  /** Higher elevation surface for floating / primary panels */
  elevated?: boolean;
  /** Adds press feedback for tappable cards */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        elevated ? "card-elevated" : "card-surface",
        "p-5 transition-[background-color,border-color] duration-200 ease-[var(--ease-out-soft)]",
        interactive &&
          "pressable cursor-pointer active:bg-surface-2 [@media(hover:hover)_and_(pointer:fine)]:hover:border-[color-mix(in_oklab,var(--primary)_38%,var(--border))] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-8 items-end justify-between gap-4 px-1", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="h-px w-5 shrink-0 bg-primary" />
        <h2 className="editorial-section-title truncate text-foreground">{title}</h2>
      </div>
      {action ? (
        <span className="font-numerical shrink-0 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {action}
        </span>
      ) : null}
    </div>
  );
}

export function Button({
  variant = "default",
  size = "default",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm" | "icon";
}) {
  const variants: Record<string, string> = {
    default: "gradient-primary border border-primary text-primary-foreground hover:bg-primary-glow",
    outline: "border border-border-strong bg-transparent text-foreground hover:bg-surface-2",
    ghost: "border border-transparent text-foreground hover:border-border hover:bg-surface",
    danger: "border border-danger/50 bg-danger/10 text-danger hover:bg-danger/15",
  };
  const sizes: Record<string, string> = {
    default: "h-11 px-4 text-[13px]",
    sm: "h-9 px-3 text-[11.5px]",
    icon: "h-11 w-11",
  };
  return (
    <button
      type={type}
      className={cn(
        "pressable inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[6px] font-semibold tracking-[-0.01em] transition-colors duration-200 ease-[var(--ease-out-soft)] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "border-border bg-surface-2 text-muted-foreground",
    primary:
      "border-[color-mix(in_oklab,var(--primary)_34%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] text-primary-glow",
    success: "border-success/30 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-danger/30 bg-danger/10 text-danger",
    info: "border-info/30 bg-info/10 text-info",
  };
  return (
    <span
      className={cn(
        "font-numerical inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[9.5px] font-medium uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: "primary" | "muted" | "gradient" | "success" | "warning" | "danger";
}) {
  const fill =
    tone === "gradient" || tone === "primary"
      ? "gradient-primary"
      : tone === "muted"
        ? "bg-white/40"
        : tone === "success"
          ? "bg-success"
          : tone === "warning"
            ? "bg-warning"
            : "bg-danger";
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-soft)]",
          fill,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Animated circular progress ring with gradient stroke. */
export function CircularProgress({
  value,
  size = 96,
  stroke = 8,
  label,
  sublabel,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(pct), 60);
    return () => window.clearTimeout(t);
  }, [pct]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `cp-${size}-${stroke}`;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="oklch(1 0 0 / 0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * shown) / 100}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out-soft)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ? (
          <span className="font-numerical text-[18px] font-semibold leading-none tracking-[-0.04em] text-foreground">
            {label}
          </span>
        ) : null}
        {sublabel ? (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Smoothly counts up to `value` on mount / change. */
export function CountUp({
  value,
  duration = 700,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const initial = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(initial + (value - initial) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={cn("font-numerical tabular-nums", className)}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
