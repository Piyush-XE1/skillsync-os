import { useEffect, useRef, useState } from "react";
import { MARK_RIBBON_PATH, MARK_VIEWBOX } from "@/components/brand/SkillSyncLogo";

/**
 * Module-scope guard. A fresh document load (cold app launch, PWA/APK relaunch
 * after termination, reload) creates a fresh module instance, so the opening
 * sequence plays. React re-mounts, route changes, tab switches, modals, theme
 * switches and foreground returns reuse this module, so they never replay it.
 */
let launchPlayed = false;

/**
 * Phase timings (ms). Origin -> pulse -> orbit -> swirl -> logo form ->
 * bloom -> brand -> tagline -> hold -> exit. ~4.1s ceiling.
 */
const P = {
  origin: 0,
  pulse: 250,
  orbit: 550,
  swirl: 1150,
  form: 1700,
  bloom: 2100,
  brand: 2400,
  tagline: 2800,
  hold: 3200,
  exit: 3700,
};
const EXIT_MS = 400;
/** Reduced-motion timeline: fade in, brief hold, fade out. */
const REDUCED_TIMELINE = 550;
const REDUCED_EXIT = 220;
/** Hard ceiling so a failed init can never trap the user on the splash. */
const MAX_WAIT = 5000;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolves once the app shell is painted and fonts are settled. */
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
 * SkillSync OS opening experience.
 *
 * A short branded sequence: an energy origin gathers, orbits, swirls into the
 * two ribbon halves of the S mark, blooms, then the brand name and tagline
 * reveal separately before the whole layer dissolves into the live Dashboard
 * rendered underneath.
 *
 * Performance: CSS keyframes on a fixed handful of nodes, animating only
 * opacity / transform / SVG stroke-dash. No canvas, no particles, no rAF loop,
 * no per-frame React state. The layer unmounts when the sequence ends.
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
      className="pointer-events-none fixed inset-0 z-[95] flex flex-col items-center justify-center overflow-hidden bg-background px-6"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        opacity: leaving ? 0 : 1,
        transform: leaving && !r ? "scale(1.02)" : "scale(1)",
        transition: `opacity ${r ? REDUCED_EXIT : EXIT_MS}ms ease-out, transform ${EXIT_MS}ms ease-out`,
        willChange: "opacity, transform",
      }}
    >
      {/* Ambient bloom behind the mark — one blurred radial layer, no shadows. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(120vw,560px)] w-[min(120vw,560px)] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124,92,245,0.28) 0%, rgba(34,211,238,0.12) 40%, transparent 70%)",
          filter: "blur(40px)",
          transform: "translate(-50%, -50%)",
          opacity: "var(--launch-glow, 1)",

          animation: r
            ? "ssx-in 260ms ease-out both"
            : `ssx-bloom 1600ms cubic-bezier(.22,1,.36,1) ${P.pulse}ms both`,
          willChange: "opacity, transform",
        }}
      />

      {/* Mark construction stage */}
      <div
        className="relative"
        style={{
          width: "min(40vw, 156px)",
          animation: r
            ? "ssx-in 260ms ease-out both"
            : `ssx-settle 620ms cubic-bezier(.2,.9,.25,1) ${P.form}ms both`,
          willChange: "opacity, transform",
        }}
      >
        <svg viewBox={MARK_VIEWBOX} className="h-auto w-full" role="presentation">
          <defs>
            <linearGradient id="ssx-a" x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="55%" stopColor="#7c5cf5" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="ssx-b" x1="0.85" y1="1" x2="0.15" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#25b3f0" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="ssx-glow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="2.4" result="bl" />
              <feMerge>
                <feMergeNode in="bl" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {!r ? (
            <>
              {/* Phase 1 — origin point */}
              <circle
                cx="60"
                cy="60"
                r="3"
                fill="#c4b5fd"
                style={{
                  animation: `ssx-origin 420ms ease-out ${P.origin}ms both`,
                }}
              />
              {/* Phase 2 — energy pulse */}
              <circle
                cx="60"
                cy="60"
                r="14"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="1.6"
                style={{
                  transformOrigin: "60px 60px",
                  animation: `ssx-pulse 620ms cubic-bezier(.22,1,.36,1) ${P.pulse}ms both`,
                }}
              />
              {/* Phase 3 — orbit forming */}
              <circle
                cx="60"
                cy="60"
                r="42"
                fill="none"
                stroke="url(#ssx-a)"
                strokeWidth="2"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                style={{
                  transformOrigin: "60px 60px",
                  animation: `ssx-orbit 900ms cubic-bezier(.35,0,.3,1) ${P.orbit}ms both`,
                }}
              />
            </>
          ) : null}

          {/* Phase 4/5 — the two ribbon halves draw, then fill into the mark */}
          <g filter="url(#ssx-glow)">
            {[
              { fill: "url(#ssx-a)", stroke: "#a855f7", rot: false },
              { fill: "url(#ssx-b)", stroke: "#22d3ee", rot: true },
            ].map((half, i) => (
              <g key={i} transform={half.rot ? "rotate(180 60 60)" : undefined}>
                {!r ? (
                  <path
                    d={MARK_RIBBON_PATH}
                    fill="none"
                    stroke={half.stroke}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    style={{
                      animation: `ssx-draw 620ms cubic-bezier(.3,0,.3,1) ${P.swirl + i * 70}ms both`,
                    }}
                  />
                ) : null}
                <path
                  d={MARK_RIBBON_PATH}
                  fill={half.fill}
                  style={{
                    animation: r
                      ? "ssx-in 260ms ease-out both"
                      : `ssx-fill 420ms ease-out ${P.form + i * 70}ms both`,
                  }}
                />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Phase 7 — brand name (separate text element) */}
      <div
        className="relative mt-7 text-center text-[clamp(18px,5.6vw,26px)] font-semibold uppercase leading-none tracking-[0.16em] text-foreground"
        style={{
          animation: r
            ? "ssx-in 260ms ease-out 60ms both"
            : `ssx-rise 520ms ease-out ${P.brand}ms both`,
        }}
      >
        SkillSync <span className="gradient-text">OS</span>
      </div>

      {/* Phase 8 — tagline (separate text element, subordinate) */}
      <div
        className="relative mt-3 text-center text-[clamp(9px,2.6vw,11px)] font-medium uppercase tracking-[0.34em] text-muted-foreground"
        style={{
          animation: r
            ? "ssx-in 260ms ease-out 110ms both"
            : `ssx-rise 480ms ease-out ${P.tagline}ms both`,
        }}
      >
        Align <span className="text-primary">•</span> Connect{" "}
        <span className="text-primary">•</span> Elevate
      </div>

      <style>{`
        @keyframes ssx-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ssx-origin {
          0% { opacity: 0; r: 1 }
          35% { opacity: 1 }
          100% { opacity: 0 }
        }
        @keyframes ssx-pulse {
          0% { opacity: 0; transform: scale(.2) }
          30% { opacity: .9 }
          100% { opacity: 0; transform: scale(1.5) }
        }
        @keyframes ssx-orbit {
          0% { opacity: 0; stroke-dashoffset: 100; transform: rotate(-90deg) scale(.7) }
          35% { opacity: 1 }
          70% { stroke-dashoffset: 0; transform: rotate(120deg) scale(1) }
          100% { opacity: 0; stroke-dashoffset: 0; transform: rotate(200deg) scale(1.02) }
        }
        @keyframes ssx-draw {
          0% { opacity: 0; stroke-dashoffset: 100 }
          25% { opacity: 1 }
          85% { opacity: 1; stroke-dashoffset: 0 }
          100% { opacity: 0; stroke-dashoffset: 0 }
        }
        @keyframes ssx-fill {
          0% { opacity: 0 }
          100% { opacity: 1 }
        }
        @keyframes ssx-settle {
          0% { transform: scale(.9); filter: blur(4px) }
          65% { transform: scale(1.025); filter: blur(0) }
          100% { transform: scale(1); filter: blur(0) }
        }
        @keyframes ssx-bloom {
          0% { opacity: 0; transform: translate(-50%,-50%) scale(.5) }
          45% { opacity: 1; transform: translate(-50%,-50%) scale(.9) }
          100% { opacity: .8; transform: translate(-50%,-50%) scale(1) }
        }
        @keyframes ssx-rise {
          0% { opacity: 0; transform: translateY(8px) }
          100% { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  );
}

export default AppLaunchScreen;
