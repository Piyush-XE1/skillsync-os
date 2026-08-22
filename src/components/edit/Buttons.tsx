import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "gradient-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:brightness-110",
  ghost: "bg-white/[0.045] text-foreground hover:bg-white/[0.07]",
  outline: "border border-border-strong text-foreground hover:bg-white/[0.04]",
  danger: "bg-danger/12 text-danger hover:bg-danger/20",
};

export function IconButton({
  className,
  children,
  variant = "ghost",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}) {
  const sizes: Record<Size, string> = {
    sm: "h-8 w-8 rounded-[10px]",
    md: "h-10 w-10 rounded-[14px]",
    lg: "h-11 w-11 rounded-[14px]",
  };
  return (
    <button
      onClick={(e) => {
        if (!props.disabled) {
          if (variant === "danger") haptics.impact();
          else haptics.tap();
        }
        props.onClick?.(e);
      }}
      className={cn(
        "pressable inline-flex items-center justify-center",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        sizes[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ActionButton({
  className,
  children,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}) {
  const sizes: Record<Size, string> = {
    sm: "h-9 px-3.5 text-[13px] rounded-[12px]",
    md: "h-11 px-4 text-[14px] rounded-[14px]",
    lg: "h-12 px-5 text-[15px] rounded-[16px]",
  };
  return (
    <button
      onClick={(e) => {
        if (!props.disabled) {
          if (variant === "danger") haptics.impact();
          else haptics.tap();
        }
        props.onClick?.(e);
      }}
      className={cn(
        "pressable inline-flex items-center justify-center gap-2 font-medium tracking-tight",
        sizes[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Floating action button — glass shell, spring press, ambient glow. */
export function Fab({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      onClick={(e) => {
        if (!props.disabled) haptics.tap();
        props.onClick?.(e);
      }}
      className={cn(
        "pressable inline-flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-[var(--shadow-glow)] ring-1 ring-white/15 active:scale-95",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
