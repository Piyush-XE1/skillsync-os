import type { ButtonHTMLAttributes } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";

/**
 * Primary create action.
 * - `< lg` — compact icon-only button (FAB behaviour).
 * - `>= lg` — labelled button, e.g. `[+ Add Expense]`.
 */
export function PrimaryAction({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      onClick={(e) => {
        if (!props.disabled) {
          haptics.tap();
          sound.tap();
        }
        props.onClick?.(e);
      }}
      className={cn(
        "pressable gradient-primary inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[6px] border border-primary px-0 text-primary-foreground transition-colors duration-200 hover:bg-primary-glow",
        "w-11 lg:w-auto lg:px-4",
        className,
      )}
      {...props}
    >
      <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
      <span className="font-numerical hidden text-[10px] font-semibold uppercase tracking-[0.1em] lg:inline">
        {label}
      </span>
    </button>
  );
}
