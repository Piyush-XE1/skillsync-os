import { NOISE, BASE_LAYER_CLASS } from "./shared";

/**
 * SkillSync OS — Animated Aurora ("Boreal Drift").
 *
 * The aurora look rebuilt on the same bulletproof architecture as the Light
 * and Atelier backgrounds, so it stays animated but can no longer glitch:
 *
 *  - ZERO `filter: blur()` — every soft edge is baked into multi-stop
 *    radial/linear gradients, so layers rasterize once, instantly.
 *  - ZERO `mix-blend-mode` on aurora light — `screen`-blended near-white
 *    bands were washing out header text and flickering on Android WebViews.
 *  - ZERO `mask-image` on animated layers — masks force per-frame offscreen
 *    buffers on mobile GPUs.
 *  - ZERO `repeating-linear-gradient` stripes — high-frequency stripes under
 *    rotate/skew animation aliased into crawling moiré. Curtain "folds" are
 *    individual soft ellipses instead: they resample cleanly at any angle.
 *  - Compositor-only motion: three oversized curtain layers drift on slow
 *    translate/rotate/scale cycles (transform only) plus one opacity-only
 *    star twinkle. Nothing else ever repaints.
 *  - Legibility-first staging: the luminous curtain band lives below the
 *    page-header zone, and static scrims (top, bottom, vignette) keep every
 *    region where text renders on bare background at deep-navy contrast.
 *  - `--aurora-sky`, `--aurora-stars`, `--aurora-stars-2`, `--aurora-noise`
 *    and `--aurora-vignette` keep working — star opacity vars now sit on
 *    wrapper layers, so the twinkle animation can no longer override them.
 *
 * `prefers-reduced-motion` freezes every animation; each animated layer
 * carries its base transform inline, so the frozen frame is still the
 * composed, tilted aurora (never a flat unrotated slab).
 */

/** Deep cosmic sky: navy base, violet/teal nebula corners, horizon radiance. */
const SKY = [
  // horizon radiance rising from below
  "radial-gradient(120% 55% at 50% 108%, rgba(56, 79, 180, 0.20) 0%, rgba(29, 44, 120, 0.12) 40%, transparent 72%)",
  // faint violet nebula, upper left
  "radial-gradient(60% 42% at 16% 10%, rgba(94, 58, 214, 0.11) 0%, transparent 70%)",
  // faint teal nebula, upper right
  "radial-gradient(55% 40% at 86% 18%, rgba(14, 116, 144, 0.09) 0%, transparent 70%)",
  // deep cosmic base
  "linear-gradient(180deg, #030510 0%, #050a1c 38%, #071128 70%, #060d20 100%)",
].join(", ");

/**
 * Star fields. Dots are fixed-radius radial-gradients anchored at percentage
 * positions with `no-repeat`, so they never tile into a visible grid and stay
 * perfectly round at any viewport size.
 */
const STARS_STATIC = [
  // (stars deliberately avoid the 8–16% header-text band)
  "8% 27%",
  "15% 34%",
  "22% 9%",
  "29% 47%",
  "36% 18%",
  "43% 61%",
  "50% 8%",
  "57% 39%",
  "64% 71%",
  "71% 15%",
  "78% 52%",
  "85% 24%",
  "92% 57%",
  "97% 11%",
  "12% 70%",
  "25% 83%",
  "46% 79%",
  "67% 89%",
  "88% 78%",
  "4% 41%",
  "52% 27%",
  "77% 36%",
  "18% 55%",
  "60% 5%",
  "34% 90%",
  "95% 42%",
]
  .map(
    (p) =>
      `radial-gradient(1.5px 1.5px at ${p}, rgba(232, 240, 255, 0.9) 0%, rgba(186, 220, 255, 0.4) 45%, transparent 100%)`,
  )
  .join(",");

