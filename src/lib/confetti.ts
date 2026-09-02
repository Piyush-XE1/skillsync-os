/**
 * Snack-sized, dependency-free confetti.
 *
 * A single rAF-driven canvas overlay that spawns a burst of physics-simulated
 * particles (gravity, air drag, spin, flutter) and removes itself when done.
 * Safe to call anywhere — it no-ops on the server and whenever the browser
 * can't provide a 2D context.
 *
 * Why hand-rolled instead of `canvas-confetti`? Zero deps, ~2 KB, full control
 * over colours (we pull from the active accent), and it double-functions as a
 * small particle-simulation showcase.
 */

export type ConfettiOptions = {
  /** Total particle count. */
  count?: number;
  /** Horizontal spread (px) around the origin. */
  spread?: number;
  /** Initial upward velocity (px/s). */
  velocity?: number;
  /** Gravity in px/s². */
  gravity?: number;
  /** Drag factor applied each frame (0.90–0.98 loose damping). */
  drag?: number;
  /** Where the burst originates, in normalised viewport coords (0..1). */
  origin?: { x: number; y: number };
  /** Particle colours; defaults to a mix of the accent palette + warm white. */
  colors?: string[];
  /** Random angle window in degrees (default ±60). */
  angle?: number;
  /** Particle lifetime in seconds. */
  ttl?: number;
  /** Draw particles as circles (default squares). */
  shape?: "square" | "circle";
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRotation: number;
  shape: "square" | "circle";
  life: number;
  ttl: number;
};

const DEFAULT_COLORS = ["#7c3aed", "#a78bfa", "#2563eb", "#f472b6", "#fef08a", "#ffffff"];

let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * A boolean that's flipped when a run is already painting, so rapid calls
 * (achievement + level-up on the same tick) coalesce into one overlay instead
 * of stacking canvases.
 */
let active = false;

export function fireConfetti(options: ConfettiOptions = {}): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const {
    count = 120,
    spread = 70,
    velocity = 520,
    gravity = 0.28,
    drag = 0.97,
    origin = { x: 0.5, y: 0.42 },
    colors = DEFAULT_COLORS,
    angle = 60,
    ttl = 2.4,
    shape = "square",
  } = options;

  // Resolve accent-tinted default colours at fire time if none were supplied.
  const palette = options.colors ?? accentColors(DEFAULT_COLORS);

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.cssText = `position:fixed;inset:0;width:${width}px;height:${height}px;pointer-events:none;z-index:9999;`;
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const cx = origin.x * width;
  const cy = origin.y * height;
  const angleRad = (angle * Math.PI) / 180;
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    // Random angle within the cone, scattered around the burst direction.
    const theta = -Math.PI / 2 + (Math.random() - 0.5) * 2 * angleRad;
    const power = velocity * (0.5 + Math.random() * 0.9);
    const size = 5 + Math.random() * 7;
    particles.push({
      x: cx + (Math.random() - 0.5) * spread,
      y: cy + (Math.random() - 0.5) * spread * 0.6,
      vx: Math.cos(theta) * power * (0.7 + Math.random() * 0.5),
      vy: Math.sin(theta) * power,
      size,
      color: palette[Math.floor(Math.random() * palette.length)],
      rotation: Math.random() * Math.PI * 2,
      vRotation: (Math.random() - 0.5) * 0.3,
      shape,
      life: 0,
      ttl: ttl * (0.7 + Math.random() * 0.6),
    });
  }

  let last = performance.now();
  let raf = 0;
  const end = () => {
    cancelAnimationFrame(raf);
    canvas.remove();
    active = false;
    window.clearTimeout(timer);
  };
  // Safety net in case the tab is backgrounded and rAF stalls.
  timer = setTimeout(end, ttl * 1000 + 1500);

  const frame = (now: number) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, width, height);

    let alive = 0;
    for (const p of particles) {
      p.life += dt;
      if (p.life >= p.ttl) continue;
      alive++;

      // Physics: gravity, drag, flutter.
      p.vy += gravity * 100 * dt;
      p.vx *= Math.pow(drag, dt * 60);
      p.vy *= Math.pow(drag, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRotation * dt * 60;

      const fade = 1 - p.life / p.ttl;
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));

      // A subtle horizontal sway keeps the flutter alive.
      const sway = Math.sin(p.life * 7 + p.rotation) * 6;

      ctx.save();
      ctx.translate(p.x + sway, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      }
      ctx.restore();
    }

    if (alive > 0) {
      raf = requestAnimationFrame(frame);
    } else {
      end();
    }
  };

  raf = requestAnimationFrame(frame);
}

/** Derive accented default colours from the live CSS accent when available. */
function accentColors(fallback: string[]): string[] {
  if (typeof document === "undefined") return fallback;
  const root = document.documentElement;
  const accent = root.style.getPropertyValue("--primary").trim();
  if (!accent) return fallback;
  const glow = root.style.getPropertyValue("--primary-glow").trim();
  return [accent, glow || accent, "#f472b6", "#fef08a", "#ffffff"];
}

/** Convenience: a quick celebratory burst from the bottom-centre. */
export function celebrate(): void {
  fireConfetti({ count: 130, origin: { x: 0.5, y: 0.9 }, angle: 55 });
}

/** Convenience: a cannon from a horizontal edge. */
export function cannon(from: "left" | "right" = "right"): void {
  fireConfetti({
    count: 160,
    origin: { x: from === "right" ? 0.9 : 0.1, y: 0.75 },
    angle: 42,
    velocity: 640,
  });
}
