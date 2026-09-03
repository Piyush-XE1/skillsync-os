/**
 * Pure geometry + ordering rules behind every drag-to-reorder surface
 * (expense rows, dashboard widgets, …).
 *
 * Everything here is DOM-free and unit-tested: the React primitive
 * (`@/components/common/DragSortList`) only measures elements and writes
 * transforms, then delegates *decisions* — "which slot is the pointer over?",
 * "how far does each neighbour shift?", "what order do we persist?" — to these
 * functions.
 */

/** A measured item slot, in a single consistent coordinate space. */
export type Slot = {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

export type Offset = { x: number; y: number };

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function slotCenter(slot: Slot): { x: number; y: number } {
  return { x: slot.left + slot.width / 2, y: slot.top + slot.height / 2 };
}

/** Moves `items[from]` to `to`, clamped to the array bounds. */
export function reorder<T>(items: T[], from: number, to: number): T[] {
  if (items.length === 0) return items;
  const src = clamp(from, 0, items.length - 1);
  const dst = clamp(to, 0, items.length - 1);
  if (src === dst) return items.slice();
  const next = items.slice();
  const [moved] = next.splice(src, 1);
  next.splice(dst, 0, moved);
  return next;
}

/**
 * Which slot should the dragged item occupy?
 *
 * Vertical lists have *variable* heights (an expense row grows with its
 * description and tags), so the old "delta ÷ rowHeight" shortcut drifts and
 * makes rows jump. Instead we walk the measured slots from the origin and stop
 * at the first centre the dragged centre has not passed yet.
 */
export function resolveListIndex(slots: Slot[], dragId: string, deltaY: number): number {
  const from = slots.findIndex((s) => s.id === dragId);
  if (from < 0 || slots.length < 2) return from;
  const dragged = slots[from];
  const centre = dragged.top + dragged.height / 2 + deltaY;
  let to = from;
  // Inclusive comparison in the direction of travel: reaching a neighbour's
  // centre is enough to claim its slot, which keeps the drag feeling 1:1.
  if (deltaY > 0) {
    for (let i = from + 1; i < slots.length; i += 1) {
      if (centre >= slots[i].top + slots[i].height / 2) to = i;
      else break;
    }
  } else if (deltaY < 0) {
    for (let i = from - 1; i >= 0; i -= 1) {
      if (centre <= slots[i].top + slots[i].height / 2) to = i;
      else break;
    }
  }
  return to;
}

/**
 * Grid variant: the slot whose centre is nearest to the dragged centre.
 * Works for the dashboard's mixed-span widget grid, where "one row height"
 * isn't a meaningful step.
 */
export function resolveGridIndex(slots: Slot[], dragId: string, dx: number, dy: number): number {
  const from = slots.findIndex((s) => s.id === dragId);
  if (from < 0 || slots.length < 2) return from;
  const origin = slotCenter(slots[from]);
  const cx = origin.x + dx;
  const cy = origin.y + dy;
  let best = from;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < slots.length; i += 1) {
    const c = slotCenter(slots[i]);
    const d = (c.x - cx) ** 2 + (c.y - cy) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

/**
 * Where every *other* item should sit while `from` is lifted to `to`.
 *
 * Each item between the two indices slides into its neighbour's slot, so the
 * list opens up exactly the space the dragged item will land in. Returned as
 * offsets (never absolute positions) so the caller can keep using CSS
 * transforms — no layout thrash, no re-render.
 */
export function slotShifts(slots: Slot[], from: number, to: number): Map<string, Offset> {
  const shifts = new Map<string, Offset>();
  if (from === to || from < 0 || to < 0) return shifts;
  const dir = to > from ? 1 : -1;
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  for (let i = start; i <= end; i += 1) {
    if (i === from) continue;
    const current = slots[i];
    const target = slots[i - dir];
    if (!current || !target) continue;
    shifts.set(current.id, { x: target.left - current.left, y: target.top - current.top });
  }
  return shifts;
}

/**
 * Auto-scroll speed (px per frame) for a pointer near an edge of the scroll
 * viewport. Ramps quadratically from a crawl to `maxStep`, so nudging the edge
 * scrolls gently while pushing past it accelerates.
 */
export function autoScrollStep(
  pointerY: number,
  viewportTop: number,
  viewportBottom: number,
  edge = 88,
  maxStep = 22,
): number {
  if (edge <= 0 || viewportBottom <= viewportTop) return 0;
  const minStep = 2;
  if (pointerY < viewportTop + edge) {
    const t = clamp((viewportTop + edge - pointerY) / edge, 0, 1);
    return -Math.round(minStep + (maxStep - minStep) * t * t);
  }
  if (pointerY > viewportBottom - edge) {
    const t = clamp((pointerY - (viewportBottom - edge)) / edge, 0, 1);
    return Math.round(minStep + (maxStep - minStep) * t * t);
  }
  return 0;
}

/* ------------------------------------------------------------------ *
 * Persisting an order
 * ------------------------------------------------------------------ */

type Positioned = { id: string; position?: number; at?: number };

/** True when two records claim the same manual position (legacy data). */
export function hasDuplicatePositions<T extends Positioned>(items: T[]): boolean {
  const seen = new Set<number>();
  for (const item of items) {
    const p = item.position ?? 0;
    if (seen.has(p)) return true;
    seen.add(p);
  }
  return false;
}

/**
 * Re-indexes every record to 0..n-1 while preserving the current visual order
 * (position ascending, newest first on ties). Used once, defensively, when a
 * legacy workspace has duplicate positions.
 */
export function normalizePositions<T extends Positioned>(items: T[]): T[] {
  const ranked = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const pa = a.item.position ?? 0;
      const pb = b.item.position ?? 0;
      if (pa !== pb) return pa - pb;
      const atDiff = (b.item.at ?? 0) - (a.item.at ?? 0);
      if (atDiff !== 0) return atDiff;
      return a.index - b.index;
    });
  const positionById = new Map<string, number>();
  ranked.forEach((entry, rank) => positionById.set(entry.item.id, rank));
  return items.map((item) => {
    const next = positionById.get(item.id);
    if (next === undefined || item.position === next) return item;
    return { ...item, position: next };
  });
}

/**
 * Applies a *partial* order — e.g. the three visible rows of a filtered list —
 * without disturbing hidden records.
 *
 * The ids being reordered simply swap the positions they already occupy
 * (sorted ascending), so a search or tag filter can never scramble the rest of
 * the month. This is the bug that made filtered reordering feel broken.
 */
export function scopedPositions<T extends Positioned>(items: T[], orderedIds: string[]): T[] {
  if (orderedIds.length < 2) return items;
  const wanted = new Set(orderedIds);
  const pool = items
    .filter((item) => wanted.has(item.id))
    .map((item) => item.position ?? 0)
    .sort((a, b) => a - b);
  const positionById = new Map<string, number>();
  orderedIds.forEach((id, index) => {
    const position = pool[index];
    if (position !== undefined) positionById.set(id, position);
  });
  return items.map((item) => {
    const next = positionById.get(item.id);
    if (next === undefined || item.position === next) return item;
    return { ...item, position: next };
  });
}

/**
 * Full pipeline used by the store: normalise legacy duplicates, then apply the
 * requested order to exactly the ids that moved.
 */
export function applyOrder<T extends Positioned>(items: T[], orderedIds: string[]): T[] {
  const base = hasDuplicatePositions(items) ? normalizePositions(items) : items;
  return scopedPositions(base, orderedIds);
}