const STARS_TWINKLE = [
  "11% 22%",
  "19% 44%",
  "27% 15%",
  "38% 33%",
  "47% 52%",
  "55% 27%",
  "62% 44%",
  "69% 26%",
  "75% 62%",
  "83% 39%",
  "90% 19%",
  "96% 66%",
  "33% 68%",
  "58% 82%",
  "80% 88%",
]
  .map(
    (p) =>
      `radial-gradient(1.8px 1.8px at ${p}, rgba(255, 255, 255, 0.95) 0%, rgba(165, 243, 252, 0.45) 40%, transparent 100%)`,
  )
  .join(",");

/**
 * Curtain layers. Each is one element whose background stacks soft ellipses
 * of different widths — wide ones are the curtain body, narrow tall ones are
 * luminous vertical folds. Everything fades to transparent at its own edges,
 * so the oversized boxes can rotate and drift without ever showing a seam.
 */

// 1) Emerald / teal foundation — the broad lower boreal band.
const CURTAIN_EMERALD = [
  "radial-gradient(38% 60% at 30% 52%, rgba(16, 225, 170, 0.30) 0%, rgba(16, 190, 150, 0.12) 48%, transparent 74%)",
  "radial-gradient(46% 56% at 60% 50%, rgba(13, 200, 190, 0.26) 0%, rgba(12, 160, 170, 0.10) 50%, transparent 76%)",
  "radial-gradient(30% 46% at 84% 46%, rgba(14, 140, 190, 0.18) 0%, transparent 72%)",
  "radial-gradient(26% 42% at 12% 58%, rgba(10, 170, 140, 0.17) 0%, transparent 72%)",
].join(", ");

// 2) Violet / indigo main curtain — the hero band with brighter fold cores.
const CURTAIN_VIOLET = [
  "radial-gradient(44% 55% at 34% 50%, rgba(139, 92, 246, 0.30) 0%, rgba(109, 80, 220, 0.12) 50%, transparent 75%)",
  "radial-gradient(40% 52% at 66% 48%, rgba(99, 102, 241, 0.26) 0%, rgba(80, 90, 210, 0.10) 50%, transparent 76%)",
  "radial-gradient(26% 44% at 50% 42%, rgba(59, 130, 246, 0.22) 0%, transparent 72%)",
  "radial-gradient(16% 40% at 44% 46%, rgba(167, 139, 250, 0.28) 0%, transparent 70%)",
  "radial-gradient(12% 34% at 58% 44%, rgba(196, 181, 253, 0.24) 0%, transparent 70%)",
  "radial-gradient(14% 38% at 24% 52%, rgba(167, 139, 250, 0.22) 0%, transparent 70%)",
].join(", ");

// 3) Cyan crown — narrow vertical fold streaks riding the curtain's top edge.
const CURTAIN_CYAN = [
  "radial-gradient(9% 72% at 22% 50%, rgba(103, 232, 249, 0.19) 0%, transparent 70%)",
  "radial-gradient(11% 78% at 38% 48%, rgba(103, 232, 249, 0.23) 0%, transparent 70%)",
  "radial-gradient(8% 66% at 52% 52%, rgba(125, 211, 252, 0.17) 0%, transparent 70%)",
  "radial-gradient(12% 82% at 68% 46%, rgba(103, 232, 249, 0.22) 0%, transparent 70%)",
  "radial-gradient(9% 70% at 82% 50%, rgba(165, 243, 252, 0.16) 0%, transparent 70%)",
  "radial-gradient(7% 58% at 10% 54%, rgba(125, 211, 252, 0.14) 0%, transparent 70%)",
].join(", ");

/**
 * Legibility scrims — static overlays that keep text-bearing regions on deep
 * navy. The header zone (top ~20%) and the bottom-nav zone never see the
 * curtain's full brightness; the radial vignette calms the edges.
 */
const SCRIMS = [
  // header / status-bar zone
  "linear-gradient(180deg, rgba(3, 5, 16, 0.62) 0%, rgba(3, 5, 16, 0.30) 9%, rgba(3, 5, 16, 0) 24%)",
  // bottom-nav zone
  "linear-gradient(0deg, rgba(3, 5, 16, 0.55) 0%, rgba(3, 5, 16, 0) 16%)",
  // edge vignette (token-driven, same contract as the other backgrounds)
  "radial-gradient(125% 100% at 50% 42%, transparent 45%, var(--aurora-vignette) 100%)",
].join(", ");

