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
        "p-5 transition-all duration-200 ease-[var(--ease-out-soft)]",
        interactive &&
          "pressable cursor-pointer active:shadow-[0_10px_24px_-20px_oklch(0_0_0_/_0.9)]",
        // Desktop-only hover affordance (hover-capable pointers only)
        "[@media(hover:hover)_and_(pointer:fine)]:hover:border-border-strong [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5",
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
    <div className={cn("flex items-end justify-between px-1", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </h2>
      {action ? (
        <span className="text-[12px] font-medium text-muted-foreground">{action}</span>
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
    default: "gradient-primary text-white border border-transparent",
    outline: "border border-white/[0.08] bg-white/[0.02] text-foreground hover:bg-white/[0.05]",
    ghost: "text-foreground hover:bg-white/[0.05]",
    danger: "bg-[var(--danger)] text-white border border-transparent",
  };
  const sizes: Record<string, string> = {
    default: "h-10 px-4 text-[13.5px]",
    sm: "h-8 px-3 text-[12.5px] rounded-lg",
    icon: "h-10 w-10",
  };
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-medium tracking-tight transition-all duration-200 ease-[var(--ease-out-soft)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
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
    default: "bg-white/[0.045] text-muted-foreground border-white/[0.07]",
    primary:
      "bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-[color-mix(in_oklab,var(--primary-glow)_88%,white)] border-[color-mix(in_oklab,var(--primary)_30%,transparent)]",
    success: "bg-success/10 text-success border-success/25",
    warning: "bg-warning/10 text-warning border-warning/25",
    danger: "bg-danger/10 text-danger border-danger/25",
    info: "bg-info/10 text-info border-info/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
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
          <span className="text-[18px] font-semibold leading-none tracking-tight text-foreground">
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
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
