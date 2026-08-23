import { NOISE, BASE_LAYER_CLASS } from "./shared";

/**
 * SkillSync OS — Ultra-Premium Animated Aurora ("Dynamic Boreal Odyssey")
 *
 * Visual architecture:
 *  1. Deep cosmic foundation + midnight horizon radiance
 *  2. Multi-tier living starfield (twinkling stellar nodes + ambient cosmic streak)
 *  3. Atmospheric nebula veil (soft expansive indigo & violet haze)
 *  4. PRIMARY BOREAL CURTAINS:
 *     - Grand sweeping emerald & cyan lower ribbon
 *     - Vibrant violet & amethyst main ionized curtain with vertical striation folds
 *     - High-energy radiant core river of light
 *     - Coronal magenta highlight tips
 *  5. Ionized atmospheric light pillars & vertical ray cascades
 *  6. Pulsing coronal flare hotspots
 *  7. Filmic micro-grain overlay + focus vignette
 *
 * Performance:
 *  - 100% GPU compositor driven (transform3d & opacity only)
 *  - strict contain, zero layout shift, low power draw
 *  - responsive fallback for smaller mobile screens
 *  - prefers-reduced-motion freezes all animations cleanly
 */

const AURORA_STYLES = `
@keyframes ss-aurora-sway-1 {
  0%   { transform: translate3d(-3%, -2%, 0) rotate(-8deg) skewX(-4deg) scale(1); }
  50%  { transform: translate3d(4%, 2%, 0) rotate(-4deg) skewX(5deg) scale(1.08, 1.04); }
  100% { transform: translate3d(-4%, 1%, 0) rotate(-9deg) skewX(-6deg) scale(0.96, 1.02); }
}
@keyframes ss-aurora-sway-2 {
  0%   { transform: translate3d(4%, 1%, 0) rotate(-14deg) skewX(6deg) scale(1.04); }
  50%  { transform: translate3d(-5%, -2%, 0) rotate(-7deg) skewX(-5deg) scale(0.94, 1.06); }
  100% { transform: translate3d(3%, 3%, 0) rotate(-12deg) skewX(4deg) scale(1.02); }
}
@keyframes ss-aurora-sway-3 {
  0%   { transform: translate3d(-2%, 0, 0) rotate(-18deg) skewX(-8deg) scale(0.98); }
  50%  { transform: translate3d(5%, -1.5%, 0) rotate(-11deg) skewX(7deg) scale(1.12, 0.95); }
  100% { transform: translate3d(-3%, 2%, 0) rotate(-16deg) skewX(-5deg) scale(1.01); }
}
@keyframes ss-core-stream {
  0%   { transform: translate3d(-4%, 0, 0) rotate(-7deg) scaleY(1); opacity: 0.75; }
  50%  { transform: translate3d(5%, 1.2%, 0) rotate(-3deg) scaleY(1.22); opacity: 1; }
  100% { transform: translate3d(-3%, -0.8%, 0) rotate(-8deg) scaleY(0.92); opacity: 0.8; }
}
@keyframes ss-boreal-green-sway {
  0%   { transform: translate3d(-5%, 2%, 0) rotate(-12deg) skewX(7deg) scale(1); opacity: 0.55; }
  50%  { transform: translate3d(4%, -1%, 0) rotate(-6deg) skewX(-4deg) scale(1.15, 1.05); opacity: 0.85; }
  100% { transform: translate3d(-3%, 3%, 0) rotate(-10deg) skewX(5deg) scale(0.96); opacity: 0.6; }
}
@keyframes ss-pillars-drift {
  0%   { transform: translate3d(-4%, 0, 0) skewX(-6deg) scaleY(1); opacity: 0.45; }
  50%  { transform: translate3d(5%, 0, 0) skewX(4deg) scaleY(1.18); opacity: 0.8; }
  100% { transform: translate3d(-3%, 0, 0) skewX(-5deg) scaleY(0.95); opacity: 0.5; }
}
@keyframes ss-flare-pulse-1 {
  0%, 100% { transform: scale(0.92) translate3d(0, 0, 0); opacity: 0.45; }
  50%      { transform: scale(1.18) translate3d(4%, -2%, 0); opacity: 0.9; }
}
@keyframes ss-flare-pulse-2 {
  0%, 100% { transform: scale(1.1) translate3d(0, 0, 0); opacity: 0.7; }
  50%      { transform: scale(0.88) translate3d(-5%, 3%, 0); opacity: 0.35; }
}
@keyframes ss-twinkle-fast {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50%      { opacity: 0.95; transform: scale(1.1); }
}
@keyframes ss-twinkle-slow {
  0%, 100% { opacity: 0.25; }
  50%      { opacity: 0.85; }
}
@keyframes ss-nebula-breathe {
  0%, 100% { opacity: 0.5; transform: scale(1) translate3d(0,0,0); }
  50%      { opacity: 0.85; transform: scale(1.08) translate3d(2%, -1%, 0); }
}
@keyframes ss-shooting-star {
  0%   { transform: translate3d(-40px, -40px, 0) rotate(-35deg) scaleX(0); opacity: 0; }
  2%   { opacity: 1; }
  5%   { transform: translate3d(320px, 220px, 0) rotate(-35deg) scaleX(1.4); opacity: 0.9; }
  7%   { transform: translate3d(440px, 300px, 0) rotate(-35deg) scaleX(0.2); opacity: 0; }
  100% { transform: translate3d(440px, 300px, 0) rotate(-35deg) scaleX(0); opacity: 0; }
}

@media (max-width: 767px) {
  .ss-aur-desktop { display: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  .ss-aur-container * { animation: none !important; }
}
`;

