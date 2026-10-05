import type { GraphicsQuality } from "@/lib/schema";

/** Whether expensive ambient surfaces and continuous background effects should be disabled. */
export function shouldUseBatterySaver(
  quality: GraphicsQuality,
  hardwareConcurrency: number | undefined,
  prefersReducedMotion: boolean,
): boolean {
  // Reduced motion is an accessibility preference, so it always wins.
  if (prefersReducedMotion) return true;
  if (quality === "battery-saver") return true;
  if (quality === "high-fidelity") return false;
  return typeof hardwareConcurrency === "number" && hardwareConcurrency <= 4;
}
