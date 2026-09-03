import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { GripVertical } from "lucide-react";
import {
  autoScrollStep,
  resolveGridIndex,
  resolveListIndex,
  reorder,
  slotShifts,
  type Slot,
} from "@/lib/drag-sort";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

/**
 * DragSortList — the app's one drag-to-reorder primitive.
 *
 * Written to fix the glitches the hand-rolled expense list had:
 *
 *  1. **Variable row heights.** The old code assumed every row was the same
 *     height (`rowHeight = dragged.height + gap`), so a row with a description
 *     or tags made the list drift and snap. Slots are now *measured* and the
 *     target index is resolved against real centres (`resolveListIndex`).
 *  2. **Scroll drift.** Auto-scroll added the *requested* scroll delta instead
 *     of the *actual* one, so hitting the end of the page made the dragged row
 *     fly away from the finger. The offset is re-read every frame.
 *  3. **The wrong scroll container.** `window.scrollBy` only works when the
 *     document scrolls; the nearest scrollable ancestor is now detected.
 *  4. **Snappy drops.** Releasing used to teleport the row into place. It now
 *     glides into its slot (settle) and the commit runs inside `flushSync`, so
 *     the new DOM order and the cleared transforms land in the same frame —
 *     no flash, no double paint.
 *  5. **No affordance, no keyboard.** A real grip (`DragHandle` + `handleProps`)
 *     starts a drag instantly and is fully keyboard operable: Space to lift,
 *     arrows to move, Space to drop, Escape to cancel — announced through a
 *     polite live region.
 *  6. **Gesture arbitration.** A finger sliding on the row body still scrolls
 *     (long-press to lift); a mouse or the grip activates after a few pixels.
 *     pointercancel, lost capture, window blur and a released mouse button all
 *     roll the drag back instead of leaving it stuck.
 *
 * Per-frame work writes transforms straight to the measured nodes — the list
 * re-renders exactly twice per drag (lift + land), never while the finger moves.
 */

export type DragSortAxis = "y" | "grid";

export type DragSortRenderState<T> = {
  item: T;
  index: number;
  /** This item is the one being dragged. */
  dragging: boolean;
  /** Some item in this list is being dragged. */
  sorting: boolean;
  /** Attach to the row's root element. */
  setNodeRef: (el: HTMLElement | null) => void;
  /** Spread on the row root to make the whole row a drag surface. */
  rowProps: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    "data-sort-row": string;
  };
  /** Spread on a dedicated grip element (instant drag + keyboard support). */
  handleProps: HandleProps;
};

export type HandleProps = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  role: "button";
  tabIndex: number;
  "data-drag-handle": string;
  "aria-roledescription": string;
  "aria-label": string;
};

type ScrollBox = {
  el: HTMLElement | null;
  top: () => number;
  nudge: (dy: number) => void;
  viewport: () => { top: number; bottom: number };
};

type Session = {
  id: string;
  pointerId: number;
  pointerType: string;
  mode: "pointer" | "keyboard";
  slots: Slot[];
  ids: string[];
  fromIndex: number;
  index: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  activated: boolean;
  settling: boolean;
  timer: number;
  raf: number;
  settleTimer: number;
  scroll: ScrollBox;
  scrollStart: number;
  captured: { el: HTMLElement; pointerId: number } | null;
  detach: (() => void) | null;
};

const SETTLE_MS = 170;
const ROLLBACK_MS = 150;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

/** Nearest ancestor that actually scrolls (or `el === null` → the document). */
function findScrollBox(start: HTMLElement | null): ScrollBox {
  let node = start?.parentElement ?? null;
  while (node && node !== document.body) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      const el = node;
      return {
        el,
        top: () => el.scrollTop,
        nudge: (dy) => {
          el.scrollTop += dy;
        },
        viewport: () => {
          const r = el.getBoundingClientRect();
          return {
            top: Math.max(0, r.top),
            bottom: Math.min(window.innerHeight, r.bottom),
          };
        },
      };
    }
    node = node.parentElement;
  }
  return {
    el: null,
    top: () => window.scrollY || document.documentElement?.scrollTop || 0,
    nudge: (dy) => window.scrollBy({ top: dy }),
    viewport: () => ({ top: 0, bottom: window.innerHeight }),
  };
}

/** Interactive descendants must never start a row drag. */
function isInteractiveTarget(target: EventTarget | null) {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  return Boolean(target.closest("button, a, input, textarea, select, [data-no-drag]"));
}

