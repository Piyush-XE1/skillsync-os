/**
 * Dashboard widget system — pure layout rules.
 *
 * The dashboard is a grid of widgets the user owns: show/hide any of them,
 * resize them (tile → wide → full) and drag them into a personal order. The
 * layout is persisted with the workspace, so this module is deliberately free
 * of React and DOM access — every rule here is unit-tested.
 *
 * Rendering lives in `@/components/widgets` (one component per id, resolved
 * through the registry), and drag-to-reorder reuses `DragSortList`.
 */

export type ModuleKey = "attendance" | "expenses" | "focus" | "cgpa" | "coding" | "career";

/** How much of the grid a widget occupies. */
export type WidgetSize = "tile" | "wide" | "full";

export const WIDGET_SIZES: WidgetSize[] = ["tile", "wide", "full"];

export const WIDGET_IDS = [
  "goals",
  "focusToday",
  "habitsToday",
  "momentum",
  "deepWork",
  "solved",
  "expenses",
  "cgpa",
  "career",
  "attendance",
  "rating",
  "continueLearning",
  "today",
  "habits",
  "weekReview",
  "quote",
  "quickAccess",
  "roadmaps",
  "projects",
  "notes",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export type WidgetPlacement = {
  id: WidgetId;
  size: WidgetSize;
  visible: boolean;
};

/**
 * The loose shape that can arrive from storage (a backup, an older build, a
 * hand-edited file). Every helper below accepts it and returns strict
 * `WidgetPlacement[]`, so the schema can keep `id: string` and a widget retired
 * in a future release never fails a parse.
 */
export type WidgetPlacementInput = {
  id: string;
  size?: string;
  visible?: boolean;
};

export type WidgetDefinition = {
  id: WidgetId;
  title: string;
  hint: string;
  defaultSize: WidgetSize;
  /** Sizes this widget can be resized to, in cycle order. */
  sizes: WidgetSize[];
  /** Only offered when the matching optional module is switched on. */
  module?: ModuleKey;
  /** Off-by-default widgets stay in the catalogue, just not on the grid. */
  defaultVisible: boolean;
};

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  {
    id: "goals",
    title: "Aims",
    hint: "The goals you are working on",
    defaultSize: "full",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "focusToday",
    title: "Focus today",
    hint: "Deep-work minutes and sessions",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    module: "focus",
    defaultVisible: true,
  },
  {
    id: "habitsToday",
    title: "Habits today",
    hint: "Check-ins completed today",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    defaultVisible: true,
  },
  {
    id: "momentum",
    title: "Momentum",
    hint: "Seven-day effort sparkline",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    defaultVisible: true,
  },
  {
    id: "deepWork",
    title: "Deep work",
    hint: "Focus minutes this week",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    module: "focus",
    defaultVisible: true,
  },
  {
    id: "solved",
    title: "DSA this week",
    hint: "Problems solved per day",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    module: "coding",
    defaultVisible: true,
  },
  {
    id: "expenses",
    title: "Money this month",
    hint: "Credits, debits and balance",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    module: "expenses",
    defaultVisible: true,
  },
  {
    id: "cgpa",
    title: "CGPA",
    hint: "Cumulative grade point average",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    module: "cgpa",
    defaultVisible: false,
  },
  {
    id: "career",
    title: "Pipeline",
    hint: "Applications, interviews, offers",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    module: "career",
    defaultVisible: false,
  },
  {
    id: "attendance",
    title: "Attendance",
    hint: "Overall attendance percentage",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    module: "attendance",
    defaultVisible: false,
  },
  {
    id: "rating",
    title: "Contest rating",
    hint: "Current and peak rating",
    defaultSize: "tile",
    sizes: ["tile", "wide"],
    module: "coding",
    defaultVisible: false,
  },
  {
    id: "continueLearning",
    title: "Continue learning",
    hint: "The next topic waiting for you",
    defaultSize: "full",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "today",
    title: "Today",
    hint: "Smart queue of today's tasks",
    defaultSize: "wide",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "habits",
    title: "Habit check-in",
    hint: "Tap a habit to log today",
    defaultSize: "wide",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "weekReview",
    title: "Week in review",
    hint: "Effort score and grade",
    defaultSize: "wide",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "quote",
    title: "Daily quote",
    hint: "One line to start the day",
    defaultSize: "wide",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "quickAccess",
    title: "Quick access",
    hint: "Jump straight into a module",
    defaultSize: "full",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "roadmaps",
    title: "Learning progress",
    hint: "Roadmap completion bars",
    defaultSize: "wide",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "projects",
    title: "Projects",
    hint: "What you are building",
    defaultSize: "full",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
  {
    id: "notes",
    title: "Recent notes",
    hint: "Latest captures",
    defaultSize: "wide",
    sizes: ["wide", "full"],
    defaultVisible: true,
  },
];

export const WIDGET_BY_ID: Record<WidgetId, WidgetDefinition> = WIDGET_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.id] = def;
    return acc;
  },
  {} as Record<WidgetId, WidgetDefinition>,
);

/** Tailwind span classes for each size (2 columns on phones, 4 on desktop). */
export const WIDGET_SPAN_CLASS: Record<WidgetSize, string> = {
  tile: "col-span-1",
  wide: "col-span-2",
  full: "col-span-2 lg:col-span-4",
};

