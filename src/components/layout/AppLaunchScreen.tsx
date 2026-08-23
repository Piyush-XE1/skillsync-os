import { useEffect, useRef, useState } from "react";
import { MARK_RIBBON_PATH, MARK_CREST_PATH, MARK_VIEWBOX } from "@/components/brand/SkillSyncLogo";

/**
 * Module-scope guard. A fresh document load (cold app launch, PWA/APK relaunch
 * after termination, hard reload) creates a fresh module instance, so the opening
 * sequence plays. React re-mounts, route changes, tab switches, modals, theme
 * switches and foreground returns reuse this module, so they never replay it.
 */
let launchPlayed = false;

/**
 * Cinematic phase timings (ms).
 * Inception -> Dual Orbit -> Ribbon Sweep -> Sync Lock & Flare -> Specular Sheen -> Wordmark -> Tagline -> Hold -> Iris Dissolve
 */
const P = {
  inception: 0,
  orbit: 400,
  swirl: 1050,
  form: 1650,
  syncFlare: 1950,
  sheen: 2200,
  brand: 2500,
  tagline: 2850,
  hold: 3300,
  exit: 3750,
};

const EXIT_MS = 450;
const REDUCED_TIMELINE = 550;
const REDUCED_EXIT = 220;
const MAX_WAIT = 5000;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function appReady(): Promise<void> {
  const frame = new Promise<void>((res) =>
    requestAnimationFrame(() => requestAnimationFrame(() => res())),
  );
  const fonts =
    typeof document !== "undefined" && "fonts" in document
      ? (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => undefined)
      : Promise.resolve();
  return Promise.all([frame, fonts]).then(() => undefined);
}

/**
 * SkillSync OS — Ultra-Premium Brand Opening Experience.
 *
 * Choreography:
 *  - Quantum singularity spark ignites the dark atmospheric void
 *  - Dual energetic streamers (amethyst violet & electric cyan) orbit in counter-harmony
 *  - Streamers converge and trace the iconic SkillSync S-ribbon geometry
 *  - Harmonic sync lock: Coronal plasma burst + diagonal specular glass sweep
 *  - Kinetic typographic reveal: SKILLSYNC OS + ALIGN • CONNECT • ELEVATE
 *  - Celestial iris dissolve into the live interactive Dashboard
 */