const CURTAIN_FADE_MASK =
  "linear-gradient(to top, transparent 0%, rgba(0,0,0,0.6) 12%, rgba(0,0,0,0.95) 38%, #000 55%, rgba(0,0,0,0.7) 82%, transparent 100%)";

const PILLARS_MASK =
  "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.85) 15%, #000 45%, rgba(0,0,0,0.5) 75%, transparent 98%)";

const STARS_TIER_1 = [
  "6% 9%",
  "14% 28%",
  "21% 7%",
  "29% 48%",
  "36% 16%",
  "42% 62%",
  "49% 11%",
  "56% 37%",
  "64% 72%",
  "71% 14%",
  "78% 54%",
  "84% 26%",
  "91% 59%",
  "95% 12%",
  "98% 41%",
  "11% 68%",
  "25% 82%",
  "45% 78%",
  "68% 88%",
  "86% 77%",
  "3% 39%",
  "52% 24%",
  "77% 38%",
  "18% 52%",
  "61% 4%",
]
  .map(
    (p) =>
      `radial-gradient(1.8px 1.8px at ${p}, rgba(240, 246, 255, 0.95) 0%, rgba(186, 220, 255, 0.45) 45%, transparent 100%)`,
  )
  .join(",");

const STARS_TIER_2 = [
  "9% 19%",
  "23% 38%",
  "31% 12%",
  "38% 58%",
  "45% 22%",
  "53% 68%",
  "60% 17%",
  "67% 43%",
  "75% 81%",
  "82% 19%",
  "89% 62%",
  "93% 31%",
  "97% 69%",
  "16% 76%",
  "33% 91%",
  "54% 84%",
  "73% 94%",
  "88% 86%",
  "8% 51%",
  "41% 33%",
  "85% 48%",
]
  .map(
    (p) =>
      `radial-gradient(2.2px 2.2px at ${p}, rgba(216, 235, 255, 0.9) 0%, rgba(165, 243, 252, 0.4) 40%, transparent 100%)`,
  )
  .join(",");

