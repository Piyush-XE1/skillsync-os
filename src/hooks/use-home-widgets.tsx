import { useCallback, useEffect, useRef } from "react";
import { toAppData, useAppStore } from "@/store/useAppStore";
import { hasNativeBridge, nativeWidgetSync, nativeWidgetTakeActions } from "@/lib/native/bridge";
import { buildWidgetSnapshot, parseWidgetActions, planWidgetActions } from "@/lib/home-widgets";

/** Widgets are glanceable — a slightly lazy push keeps typing cheap. */
const SYNC_DEBOUNCE_MS = 1200;

/**
 * Keeps the Android home screen widgets in sync with the workspace.
 *
 * Two directions:
 *  1. Workspace → widgets: after any store change the compact snapshot is
 *     pushed to the native shell, which repaints every placed widget.
 *  2. Widgets → workspace: taps made while the app was closed are replayed as
 *     store operations, so a check-in from the home screen counts everywhere.
 *
 * A no-op in the browser: without the native bridge nothing is subscribed.
 */
export function useHomeWidgets() {
  const hydrated = useAppStore((s) => s._hydrated);
  const draining = useRef(false);

  const push = useCallback(async () => {
    if (!hasNativeBridge()) return;
    try {
      const data = toAppData(useAppStore.getState());
      await nativeWidgetSync(buildWidgetSnapshot(data));
    } catch {
      /* a failed sync simply leaves the last snapshot in place */
    }
  }, []);

  const drain = useCallback(async () => {
    if (!hasNativeBridge() || draining.current) return;
    draining.current = true;
    try {
      const actions = parseWidgetActions(await nativeWidgetTakeActions());
      if (actions.length === 0) return;

      const state = useAppStore.getState();
      const operations = planWidgetActions(
        {
          habits: state.habits,
          habitLogs: state.habitLogs,
          planner: state.planner,
          transactions: state.expenses.transactions,
        },
        actions,
      );
      for (const operation of operations) {
        const store = useAppStore.getState();
        if (operation.kind === "setHabit") {
          // `toggleHabitToday` is the single writer for habit logs; the planner
          // above already established that this toggle reaches the desired state.
          store.toggleHabitToday(operation.id, operation.date);
        } else if (operation.kind === "setTaskDone") {
          store.updatePlannerTask(operation.id, { done: operation.done });
        } else {
          store.addTransaction({
            title: operation.title,
            amount: operation.amount,
            type: "debit",
            tags: operation.tags,
            at: operation.at,
            description: "Logged from a home screen widget",
          });
        }
      }
      if (operations.length > 0) await push();
    } catch {
      /* queued taps stay queued if anything goes wrong */
    } finally {
      draining.current = false;
    }
  }, [push]);

  // Replay widget taps whenever the app becomes relevant again.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined" || !hasNativeBridge()) return;

    void drain();

    const onVisible = () => {
      if (document.visibilityState === "visible") void drain();
    };
    const onWidgetAction = () => void drain();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("skillsync:widget-actions", onWidgetAction);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("skillsync:widget-actions", onWidgetAction);
    };
  }, [hydrated, drain]);

  // Workspace → widgets, debounced so a burst of edits results in one sync.
  useEffect(() => {
    if (!hydrated || !hasNativeBridge()) return;

    void push();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useAppStore.subscribe(() => {
      if (!useAppStore.getState()._hydrated) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void push(), SYNC_DEBOUNCE_MS);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [hydrated, push]);
}
