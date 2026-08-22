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
        <linearGradient id={gA} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="55%" stopColor="#7c5cf5" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id={gB} x1="0.85" y1="1" x2="0.15" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#25b3f0" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        {glow ? (
          <filter id={fx} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
      </defs>

      <g filter={glow ? `url(#${fx})` : undefined}>
        <path d={MARK_RIBBON_PATH} fill={`url(#${gA})`} />
        <path d={MARK_RIBBON_PATH} fill={`url(#${gB})`} transform="rotate(180 60 60)" />
      </g>
    </svg>
  );
}

export default SkillSyncLogo;
