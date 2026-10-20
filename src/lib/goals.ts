/**
 * Goals (Aims) — the anti-gamification feature.
 *
 * A goal is a plain statement of intent the user keeps in front of themselves:
 * "Gym", "No junk food", "Good at academics", "No fap". There is deliberately
 * no XP, no level, no badge and no completion state — nothing to farm. This
 * module owns the quick-add catalogue and the pure helpers around it.
 */
import type { Goal } from "./schema";
import { newId } from "./id";
import { DEFAULT_GOAL_ICON, resolveSemanticIcon, type SemanticIconKey } from "./semantic-icons";

export type GoalPreset = {
  title: string;
  icon: SemanticIconKey;
  /** Optional starter line the user can edit after adding. */
  note?: string;
};

/**
 * One-tap aims offered when adding a goal. The first four are the ones users
 * ask for most; everything else is a well-worn self-discipline staple. Any
 * custom aim can be typed instead, so this list never limits anyone.
 */
export const GOAL_PRESETS: GoalPreset[] = [
  { title: "Gym", icon: "dumbbell", note: "Show up even on the days you don't feel like it." },
  { title: "No junk food", icon: "salad", note: "Eat for energy, not for boredom." },
  {
    title: "Good at academics",
    icon: "graduation-cap",
    note: "Consistent study beats last-minute cramming.",
  },
  { title: "No fap", icon: "lock-keyhole", note: "Keep the energy. Keep the focus." },
  { title: "Sleep on time", icon: "moon", note: "Lights out before midnight." },
  { title: "Wake up early", icon: "sunrise" },
  { title: "Drink more water", icon: "droplets" },
  { title: "No smoking", icon: "cigarette-off" },
  { title: "No alcohol", icon: "wine-off" },
  { title: "Cut screen time", icon: "smartphone", note: "No doom-scrolling in bed." },
  { title: "Meditate daily", icon: "brain" },
  { title: "Read daily", icon: "book-open" },
  { title: "Walk daily", icon: "footprints" },
  { title: "Save money", icon: "piggy-bank" },
];

export const GOAL_TITLE_MAX = 48;
export const GOAL_NOTE_MAX = 160;

/** Collapse whitespace and cap length so a pasted paragraph can't win. */
export function cleanGoalText(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Pure factory for a new aim — always returns a valid, trimmed `Goal`. */
export function createGoal(input: {
  title: string;
  icon?: string;
  /** Legacy input name retained for callers and old backup fixtures. */
  emoji?: string;
  note?: string;
  id?: string;
  createdAt?: number;
}): Goal {
  const title = cleanGoalText(input.title, GOAL_TITLE_MAX);
  return {
    id: input.id ?? newId(),
    title: title.length > 0 ? title : "New aim",
    // `emoji` is the historical storage key; its value is now a semantic icon id.
    emoji: resolveSemanticIcon(input.icon ?? input.emoji, DEFAULT_GOAL_ICON),
    note: cleanGoalText(input.note ?? "", GOAL_NOTE_MAX),
    createdAt: input.createdAt ?? Date.now(),
  };
}

/** Same as `createGoal`, from one of the `GOAL_PRESETS` entries. */
export function goalFromPreset(preset: GoalPreset): Goal {
  return createGoal({ title: preset.title, icon: preset.icon, note: preset.note });
}

/** Case-insensitive "is this aim already on my list?" — used to tick presets. */
export function hasGoalNamed(goals: Goal[], title: string): boolean {
  const wanted = cleanGoalText(title, GOAL_TITLE_MAX).toLowerCase();
  return goals.some((g) => g.title.trim().toLowerCase() === wanted);
}

/** Presets that are not on the list yet, in catalogue order. */
export function unusedPresets(goals: Goal[]): GoalPreset[] {
  return GOAL_PRESETS.filter((p) => !hasGoalNamed(goals, p.title));
}
