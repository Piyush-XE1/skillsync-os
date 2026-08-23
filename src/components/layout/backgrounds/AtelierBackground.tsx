import { NOISE, BASE_LAYER_CLASS } from "./shared";

/**
 * Atelier — the premium studio backdrop.
 *
 * Deliberately quiet: a warm graphite ground with a faint candle-glow from the
 * top edge, one soft counterweight field and fine paper grain. Two ambient
 * fields drift on ultra-slow cycles so the surface feels alive without ever
 * asking for attention. No hue shifts, no stars, no sheen — the palette lives
 * in the design tokens; this layer only provides warm light and depth.
 *
 * Perf: transform-only animations on blurred radial fields, same budget as
 * the light atmosphere. `prefers-reduced-motion` freezes everything.
 */
export function AtelierBackground() {
  return (
    <div
      aria-hidden="true"
      className={BASE_LAYER_CLASS + " ss-atelier"}
      style={{ backgroundColor: "var(--bg-base)", contain: "strict" }}
    >
      {/* candle-glow: warm light falling from the top edge */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 46% at 50% -14%, rgba(214,178,112,0.10) 0%, rgba(201,163,92,0.045) 42%, transparent 72%)",
        }}
      />

      {/* warm field, upper-left — ultraslow drift */}
      <div
        className="absolute -left-[18%] -top-[24%] h-[80vh] w-[90vw] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(201,163,92,0.055), rgba(201,163,92,0.018) 55%, transparent 80%)",
          filter: "blur(60px)",
          animation: "ss-atelier-drift-a 38s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />

      {/* olive counterweight, lower-right */}
      <div
        className="absolute -bottom-[26%] -right-[16%] h-[75vh] w-[85vw] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(110,111,71,0.06), rgba(110,111,71,0.02) 58%, transparent 82%)",
          filter: "blur(66px)",
          animation: "ss-atelier-drift-b 46s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />

      {/* paper grain */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE,
          backgroundRepeat: "repeat",
          opacity: "var(--aurora-noise)",
          mixBlendMode: "overlay",
        }}
      />

      {/* warm vignette keeps the edges out of the reader's eye */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 45%, transparent 40%, var(--aurora-vignette) 88%, var(--aurora-vignette) 100%)",
        }}
      />

      <style>{`
        @keyframes ss-atelier-drift-a {
          from { transform: translate3d(0,0,0) scale(1); }
          to   { transform: translate3d(2.5%, 2%, 0) scale(1.05); }
        }
        @keyframes ss-atelier-drift-b {
          from { transform: translate3d(0,0,0) scale(1.03); }
          to   { transform: translate3d(-2.5%, -2%, 0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ss-atelier * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default AtelierBackground;
