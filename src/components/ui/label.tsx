import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Dependency-free form label (shadcn-style API, SkillSync styling).
 * Also used as a clickable wrapper around toggles and radio inputs.
 */
export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { children?: ReactNode }) {
  return (
    <label className={cn("block text-[12.5px] font-medium text-foreground", className)} {...props}>
      {children}
    </label>
  );
}
