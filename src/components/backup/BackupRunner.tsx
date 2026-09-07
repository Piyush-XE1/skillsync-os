/**
 * Client-only backup runner.
 *
 * Mounted once, in the root route, so there is exactly one auto-backup timer
 * for the whole app: it initialises the vault, finishes any pending OAuth
 * redirect and then checks — while the tab is visible — whether a copy is due.
 */

import { useEffect } from "react";
import { startAutoScheduler } from "@/store/useBackupStore";
import { useAppStore } from "@/store/useAppStore";

export function BackupRunner() {
  const hydrated = useAppStore((s) => s._hydrated);

  useEffect(() => {
    // Wait for rehydration: a snapshot taken before the persisted workspace is
    // loaded would back up empty data and then claim success.
    if (!hydrated) return;
    void startAutoScheduler();
  }, [hydrated]);

  return null;
}
