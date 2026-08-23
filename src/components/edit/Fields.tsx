import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Global autofill suppression props applied to every reusable input.
 * Exported so bare <input> / <textarea> elsewhere can spread it.
 */
export const NO_AUTOFILL_PROPS = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-form-type": "other",
  "data-lpignore": "true",
  "data-1p-ignore": "",
  "data-bwignore": "true",
} as const;

const FIELD_BASE =
  "w-full rounded-[14px] border border-border bg-white/[0.03] px-4 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all duration-200 ease-[var(--ease-out-soft)] focus:border-[color-mix(in_oklab,var(--primary)_45%,transparent)] focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]";

/**
 * autoFocus only gets honoured on precise-pointer (desktop-class) devices.
 * On touch devices an auto-focused field pops the on-screen keyboard while
 * the sheet is still animating in, and the viewport resizes underneath it —
 * a visible layout thrash on every sheet open. There the keyboard opens on
 * the user's deliberate tap instead, which is standard mobile behaviour.
 */
function autofocusAllowed(requested: boolean | undefined): boolean | undefined {
  if (!requested) return undefined;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return undefined;
  }
  return window.matchMedia("(pointer: fine)").matches ? true : undefined;
}

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className, type, autoFocus, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        {...NO_AUTOFILL_PROPS}
        {...props}
        autoFocus={autofocusAllowed(autoFocus)}
        className={cn(FIELD_BASE, "h-11", className)}
      />
    );
  },
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, autoFocus, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      {...NO_AUTOFILL_PROPS}
      {...props}
      autoFocus={autofocusAllowed(autoFocus)}
      className={cn(FIELD_BASE, "resize-none py-3 leading-relaxed", className)}
    />
  );
});