/** Luminous Striated Aurora Curtain with atmospheric vertical fold definition. */
function StriatedCurtain({
  className,
  colorStops,
  opacity,
  animation,
  blur,
  stripeSize,
}: {
  className?: string;
  colorStops: string;
  opacity: number;
  animation: string;
  blur: number;
  stripeSize: number;
}) {
  return (
    <div
      className={"absolute pointer-events-none " + (className ?? "")}
      style={{
        opacity,
        filter: `blur(${blur}px)`,
        animation,
        willChange: "transform",
        transformOrigin: "50% 100%",
        backgroundImage: `repeating-linear-gradient(90deg,
          transparent 0px,
          transparent ${stripeSize * 0.28}px,
          ${colorStops} ${stripeSize * 0.5}px,
          transparent ${stripeSize * 0.72}px,
          transparent ${stripeSize}px)`,
        maskImage: CURTAIN_FADE_MASK,
        WebkitMaskImage: CURTAIN_FADE_MASK,
      }}
    />
  );
}

/** Fluid Luminous Ribbon with radiant core and prismatic chromatic falloff. */
function AuroraRibbon({
  className,
  gradient,
  blur,
  opacity,
  animation,
  blendMode,
}: {
  className?: string;
  gradient: string;
  blur: number;
  opacity: number;
  animation: string;
  blendMode?: React.CSSProperties["mixBlendMode"];
}) {
  return (
    <div
      className={"absolute pointer-events-none rounded-[50%] " + (className ?? "")}
      style={{
        opacity,
        filter: `blur(${blur}px)`,
        animation,
        mixBlendMode: blendMode,
        willChange: "transform, opacity",
        background: gradient,
        maskImage:
          "radial-gradient(65% 100% at 50% 48%, #000 0%, rgba(0,0,0,0.85) 55%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(65% 100% at 50% 48%, #000 0%, rgba(0,0,0,0.85) 55%, transparent 100%)",
      }}
    />
  );
}

/** Ionized Light Pillars (Vertical Solar Ray Streamers). */
function LightPillars({
  className,
  hue,
  opacity,
  animation,
  blur,
  spacing,
}: {
  className?: string;
  hue: string;
  opacity: number;
  animation: string;
  blur: number;
  spacing: number;
}) {
  return (
    <div
      className={"absolute pointer-events-none " + (className ?? "")}
      style={{
        opacity,
        filter: `blur(${blur}px)`,
        animation,
        willChange: "transform, opacity",
        transformOrigin: "50% 0%",
        backgroundImage: `repeating-linear-gradient(90deg,
          transparent 0px,
          transparent ${spacing * 0.38}px,
          rgba(${hue}, 0.35) ${spacing * 0.46}px,
          rgba(${hue}, 0.85) ${spacing * 0.5}px,
          rgba(${hue}, 0.35) ${spacing * 0.54}px,
          transparent ${spacing * 0.62}px,
          transparent ${spacing}px)`,
        maskImage: PILLARS_MASK,
        WebkitMaskImage: PILLARS_MASK,
      }}
    />
  );
}

/** Radiant Coronal Flare Hotspot. */
function CoronaFlare({
  className,
  color,
  blur,
  animation,
}: {
  className?: string;
  color: string;
  blur: number;
  animation: string;
}) {
  return (
    <div
      className={"absolute pointer-events-none rounded-full " + (className ?? "")}
      style={{
        background: `radial-gradient(50% 50% at 50% 50%, ${color} 0%, transparent 72%)`,
        filter: `blur(${blur}px)`,
        animation,
        willChange: "transform, opacity",
      }}
    />
  );
}

