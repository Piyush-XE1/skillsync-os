import type { ComponentType } from "react";
import {
  BookOpen,
  Brain,
  CircleCheckBig,
  CigaretteOff,
  ClipboardCheck,
  CloudSun,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  GraduationCap,
  Laptop,
  ListChecks,
  LockKeyhole,
  Moon,
  PartyPopper,
  PenLine,
  PiggyBank,
  Salad,
  Smartphone,
  Sparkles,
  Sprout,
  Sunrise,
  Target,
  Trophy,
  WineOff,
  Zap,
  type LucideProps,
} from "lucide-react";
import {
  DEFAULT_HABIT_ICON,
  resolveSemanticIcon,
  semanticIconLabel,
  SEMANTIC_ICON_OPTIONS,
  type SemanticIconKey,
} from "@/lib/semantic-icons";
import { cn } from "@/lib/utils";

const ICONS: Record<SemanticIconKey, ComponentType<LucideProps>> = {
  sparkles: Sparkles,
  target: Target,
  dumbbell: Dumbbell,
  salad: Salad,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  "lock-keyhole": LockKeyhole,
  moon: Moon,
  sunrise: Sunrise,
  droplets: Droplets,
  "cigarette-off": CigaretteOff,
  "wine-off": WineOff,
  smartphone: Smartphone,
  brain: Brain,
  footprints: Footprints,
  "piggy-bank": PiggyBank,
  laptop: Laptop,
  "pen-line": PenLine,
  trophy: Trophy,
  flame: Flame,
  zap: Zap,
  sprout: Sprout,
  "cloud-sun": CloudSun,
  "circle-check": CircleCheckBig,
  "clipboard-check": ClipboardCheck,
  "list-checks": ListChecks,
  "party-popper": PartyPopper,
};

type SemanticIconProps = Omit<LucideProps, "aria-label"> & {
  value: string | null | undefined;
  fallback?: SemanticIconKey;
  /** Icons next to readable labels are decorative by default. */
  decorative?: boolean;
  label?: string;
};

/** A monochrome, font-independent replacement for persisted emoji glyphs. */
export function SemanticIcon({
  value,
  fallback = DEFAULT_HABIT_ICON,
  decorative = true,
  label,
  className,
  strokeWidth = 1.8,
  ...props
}: SemanticIconProps) {
  const key = resolveSemanticIcon(value, fallback);
  const Icon = ICONS[key];
  return (
    <Icon
      {...props}
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : (label ?? semanticIconLabel(key))}
      role={decorative ? undefined : "img"}
      focusable="false"
    />
  );
}

export function SemanticIconPicker({
  value,
  onChange,
  label = "Icon",
  fallback = DEFAULT_HABIT_ICON,
  className,
}: {
  value: string | null | undefined;
  onChange: (value: SemanticIconKey) => void;
  label?: string;
  fallback?: SemanticIconKey;
  className?: string;
}) {
  const active = resolveSemanticIcon(value, fallback);

  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </legend>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9" role="radiogroup" aria-label={label}>
        {SEMANTIC_ICON_OPTIONS.map((option) => {
          const selected = option.key === active;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              title={option.label}
              onClick={() => onChange(option.key)}
              className={cn(
                "pressable flex aspect-square min-h-10 items-center justify-center border transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface-2 text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              <SemanticIcon value={option.key} className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
