import { useMemo } from "react";
import { DragSortList } from "@/components/common/DragSortList";
import { useAppStore } from "@/store/useAppStore";
import { WIDGET_BY_ID, visibleWidgets, type WidgetId } from "@/lib/widgets";
import { WIDGET_COMPONENTS } from "./registry";
import { cn } from "@/lib/utils";

/**
 * The dashboard widget grid.
 *
 * Layout comes from the store (`widgets`), is filtered by the enabled optional
 * modules, and renders through `DragSortList` in grid mode so widgets can be
 * dragged (or keyboard-sorted) into a personal order. Dragging is only armed in
 * customize mode — the dashboard must never hijack an ordinary tap or scroll.
 */
export function WidgetGrid({
  customizing = false,
  className,
}: {
  customizing?: boolean;
  className?: string;
}) {
  const layout = useAppStore((s) => s.widgets);
  const modules = useAppStore((s) => s.preferences.modules);
  const reorderWidgets = useAppStore((s) => s.reorderWidgets);
  const toggleWidget = useAppStore((s) => s.toggleWidget);
  const resizeWidget = useAppStore((s) => s.resizeWidget);

  const items = useMemo(() => visibleWidgets(layout, modules), [layout, modules]);

  return (
    <DragSortList
      items={items}
      axis="grid"
      disabled={!customizing}
      handleOnly
      className={cn("widget-grid grid grid-cols-2 gap-3 lg:grid-cols-4", className)}
      onReorder={(ids) => reorderWidgets(ids)}
      itemLabel={(item) => WIDGET_BY_ID[item.id as WidgetId]?.title ?? item.id}
      renderItem={({ item, dragging, sorting, setNodeRef, rowProps, handleProps }) => {
        const Widget = WIDGET_COMPONENTS[item.id as WidgetId];
        if (!Widget) return null;
        return (
          <Widget
            size={item.size}
            customizing={customizing}
            dragging={dragging}
            sorting={sorting}
            setNodeRef={setNodeRef}
            rowProps={rowProps}
            handleProps={handleProps}
            onHide={() => toggleWidget(item.id as WidgetId, false)}
            onResize={() => resizeWidget(item.id as WidgetId)}
          />
        );
      }}
    />
  );
}
