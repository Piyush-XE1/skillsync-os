import { useEffect } from "react";
import { toast } from "sonner";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { readDemoSnapshot } from "@/lib/demo";

/**
 * Crash guard for demo mode.
 *
 * `loadDemoWorkspace()` snapshots the real workspace before adopting the demo
 * persona, and the snapshot key survives the session. If the app is closed
 * while the demo is running, the next boot finds the snapshot, restores the
 * real workspace and says so — a demo can never strand someone's data.
 *
 * Runs once per document load, after rehydration, and is a no-op when no
 * snapshot exists.
 */
export function useDemoRecovery(): void {
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    if (useAppStore.getState().demoMode) return;
    if (!readDemoSnapshot()) return;
    const restored = useAppStore.getState().recoverFromDemo();
    if (restored) {
      toast.message("Demo closed", {
        description: "Your workspace was restored exactly as you left it.",
        duration: 5000,
      });
    }
  }, [hydrated]);
}