export function isWidgetId(value: unknown): value is WidgetId {
  return typeof value === "string" && (WIDGET_IDS as readonly string[]).includes(value);
}

export function isWidgetSize(value: unknown): value is WidgetSize {
  return typeof value === "string" && (WIDGET_SIZES as string[]).includes(value);
}

/** The shipped layout: every widget, in its default order and visibility. */
export function defaultWidgetLayout(): WidgetPlacement[] {
  return WIDGET_DEFINITIONS.map((def) => ({
    id: def.id,
    size: def.defaultSize,
    visible: def.defaultVisible,
  }));
}

/**
 * Repairs a persisted layout: unknown ids are dropped, duplicates collapse,
 * sizes/visibility are coerced, and any widget the layout has never heard of
 * (a new release) is appended hidden-but-available.
 */
export function normalizeWidgetLayout(input: unknown): WidgetPlacement[] {
  const seen = new Set<WidgetId>();
  const out: WidgetPlacement[] = [];

  if (Array.isArray(input)) {
    for (const raw of input) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Partial<WidgetPlacement>;
      if (!isWidgetId(entry.id) || seen.has(entry.id)) continue;
      const def = WIDGET_BY_ID[entry.id];
      seen.add(entry.id);
      out.push({
        id: entry.id,
        size:
          isWidgetSize(entry.size) && def.sizes.includes(entry.size) ? entry.size : def.defaultSize,
        visible: typeof entry.visible === "boolean" ? entry.visible : def.defaultVisible,
      });
    }
  }

  for (const def of WIDGET_DEFINITIONS) {
    if (seen.has(def.id)) continue;
    out.push({ id: def.id, size: def.defaultSize, visible: def.defaultVisible });
  }
  return out;
}

/** What the grid should actually render, given the enabled optional modules. */
export function visibleWidgets(
  layout: WidgetPlacementInput[],
  modules: Partial<Record<ModuleKey, boolean>>,
): WidgetPlacement[] {
  return normalizeWidgetLayout(layout).filter((entry) => {
    if (!entry.visible) return false;
    const def = WIDGET_BY_ID[entry.id];
    if (def.module && !modules[def.module]) return false;
    return true;
  });
}

/** Shows or hides a widget without moving it. */
export function setWidgetVisible(
  layout: WidgetPlacementInput[],
  id: WidgetId,
  visible: boolean,
): WidgetPlacement[] {
  return normalizeWidgetLayout(layout).map((entry) =>
    entry.id === id ? { ...entry, visible } : entry,
  );
}

/** Resizes a widget, snapping back to its default when the size isn't allowed. */
export function setWidgetSize(
  layout: WidgetPlacementInput[],
  id: WidgetId,
  size: WidgetSize,
): WidgetPlacement[] {
  const def = WIDGET_BY_ID[id];
  if (!def) return normalizeWidgetLayout(layout);
  const next = def.sizes.includes(size) ? size : def.defaultSize;
  return normalizeWidgetLayout(layout).map((entry) =>
    entry.id === id ? { ...entry, size: next } : entry,
  );
}

/** Next size in the widget's own cycle (tile → wide → tile …). */
export function nextWidgetSize(id: WidgetId, current: WidgetSize): WidgetSize {
  const sizes = WIDGET_BY_ID[id]?.sizes ?? WIDGET_SIZES;
  const index = sizes.indexOf(current);
  return sizes[(index + 1) % sizes.length];
}

/** Moves a widget to an absolute index in the layout. */
export function moveWidget(
  layout: WidgetPlacementInput[],
  id: WidgetId,
  toIndex: number,
): WidgetPlacement[] {
  const next = normalizeWidgetLayout(layout);
  const from = next.findIndex((entry) => entry.id === id);
  if (from < 0) return next;
  const to = Math.max(0, Math.min(next.length - 1, toIndex));
  if (from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Applies a drag-sort result.
 *
 * The grid only contains *visible* widgets, so `orderedIds` is a subset of the
 * layout. The subset simply swaps the layout slots it already occupies — hidden
 * widgets never move, exactly like the scoped expense reorder.
 */
export function applyWidgetOrder(
  layout: WidgetPlacementInput[],
  orderedIds: string[],
): WidgetPlacement[] {
  const next = normalizeWidgetLayout(layout);
  const byId = new Map(next.map((entry) => [entry.id, entry]));
  // Only ids that really are in the layout take part — a stale or foreign id
  // must never shift the others out of alignment.
  const known = orderedIds.filter((id): id is WidgetId => isWidgetId(id) && byId.has(id));
  if (known.length < 2) return next;
  const slots: number[] = [];
  const wanted = new Set<string>(known);
  next.forEach((entry, index) => {
    if (wanted.has(entry.id)) slots.push(index);
  });
  // Ascending, so the new order fills the vacated slots front-to-back.
  slots.sort((a, b) => a - b);
  known.forEach((id, order) => {
    const slot = slots[order];
    const entry = byId.get(id);
    if (slot === undefined || !entry) return;
    next[slot] = entry;
  });
  return next;
}

/** Back to the shipped dashboard. */
export function resetWidgetLayout(): WidgetPlacement[] {
  return defaultWidgetLayout();
}

/** Catalogue entries the settings sheet should offer for these module flags. */
export function availableWidgets(modules: Partial<Record<ModuleKey, boolean>>): WidgetDefinition[] {
  return WIDGET_DEFINITIONS.filter((def) => !def.module || modules[def.module]);
}
