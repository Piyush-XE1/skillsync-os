import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

/**
 * Minimal switch used across the settings screens.
 * Visually identical to the previous per-route copies; `role="switch"` gives
 * screen readers proper on/off semantics.
 */
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  /** Accessible name, required when no visible text label sits next to it. */
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        haptics.toggle(!on);
        onChange(!on);
      }}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-[var(--primary)]" : "bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
