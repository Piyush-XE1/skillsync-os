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
        "pressable gradient-primary inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] px-0 text-[14px] font-medium tracking-tight text-primary-foreground shadow-[var(--shadow-glow)] transition-all duration-200 hover:brightness-110 lg:px-4",
        "w-11 lg:w-auto",
        className,
      )}
      {...props}
    >
      <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
