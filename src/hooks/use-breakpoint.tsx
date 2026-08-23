import { useEffect, useState } from "react";

/** Tailwind-aligned breakpoints (px). */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

function useMediaQuery(query: string) {
  // Lazy init with the real value: starting from `false` made the first
  // painted frame render the wrong breakpoint branch on desktop viewports.
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** True from the `lg` breakpoint up — sidebar / desktop behaviour. */
export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}
