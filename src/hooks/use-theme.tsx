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

const THEME_COLOR: Record<ResolvedTheme, string> = {
  dark: "#070b19",
  light: "#fbfaf8",
};

/** Maps a background preference onto the resolved light/dark visual system. */
export function resolveTheme(background: string | undefined): ResolvedTheme {
  return background === "light" ? "light" : "dark";
}

let transitionTimer: number | undefined;

function applyTheme(resolved: ResolvedTheme, animate: boolean) {
  const root = document.documentElement;
  if (root.classList.contains(resolved)) return;

  if (animate) {
    root.classList.add("theme-transition");
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => root.classList.remove("theme-transition"), 320);
  }
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[resolved]);
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
    applyTheme(resolved, true);
    void nativeSetTheme(resolved, THEME_COLOR[resolved]);
  }, [resolved]);

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
