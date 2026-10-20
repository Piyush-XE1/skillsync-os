import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useOverlaySound } from "@/hooks/use-sound";
import { sound } from "@/lib/sound";
import { useKeyboardInset, useScrollFocusedIntoView } from "@/hooks/use-keyboard-inset";
import {
  useDismissOnEscape,
  useFocusTrap,
  useOverlayLayer,
  usePresence,
  useScrollLock,
} from "@/hooks/use-overlay";

/** Portals overlays to <body> so no route-level stacking context can trap them. */
function OverlayPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/** Exit choreography duration — mirrors the entry animations. */
const OVERLAY_EXIT_MS = 200;

const BACKDROP_ENTER =
  "absolute inset-0 bg-black/60 animate-in fade-in duration-200 motion-reduce:animate-none";
const BACKDROP_EXIT =
  "absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-200 motion-reduce:transition-none";

/**
 * Responsive edit surface:
 *  - phones  → bottom sheet (safe-area + keyboard aware)
 *  - md and up → centered dialog
 * Same children in both, no duplicated form logic.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
  footer,
  showClose = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** One line under the title — keeps confirm sheets self-explanatory. */
  description?: string;
  children: ReactNode;
  className?: string;
  /** Sticky action row pinned above the keyboard. */
  footer?: ReactNode;
  /** Mandatory onboarding surfaces can hide dismissal until the user completes them. */
  showClose?: boolean;
}) {
  useOverlaySound(open);
  const kb = useKeyboardInset();
  const bodyRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const { mounted, closing } = usePresence(open, OVERLAY_EXIT_MS);
  const { zIndex, isTop } = useOverlayLayer(mounted);
  useScrollLock(mounted);
  useDismissOnEscape(open, isTop, onClose);
  useFocusTrap(surfaceRef, mounted);
  useScrollFocusedIntoView(bodyRef, mounted);

  if (!mounted) return null;

  return (
    <OverlayPortal>
      <div
        className={cn(
          "fixed inset-0 flex items-end justify-center md:items-center md:p-8",
          // Inert while closing: no double actions, no background interaction.
          closing && "pointer-events-none",
        )}
        style={{ zIndex }}
      >
        <div className={closing ? BACKDROP_EXIT : BACKDROP_ENTER} onClick={onClose} aria-hidden />
        <div
          ref={surfaceRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : "Dialog"}
          tabIndex={-1}
          className={cn(
            "glass relative mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-[12px] bg-surface shadow-[var(--shadow-float)] outline-none transition-[max-height,margin] duration-200 ease-[var(--ease-out-soft)] motion-reduce:animate-none motion-reduce:transition-none",
            // Tablet & desktop: centered dialog / modal instead of a bottom sheet.
            "md:max-w-lg md:rounded-[10px] lg:max-w-xl",
            closing
              ? "translate-y-[14px] opacity-0 transition-[opacity,transform] duration-200 ease-in md:translate-y-0 md:scale-[0.96]"
              : "animate-sheet-up md:animate-dialog-pop",
            className,
          )}
          style={{
            marginBottom: kb,
            maxHeight: kb > 0 ? `calc(100dvh - ${kb}px - 16px)` : "min(92dvh, 100svh - 16px)",
          }}
        >
          <div className="mx-auto mt-3 h-px w-10 shrink-0 bg-primary/60 md:hidden" />
          <div className="flex shrink-0 items-start gap-4 border-b border-border px-6 pb-4 pt-4 md:pt-6">
            <div className="min-w-0 flex-1">
              <div aria-hidden className="mb-2 h-px w-6 bg-primary" />
              <h3
                id={titleId}
                className="font-editorial min-w-0 text-[23px] font-normal leading-tight tracking-[-0.025em] text-foreground md:text-[27px]"
              >
                {title}
              </h3>
              {description ? (
                <p className="mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border bg-surface-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
          <div
            ref={bodyRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 [touch-action:pan-y]",
              footer ? "pb-3" : "pb-[max(env(safe-area-inset-bottom),24px)] md:pb-6",
            )}
            style={kb > 0 ? { paddingBottom: footer ? 12 : 16 } : undefined}
          >
            {children}
          </div>
          {footer ? (
            <div
              className="shrink-0 border-t border-border bg-surface px-6 pt-3 md:pb-5"
              style={{
                paddingBottom: kb > 0 ? 12 : "max(env(safe-area-inset-bottom),20px)",
              }}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </OverlayPortal>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  useOverlaySound(open);
  const kb = useKeyboardInset();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const { mounted, closing } = usePresence(open, OVERLAY_EXIT_MS);
  const { zIndex, isTop } = useOverlayLayer(mounted);
  useScrollLock(mounted);
  useDismissOnEscape(open, isTop, onClose);
  useFocusTrap(surfaceRef, mounted);

  // Destructive confirmations announce themselves tactilely (and audibly),
  // exactly once.
  useEffect(() => {
    if (open && destructive) {
      haptics.warning();
      sound.error();
    }
  }, [open, destructive]);

  if (!mounted) return null;

  return (
    <OverlayPortal>
      <div
        className={cn(
          "fixed inset-0 flex items-center justify-center p-6",
          closing && "pointer-events-none",
        )}
        style={{ zIndex, paddingBottom: kb ? kb + 24 : undefined }}
      >
        <div className={closing ? BACKDROP_EXIT : BACKDROP_ENTER} onClick={onClose} aria-hidden />
        <div
          ref={surfaceRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={cn(
            "glass relative w-full max-w-sm rounded-[10px] bg-surface p-6 shadow-[var(--shadow-float)] outline-none motion-reduce:animate-none motion-reduce:transition-none",
            closing
              ? "scale-[0.96] opacity-0 transition-[opacity,transform] duration-200 ease-in"
              : "animate-dialog-pop",
          )}
        >
          <h3 id={titleId} className="text-[17px] font-semibold tracking-tight">
            {title}
          </h3>
          {description ? (
            <p id={descId} className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="pressable flex-1 rounded-[6px] border border-border-strong py-3 text-[14px] font-medium text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.impact();
                if (destructive) sound.trash();
                else sound.success();
                onConfirm();
                onClose();
              }}
              className={cn(
                "pressable flex-1 rounded-[6px] border py-3 text-[14px] font-medium text-primary-foreground",
                destructive ? "border-danger bg-danger" : "gradient-primary border-primary",
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
