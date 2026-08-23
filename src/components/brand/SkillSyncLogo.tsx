import { useId } from "react";

/**
 * SkillSync OS brand mark — the S-shaped ribbon symbol.
 *
 * Canonical logo asset for the whole app: symbol only (no wordmark, no
 * tagline, transparent background). Pure inline SVG so it stays crisp at any
 * size, needs no network request, and works in light + dark themes.
 *
 * The mark is built from ONE crescent ribbon path that is rotationally
 * symmetric about the centre: the second half is the same path rotated 180deg.
 */
export const MARK_VIEWBOX = "0 0 120 120";

/** Upper ribbon half. Rotate 180deg about (60,60) for the lower half. */
export const MARK_RIBBON_PATH =
  "M100 14 C64 6 32 20 27 45 C23 65 39 77 61 74 L61 66 C45 63 38 54 42 43 C48 27 72 19 100 14 Z";

/** Specular highlight ridge on the outer crest of the ribbon */
export const MARK_CREST_PATH = "M96 16 C63 8 34 21 29 44 C26 58 36 68 53 69";

export function SkillSyncLogo({
  size = 128,
  className,
  glow = true,
}: {
  size?: number;
  className?: string;
  /** Soft luminous treatment. Disable for tiny sizes / flat contexts. */
  glow?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gA = `ssg-a-${uid}`;
  const gB = `ssg-b-${uid}`;
  const gH = `ssg-h-${uid}`;
  const fx = `ssg-f-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      role="img"
      aria-label="SkillSync OS"
      className={className}
    >
      <defs>
        {/* Upper Amethyst-Violet Ribbon Gradient */}
        <linearGradient id={gA} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="35%" stopColor="#a855f7" />
          <stop offset="70%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Lower Cyan-Azure Ribbon Gradient */}
        <linearGradient id={gB} x1="0.9" y1="1" x2="0.1" y2="0">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="35%" stopColor="#22d3ee" />
          <stop offset="70%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Specular Glint Gradient */}
        <linearGradient id={gH} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {glow ? (
          <filter id={fx} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="blur1" />
            <feGaussianBlur stdDeviation="1.2" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" opacity="0.6" />
              <feMergeNode in="blur2" opacity="0.8" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
      </defs>

      <g filter={glow ? `url(#${fx})` : undefined}>
        {/* Upper Ribbon */}
        <g>
          <path d={MARK_RIBBON_PATH} fill={`url(#${gA})`} />
          <path
            d={MARK_CREST_PATH}
            fill="none"
            stroke={`url(#${gH})`}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.75"
          />
        </g>

        {/* Lower Ribbon (Rotated 180) */}
        <g transform="rotate(180 60 60)">
          <path d={MARK_RIBBON_PATH} fill={`url(#${gB})`} />
          <path
            d={MARK_CREST_PATH}
            fill="none"
            stroke={`url(#${gH})`}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.75"
          />
        </g>
      </g>
    </svg>
  );
}

export default SkillSyncLogo;
