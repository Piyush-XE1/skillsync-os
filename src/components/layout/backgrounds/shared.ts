/** Shared noise texture used by every background variant. */
export const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

export const BASE_LAYER_CLASS = "pointer-events-none fixed inset-0 -z-10 overflow-hidden";

export type BackgroundStyle = "aurora" | "light" | "atelier";

export const BACKGROUND_OPTIONS: {
  id: BackgroundStyle;
  label: string;
  description: string;
  swatch: string;
}[] = [
  {
    id: "aurora",
    label: "Animated Aurora",
    description: "A flowing northern-lights curtain with light glares over a starlit sky.",
    swatch:
      "repeating-linear-gradient(96deg, transparent 0 10px, rgba(167,110,255,0.35) 13px, transparent 17px 26px), repeating-linear-gradient(88deg, transparent 0 7px, rgba(130,240,255,0.28) 9px, transparent 12px 19px), linear-gradient(100deg, transparent 8%, rgba(147,89,255,0.5) 28%, rgba(96,165,250,0.55) 52%, rgba(103,232,249,0.4) 72%, transparent 92%), radial-gradient(90% 100% at 50% 100%, rgba(59,74,180,0.35), transparent 75%), linear-gradient(to bottom, #070c1a, #060a18)",
  },
  {
    id: "light",
    label: "Minimalist Light",
    description:
      "Warm paper surfaces, quiet ink text and a single deep botanical accent — the full light experience.",
    swatch:
      "radial-gradient(70% 70% at 20% 0%, rgba(71,116,88,0.14), transparent 68%), radial-gradient(60% 60% at 90% 100%, rgba(192,178,131,0.16), transparent 70%), #f7f6f2",
  },
  {
    id: "atelier",
    label: "Atelier",
    description:
      "Warm graphite, ivory ink and one restrained brass accent. Calm, editorial, deliberate.",
    swatch:
      "radial-gradient(65% 60% at 50% 0%, rgba(201,163,92,0.16), transparent 70%), radial-gradient(55% 55% at 88% 100%, rgba(110,111,71,0.14), transparent 72%), linear-gradient(180deg, #17140f, #12100c)",
  },
];
