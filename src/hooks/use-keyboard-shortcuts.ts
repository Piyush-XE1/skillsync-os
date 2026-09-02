import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

/**
 * Global keyboard shortcuts (ignored while typing in a field):
 *   Cmd/Ctrl + K or "/" → command palette (search)
 *   "f"                → focus timer
 *   "c"                → code / DSA prep
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (isTypingTarget(e.target)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        void navigate({ to: "/search" });
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        void navigate({ to: "/search" });
        return;
      }
      if (e.key.toLowerCase() === "f" && !e.altKey) {
        void navigate({ to: "/focus" });
      }
      if (e.key.toLowerCase() === "c" && !e.altKey && !e.metaKey && !e.ctrlKey) {
        void navigate({ to: "/coding" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}
