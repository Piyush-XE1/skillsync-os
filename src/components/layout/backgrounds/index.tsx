/**
 * Monograph Noir's single atmospheric layer. Character comes from ink, paper
 * grain, and composition rather than animated colour effects.
 */
export function AppBackground() {
  return (
    <div
      className="monograph-background pointer-events-none fixed inset-0 -z-10"
      aria-hidden="true"
    >
      <div className="monograph-grain absolute inset-0" />
    </div>
  );
}
