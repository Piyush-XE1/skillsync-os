import { useEffect, useSyncExternalStore } from "react";
import { useIsDesktop } from "@/hooks/use-breakpoint";

/**
 * Tracks the on-screen keyboard (IME) inset using visualViewport.
 * Exposes the value in px and mirrors it to the `--kb-inset` CSS variable
 * on <html> so plain CSS can react without React re-renders.
 */

let inset = 0;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return inset;
}

function getServerSnapshot() {
  return 0;
}

function setInset(next: number) {
  const rounded = Math.max(0, Math.round(next));
  if (rounded === inset) return;
  inset = rounded;
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--kb-inset", `${inset}px`);
    document.documentElement.dataset.keyboard = inset > 120 ? "open" : "closed";
  }
  emit();
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const vv = window.visualViewport;
  if (!vv) return;
  let frame = 0;
  const measure = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      setInset(window.innerHeight - (vv.height + vv.offsetTop));
    });
  };
  vv.addEventListener("resize", measure, { passive: true });
  vv.addEventListener("scroll", measure, { passive: true });
  measure();
}

/**
 * Raw keyboard inset in px (0 when closed / unsupported).
 * Always 0 on desktop-class viewports: keyboard insets, viewport shifts and
 * sheet repositioning are mobile-only behaviour.
 */
export function useKeyboardInset() {
  useEffect(() => {
    start();
  }, []);
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDesktop = useIsDesktop();
  return isDesktop ? 0 : raw;
}

export function useKeyboardOpen() {
  return useKeyboardInset() > 120;
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
