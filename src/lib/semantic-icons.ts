/**
 * Stable, textual identifiers for the app's monochrome line-icon language.
 *
 * The persisted `emoji` field on older Habit/Goal records is intentionally
 * retained for backup compatibility. New records store one of these keys in
 * that field, while legacy emoji values are resolved here without ever being
 * rendered as emoji in the interface.
 */
export const SEMANTIC_ICON_OPTIONS = [
  { key: "sparkles", label: "Spark" },
  { key: "target", label: "Target" },
  { key: "dumbbell", label: "Training" },
  { key: "salad", label: "Nutrition" },
  { key: "book-open", label: "Reading" },
  { key: "graduation-cap", label: "Study" },
  { key: "lock-keyhole", label: "Discipline" },
  { key: "moon", label: "Sleep" },
  { key: "sunrise", label: "Morning" },
  { key: "droplets", label: "Hydration" },
  { key: "cigarette-off", label: "No smoking" },
  { key: "wine-off", label: "No alcohol" },
  { key: "smartphone", label: "Screen time" },
  { key: "brain", label: "Mind" },
  { key: "footprints", label: "Walking" },
  { key: "piggy-bank", label: "Saving" },
  { key: "laptop", label: "Coding" },
  { key: "pen-line", label: "Writing" },
  { key: "trophy", label: "Achievement" },
  { key: "flame", label: "Momentum" },
  { key: "zap", label: "Energy" },
  { key: "sprout", label: "Growth" },
  { key: "cloud-sun", label: "Warming up" },
  { key: "circle-check", label: "Completed" },
  { key: "clipboard-check", label: "Tasks" },
  { key: "list-checks", label: "Checklist" },
  { key: "party-popper", label: "Celebration" },
] as const;

export type SemanticIconKey = (typeof SEMANTIC_ICON_OPTIONS)[number]["key"];

export const DEFAULT_HABIT_ICON: SemanticIconKey = "sparkles";
export const DEFAULT_GOAL_ICON: SemanticIconKey = "target";

const ICON_KEYS = new Set<string>(SEMANTIC_ICON_OPTIONS.map((option) => option.key));

/**
 * Emoji aliases are encoded so source and generated UI remain typographically
 * neutral while backups made by older app versions still retain their meaning.
 */
const LEGACY_ALIASES: Record<string, SemanticIconKey> = {
  "\u2728": "sparkles",
  "\u{1f3af}": "target",
  "\u{1f3cb}": "dumbbell",
  "\u{1f957}": "salad",
  "\u{1f4da}": "graduation-cap",
  "\u{1f512}": "lock-keyhole",
  "\u{1f634}": "moon",
  "\u{1f305}": "sunrise",
  "\u{1f4a7}": "droplets",
  "\u{1f6ad}": "cigarette-off",
  "\u{1f377}": "wine-off",
  "\u{1f4f1}": "smartphone",
  "\u{1f9d8}": "brain",
  "\u{1f4d6}": "book-open",
  "\u{1f6b6}": "footprints",
  "\u{1f3c3}": "footprints",
  "\u{1f4b0}": "piggy-bank",
  "\u{1f4bb}": "laptop",
  "\u270d": "pen-line",
  "\u{1f3c6}": "trophy",
  "\u{1f525}": "flame",
  "\u26a1": "zap",
  "\u{1f331}": "sprout",
  "\u{1f324}": "cloud-sun",
  "\u{1f393}": "graduation-cap",
  "\u{1f9e0}": "brain",
  "\u2705": "circle-check",
  "\u{1f4cb}": "clipboard-check",
  "\u{1f389}": "party-popper",
};

/** Resolve canonical keys and legacy values to a safe line-icon identifier. */
export function resolveSemanticIcon(
  value: string | null | undefined,
  fallback: SemanticIconKey = DEFAULT_HABIT_ICON,
): SemanticIconKey {
  const raw = (value ?? "").trim();
  const canonical = raw.toLowerCase();
  if (ICON_KEYS.has(canonical)) return canonical as SemanticIconKey;

  // Variation selectors only affect emoji presentation and not its meaning.
  const legacy = raw.replaceAll("\ufe0f", "");
  return LEGACY_ALIASES[legacy] ?? fallback;
}

export function semanticIconLabel(value: string | null | undefined): string {
  const key = resolveSemanticIcon(value);
  return SEMANTIC_ICON_OPTIONS.find((option) => option.key === key)?.label ?? "Icon";
}
