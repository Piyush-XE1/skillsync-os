import { useAppStore } from "@/store/useAppStore";

import { AuroraBackground } from "./AuroraBackground";
import { LightAtmosphereBackground } from "./LightAtmosphereBackground";
import { AtelierBackground } from "./AtelierBackground";
import type { BackgroundStyle } from "./shared";

export { BACKGROUND_OPTIONS } from "./shared";
export type { BackgroundStyle } from "./shared";
export { AuroraBackground, LightAtmosphereBackground, AtelierBackground };

export function BackgroundByStyle({ style }: { style: BackgroundStyle }) {
  if (style === "light") return <LightAtmosphereBackground />;
  if (style === "atelier") return <AtelierBackground />;
  // "aurora" is the flagship default and the safe fallback for any value that
  // somehow reaches the renderer unknown (pre-migration state, hand-edited
  // backups): the app never renders unstyled.
  return <AuroraBackground />;
}

/**
 * Renders the background chosen in Profile → Preferences → Background — the
 * single source of truth for the app's appearance. "Minimalist Light" swaps in
 * the restrained light atmosphere instead of the dark aurora curtain.
 */
export function AppBackground() {
  const style = useAppStore((s) => s.preferences.background) ?? "aurora";
  return <BackgroundByStyle style={style} />;
}
