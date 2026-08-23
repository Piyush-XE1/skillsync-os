import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { nativeSetTheme } from "@/lib/native/bridge";

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
export function useTheme(): ResolvedTheme {
  const background = useAppStore((s) => s.preferences.background);
  const resolved = resolveTheme(background);

  useEffect(() => {
    const next = appearanceFor(background);
    applyTheme(background, true);
    void nativeSetTheme(next.scheme, next.themeColor);
  }, [background]);

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