export function AppLaunchScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    if (launchPlayed) return;
    launchPlayed = true;
    reduced.current = prefersReducedMotion();
    setVisible(true);

    const timeline = reduced.current ? REDUCED_TIMELINE : P.exit;
    const started = performance.now();
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      setLeaving(true);
      window.setTimeout(() => setVisible(false), reduced.current ? REDUCED_EXIT : EXIT_MS);
    };

    const minWait = new Promise<void>((res) => window.setTimeout(res, timeline));
    const cap = window.setTimeout(finish, MAX_WAIT);

    void Promise.all([minWait, appReady()]).then(() => {
      const elapsed = performance.now() - started;
      window.setTimeout(finish, Math.max(0, timeline - elapsed));
    });

    return () => window.clearTimeout(cap);
  }, []);

  if (!visible) return null;
  const r = reduced.current;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[95] flex flex-col items-center justify-center overflow-hidden bg-[#040714] px-6 select-none"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        opacity: leaving ? 0 : 1,
        transform: leaving && !r ? "scale(1.035)" : "scale(1)",
        transition: `opacity ${r ? REDUCED_EXIT : EXIT_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1), transform ${EXIT_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
        willChange: "opacity, transform",
      }}
    >
      {/* 1. Deep Atmospheric Nebula Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(130vw,600px)] w-[min(130vw,600px)] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.32) 0%, rgba(6,182,212,0.20) 35%, rgba(16,185,129,0.08) 55%, transparent 72%)",
          filter: "blur(48px)",
          transform: "translate(-50%, -50%)",
          opacity: "var(--launch-glow, 1)",
          animation: r
            ? "ssx-fade-in 260ms ease-out both"
            : `ssx-ambient-bloom 2200ms cubic-bezier(.22,1,.36,1) ${P.inception}ms both`,
          willChange: "opacity, transform",
        }}
      />

      {/* 2. Concentric Energy Shockwave Rings */}
      {!r ? (
        <>
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30"
            style={{
              animation: `ssx-shockwave-1 1200ms cubic-bezier(0.1, 0.8, 0.2, 1) ${P.orbit}ms both`,
            }}
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-500/25"
            style={{
              animation: `ssx-shockwave-2 1500ms cubic-bezier(0.1, 0.8, 0.2, 1) ${P.orbit + 180}ms both`,
            }}
          />
        </>
      ) : null}

      {/* 3. Central S-Mark Logo Arena */}
      <div
        className="relative"
        style={{
          width: "min(42vw, 160px)",
          animation: r
            ? "ssx-fade-in 260ms ease-out both"
            : `ssx-mark-settle 800ms cubic-bezier(0.16, 1, 0.3, 1) ${P.form}ms both`,
          willChange: "opacity, transform",
        }}
      >
        <svg viewBox={MARK_VIEWBOX} className="h-auto w-full overflow-visible" role="presentation">
          <defs>
            {/* Upper Amethyst-Violet Gradient */}
            <linearGradient id="ssx-grad-a" x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="35%" stopColor="#a855f7" />
              <stop offset="70%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Lower Cyan-Azure Gradient */}
            <linearGradient id="ssx-grad-b" x1="0.9" y1="1" x2="0.1" y2="0">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="35%" stopColor="#22d3ee" />
              <stop offset="70%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Specular Ridge Glint */}
            <linearGradient id="ssx-grad-crest" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Multi-tier Glow Filter */}
            <filter id="ssx-luminous-glow" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="3.5" result="blurWide" />
              <feGaussianBlur stdDeviation="1.2" result="blurSharp" />
              <feMerge>
                <feMergeNode in="blurWide" opacity="0.65" />
                <feMergeNode in="blurSharp" opacity="0.85" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Specular Diagonal Sheen Mask */}
            <linearGradient id="ssx-sheen-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <clipPath id="ssx-full-mark-clip">
              <path d={MARK_RIBBON_PATH} />
              <path d={MARK_RIBBON_PATH} transform="rotate(180 60 60)" />
            </clipPath>
          </defs>

          {!r ? (
            <>
              {/* Phase 1: Quantum Inception Flare */}
              <g
                style={{
                  transformOrigin: "60px 60px",
                  animation: `ssx-spark 550ms cubic-bezier(0.1, 0.9, 0.2, 1) ${P.inception}ms both`,
                }}
              >
                <circle cx="60" cy="60" r="3.5" fill="#ffffff" />
                <line
                  x1="60"
                  y1="46"
                  x2="60"
                  y2="74"
                  stroke="#e0f2fe"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <line
                  x1="46"
                  y1="60"
                  x2="74"
                  y2="60"
                  stroke="#e0f2fe"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </g>

              {/* Phase 2: Dual Orbital Energy Arcs */}
              {/* Upper Violet Orbital Stream */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="url(#ssx-grad-a)"
                strokeWidth="2.2"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                style={{
                  transformOrigin: "60px 60px",
                  animation: `ssx-orbit-a 950ms cubic-bezier(0.35, 0, 0.25, 1) ${P.orbit}ms both`,
                }}
              />
              {/* Lower Cyan Orbital Stream */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="url(#ssx-grad-b)"
                strokeWidth="2.2"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                style={{
                  transformOrigin: "60px 60px",
                  animation: `ssx-orbit-b 950ms cubic-bezier(0.35, 0, 0.25, 1) ${P.orbit + 80}ms both`,
                }}
              />
            </>
          ) : null}

          {/* Phase 3 & 4: Dual Ribbon Construction + Solidification */}
          <g filter="url(#ssx-luminous-glow)">
            {/* Half A (Upper Violet Ribbon) */}
            <g>
              {!r ? (
                <path
                  d={MARK_RIBBON_PATH}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100"
                  style={{
                    animation: `ssx-stroke-draw 680ms cubic-bezier(0.3, 0, 0.2, 1) ${P.swirl}ms both`,
                  }}
                />
              ) : null}
              <path
                d={MARK_RIBBON_PATH}
                fill="url(#ssx-grad-a)"
                style={{
                  animation: r
                    ? "ssx-fade-in 260ms ease-out both"
                    : `ssx-body-fill 500ms ease-out ${P.form}ms both`,
                }}
              />
              <path
                d={MARK_CREST_PATH}
                fill="none"
                stroke="url(#ssx-grad-crest)"
                strokeWidth="1.2"
                strokeLinecap="round"
                style={{
                  animation: r
                    ? "ssx-fade-in 260ms ease-out both"
                    : `ssx-body-fill 500ms ease-out ${P.form + 80}ms both`,
                }}
              />
            </g>

            {/* Half B (Lower Cyan Ribbon, Rotated 180) */}
            <g transform="rotate(180 60 60)">
              {!r ? (
                <path
                  d={MARK_RIBBON_PATH}
                  fill="none"
                  stroke="#67e8f9"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100"
                  style={{
                    animation: `ssx-stroke-draw 680ms cubic-bezier(0.3, 0, 0.2, 1) ${P.swirl + 80}ms both`,
                  }}
                />
              ) : null}
              <path
                d={MARK_RIBBON_PATH}
                fill="url(#ssx-grad-b)"
                style={{
                  animation: r
                    ? "ssx-fade-in 260ms ease-out both"
                    : `ssx-body-fill 500ms ease-out ${P.form + 80}ms both`,
                }}
              />
              <path
                d={MARK_CREST_PATH}
                fill="none"
                stroke="url(#ssx-grad-crest)"
                strokeWidth="1.2"
                strokeLinecap="round"
                style={{
                  animation: r
                    ? "ssx-fade-in 260ms ease-out both"
                    : `ssx-body-fill 500ms ease-out ${P.form + 160}ms both`,
                }}
              />
            </g>
          </g>

          {/* Phase 4.2: Specular Light Glare Sweep across the glossy ribbon */}
          {!r ? (
            <g clipPath="url(#ssx-full-mark-clip)">
              <rect
                x="-80"
                y="-40"
                width="80"
                height="200"
                fill="url(#ssx-sheen-grad)"
                transform="rotate(25 60 60)"
                style={{
                  animation: `ssx-sheen-sweep 850ms cubic-bezier(0.2, 0.8, 0.2, 1) ${P.sheen}ms both`,
                }}
              />
            </g>
          ) : null}

          {/* Phase 4.3: Sync Lock Coronal Burst at Center */}
          {!r ? (
            <circle
              cx="60"
              cy="60"
              r="24"
              fill="url(#ssx-grad-a)"
              opacity="0"
              filter="url(#ssx-luminous-glow)"
              style={{
                transformOrigin: "60px 60px",
                animation: `ssx-sync-burst 650ms cubic-bezier(0.1, 0.9, 0.2, 1) ${P.syncFlare}ms both`,
              }}
            />
          ) : null}
        </svg>
      </div>

      {/* 4. Brand Name Reveal */}
      <div
        className="relative mt-8 text-center text-[clamp(20px,5.8vw,28px)] font-bold uppercase leading-none text-white tracking-[0.18em]"
        style={{
          fontFamily: "'Inter', sans-serif",
          animation: r
            ? "ssx-fade-in 260ms ease-out 60ms both"
            : `ssx-brand-unveil 650ms cubic-bezier(0.16, 1, 0.3, 1) ${P.brand}ms both`,
        }}
      >
        <span className="bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
          SkillSync
        </span>{" "}
        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text font-black text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]">
          OS
        </span>
      </div>

      {/* 5. Subtitle Tagline Reveal */}
      <div
        className="relative mt-3.5 flex items-center justify-center gap-2 text-center text-[clamp(9.5px,2.7vw,11.5px)] font-semibold uppercase tracking-[0.36em] text-white/50"
        style={{
          animation: r
            ? "ssx-fade-in 260ms ease-out 110ms both"
            : `ssx-tagline-unveil 600ms cubic-bezier(0.16, 1, 0.3, 1) ${P.tagline}ms both`,
        }}
      >
        <span>Align</span>
        <span className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_6px_#a855f7]" />
        <span>Connect</span>
        <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
        <span>Elevate</span>
      </div>

      {/* Keyframe Styles */}
      <style>{`
        @keyframes ssx-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ssx-ambient-bloom {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          40%  { opacity: 0.9; transform: translate(-50%, -50%) scale(0.85); }
          100% { opacity: 0.75; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes ssx-spark {
          0%   { opacity: 0; transform: scale(0.2); }
          40%  { opacity: 1; transform: scale(1.4); }
          100% { opacity: 0; transform: scale(0.6); }
        }
        @keyframes ssx-shockwave-1 {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          30%  { opacity: 0.8; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
        }
        @keyframes ssx-shockwave-2 {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          30%  { opacity: 0.6; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.7); }
        }
        @keyframes ssx-orbit-a {
          0%   { opacity: 0; stroke-dashoffset: 100; transform: rotate(-120deg) scale(0.7); }
          30%  { opacity: 1; }
          75%  { stroke-dashoffset: 0; transform: rotate(110deg) scale(1); }
          100% { opacity: 0; stroke-dashoffset: 0; transform: rotate(190deg) scale(1.04); }
        }
        @keyframes ssx-orbit-b {
          0%   { opacity: 0; stroke-dashoffset: 100; transform: rotate(60deg) scale(0.7); }
          30%  { opacity: 1; }
          75%  { stroke-dashoffset: 0; transform: rotate(290deg) scale(1); }
          100% { opacity: 0; stroke-dashoffset: 0; transform: rotate(370deg) scale(1.04); }
        }
        @keyframes ssx-stroke-draw {
          0%   { opacity: 0; stroke-dashoffset: 100; }
          25%  { opacity: 1; }
          85%  { opacity: 1; stroke-dashoffset: 0; }
          100% { opacity: 0; stroke-dashoffset: 0; }
        }
        @keyframes ssx-body-fill {
          0%   { opacity: 0; filter: brightness(1.6) blur(2px); }
          60%  { opacity: 0.9; filter: brightness(1.2) blur(0px); }
          100% { opacity: 1; filter: brightness(1) blur(0px); }
        }
        @keyframes ssx-mark-settle {
          0%   { transform: scale(0.9); opacity: 0.7; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ssx-sync-burst {
          0%   { opacity: 0; transform: scale(0.2); }
          35%  { opacity: 0.75; transform: scale(1.3); }
          100% { opacity: 0; transform: scale(1.8); }
        }
        @keyframes ssx-sheen-sweep {
          0%   { transform: translate3d(-100px, 0, 0) rotate(25deg); opacity: 0; }
          30%  { opacity: 0.9; }
          100% { transform: translate3d(240px, 0, 0) rotate(25deg); opacity: 0; }
        }
        @keyframes ssx-brand-unveil {
          0%   { opacity: 0; transform: translateY(12px); filter: blur(4px); letter-spacing: 0.28em; }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); letter-spacing: 0.18em; }
        }
        @keyframes ssx-tagline-unveil {
          0%   { opacity: 0; transform: translateY(8px); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>
    </div>
  );
}

export default AppLaunchScreen;