export function DragSortList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  axis = "y",
  className,
  disabled = false,
  handleOnly = false,
  longPressMs = 300,
  mouseDelayMs = 110,
  activationDistance = 6,
  itemLabel,
  onDragChange,
  announce,
}: {
  items: T[];
  /** Called with the new id order when a drag (or keyboard move) lands. */
  onReorder: (ids: string[]) => void;
  renderItem: (state: DragSortRenderState<T>) => ReactNode;
  /** "y" for stacked rows, "grid" for mixed-span tiles. */
  axis?: DragSortAxis;
  className?: string;
  disabled?: boolean;
  /** Only the grip handle can start a drag (no long-press on the row body). */
  handleOnly?: boolean;
  longPressMs?: number;
  mouseDelayMs?: number;
  activationDistance?: number;
  itemLabel?: (item: T, index: number) => string;
  onDragChange?: (activeId: string | null) => void;
  announce?: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const refCache = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const session = useRef<Session | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  /** Order applied locally the instant a drag lands, before the store catches up. */
  const [order, setOrder] = useState<string[] | null>(null);

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const announceRef = useRef(announce);
  announceRef.current = announce;
  const onDragChangeRef = useRef(onDragChange);
  onDragChangeRef.current = onDragChange;
  const itemLabelRef = useRef(itemLabel);
  itemLabelRef.current = itemLabel;

  const list = useMemo(() => {
    if (!order) return items;
    const map = new Map(items.map((item) => [item.id, item]));
    const next = order.map((id) => map.get(id)).filter((item): item is T => Boolean(item));
    // Anything the local order doesn't know about (a brand-new record) is
    // appended rather than silently dropped.
    for (const item of items) if (!order.includes(item.id)) next.push(item);
    return next;
  }, [items, order]);

  /** Id signature — rolling back on every parent re-render would kill drags. */
  const signature = useMemo(() => items.map((item) => item.id).join("|"), [items]);

  const labelFor = useCallback(
    (id: string, index: number) => {
      const item = items.find((candidate) => candidate.id === id);
      const label = itemLabelRef.current;
      if (item && label) return label(item, index);
      return `Item ${index + 1}`;
    },
    [items],
  );

  /** Writes to the live region without re-rendering the list mid-drag. */
  const say = useCallback((message: string) => {
    if (liveRef.current) liveRef.current.textContent = message;
    announceRef.current?.(message);
  }, []);

  const setNodeRef = useCallback((id: string) => {
    let fn = refCache.current.get(id);
    if (!fn) {
      fn = (el: HTMLElement | null) => {
        if (el) nodes.current.set(id, el);
        else nodes.current.delete(id);
      };
      refCache.current.set(id, fn);
    }
    return fn;
  }, []);

  // Forget ref callbacks for ids that left the list.
  useEffect(() => {
    const alive = new Set(items.map((item) => item.id));
    for (const id of Array.from(refCache.current.keys())) {
      if (!alive.has(id)) {
        refCache.current.delete(id);
        nodes.current.delete(id);
      }
    }
  }, [items]);

  /* ------------------------------- painting ------------------------------ */

  const clearStyles = useCallback(() => {
    nodes.current.forEach((el) => {
      el.style.transform = "";
      el.style.transition = "";
      el.style.willChange = "";
      el.style.touchAction = "";
      el.style.cursor = "";
      el.style.zIndex = "";
    });
  }, []);

  const paint = useCallback(() => {
    const s = session.current;
    if (!s || !s.activated || s.settling) return;
    const reduce = prefersReducedMotion();
    const glide = reduce ? "none" : "transform 210ms var(--ease-out-soft)";
    const shifts = slotShifts(s.slots, s.fromIndex, s.index);
    const origin = s.slots[s.fromIndex];

    for (const slot of s.slots) {
      const el = nodes.current.get(slot.id);
      if (!el) continue;
      el.style.willChange = "transform";
      if (slot.id === s.id) {
        el.style.zIndex = "30";
        if (s.mode === "keyboard") {
          // Keyboard lifts glide to the destination slot so the landing spot
          // is visible without a pointer.
          const target = s.slots[s.index];
          el.style.transition = reduce ? "none" : "transform 180ms var(--ease-out-soft)";
          el.style.transform = `translate3d(${target.left - origin.left}px, ${
            target.top - origin.top
          }px, 0)`;
        } else {
          // Pinned to the finger: no transition, or the row visibly lags.
          el.style.transition = "none";
          el.style.transform = `translate3d(${s.dx}px, ${s.dy}px, 0)`;
        }
        continue;
      }
      el.style.transition = glide;
      const off = shifts.get(slot.id);
      el.style.transform = off ? `translate3d(${off.x}px, ${off.y}px, 0)` : "";
    }
  }, []);

  /* ------------------------------ drag loop ------------------------------ */

  const stopLoop = useCallback(() => {
    const s = session.current;
    if (s?.raf) cancelAnimationFrame(s.raf);
    if (s) s.raf = 0;
  }, []);

  const loop = useCallback(() => {
    const s = session.current;
    if (!s || !s.activated || s.settling) return;

    // Auto-scroll, compensated by what ACTUALLY moved.
    const { top, bottom } = s.scroll.viewport();
    const step = autoScrollStep(s.y, top, bottom);
    if (step !== 0) s.scroll.nudge(step);
    const moved = s.scroll.top() - s.scrollStart;

    s.dx = s.x - s.startX;
    s.dy = s.y - s.startY + moved;

    const nextIndex =
      axis === "grid"
        ? resolveGridIndex(s.slots, s.id, s.dx, s.dy)
        : resolveListIndex(s.slots, s.id, s.dy);

    if (nextIndex !== s.index && nextIndex >= 0) {
      s.index = nextIndex;
      haptics.selection();
      sound.move();
      say(`Position ${nextIndex + 1} of ${s.ids.length}.`);
    }
    paint();
    s.raf = requestAnimationFrame(loop);
  }, [axis, paint, say]);

  const measure = useCallback(
    (id: string): { slots: Slot[]; ids: string[] } | null => {
      const slots: Slot[] = [];
      for (const item of list) {
        const el = nodes.current.get(item.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        slots.push({ id: item.id, top: r.top, left: r.left, width: r.width, height: r.height });
      }
      if (slots.length < 2 || !slots.some((slot) => slot.id === id)) return null;
      return { slots, ids: slots.map((slot) => slot.id) };
    },
    [list],
  );

  const activate = useCallback(
    (mode: "pointer" | "keyboard") => {
      const s = session.current;
      if (!s || s.activated) return;
      const measured = measure(s.id);
      if (!measured) {
        // Nothing to sort (single row / unmeasurable) — abandon quietly.
        window.clearTimeout(s.timer);
        s.detach?.();
        session.current = null;
        return;
      }
      window.clearTimeout(s.timer);
      s.timer = 0;
      s.slots = measured.slots;
      s.ids = measured.ids;
      s.fromIndex = measured.ids.indexOf(s.id);
      s.index = s.fromIndex;
      s.mode = mode;
      s.activated = true;
      s.scroll = findScrollBox(nodes.current.get(s.id) ?? containerRef.current);
      s.scrollStart = s.scroll.top();

      const el = nodes.current.get(s.id);
      if (el && mode === "pointer") {
        // Own the gesture before the browser decides to scroll instead.
        el.style.touchAction = "none";
        el.style.cursor = "grabbing";
        try {
          el.setPointerCapture(s.pointerId);
          s.captured = { el, pointerId: s.pointerId };
        } catch {
          /* capture unsupported — the window listeners still end the drag */
        }
      }

      setActiveId(s.id);
      onDragChangeRef.current?.(s.id);
      haptics.longPress();
      sound.lift();
      say(
        `${labelFor(s.id, s.fromIndex)} picked up. Position ${s.fromIndex + 1} of ${s.ids.length}.`,
      );
      paint();
      if (mode === "pointer") s.raf = requestAnimationFrame(loop);
    },
    [labelFor, loop, measure, paint, say],
  );

  /* ------------------------------- teardown ------------------------------ */

  const releaseCapture = useCallback(() => {
    const s = session.current;
    if (!s?.captured) return;
    try {
      s.captured.el.releasePointerCapture(s.captured.pointerId);
    } catch {
      /* already released */
    }
    s.captured = null;
  }, []);

  const endSession = useCallback(() => {
    const s = session.current;
    if (s) {
      window.clearTimeout(s.timer);
      window.clearTimeout(s.settleTimer);
      s.detach?.();
    }
    stopLoop();
    releaseCapture();
    session.current = null;
    clearStyles();
    setActiveId(null);
    onDragChangeRef.current?.(null);
  }, [clearStyles, releaseCapture, stopLoop]);

  /** Applies the new order to the DOM and hands it to the store. */
  const commit = useCallback(
    (nextIds: string[], changed: boolean) => {
      // DOM order first, transforms cleared in the same frame → no flash.
      flushSync(() => setOrder(nextIds));
      clearStyles();
      if (changed) {
        onReorderRef.current(nextIds);
        haptics.tap();
        sound.drop();
      }
      endSession();
      setOrder(null);
    },
    [clearStyles, endSession],
  );

  /** Glides the lifted row into its slot, then commits. */
  const settle = useCallback(() => {
    const s = session.current;
    if (!s || !s.activated) return;
    stopLoop();
    releaseCapture();
    const changed = s.index !== s.fromIndex;
    const nextIds = reorder(s.ids, s.fromIndex, s.index);
    const reduce = prefersReducedMotion();
    say(changed ? `Dropped at position ${s.index + 1} of ${s.ids.length}.` : "Returned to start.");

    if (reduce || !changed || s.mode === "keyboard") {
      // Keyboard lifts already sit on their destination; reduced motion skips
      // the glide. Deferred so `flushSync` never runs inside a React handler.
      window.setTimeout(() => commit(nextIds, changed), 0);
      return;
    }

    s.settling = true;
    const el = nodes.current.get(s.id);
    const target = s.slots[s.index];
    const origin = s.slots[s.fromIndex];
    if (el && target && origin) {
      el.style.transition = `transform ${SETTLE_MS}ms var(--ease-out-soft)`;
      el.style.transform = `translate3d(${target.left - origin.left}px, ${
        target.top - origin.top
      }px, 0)`;
    }
    s.settleTimer = window.setTimeout(() => commit(nextIds, changed), SETTLE_MS);
  }, [commit, releaseCapture, say, stopLoop]);

  /** Gesture lost (OS stole the pointer, mouse released off-window, Esc). */
  const rollback = useCallback(() => {
    const s = session.current;
    if (!s) return;
    stopLoop();
    releaseCapture();
    if (s.activated && !prefersReducedMotion()) {
      // Ease every row home before React takes the layout back.
      s.settling = true;
      nodes.current.forEach((el) => {
        el.style.transition = `transform ${ROLLBACK_MS}ms var(--ease-out-soft)`;
        el.style.transform = "";
      });
      say("Reordering cancelled.");
      s.settleTimer = window.setTimeout(() => endSession(), ROLLBACK_MS);
      return;
    }
    endSession();
  }, [endSession, releaseCapture, say, stopLoop]);

  /* ---------------------------- pointer wiring --------------------------- */

  const beginPointer = useCallback(
    (id: string, viaHandle: boolean, event: React.PointerEvent<HTMLElement>) => {
      if (disabled || session.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!viaHandle && (handleOnly || isInteractiveTarget(event.target))) return;

      const pointerId = event.pointerId;
      const s: Session = {
        id,
        pointerId,
        pointerType: event.pointerType,
        mode: "pointer",
        slots: [],
        ids: [],
        fromIndex: 0,
        index: 0,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        dx: 0,
        dy: 0,
        activated: false,
        settling: false,
        timer: 0,
        raf: 0,
        settleTimer: 0,
        scroll: findScrollBox(event.currentTarget),
        scrollStart: 0,
        captured: null,
        detach: null,
      };
      session.current = s;

      const abandon = () => {
        window.clearTimeout(s.timer);
        s.detach?.();
        if (session.current === s) session.current = null;
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== s.pointerId || session.current !== s) return;
        s.x = ev.clientX;
        s.y = ev.clientY;
        if (!s.activated) {
          if (Math.hypot(s.x - s.startX, s.y - s.startY) < activationDistance) return;
          // Grip or mouse → the intent is clearly a drag. A finger sliding on
          // the row body is a scroll, so back off and let the page move.
          if (viaHandle || s.pointerType === "mouse") activate("pointer");
          else abandon();
          return;
        }
        // A mouse that lost its button without a pointerup (released outside
        // the window) must not leave a stuck drag behind.
        if (ev.pointerType === "mouse" && (ev.buttons & 1) === 0) {
          rollback();
          return;
        }
        ev.preventDefault();
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== s.pointerId || session.current !== s) return;
        if (!s.activated) {
          abandon();
          return;
        }
        settle();
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== s.pointerId || session.current !== s) return;
        rollback();
      };
      const onBlur = () => {
        if (session.current !== s) return;
        if (s.activated) rollback();
        else abandon();
      };
      const detach = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("blur", onBlur);
        s.detach = null;
      };
      s.detach = detach;

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("blur", onBlur);

      // Finger on the row body → hold to lift, so scrolling still works.
      // Grip or mouse → lift after a short beat (feels instant, still ignores
      // a plain click).
      const delay = viaHandle || event.pointerType === "mouse" ? mouseDelayMs : longPressMs;
      s.timer = window.setTimeout(() => {
        if (session.current !== s || s.activated) return;
        if (!viaHandle && Math.hypot(s.x - s.startX, s.y - s.startY) > activationDistance) return;
        activate("pointer");
      }, delay);
    },
    [
      activate,
      activationDistance,
      disabled,
      handleOnly,
      longPressMs,
      mouseDelayMs,
      rollback,
      settle,
    ],
  );

  /* ---------------------------- keyboard a11y ---------------------------- */

  const beginKeyboard = useCallback(
    (id: string) => {
      const measured = measure(id);
      if (!measured) return;
      const fromIndex = measured.ids.indexOf(id);
      session.current = {
        id,
        pointerId: -1,
        pointerType: "keyboard",
        mode: "keyboard",
        slots: measured.slots,
        ids: measured.ids,
        fromIndex,
        index: fromIndex,
        startX: 0,
        startY: 0,
        x: 0,
        y: 0,
        dx: 0,
        dy: 0,
        activated: true,
        settling: false,
        timer: 0,
        raf: 0,
        settleTimer: 0,
        scroll: findScrollBox(nodes.current.get(id) ?? containerRef.current),
        scrollStart: 0,
        captured: null,
        detach: null,
      };
      setActiveId(id);
      onDragChangeRef.current?.(id);
      haptics.longPress();
      sound.lift();
      say(
        `${labelFor(id, fromIndex)} picked up. Arrow keys to move, Space to drop, Escape to cancel.`,
      );
      paint();
    },
    [labelFor, measure, paint, say],
  );

  const onHandleKey = useCallback(
    (id: string, event: React.KeyboardEvent<HTMLElement>) => {
      if (disabled) return;
      const s = session.current;
      const lifted = Boolean(s && s.activated && s.id === id && s.mode === "keyboard");

      if (event.key === "Escape") {
        if (lifted) {
          event.preventDefault();
          rollback();
        }
        return;
      }

      if (event.key === " " || event.key === "Spacebar" || event.key === "Enter") {
        event.preventDefault();
        if (lifted) settle();
        else if (!s) beginKeyboard(id);
        return;
      }

      if (!lifted || !s) return;
      const step =
        event.key === "ArrowDown" || event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp" || event.key === "ArrowLeft"
            ? -1
            : event.key === "Home"
              ? -s.index
              : event.key === "End"
                ? s.ids.length - 1 - s.index
                : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = Math.max(0, Math.min(s.ids.length - 1, s.index + step));
      if (next === s.index) return;
      s.index = next;
      haptics.selection();
      sound.move();
      say(`Position ${next + 1} of ${s.ids.length}.`);
      paint();
    },
    [beginKeyboard, disabled, paint, rollback, say, settle],
  );

  /* ------------------------------ lifecycle ------------------------------ */

  // The record set changing mid-drag would leave stale measurements: bail out.
  useEffect(() => {
    const s = session.current;
    if (s && s.activated && !s.settling) rollback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => () => endSession(), [endSession]);

  const sorting = activeId !== null;

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          axis === "grid" ? "grid" : "flex flex-col",
          sorting && "select-none",
          className,
        )}
        data-sorting={sorting ? "true" : undefined}
        onDragStart={(event) => event.preventDefault()}
      >
        {list.map((item, index) => (
          <Fragment key={item.id}>
            {renderItem({
              item,
              index,
              dragging: activeId === item.id,
              sorting,
              setNodeRef: setNodeRef(item.id),
              rowProps: {
                "data-sort-row": item.id,
                onPointerDown: (event) => beginPointer(item.id, false, event),
              },
              handleProps: {
                role: "button",
                tabIndex: disabled ? -1 : 0,
                "data-drag-handle": item.id,
                "aria-roledescription": "Draggable item",
                "aria-label": `Reorder ${labelFor(item.id, index)}`,
                onPointerDown: (event) => {
                  event.stopPropagation();
                  beginPointer(item.id, true, event);
                },
                onKeyDown: (event) => onHandleKey(item.id, event),
              },
            })}
          </Fragment>
        ))}
      </div>
      <p ref={liveRef} aria-live="polite" className="sr-only">
        {""}
      </p>
    </>
  );
}

/**
 * The grip affordance. Spread `handleProps` from `renderItem` onto it to make
 * it both the instant-drag surface and the keyboard reorder control.
 */
export function DragHandle({
  className,
  active = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex h-8 w-6 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-muted-foreground/45 transition-colors",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/[0.06] [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground",
        active && "cursor-grabbing bg-white/[0.08] text-foreground",
        className,
      )}
    >
      <GripVertical className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