export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className={BASE_LAYER_CLASS + " ss-aur-container"}
      style={{ backgroundColor: "var(--bg-base)", contain: "strict" }}
    >
      <style>{AURORA_STYLES}</style>

      {/* 1. Deep Midnight Cosmic Canvas + Horizon Radiance */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 70% at 50% 102%, rgba(45, 62, 170, 0.28) 0%, rgba(20, 30, 95, 0.16) 42%, transparent 75%), linear-gradient(180deg, #040714 0%, #05091a 35%, #060c22 68%, #070b19 100%)",
          opacity: "var(--aurora-sky, 1)",
        }}
      />

      {/* 2. Ethereal Cosmic Nebulae (Deep indigo/purple ambient space dust) */}
      <div
        className="absolute -left-[20%] -top-[10%] h-[75vh] w-[140%]"
        style={{
          background:
            "radial-gradient(50% 60% at 35% 30%, rgba(124, 58, 237, 0.22) 0%, rgba(67, 56, 202, 0.12) 45%, transparent 70%), radial-gradient(45% 55% at 70% 35%, rgba(6, 182, 212, 0.18) 0%, rgba(16, 185, 129, 0.10) 40%, transparent 68%)",
          filter: "blur(64px)",
          animation: "ss-nebula-breathe 18s ease-in-out infinite alternate",
          willChange: "transform, opacity",
        }}
      />

      {/* 3. Twinkling Living Starfield */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: STARS_TIER_1,
          backgroundSize: "100% 100%",
          opacity: "var(--aurora-stars, 0.65)",
          animation: "ss-twinkle-fast 5.5s ease-in-out infinite alternate",
          willChange: "opacity, transform",
        }}
      />
      <div
        className="ss-aur-desktop absolute inset-0"
        style={{
          backgroundImage: STARS_TIER_2,
          backgroundSize: "75% 70%",
          opacity: "var(--aurora-stars-2, 0.4)",
          animation: "ss-twinkle-slow 8s ease-in-out 1.5s infinite alternate",
          willChange: "opacity",
        }}
      />

      {/* 4. Ambient Shooting Star Cosmic Streak */}
      <div
        className="ss-aur-desktop absolute left-[15%] top-[8%] h-[2px] w-[90px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(200,235,255,0.95) 75%, #ffffff 100%)",
          boxShadow: "0 0 10px rgba(124, 211, 252, 0.8)",
          transformOrigin: "left center",
          animation: "ss-shooting-star 20s cubic-bezier(0.25, 1, 0.5, 1) 4s infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* ================= 5. PRIMARY BOREAL CURTAINS ================= */}

      {/* Ambient Aurora Body Back-Glow (Broad color base behind curtains) */}
      <div
        className="absolute -left-[20%] -top-[12%] h-[68vh] w-[140%]"
        style={{
          background:
            "linear-gradient(105deg, transparent 5%, rgba(139, 92, 246, 0.32) 22%, rgba(59, 130, 246, 0.38) 46%, rgba(34, 211, 238, 0.35) 68%, rgba(52, 211, 153, 0.28) 85%, transparent 96%)",
          filter: "blur(60px)",
          animation: "ss-aurora-sway-1 16s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />

      {/* Primary Emerald/Jade Boreal Wave (True Northern-Lights Foundation) */}
      <AuroraRibbon
        className="-left-[18%] top-[2%] h-[32vh] w-[136%]"
        gradient="linear-gradient(95deg, transparent 4%, rgba(5, 150, 105, 0.35) 18%, rgba(16, 230, 160, 0.72) 44%, rgba(6, 214, 210, 0.78) 68%, rgba(56, 189, 248, 0.4) 86%, transparent 98%)"
        blur={18}
        opacity={0.65}
        animation="ss-boreal-green-sway 14s ease-in-out infinite alternate"
        blendMode="screen"
      />

      {/* Striated Violet & Amethyst Curtain Folds (Deep Folds) */}
      <StriatedCurtain
        className="-left-[22%] -top-[6%] h-[52vh] w-[144%]"
        colorStops="rgba(168, 85, 247, 0.95)"
        opacity={0.52}
        blur={11}
        stripeSize={110}
        animation="ss-aurora-sway-1 12s ease-in-out infinite alternate"
      />

      {/* Striated Electric Azure & Cyan Curtain Folds (Mid Folds) */}
      <StriatedCurtain
        className="-left-[16%] top-[0%] h-[46vh] w-[134%]"
        colorStops="rgba(56, 189, 248, 0.92)"
        opacity={0.48}
        blur={8}
        stripeSize={76}
        animation="ss-aurora-sway-2 10s ease-in-out infinite alternate"
      />

      {/* Striated Luminous Cyan Tips (Fine High-Frequency Folds) */}
      <StriatedCurtain
        className="ss-aur-desktop -left-[12%] top-[4%] h-[40vh] w-[126%]"
        colorStops="rgba(103, 232, 249, 0.98)"
        opacity={0.42}
        blur={5}
        stripeSize={46}
        animation="ss-aurora-sway-3 9s ease-in-out 0.8s infinite alternate"
      />

      {/* High-Energy Radiant Core Stream (The Bright Hot River of Light) */}
      <AuroraRibbon
        className="-left-[15%] top-[22%] h-[14vh] w-[130%]"
        gradient="linear-gradient(90deg, transparent 5%, rgba(167, 139, 250, 0.5) 18%, rgba(224, 242, 254, 0.96) 48%, rgba(125, 211, 252, 0.92) 58%, rgba(165, 243, 252, 0.55) 82%, transparent 95%)"
        blur={10}
        opacity={0.68}
        animation="ss-core-stream 11s ease-in-out infinite alternate"
        blendMode="screen"
      />

      {/* Hot Magenta & Violet Corona Highlights */}
      <AuroraRibbon
        className="ss-aur-desktop -left-[10%] top-[18%] h-[7vh] w-[118%]"
        gradient="linear-gradient(90deg, transparent 8%, rgba(244, 114, 182, 0.4) 25%, rgba(232, 121, 249, 0.95) 50%, rgba(192, 132, 252, 0.9) 70%, transparent 94%)"
        blur={6}
        opacity={0.55}
        animation="ss-core-stream 9s ease-in-out 0.5s infinite alternate"
        blendMode="screen"
      />

      {/* Secondary Cyan Ribbon (Lower Complementary Flow) */}
      <AuroraRibbon
        className="-left-[20%] top-[12%] h-[26vh] w-[118%]"
        gradient="linear-gradient(90deg, transparent 6%, rgba(124, 58, 237, 0.75) 24%, rgba(6, 182, 212, 0.82) 55%, rgba(16, 185, 129, 0.6) 80%, transparent 96%)"
        blur={18}
        opacity={0.55}
        animation="ss-aurora-sway-3 20s ease-in-out infinite alternate"
        blendMode="screen"
      />

      {/* ================= 6. IONIZED LIGHT PILLARS / RAYS ================= */}
      <LightPillars
        className="-left-[10%] top-[20%] h-[76vh] w-[122%]"
        hue="130, 210, 255"
        opacity={0.28}
        blur={6}
        spacing={140}
        animation="ss-pillars-drift 18s ease-in-out infinite alternate"
      />

      {/* ================= 7. RADIANT CORONAL FLARE HOTSPOTS ================= */}
      <CoronaFlare
        className="left-[10%] top-[15%] h-[36vh] w-[36vh]"
        color="rgba(34, 211, 238, 0.22)"
        blur={52}
        animation="ss-flare-pulse-1 9s ease-in-out infinite alternate"
      />
      <CoronaFlare
        className="ss-aur-desktop right-[8%] top-[26%] h-[44vh] w-[44vh]"
        color="rgba(192, 132, 252, 0.20)"
        blur={64}
        animation="ss-flare-pulse-2 12s ease-in-out 1.2s infinite alternate"
      />
      <CoronaFlare
        className="left-[42%] top-[10%] h-[30vh] w-[30vh]"
        color="rgba(52, 211, 153, 0.18)"
        blur={48}
        animation="ss-flare-pulse-1 11s ease-in-out 2s infinite alternate"
      />

      {/* ================= 8. CINEMATIC GRAIN & VIGNETTE ================= */}
      {/* Micro-grain eliminates color banding across rich OLED / Retina gradients */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE,
          backgroundRepeat: "repeat",
          opacity: "var(--aurora-noise)",
          mixBlendMode: "overlay",
        }}
      />
      {/* Edge vignette preserving 100% foreground legibility and card contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 100% at 50% 45%, transparent 40%, var(--aurora-vignette) 92%, var(--aurora-vignette) 100%)",
        }}
      />
    </div>
  );
}
