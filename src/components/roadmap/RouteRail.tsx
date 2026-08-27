import { cn } from "@/lib/utils";
import { Check, Flag, Rocket, MoreHorizontal } from "lucide-react";

/**
 * Roadmap "journey route" primitives.
 *
 * These are the pure visual building blocks for a roadmap that reads like a
 * map rather than a to-do list: a continuous track with numbered waypoints
 * (phases), a start marker and a destination. The track "lights up" with the
 * roadmap's gradient as each phase is completed.
 */

type PhaseDatum = { id: string; done?: boolean; pct?: number };

/**
 * Compact horizontal "course map" used on the Learn index cards. Each phase is
 * a dot along a single route line that fills in as the phase is mastered.
 */
export function RoutePathPreview({
  phases,
  color,
  max = 6,
}: {
  phases: PhaseDatum[];
  color: string;
  max?: number;
}) {
  const shown = phases.slice(0, max);
  const hidden = phases.length - shown.length;
  if (shown.length === 0) {
    // A journey that hasn't been charted yet — a single un-done waypoint.
    return (
      <div className="flex h-6 items-center">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]" />
        <span className="ml-2 text-[10.5px] text-muted-foreground">Not started</span>
      </div>
    );
  }
  return (
    <div className="relative flex h-6 items-center">
      {/* dotted route line */}
      <div className="absolute left-1 right-1 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/[0.08]" />
      {shown.map((phase, i) => {
        const done = phase.done ?? (phase.pct ?? 0) >= 100;
        const inFlight = !done && (phase.pct ?? 0) > 0;
        return (
          <span key={phase.id ?? i} className="relative z-10 flex-1">
            <span
              className="mx-auto flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors"
              style={
                done
                  ? {
                      background: `linear-gradient(135deg, ${color}, var(--secondary))`,
                      boxShadow: `0 2px 8px -2px ${color}`,
                    }
                  : inFlight
                    ? {
                        boxShadow: `0 0 0 2px ${color}55, inset 0 0 0 3.5px var(--card)`,
                        backgroundColor: color,
                      }
                    : {
                        backgroundColor: "rgba(255,255,255,0.08)",
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)",
                      }
              }
            >
              {done ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} /> : null}
            </span>
            <span className="sr-only">{i + 1}</span>
          </span>
        );
      })}
      {hidden > 0 ? (
        <span className="relative z-10 flex shrink-0 items-center gap-0.5 pl-2 text-[10px] font-medium text-muted-foreground">
          <MoreHorizontal className="h-3 w-3" />
          {hidden}
        </span>
      ) : null}
    </div>
  );
}

type PhaseNodeProps = {
  /** Phase progress 0–100 */
  pct: number;
  /** 1-based position along the journey */
  position: number;
  /** Roadmap accent color */
  color: string;
  className?: string;
};

/**
 * The circular waypoint on the track. Three states:
 *  - done:     filled gradient + check
 *  - in-flight: gradient ring around the number
 *  - upcoming: hollow ring, dim number
 */
export function PhaseNode({ pct, position, color, className }: PhaseNodeProps) {
  const done = pct >= 100;
  const inFlight = pct > 0 && !done;

  if (done) {
    return (
      <span
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-px",
          className,
        )}
        style={{
          background: `linear-gradient(135deg, ${color}, var(--secondary))`,
          boxShadow: `0 8px 22px -8px ${color}cc`,
        }}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-black/25 backdrop-blur-sm">
          <Check className="h-5 w-5 text-white" strokeWidth={2.75} />
        </span>
      </span>
    );
  }

  if (inFlight) {
    return (
      <span
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card p-px",
          className,
        )}
        style={{
          background: `linear-gradient(135deg, ${color}, var(--secondary))`,
          boxShadow: `0 0 0 5px color-mix(in oklab, ${color} 18%, transparent)`,
        }}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-card">
          <span
            className="text-[13px] font-bold tabular-nums"
            style={{ color: `color-mix(in oklab, ${color} 75%, white)` }}
          >
            {position}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-card",
        className,
      )}
    >
      <span className="text-[13px] font-semibold tabular-nums text-muted-foreground/70">
        {position}
      </span>
    </span>
  );
}

/** Start marker at the top of the journey. */
export function RouteStart({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `linear-gradient(135deg, ${color}, var(--secondary))`,
          boxShadow: `0 8px 22px -8px ${color}cc`,
        }}
      >
        <Rocket className="h-[18px] w-[18px] text-white" strokeWidth={2} />
      </span>
      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Start
      </span>
    </div>
  );
}

/** Destination / finish marker at the bottom of the journey. */
export function RouteFinish({
  color,
  done,
  label = "Destination",
}: {
  color: string;
  done: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          done
            ? "bg-[linear-gradient(135deg,var(--primary),var(--secondary))]"
            : "border border-dashed border-white/[0.16] bg-card",
        )}
        style={
          done
            ? { boxShadow: "0 8px 22px -8px color-mix(in oklab, var(--primary) 70%, transparent)" }
            : undefined
        }
      >
        <Flag
          className={cn("h-[18px] w-[18px]", done ? "text-white" : "text-muted-foreground/70")}
        />
      </span>
      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
