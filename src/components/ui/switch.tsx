import { cn } from "@/lib/utils";

/**
 * Dependency-free switch control (shadcn-style API, SkillSync styling).
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full border transition-colors duration-200 ease-[var(--ease-out-soft)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        checked ? "gradient-primary border-transparent" : "border-white/[0.08] bg-white/[0.06]",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out-soft)]",
          checked ? "translate-x-[23px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
