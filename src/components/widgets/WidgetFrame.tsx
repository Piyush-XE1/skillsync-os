import type { ReactNode } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { DragHandle, type HandleProps } from "@/components/common/DragSortList";
import { WIDGET_SPAN_CLASS, type WidgetSize } from "@/lib/widgets";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for every dashboard widget.
 *
 * The outer element is the drag slot (it carries the grid span, the node ref
 * and the pointer handlers); the card inside owns the visual treatment. In
 * customize mode the frame grows a control rail — grip, resize, hide — and a
 * dashed outline so it's obvious the grid is editable.
 */
export type WidgetFrameProps = {
  size: WidgetSize;
  title?: string;
  icon?: ReactNode;
  /** Optional chip/link rendered on the right of the header. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Editing mode: shows the drag grip + resize/hide controls. */
  customizing?: boolean;
  dragging?: boolean;
  /** Some widget in the grid is being dragged — freezes the idle jiggle. */
  sorting?: boolean;
  handleProps?: HandleProps;
  setNodeRef?: (el: HTMLDivElement | null) => void;
  rowProps?: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    "data-sort-row": string;
  };
  onHide?: () => void;
  onResize?: () => void;
  /** Ambient accent glow behind the content. */
  glow?: boolean;
};

export function WidgetFrame({
  size,
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
  customizing = false,
  dragging = false,
  sorting = false,
  handleProps,
  setNodeRef,
  rowProps,
  onHide,
  onResize,
  glow = true,
}: WidgetFrameProps) {
  const wide = size !== "tile";
  return (
    <div
      ref={setNodeRef}
      {...rowProps}
      className={cn(
        "relative min-w-0",
        WIDGET_SPAN_CLASS[size],
        dragging && "z-30",
        customizing && !dragging && "z-10",
        // The idle "these are editable" jiggle — frozen while anything drags,
        // because a CSS animation would override the inline drag transforms.
        customizing && !dragging && !sorting && "widget-jiggle",
      )}
    >
      <Card
        className={cn(
          "group/widget relative flex h-full flex-col overflow-hidden p-4",
          "transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out-soft)]",
          dragging &&
            "border-[color-mix(in_oklab,var(--primary)_45%,transparent)] shadow-[0_30px_60px_-26px_oklch(0_0_0/0.95)] ring-1 ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]",
          customizing &&
            !dragging &&
            "border-dashed border-[color-mix(in_oklab,var(--primary)_28%,transparent)]",
          className,
        )}
      >
        {glow ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full blur-3xl transition-opacity duration-300",
              "bg-[color-mix(in_oklab,var(--primary)_16%,transparent)]",
              dragging ? "opacity-100" : "opacity-60",
            )}
          />
        ) : null}

        {title || customizing ? (
          <div className="relative mb-3 flex items-center gap-2">
            {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
            {title ? (
              <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {title}
              </h3>
            ) : (
              <span className="flex-1" />
            )}
            {!customizing && action ? <span className="shrink-0">{action}</span> : null}

            {customizing ? (
              <div className="flex shrink-0 items-center gap-0.5" data-no-drag>
                {onResize ? (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      sound.select();
                      onResize();
                    }}
                    aria-label={
                      wide ? `Make ${title ?? "widget"} smaller` : `Make ${title ?? "widget"} wider`
                    }
                    title={wide ? "Smaller" : "Wider"}
                    className="pressable flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-muted-foreground transition-colors hover:bg-white/[0.09] hover:text-foreground"
                  >
                    {wide ? (
                      <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                  </button>
                ) : null}
                {onHide ? (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.impact();
                      sound.close();
                      onHide();
                    }}
                    aria-label={`Remove ${title ?? "widget"} from the dashboard`}
                    title="Remove"
                    className="pressable flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05] text-muted-foreground transition-colors hover:bg-[var(--danger)]/15 hover:text-[var(--danger)]"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                ) : null}
                {handleProps ? <DragHandle {...handleProps} active={dragging} /> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={cn("relative min-w-0 flex-1", bodyClassName)}>{children}</div>
      </Card>
    </div>
  );
}

/** Big number + unit + optional footnote — the tile rhythm used everywhere. */
export function StatValue({
  value,
  unit,
  footnote,
  className,
}: {
  value: ReactNode;
  unit?: string;
  footnote?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline gap-1.5">
        <span className="truncate text-[30px] font-semibold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {unit ? <span className="text-[13px] text-muted-foreground">{unit}</span> : null}
      </div>
      {footnote ? <div className="mt-2.5 text-[11px] text-muted-foreground">{footnote}</div> : null}
    </div>
  );
}

/**
 * Props every widget receives from the grid: its size plus the drag/customize
 * chrome that `WidgetFrame` forwards to the sortable row.
 */
export type WidgetChromeProps = Pick<
  WidgetFrameProps,
  | "customizing"
  | "dragging"
  | "sorting"
  | "handleProps"
  | "setNodeRef"
  | "rowProps"
  | "onHide"
  | "onResize"
>;

export type WidgetProps = WidgetChromeProps & { size: WidgetSize };
