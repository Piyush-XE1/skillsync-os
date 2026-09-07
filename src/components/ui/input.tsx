import { cn } from "@/lib/utils";

/**
 * Dependency-free styled text input (shadcn-style API, SkillSync styling).
 */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[13.5px] text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-[color-mix(in_oklab,var(--primary)_45%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
