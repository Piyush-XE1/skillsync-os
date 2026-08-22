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

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        {...NO_AUTOFILL_PROPS}
        {...props}
        className={cn(FIELD_BASE, "h-11", className)}
      />
    );
  },
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      {...NO_AUTOFILL_PROPS}
      {...props}
      className={cn(FIELD_BASE, "resize-none py-3 leading-relaxed", className)}
    />
  );
});
