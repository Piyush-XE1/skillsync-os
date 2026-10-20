import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";

/**
 * The Folio Circuit switch.
 *
 * Instead of the familiar pill-and-thumb metaphor, the setting is represented
 * as a tiny circuit diagram: OFF lifts the bridge away from its terminal; ON
 * closes the line. The adjacent folio readout keeps the state unambiguous at a
 * glance, while native button and switch semantics preserve keyboard and screen
 * reader behavior.
 */
export function Toggle({
  on,
  onChange,
  label,
  disabled = false,
  className,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  /** Accessible setting name. The current state is supplied by aria-checked. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const state = on ? "on" : "off";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      data-state={state}
      title={`${label}: ${state}`}
      onClick={() => {
        const next = !on;
        haptics.toggle(next);
        sound.toggle();
        onChange(next);
      }}
      className={cn("signal-toggle", className)}
    >
      <span className="signal-toggle__schematic" aria-hidden="true">
        <span className="signal-toggle__wire signal-toggle__wire--left" />
        <span className="signal-toggle__wire signal-toggle__wire--right" />
        <span className="signal-toggle__node signal-toggle__node--left" />
        <span className="signal-toggle__node signal-toggle__node--right" />
        <span className="signal-toggle__bridge">
          <span className="signal-toggle__tip" />
        </span>
      </span>
      <span key={state} className="signal-toggle__readout" aria-hidden="true">
        <span className="signal-toggle__folio">{on ? "01" : "00"}</span>
        <span className="signal-toggle__state">{on ? "ON" : "OFF"}</span>
      </span>
    </button>
  );
}
