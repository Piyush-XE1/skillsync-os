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
    description:
      "Flowing boreal ribbons, starlit skies & ethereal emerald-violet atmospheric waves.",
    swatch:
      "radial-gradient(ellipse 90% 70% at 30% 20%, rgba(16,230,160,0.45) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 75% 35%, rgba(168,85,247,0.55) 0%, transparent 65%), linear-gradient(110deg, transparent 10%, rgba(6,214,210,0.5) 35%, rgba(59,130,246,0.6) 60%, rgba(147,51,234,0.5) 85%, transparent 100%), radial-gradient(100% 90% at 50% 100%, rgba(45,62,170,0.4), transparent 75%), linear-gradient(to bottom, #040714, #060c22)",
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
