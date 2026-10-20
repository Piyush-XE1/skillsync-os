/**
 * SkillSync OS monograph mark.
 *
 * One flat, local-only SVG: ivory serif initial, brass rule, and a graphite
 * hairline. It intentionally has no gradient, glow, or theme-dependent colour.
 */
export const MARK_VIEWBOX = "0 0 120 120";

export function SkillSyncLogo({
  size = 128,
  className,
  glow: _glow = false,
}: {
  size?: number;
  className?: string;
  /** Retained for call-site compatibility; Monograph Noir never renders glow. */
  glow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      role="img"
      aria-label="SkillSync OS"
      className={className}
    >
      <rect x="12.5" y="12.5" width="95" height="95" fill="#08080A" stroke="#24252A" />
      <text
        x="60"
        y="83"
        textAnchor="middle"
        fill="#F3F1EC"
        fontFamily="Playfair Display Variable, Iowan Old Style, Palatino Linotype, Baskerville, Georgia, serif"
        fontSize="78"
        fontWeight="500"
      >
        S
      </text>
      <line x1="42" y1="94" x2="78" y2="94" stroke="#C29F62" strokeWidth="1.8" />
      <circle cx="60" cy="94" r="1.9" fill="#C29F62" />
    </svg>
  );
}

export default SkillSyncLogo;
