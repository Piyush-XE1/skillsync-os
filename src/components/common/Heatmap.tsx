import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type HeatCell = { date: string; level: number };

/**
 * GitHub-style contribution heatmap, rendered with pure CSS — no chart lib.
 * Columns are weeks (oldest → newest); rows are days of the week.
 * Cells are clipped to `maxLevel` and rendered as nested spans with a
 * data-level attribute so theme tokens drive the colors.
 */
export function Heatmap({
  cells,
  weeks = 14,
  maxLevel = 4,
  className,
}: {
  cells: HeatCell[];
  /** How many weeks to render (cells older than that are dropped). */
  weeks?: number;
  maxLevel?: number;
  className?: string;
}) {
  const visible = useMemo(() => cells.slice(-weeks * 7), [cells, weeks]);

  // Bucket cells by week: 7-day grid aligned so the last column ends "today".
  const columns = useMemo(() => {
    const cols: HeatCell[][] = [];
    for (let i = 0; i < visible.length; i += 7) {
      cols.push(visible.slice(i, i + 7));
    }
    // Pad the last column so weekday alignment stays consistent.
    while (cols.length && cols[cols.length - 1].length < 7) {
      cols[cols.length - 1].unshift({ date: "", level: -1 });
    }
    return cols;
  }, [visible]);

  return (
    <div
      className={cn("flex gap-[3px] overflow-x-auto no-scrollbar", className)}
      role="img"
      aria-label="Activity heatmap"
    >
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map((cell, ri) => {
            if (cell.level < 0) {
              return <span key={ri} className="heat-cell opacity-0" aria-hidden />;
            }
            return (
              <span
                key={ri}
                data-level={Math.min(maxLevel, cell.level)}
                className="heat-cell"
                title={cell.date}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