const AURORA_STYLES = `
/* Compositor-only drift. Rotations are baked into every keyframe AND the
   matching inline transform, so animation:none (reduced motion) still shows
   the composed tilted curtain. */
@keyframes ss-aurora-drift-a {
  from { transform: translate3d(-1.6%, 1%, 0) rotate(-10.5deg) scale(1.02); }
  to   { transform: translate3d(1.8%, -1.2%, 0) rotate(-7.5deg) scale(1.07); }
}
@keyframes ss-aurora-drift-b {
  from { transform: translate3d(1.4%, -0.8%, 0) rotate(-13.5deg) scale(1.06) skewX(-1.5deg); }
  to   { transform: translate3d(-1.6%, 1.2%, 0) rotate(-10.5deg) scale(1.01) skewX(1.5deg); }
}
@keyframes ss-aurora-drift-c {
  from { transform: translate3d(-1.2%, 1.4%, 0) rotate(-12deg) scale(1.03) skewX(1deg); }
  to   { transform: translate3d(1.6%, -1%, 0) rotate(-9deg) scale(1.08) skewX(-2deg); }
}
/* Opacity-only twinkle on the bright star subset (nested inside a wrapper
   whose opacity carries the --aurora-stars-2 token, so the token wins). */
@keyframes ss-aurora-twinkle {
  from { opacity: 0.45; }
  to   { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ss-aurora * { animation: none !important; }
}
`;

export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className={BASE_LAYER_CLASS + " ss-aurora"}
      style={{ backgroundColor: "var(--bg-base)", contain: "strict" }}
    >
      <style>{AURORA_STYLES}</style>

      {/* 1. Deep cosmic sky (static — sky, nebulae and horizon in one layer) */}
      <div
        className="absolute inset-0"
        style={{ background: SKY, opacity: "var(--aurora-sky, 1)" }}
      />

      {/* 2. Star field — static tier + twinkling bright subset */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: STARS_STATIC,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          opacity: "var(--aurora-stars, 0.6)",
        }}
      />
      <div className="absolute inset-0" style={{ opacity: "var(--aurora-stars-2, 0.4)" }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: STARS_TWINKLE,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            animation: "ss-aurora-twinkle 6.5s ease-in-out infinite alternate",
            willChange: "opacity",
          }}
        />
      </div>

      {/* 3. Emerald / teal foundation band (lower) */}
      <div
        className="absolute"
        style={{
          left: "-25%",
          top: "33%",
          width: "150%",
          height: "58%",
          background: CURTAIN_EMERALD,
          transform: "translate3d(-1.6%, 1%, 0) rotate(-10.5deg) scale(1.02)",
          animation: "ss-aurora-drift-a 26s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />

      {/* 4. Violet / indigo main curtain (the hero band, below the header zone) */}
      <div
        className="absolute"
        style={{
          left: "-25%",
          top: "17%",
          width: "150%",
          height: "50%",
          background: CURTAIN_VIOLET,
          transform: "translate3d(1.4%, -0.8%, 0) rotate(-13.5deg) scale(1.06) skewX(-1.5deg)",
          animation: "ss-aurora-drift-b 21s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />

      {/* 5. Cyan fold streaks riding the curtain's crown */}
      <div
        className="absolute"
        style={{
          left: "-20%",
          top: "21%",
          width: "140%",
          height: "26%",
          background: CURTAIN_CYAN,
          transform: "translate3d(-1.2%, 1.4%, 0) rotate(-12deg) scale(1.03) skewX(1deg)",
          animation: "ss-aurora-drift-c 17s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />

      {/* 6. Legibility scrims — header band, bottom band, edge vignette */}
      <div className="absolute inset-0" style={{ background: SCRIMS }} />

      {/* 7. Filmic grain — same pattern as the other two backgrounds */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE,
          backgroundRepeat: "repeat",
          opacity: "var(--aurora-noise)",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}

export default AuroraBackground;
