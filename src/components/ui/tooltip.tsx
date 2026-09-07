import { cn } from "@/lib/utils";
import type { ReactElement, ReactNode } from "react";

/**
 * Dependency-free CSS-only tooltip (shadcn-style compound API).
 *
 * Supported usage:
 *   <Tooltip>
 *     <TooltipTrigger asChild>{triggerElement}</TooltipTrigger>
 *     <TooltipContent>Helper text</TooltipContent>
 *   </Tooltip>
 */

export function Tooltip({ children, className }: { children?: ReactNode; className?: string }) {
  return <span className={cn("group/tooltip relative inline-flex", className)}>{children}</span>;
}

export function TooltipTrigger({
  asChild = false,
  children,
}: {
  asChild?: boolean;
  children?: ReactNode;
}) {
  if (asChild) {
    // The trigger element itself carries the hover state of the wrapping group.
    return children as ReactElement;
  }
  return <span className="inline-flex">{children}</span>;
}

export function TooltipContent({
  children,
  className,
  side = "top",
}: {
  children?: ReactNode;
  className?: string;
  side?: "top" | "bottom";
}) {
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute left-1/2 z-50 hidden w-max max-w-56 -translate-x-1/2 rounded-xl border border-white/[0.1] bg-black/90 px-3 py-2 text-left text-[11.5px] leading-relaxed text-white shadow-xl backdrop-blur-md group-hover/tooltip:block",
        side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        className,
      )}
    >
      {children}
    </span>
  );
}
