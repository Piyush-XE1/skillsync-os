/**
 * Accent theme engine.
 *
 * The whole SkillSync visual system is driven by a small set of CSS custom
 * properties (`--primary`, `--primary-glow`, `--secondary`). By overriding
 * those three on `<html>` we can re-skin the entire app instantly — every card,
 * gradient, chip, progress bar and glow follows along. This module centralises
 * the accent presets and the tiny colour-math helpers that derive a cohesive
 * palette from a single hue.
 */

export type AccentPreset = {
  id: string;
  label: string;
  /** The base accent hex (or any CSS colour). */
  color: string;
  /** Short swatch used in the Theme Studio picker. */
  swatch: string;
};

/** Curated accent presets, tuned to read well on the dark Aurora surfaces. */
export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "violet",
    label: "Violet",
    color: "#7c3aed",
    swatch: "linear-gradient(135deg,#7c3aed,#2563eb)",
  },
  {
    id: "cobalt",
    label: "Cobalt",
    color: "#2563eb",
    swatch: "linear-gradient(135deg,#2563eb,#06b6d4)",
  },
  {
    id: "emerald",
    label: "Emerald",
    color: "#059669",
    swatch: "linear-gradient(135deg,#059669,#22d3ee)",
  },
  {
    id: "rose",
    label: "Rose",
    color: "#e11d48",
    swatch: "linear-gradient(135deg,#e11d48,#f97316)",
  },
  {
    id: "amber",
    label: "Amber",
    color: "#d97706",
    swatch: "linear-gradient(135deg,#d97706,#f59e0b)",
  },
  {
    id: "cyan",
    label: "Cyan",
    color: "#0891b2",
    swatch: "linear-gradient(135deg,#0891b2,#3b82f6)",
  },
  {
    id: "fuchsia",
    label: "Fuchsia",
    color: "#c026d3",
    swatch: "linear-gradient(135deg,#c026d3,#7c3aed)",
  },
  {
    id: "lime",
    label: "Lime",
    color: "#4d7c0f",
    swatch: "linear-gradient(135deg,#4d7c0f,#84cc16)",
  },
  {
    id: "slate",
    label: "Slate",
    color: "#475569",
    swatch: "linear-gradient(135deg,#334155,#0f172a)",
  },
];

/** The default accent for each background, so a fresh theme always looks authored. */
export const ACCENT_DEFAULTS: Record<string, string> = {
  aurora: "#7c3aed",
  light: "#20573f",
  atelier: "#c9a35c",
};

/** Default accent (used for new workspaces and the Aurora flagship appearance). */
export const DEFAULT_ACCENT = ACCENT_DEFAULTS.aurora;

/** Resolve the default accent for a Background preference. */
export function defaultAccentFor(background?: string): string {
  return ACCENT_DEFAULTS[background ?? "aurora"] ?? DEFAULT_ACCENT;
}

/* ------------------------------------------------------------------ *
 * Small hex → HSL colour math. A student-sized colour utility: no deps,
 * just enough to derive a pleasing companion hue for any accent.
 * ------------------------------------------------------------------ */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length === 8) h = h.slice(0, 6);
  const num = parseInt(h, 16);
  if (Number.isNaN(num)) return [124, 58, 237]; // violet fallback
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

/** Shift a hex colour's hue by `deg` (and optionally adjust saturation/lightness). */
function shiftHue(hex: string, deg: number, ds = 0, dl = 0): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const nh = (h + deg + 360) % 360;
  const ns = clamp(s + ds, 0, 100);
  const nl = clamp(l + dl, 0, 100);
  const [nr, ng, nb] = hslToRgb(nh, ns, nl);
  return rgbToHex(nr, ng, nb);
}

/**
 * Take a base accent hex and produce a cohesive three-variable palette.
 * - primary: the accent itself
 * - glow:    a lightened copy (color-mix with white)
 * - secondary: a hue-shifted companion that makes the signature gradient sing
 */
export function accentPalette(accent: string): {
  primary: string;
  glow: string;
  secondary: string;
} {
  return {
    primary: accent,
    glow: `color-mix(in oklab, ${accent} 62%, white)`,
    secondary: shiftHue(accent, 24, -6, 6),
  };
}

/** Apply the accent palette as inline CSS variables on the document root. */
export function applyAccent(accent: string): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = accentPalette(accent || DEFAULT_ACCENT);
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-glow", palette.glow);
  root.style.setProperty("--secondary", palette.secondary);
}

/** Escape user-supplied colour strings that could inject CSS. */
export function safeAccent(input: string): string {
  const cleaned = input.trim();
  // Only allow hex colours (#rgb, #rrggbb, #rrggbbaa) — the picker emits these.
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(cleaned)) return cleaned;
  return DEFAULT_ACCENT;
}
