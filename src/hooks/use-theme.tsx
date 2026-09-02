import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { nativeSetTheme } from "@/lib/native/bridge";
import { applyAccent, defaultAccentFor, safeAccent } from "@/lib/accent";

/**
 * SkillSync owns its appearance. The Android/OS colour scheme is intentionally
 * NOT consulted, and there is no separate theme setting: the persisted
 * Background preference is the single source of truth. "light" (Minimalist
 * Light) is the only light appearance; every other background is dark.
 */
export type ThemeMode = "light" | "dark";
export type ResolvedTheme = ThemeMode;

/**
 * The appearance applied to <html> for each Background preference. Classes are
 * mutually exclusive — exactly one is present at a time — and each carries its
 * full design-token set in styles.css (never layered on top of another theme).
 * Unknown or retired values fall back to the flagship "aurora" appearance.
 */
const APPEARANCE: Record<string, { cls: string; scheme: ResolvedTheme; themeColor: string }> = {
  aurora: { cls: "dark", scheme: "dark", themeColor: "#070b19" },
  light: { cls: "light", scheme: "light", themeColor: "#f7f6f2" },
  atelier: { cls: "atelier", scheme: "dark", themeColor: "#12100c" },
};
const FALLBACK_APPEARANCE = APPEARANCE.aurora;
const MANAGED_CLASSES = Object.values(APPEARANCE).map((a) => a.cls);
const VALID_BACKGROUNDS = Object.keys(APPEARANCE);
const APPEARANCE_KEY = "skillsync:data:v1";

/**
 * Blocking, dependency-free pre-paint script rendered into <head> by the root
 * shell. Without it, the persisted background is only applied by ThemeManager's
 * first effect — AFTER the first paint — so anyone on a non-default background
 * (e.g. Minimalist Light) saw a dark flash on every cold start, and the launch
 * screen visibly flipped colours mid-animation. This reads the zustand persist
 * value the same way the store does and sets the class + colour scheme + status
 * bar colour synchronously, before any frame is produced.
 */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{var raw=window.localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)});var bg="aurora";var accent=null;if(raw){var st=JSON.parse(raw);var prefs=st&&st.state?st.state.preferences:null;var val=prefs?prefs.background:null;if(${JSON.stringify(VALID_BACKGROUNDS)}.indexOf(val)>=0)bg=val;if(prefs&&typeof prefs.accent==="string"&&/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(prefs.accent))accent=prefs.accent;}var map=${JSON.stringify(APPEARANCE)};var a=map[bg]||map.aurora;var el=document.documentElement;el.classList.remove(${MANAGED_CLASSES.map((c) => JSON.stringify(c)).join(",")});el.classList.add(a.cls);el.style.colorScheme=a.scheme;if(accent){el.style.setProperty("--primary",accent);el.style.setProperty("--primary-glow","color-mix(in oklab, "+accent+" 62%, white)");el.style.setProperty("--secondary","color-mix(in oklab, "+accent+" 58%, #0b0b12)");}var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",a.themeColor);}catch(e){}})();`;

/** Maps a background preference onto the resolved light/dark visual system. */
export function resolveTheme(background: string | undefined): ResolvedTheme {
  return background === "light" ? "light" : "dark";
}

function appearanceFor(background: string | undefined) {
  return (background && APPEARANCE[background]) || FALLBACK_APPEARANCE;
}

let transitionTimer: number | undefined;

function applyTheme(background: string | undefined, animate: boolean) {
  const root = document.documentElement;
  const next = appearanceFor(background);

  // Class sets are exclusive; two backgrounds may share the same light/dark
  // mode (aurora and atelier are both dark), so compare the actual appearance
  // class — not just the resolved mode — or a same-mode switch would no-op.
  const current = MANAGED_CLASSES.find((c) => root.classList.contains(c));
  if (current === next.cls) return;

  if (animate) {
    root.classList.add("theme-transition");
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => root.classList.remove("theme-transition"), 320);
  }
  root.classList.remove(...MANAGED_CLASSES);
  root.classList.add(next.cls);
  root.style.colorScheme = next.scheme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next.themeColor);
}

/**
 * Applies the appearance derived from the Background preference to <html> and
 * mirrors it onto the Android system bars. No system-preference listener: the
 * OS never flips the app's appearance.
 */
function applyAccentSafe(accent: string | undefined) {
  applyAccent(safeAccent(accent ?? defaultAccentFor("aurora")));
}

export function useTheme(): ResolvedTheme {
  const background = useAppStore((s) => s.preferences.background);
  const accent = useAppStore((s) => s.preferences.accent);
  const resolved = resolveTheme(background);

  useEffect(() => {
    const next = appearanceFor(background);
    applyTheme(background, true);
    void nativeSetTheme(next.scheme, next.themeColor);
  }, [background]);

  // Accent re-themes the entire OS; re-run whenever it (or the background it
  // defaults from) changes. applyAccentSafe guards against empty values.
  useEffect(() => {
    applyAccentSafe(accent);
  }, [accent, background]);

  return resolved;
}

/** Read-only resolved theme for components that need to branch visually. */
export function useResolvedTheme(): ResolvedTheme {
  return resolveTheme(useAppStore((s) => s.preferences.background));
}

export function ThemeManager() {
  useTheme();
  return null;
}
