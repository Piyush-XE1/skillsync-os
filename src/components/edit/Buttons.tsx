import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "gradient-primary border border-primary text-primary-foreground hover:bg-primary/90",
  ghost: "border border-transparent bg-surface-2 text-foreground hover:border-border",
  outline: "border border-border-strong text-foreground hover:bg-surface-2",
  danger: "border border-danger/25 bg-danger/10 text-danger hover:bg-danger/15",
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
    sm: "h-10 w-10 rounded-[4px]",
    md: "h-11 w-11 rounded-[6px]",
    lg: "h-12 w-12 rounded-[6px]",
  };
  return (
    <button
      onClick={(e) => {
        if (!props.disabled) {
          if (variant === "danger") haptics.impact();
          else haptics.tap();
          sound.tap();
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
    sm: "h-9 px-3.5 text-[10px] rounded-[4px]",
    md: "h-11 px-4 text-[11px] rounded-[6px]",
    lg: "h-12 px-5 text-[12px] rounded-[6px]",
  };
  return (
    <button
      onClick={(e) => {
        if (!props.disabled) {
          if (variant === "danger") haptics.impact();
          else haptics.tap();
          sound.tap();
        }
        props.onClick?.(e);
      }}
      className={cn(
        "font-numerical pressable inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.08em]",
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

/** Floating action button — flat brass control in the shared visual system. */
export function Fab({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      onClick={(e) => {
        if (!props.disabled) {
          haptics.tap();
          sound.tap();
        }
        props.onClick?.(e);
      }}
      className={cn(
        "pressable inline-flex h-12 w-12 items-center justify-center rounded-[6px] border border-primary gradient-primary text-primary-foreground active:scale-95",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
