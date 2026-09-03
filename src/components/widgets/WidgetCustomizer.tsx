import { useMemo } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Maximize2, RotateCcw } from "lucide-react";
import { BottomSheet } from "@/components/edit/Sheet";
import { ActionButton } from "@/components/edit/Buttons";
import { Toggle } from "@/components/common/Toggle";
import { SectionHeader } from "@/components/ui/primitives";
import { useAppStore } from "@/store/useAppStore";
import {
  WIDGET_BY_ID,
  availableWidgets,
  normalizeWidgetLayout,
  type WidgetId,
  type WidgetPlacement,
} from "@/lib/widgets";
import { WIDGET_ICONS } from "./registry";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * The "Customize dashboard" sheet.
 *
 * Complements dragging on the grid: switch a widget on/off, cycle its size and
 * nudge its position precisely (which is also how keyboard-only users reorder
 * without the grid). Reset restores the shipped dashboard, with an Undo toast.
 */

const SIZE_LABEL: Record<WidgetPlacement["size"], string> = {
  tile: "Tile",
  wide: "Wide",
  full: "Full",
};

function WidgetRow({
  entry,
  index,
  total,
}: {
  entry: WidgetPlacement;
  index: number;
  total: number;
}) {
  const def = WIDGET_BY_ID[entry.id];
  const Icon = WIDGET_ICONS[entry.id];
  const toggleWidget = useAppStore((s) => s.toggleWidget);
  const resizeWidget = useAppStore((s) => s.resizeWidget);
  const moveWidgetTo = useAppStore((s) => s.moveWidgetTo);

  if (!def) return null;

  const move = (dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= total) return;
    haptics.selection();
    sound.select();
    moveWidgetTo(entry.id, to);
  };

  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <span className="icon-tile h-9 w-9 rounded-xl">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium tracking-tight">{def.title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{def.hint}</div>
      </div>

      {entry.visible ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => resizeWidget(entry.id)}
            aria-label={`Resize ${def.title} (currently ${SIZE_LABEL[entry.size]})`}
            title={`Size: ${SIZE_LABEL[entry.size]}`}
            className="pressable flex h-8 items-center gap-1 rounded-[10px] bg-white/[0.05] px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.09] hover:text-foreground"
          >
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            {SIZE_LABEL[entry.size]}
          </button>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={index === 0}
              aria-label={`Move ${def.title} up`}
              className="flex h-4 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-25"
            >
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={index === total - 1}
              aria-label={`Move ${def.title} down`}
              className="flex h-4 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-25"
            >
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : null}

      <Toggle
        on={entry.visible}
        label={def.title}
        onChange={(visible) => {
          toggleWidget(entry.id, visible);
          sound.toggle();
        }}
      />
    </div>
  );
}

export function WidgetCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const layout = useAppStore((s) => s.widgets);
  const modules = useAppStore((s) => s.preferences.modules);
  const setWidgets = useAppStore((s) => s.setWidgets);
  const resetWidgets = useAppStore((s) => s.resetWidgets);

  const normalized = useMemo(() => normalizeWidgetLayout(layout), [layout]);
  const allowed = useMemo(() => new Set(availableWidgets(modules).map((d) => d.id)), [modules]);

  const onDashboard = normalized.filter((entry) => entry.visible && allowed.has(entry.id));
  const available = normalized.filter((entry) => !entry.visible && allowed.has(entry.id));
  const hiddenByModule = normalized.filter((entry) => !allowed.has(entry.id));

  const reset = () => {
    const previous = normalized;
    haptics.impact();
    sound.drop();
    resetWidgets();
    toast.success("Dashboard reset", {
      description: "The shipped widget layout is back.",
      action: {
        label: "Undo",
        onClick: () => {
          setWidgets(previous);
          sound.select();
        },
      },
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Customize dashboard"
      footer={
        <div className="flex gap-2">
          <ActionButton variant="outline" className="flex-1" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset layout
          </ActionButton>
          <ActionButton className="flex-1" onClick={onClose}>
            Done
          </ActionButton>
        </div>
      }
    >
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        Drag widgets on the dashboard to rearrange them — or use the arrows here. Turn anything off
        and it disappears from the grid without losing your data.
      </p>

      <div className="space-y-5">
        <section className="space-y-2.5">
          <SectionHeader title={`On your dashboard · ${onDashboard.length}`} />
          {onDashboard.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-white/[0.08] px-4 py-6 text-center text-[12.5px] text-muted-foreground">
              Nothing on the grid. Switch a widget on below.
            </p>
          ) : (
            <div className="space-y-2">
              {onDashboard.map((entry) => (
                <WidgetRow
                  key={entry.id}
                  entry={entry}
                  index={normalized.findIndex((n) => n.id === entry.id)}
                  total={normalized.length}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2.5">
          <SectionHeader title={`Available · ${available.length}`} />
          {available.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-white/[0.08] px-4 py-6 text-center text-[12.5px] text-muted-foreground">
              Every widget for your enabled modules is already on the dashboard.
            </p>
          ) : (
            <div className="space-y-2">
              {available.map((entry) => (
                <WidgetRow
                  key={entry.id}
                  entry={entry}
                  index={normalized.findIndex((n) => n.id === entry.id)}
                  total={normalized.length}
                />
              ))}
            </div>
          )}
        </section>

        {hiddenByModule.length > 0 ? (
          <section className="space-y-2.5">
            <SectionHeader title="Needs a module" />
            <div
              className={cn(
                "space-y-2 rounded-[16px] border border-white/[0.05] bg-white/[0.015] p-3 opacity-70",
              )}
            >
              {hiddenByModule.map((entry) => {
                const def = WIDGET_BY_ID[entry.id as WidgetId];
                const Icon = WIDGET_ICONS[entry.id as WidgetId];
                if (!def) return null;
                return (
                  <div key={entry.id} className="flex items-center gap-3">
                    <span className="icon-tile h-8 w-8 rounded-lg">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium">{def.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        Turn on the {def.module} module to use it
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </BottomSheet>
  );
}
