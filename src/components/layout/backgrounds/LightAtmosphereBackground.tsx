import { NOISE, BASE_LAYER_CLASS } from "./shared";

/**
 * Light theme signature background — "Calm Atmosphere".
 *
 * Not an inverted aurora: a warm off-white paper base with two extremely soft
 * botanical/straw light fields that drift very slowly, a faint horizon wash
 * and a whisper of grain. Three transformed layers only, so it stays GPU-cheap.
 * The hues deliberately echo the theme's palette tokens: sage light above,
 * warm straw below, never loud enough to touch readability.
 */
export function LightAtmosphereBackground() {
  return (
    <div
      aria-hidden="true"
      className={BASE_LAYER_CLASS}
      style={{ backgroundColor: "var(--bg-base)", contain: "strict" }}
    >
      {/* paper warmth */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, var(--bg-base) 46%, #f1eee8 100%)",
        }}
      />

      {/* soft botanical light field, top-left */}
      <div
        className="absolute -left-[20%] -top-[28%] h-[85vh] w-[95vw] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(74,117,90,0.13), rgba(74,117,90,0.045) 55%, transparent 78%)",
          filter: "blur(60px)",
          animation: "ss-light-drift-a 34s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />

      {/* warm straw counterweight, bottom-right */}
      <div
        className="absolute -bottom-[30%] -right-[18%] h-[80vh] w-[90vw] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(183,165,116,0.13), rgba(150,143,120,0.05) 58%, transparent 80%)",
          filter: "blur(66px)",
          animation: "ss-light-drift-b 42s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />

      {/* horizon wash for depth */}
      <div
        className="absolute inset-x-0 top-[38%] h-[42vh]"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)",
        }}
      />

      {/* whisper of grain */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE,
          backgroundRepeat: "repeat",
          opacity: 0.016,
          mixBlendMode: "multiply",
        }}
      />

      {/* barely-there edge shading keeps cards crisp */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 95% at 50% 45%, transparent 52%, rgba(110,104,86,0.09) 100%)",
        }}
      />

      <style>{`
        @keyframes ss-light-drift-a {
          from { transform: translate3d(0,0,0) scale(1); }
          to   { transform: translate3d(3%, 2%, 0) scale(1.06); }
        }
        @keyframes ss-light-drift-b {
          from { transform: translate3d(0,0,0) scale(1.04); }
          to   { transform: translate3d(-3%, -2%, 0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ss-static, [style*="ss-light-drift"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default LightAtmosphereBackground;
