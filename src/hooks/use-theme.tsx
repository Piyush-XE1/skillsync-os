import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { nativeSetTheme } from "@/lib/native/bridge";
import { shouldUseBatterySaver } from "@/lib/graphics-quality";

/** Monograph Noir is the only application appearance. */
export type ThemeMode = "dark";
export type ResolvedTheme = ThemeMode;

const APPEARANCE_KEY = "skillsync:data:v1";
const THEME_COLOR = "#08080A";

/**
 * Runs before first paint. It applies the fixed palette synchronously and reads
 * only the rendering-quality preference, preventing both a theme flash and an
 * unnecessary localStorage parse after React mounts.
 */
export const APPEARANCE_INIT_SCRIPT = `(function(){try{
  var quality="automatic",raw=window.localStorage.getItem(${JSON.stringify(APPEARANCE_KEY)});
  if(raw){var st=JSON.parse(raw),p=st&&st.state?st.state.preferences:null;if(p&&["automatic","high-fidelity","battery-saver"].indexOf(p.graphicsQuality)>=0)quality=p.graphicsQuality;}
  var el=document.documentElement;
  el.classList.remove("light","atelier","theme-transition");
  el.classList.add("dark","monograph");
  el.style.colorScheme="dark";
  el.style.removeProperty("--primary");el.style.removeProperty("--primary-glow");el.style.removeProperty("--secondary");
  el.dataset.graphicsQuality=quality;
  var low=typeof navigator.hardwareConcurrency==="number"&&navigator.hardwareConcurrency<=4;
  var reduced=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var saver=quality==="battery-saver"||reduced||(quality==="automatic"&&low);
  el.classList.toggle("battery-saver",saver);
  var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(THEME_COLOR)});
}catch(e){}})();`;

/** Historical argument is deliberately ignored: the visual system is fixed. */
export function resolveTheme(_legacyBackground?: string): ResolvedTheme {
  return "dark";
}

export function useTheme(): ResolvedTheme {
  const graphicsQuality = useAppStore((state) => state.preferences.graphicsQuality);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "atelier", "theme-transition");
    root.classList.add("dark", "monograph");
    root.style.colorScheme = "dark";
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-glow");
    root.style.removeProperty("--secondary");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLOR);
    void nativeSetTheme("dark", THEME_COLOR);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyGraphicsMode = () => {
      const saver = shouldUseBatterySaver(
        graphicsQuality,
        typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined,
        reducedMotion.matches,
      );
      root.classList.toggle("battery-saver", saver);
      root.dataset.graphicsQuality = graphicsQuality;
    };
    applyGraphicsMode();
    reducedMotion.addEventListener("change", applyGraphicsMode);
    return () => reducedMotion.removeEventListener("change", applyGraphicsMode);
  }, [graphicsQuality]);

  return "dark";
}

export function useResolvedTheme(): ResolvedTheme {
  return "dark";
}

export function ThemeManager() {
  useTheme();
  return null;
}
