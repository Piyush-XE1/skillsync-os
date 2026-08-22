import { NOISE, BASE_LAYER_CLASS } from "./shared";

/**
 * Atmospheric — layered corner lighting and ambient shadow falloff.
 * Theme-aware through the background engine tokens.
 */
export function AtmosphericBackground() {
  return (
    <div
      aria-hidden="true"
      className={BASE_LAYER_CLASS}
      style={{ backgroundColor: "var(--bg-base)", contain: "strict" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(55% 40% at 0% 0%, rgba(var(--aurora-1),0.9) 0%, transparent 68%)",
            "radial-gradient(55% 40% at 100% 0%, rgba(var(--aurora-2),0.8) 0%, transparent 68%)",
            "radial-gradient(60% 45% at 100% 100%, rgba(var(--aurora-2),0.85) 0%, transparent 70%)",
            "radial-gradient(60% 45% at 0% 100%, rgba(var(--aurora-3),0.8) 0%, transparent 70%)",
          ].join(","),
          filter: "blur(24px)",
          opacity: "var(--aurora-op-1)",
        }}
      />
      {/* ambient core — keeps the centre deep and readable */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(75% 55% at 50% 50%, var(--aurora-core) 0%, transparent 75%)",
        }}
      />
      {/* soft top sheen */}
      <div
        className="absolute inset-x-0 top-0 h-[38vh]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,var(--aurora-sheen)), transparent)",
        }}
      />
      {/* grain */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE,
          backgroundRepeat: "repeat",
          opacity: "var(--aurora-noise)",
          mixBlendMode: "overlay",
        }}
      />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 50%, transparent 32%, var(--aurora-vignette) 78%, var(--aurora-vignette) 100%)",
        }}
      />
    </div>
  );
}
