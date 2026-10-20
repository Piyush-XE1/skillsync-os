/**
 * Backup & Restore deliberately exposes two destinations only: a portable
 * device file and Google Drive. The mature backup/restore engine remains
 * underneath so older, encrypted and compressed backup files still restore.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileDown,
  FileUp,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import { BottomSheet } from "@/components/edit/Sheet";
import { Input } from "@/components/ui/input";
import { CloudPanel } from "./CloudPanel";
import { describeBackupData, formatBytes, formatRelative } from "@/lib/backup/advanced-backup";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { useBackupStore } from "@/store/useBackupStore";

export function BackupSection() {
  const ready = useBackupStore((state) => state.ready);
  const busy = useBackupStore((state) => state.busy);
  const error = useBackupStore((state) => state.error);
  const lastMeta = useBackupStore((state) => state.lastMeta);
  const created = useBackupStore((state) => state.created);
  const pendingRestore = useBackupStore((state) => state.pendingRestore);
  const restoreStep = useBackupStore((state) => state.restoreStep);
  const lastSafetyId = useBackupStore((state) => state.lastSafetyId);

  const create = useBackupStore((state) => state.create);
  const clearError = useBackupStore((state) => state.clearError);
  const saveCreated = useBackupStore((state) => state.saveCreated);
  const dismissCreated = useBackupStore((state) => state.dismissCreated);
  const restoreFromFile = useBackupStore((state) => state.restoreFromFile);
  const unlockPendingRestore = useBackupStore((state) => state.unlockPendingRestore);
  const setRestoreStep = useBackupStore((state) => state.setRestoreStep);
  const confirmRestore = useBackupStore((state) => state.confirmRestore);
  const cancelRestore = useBackupStore((state) => state.cancelRestore);
  const undoLastRestore = useBackupStore((state) => state.undoLastRestore);

  const fileRef = useRef<HTMLInputElement>(null);
  const [unlockValue, setUnlockValue] = useState("");

  useEffect(() => {
    void useBackupStore.getState().init();
  }, []);

  const hydrated = useHydrated();
  const recordCount = useAppStore(
    (state) =>
      state.roadmaps.length +
      state.notes.length +
      state.projects.length +
      state.planner.length +
      state.habits.length +
      state.habitLogs.length,
  );
  const currentSummary = useMemo(() => {
    if (!hydrated || recordCount === 0) return "your workspace";
    try {
      return describeBackupData(JSON.parse(useAppStore.getState().exportJSON()));
    } catch {
      return "your workspace";
    }
  }, [hydrated, recordCount]);

  const blocked = !ready || Boolean(busy);

  const makeDeviceBackup = async () => {
    haptics.tap();
    const result = await create({ compression: true });
    if (result) sound.success();
    else sound.error();
  };

  const closeRestore = () => {
    setUnlockValue("");
    cancelRestore();
  };

  return (
    <section className="space-y-5" aria-label="Backup destinations">
      <div className="flex items-start gap-3 border-y border-white/[0.07] py-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.7} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">
            {busy
              ? `${busy.label}…`
              : lastMeta
                ? `Last protected ${formatRelative(lastMeta.createdAt)}`
                : "Your data stays local until you choose a destination."}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
            {lastMeta
              ? `${formatBytes(lastMeta.sizeBytes)} · ${Object.values(lastMeta.recordCounts ?? {}).reduce((total, count) => total + count, 0)} records`
              : `Ready to protect ${currentSummary}. Existing SkillSync backup files remain compatible.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="backup-destination-card space-y-5 p-5" elevated>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-foreground">
              <FileDown className="h-5 w-5" strokeWidth={1.65} />
            </span>
            <div className="min-w-0">
              <p className="section-kicker">01 / PORTABLE</p>
              <h2 className="mt-1 font-display text-xl leading-tight">Save to device</h2>
            </div>
          </div>

          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Download one complete JSON file you control. Keep it in Files, an external drive, or
            another private location.
          </p>

          <div className="space-y-2">
            <Button
              className="gradient-primary h-11 w-full"
              onClick={() => void makeDeviceBackup()}
              disabled={blocked}
            >
              {busy?.kind === "create" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Save to device
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full"
              disabled={blocked}
              onClick={() => {
                haptics.tap();
                fileRef.current?.click();
              }}
            >
              <FileUp className="h-4 w-4" />
              Restore from a file
            </Button>
          </div>

          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            Restore accepts current and earlier SkillSync JSON backups, including password-protected
            files.
          </p>
        </Card>

        <CloudPanel disabled={blocked} />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] px-3 py-2.5 text-[12px] leading-relaxed"
        >
          <AlertTriangle
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--danger)]"
            strokeWidth={2}
          />
          <span className="min-w-0 flex-1 text-[var(--danger)]">{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="focus-ring min-h-11 px-2 text-[11px] text-muted-foreground underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {lastSafetyId && (
        <button
          type="button"
          onClick={() => void undoLastRestore()}
          className="focus-ring flex min-h-11 w-full items-center gap-2 border border-white/[0.08] px-3 py-2 text-left text-[12px] text-muted-foreground transition-colors hover:border-white/[0.14] hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.9} />
          Undo the last restore and return to the safety snapshot
        </button>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {busy ? `${busy.label} in progress` : "Backup controls ready"}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Choose a SkillSync backup file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void restoreFromFile(file);
          event.target.value = "";
        }}
      />

      <BottomSheet
        open={created !== null}
        onClose={dismissCreated}
        title="Your backup is ready"
        description="Save this portable copy somewhere you can find if this device is lost or reset."
        footer={
          <div className="pb-[max(env(safe-area-inset-bottom),12px)]">
            <Button
              className="gradient-primary h-11 w-full"
              onClick={() => void saveCreated("download")}
            >
              <Download className="h-4 w-4" />
              Save to device
            </Button>
          </div>
        }
      >
        {created && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="File size" value={formatBytes(created.meta.sizeBytes)} />
              <MiniStat
                label="Records"
                value={String(
                  Object.values(created.meta.recordCounts ?? {}).reduce(
                    (total, count) => total + count,
                    0,
                  ),
                )}
              />
            </div>
            <div className="flex items-start gap-2 text-[11.5px] leading-relaxed text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
              The file contains your complete workspace and can be restored from this screen.
            </div>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={restoreStep === 1 && Boolean(pendingRestore)}
        onClose={closeRestore}
        title={
          pendingRestore?.encrypted && !pendingRestore?.data
            ? "Unlock backup"
            : "Restore this backup?"
        }
      >
        {pendingRestore && (
          <div className="space-y-4">
            {pendingRestore.encrypted && !pendingRestore.data ? (
              <>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  This file is password-protected. Enter its password to inspect it before restore.
                </p>
                <Input
                  type="password"
                  autoFocus
                  value={unlockValue}
                  onChange={(event) => setUnlockValue(event.target.value)}
                  placeholder="Backup password"
                  autoComplete="off"
                  aria-label="Backup password"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={closeRestore}>
                    Cancel
                  </Button>
                  <Button
                    className="gradient-primary flex-1"
                    disabled={!unlockValue}
                    onClick={() => void unlockPendingRestore(unlockValue)}
                  >
                    Unlock
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="border border-amber-400/15 bg-amber-400/[0.06] p-3 text-[12.5px] leading-relaxed">
                  Restoring replaces this workspace. SkillSync first keeps a safety snapshot so the
                  change can be undone.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat
                    label="From"
                    value={
                      pendingRestore.name.length > 22
                        ? `${pendingRestore.name.slice(0, 20)}…`
                        : pendingRestore.name
                    }
                  />
                  <MiniStat
                    label="Taken"
                    value={
                      pendingRestore.createdAt
                        ? formatRelative(pendingRestore.createdAt)
                        : "Unknown"
                    }
                  />
                  <MiniStat label="Records" value={String(pendingRestore.records)} />
                  <MiniStat label="Size" value={formatBytes(pendingRestore.sizeBytes)} />
                </div>
                {pendingRestore.data && (
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {describeBackupData(pendingRestore.data)}
                  </p>
                )}
                {pendingRestore.warnings.map((warning) => (
                  <p key={warning} className="text-[11.5px] leading-relaxed text-amber-300/90">
                    {warning}
                  </p>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={closeRestore}>
                    Cancel
                  </Button>
                  <Button className="gradient-primary flex-1" onClick={() => setRestoreStep(2)}>
                    Review restore
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={restoreStep === 2 && Boolean(pendingRestore)}
        onClose={closeRestore}
        title="Confirm restore"
        description="The selected backup will replace the current workspace immediately."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]"
              strokeWidth={2}
            />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Everything currently in SkillSync will be replaced by this backup. Your automatic
              safety snapshot remains on this device.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={closeRestore}>
              Cancel
            </Button>
            <Button className="flex-1 bg-[var(--danger)]" onClick={() => void confirmRestore()}>
              Restore workspace
            </Button>
          </div>
        </div>
      </BottomSheet>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-[12.5px] font-medium">{value}</div>
    </div>
  );
}
