import { useEffect, useRef, useState } from "react";

/**
 * Shared overlay primitives used by every sheet / dialog in the app.
 *
 * One source of truth for:
 *  - body scroll locking (reference counted, no layout jump)
 *  - stacking order (predictable z-index, topmost-only Escape)
 *  - focus trapping + focus restoration
 */

/* ------------------------------ scroll lock ------------------------------ */

let lockCount = 0;
let saved: { overflow: string; paddingRight: string; touchAction: string } | null = null;

function lock() {
  lockCount += 1;
  if (lockCount > 1 || typeof document === "undefined") return;
  const body = document.body;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  saved = {
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
    touchAction: body.style.touchAction,
  };
  body.style.overflow = "hidden";
  body.style.touchAction = "none";
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || typeof document === "undefined" || !saved) return;
  const body = document.body;
  body.style.overflow = saved.overflow;
  body.style.paddingRight = saved.paddingRight;
  body.style.touchAction = saved.touchAction;
  saved = null;
}

/** Prevents background scrolling while `active`, restoring cleanly after. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}

/* ------------------------------ layer stack ------------------------------ */

const BASE_Z = 200;
const STEP_Z = 10;

let stack: symbol[] = [];
const stackListeners = new Set<() => void>();

function emitStack() {
  publishOverlayCount();
  for (const l of stackListeners) l();
}

/**
 * Registers an open overlay and returns its z-index plus whether it is the
 * topmost layer (only the topmost layer reacts to Escape / back).
 */
export function useOverlayLayer(open: boolean) {
  const idRef = useRef<symbol>(Symbol("overlay"));
  const [, force] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = idRef.current;
    stack = [...stack, id];
    emitStack();
    const onChange = () => force((n) => n + 1);
    stackListeners.add(onChange);
    return () => {
      stack = stack.filter((s) => s !== id);
      stackListeners.delete(onChange);
      emitStack();
    };
  }, [open]);

  const index = stack.indexOf(idRef.current);
  const depth = index === -1 ? stack.length : index;
  return {
    zIndex: BASE_Z + depth * STEP_Z,
    isTop: index === -1 ? true : index === stack.length - 1,
  };
}

/** True while any overlay (sheet / dialog) is open. */
export function useAnyOverlayOpen() {
  const [openCount, setOpenCount] = useState(() => stack.length);
  useEffect(() => {
    const onChange = () => setOpenCount(stack.length);
    stackListeners.add(onChange);
    onChange();
    return () => {
      stackListeners.delete(onChange);
    };
  }, []);
  return openCount > 0;
}

/** Mirror for the native shell: Android back consulting how many overlays are up. */
function publishOverlayCount() {
  if (typeof window === "undefined") return;
  (window as unknown as { __skillsyncOverlays?: number }).__skillsyncOverlays = stack.length;
}

/**
 * Keeps an overlay mounted for `exitMs` after `open` goes false so its
 * closing transition can play, instead of vanishing mid-frame (the abrupt
 * "modal snap-out" flicker). While `closing`, the overlay must be inert —
 * this is also what prevents double actions from rapid taps during the exit.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  // Render-time adjustments (React's derive-state-from-props pattern):
  // mounting happens in the very commit where `open` flips true — the enter
  // animation starts on the first painted frame, never one frame late. A
  // reopen during the exit window cancels the close so the overlay never
  // gets stuck in its faded/outgoing state.
  if (open && mounted && closing) {
    setClosing(false);
  } else if (open && !mounted) {
    setMounted(true);
    setClosing(false);
  } else if (!open && mounted && !closing) {
    setClosing(true);
  }

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, exitMs);
    return () => window.clearTimeout(timer);
  }, [closing, exitMs]);

  return { mounted, closing };
}

/** Escape / Android-back dismissal for the topmost overlay only. */
export function useDismissOnEscape(open: boolean, isTop: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open || !isTop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isTop, onClose]);
}

/* ------------------------------ focus trap ------------------------------ */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab focus inside the overlay while open and restores focus to the
 * previously focused element (usually the trigger) on close.
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;

    // Focus the surface itself, not the first field: focusing an input would
    // pop the mobile keyboard before the user asked for it.
    const raf = requestAnimationFrame(() => {
      if (node && !node.contains(document.activeElement)) node.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [ref, open]);
}
