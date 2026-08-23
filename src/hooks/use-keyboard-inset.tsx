import { useEffect, useSyncExternalStore } from "react";
import { useIsDesktop } from "@/hooks/use-breakpoint";

/**
 * Tracks the on-screen keyboard (IME) inset using visualViewport.
 * Exposes the value in px and mirrors it to the `--kb-inset` CSS variable
 * on <html> so plain CSS can react without React re-renders.
 */

let inset = 0;
let open = false;
/**
 * Largest visual-viewport height observed while no editable element is
 * focused. In `interactive-widget=resizes-content` / WebView `adjustResize`
 * modes the layout viewport shrinks with the keyboard, so the raw inset
 * difference stays 0 — detecting "open" needs the focus + shrink fallback.
 */
let baselineHeight = 0;
let editableFocusCount = 0;

const KEYBOARD_THRESHOLD = 120;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Immutable snapshot — useSyncExternalStore detects changes by reference.
let snapshot = { inset: 0, open: false };

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return snapshot;
}

function publish(nextInset: number, nextOpen: boolean) {
  if (nextInset === inset && nextOpen === open) return;
  inset = nextInset;
  open = nextOpen;
  snapshot = { inset, open };
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--kb-inset", `${inset}px`);
    document.documentElement.dataset.keyboard = open ? "open" : "closed";
  }
  emit();
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select") || (target.isContentEditable ?? false));
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const vv = window.visualViewport;
  if (!vv) return;

  window.addEventListener(
    "focusin",
    (e) => {
      if (isEditable(e.target)) {
        editableFocusCount += 1;
        measure();
      }
    },
    { passive: true },
  );
  window.addEventListener(
    "focusout",
    (e) => {
      if (isEditable(e.target)) {
        editableFocusCount = Math.max(0, editableFocusCount - 1);
        // The keyboard dismissal animation resizes the viewport; measure both
        // now and just after it typically completes.
        measure();
        setTimeout(measure, 400);
      }
    },
    { passive: true },
  );

  let frame = 0;
  const measureNow = () => {
    // Refreshed only while nothing editable is focused, so an open keyboard
    // never poisons the baseline.
    if (editableFocusCount === 0) {
      baselineHeight = Math.max(baselineHeight, vv.height);
    }
    const raw = window.innerHeight - (vv.height + vv.offsetTop);
    const shrink = baselineHeight > 0 ? baselineHeight - (vv.height + vv.offsetTop) : 0;
    publish(
      Math.max(0, Math.round(raw)),
      raw > KEYBOARD_THRESHOLD || (editableFocusCount > 0 && shrink > KEYBOARD_THRESHOLD),
    );
  };
  const measure = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      measureNow();
    });
  };
  vv.addEventListener("resize", measure, { passive: true });
  vv.addEventListener("scroll", measure, { passive: true });
  measureNow();
}

/**
 * Raw keyboard inset in px (0 when closed / unsupported), for layout margins.
 * Always 0 on desktop-class viewports: keyboard insets, viewport shifts and
 * sheet repositioning are mobile-only behaviour.
 */
export function useKeyboardInset() {
  useEffect(() => {
    start();
  }, []);
  const { inset: raw } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDesktop = useIsDesktop();
  return isDesktop ? 0 : raw;
}

export function useKeyboardOpen() {
  useEffect(() => {
    start();
  }, []);
  const { open: isOpen } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDesktop = useIsDesktop();
  return !isDesktop && isOpen;
}

/* ---------------- overlay (sheet / dialog) tracking ---------------- */

/**
 * Overlay tracking lives in `use-overlay` (single stack shared by every
 * sheet / dialog). Re-exported here for the layout components.
 */
export { useAnyOverlayOpen as useOverlayOpen } from "@/hooks/use-overlay";

/**
 * Keeps the focused field visible inside a scroll container when the
 * keyboard opens. Attach the returned ref to the scrollable element.
 */
export function useScrollFocusedIntoView(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.scrollIntoView !== "function") return;
      // Wait for the keyboard animation / viewport resize to settle.
      const run = () => target.scrollIntoView({ block: "center", behavior: "smooth" });
      requestAnimationFrame(() => setTimeout(run, 260));
    };
    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
  }, [ref, active]);
}
