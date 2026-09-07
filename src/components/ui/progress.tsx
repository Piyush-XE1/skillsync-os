import { cn } from "@/lib/utils";

/**
 * Dependency-free progress bar (shadcn-style API, SkillSync styling).
 */
export function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
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
          "h-full rounded-full gradient-primary transition-[width] duration-700 ease-[var(--ease-out-soft)]",
          indicatorClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
