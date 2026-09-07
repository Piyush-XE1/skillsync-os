/**
 * Backup & Restore — the whole feature on one screen.
 *
 * Layout is deliberately linear: where you stand, the two things you do most,
 * the copies this device holds, the cloud, and the schedule. Everything that
 * used to live behind four tabs is either one tap away or inside "Options".
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CloudUpload,
  Database,
  Download,
  HardDrive,
  Hourglass,
  KeyRound,
  ListChecks,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { Toggle } from "@/components/common/Toggle";
import { BottomSheet } from "@/components/edit/Sheet";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CloudPanel } from "./CloudPanel";
import { formatBytes, formatRelative, describeBackupData } from "@/lib/backup/advanced-backup";
import { defaultLabel, type VaultSummary } from "@/lib/backup/vault";
import { useBackupStore, type CreateBackupInput } from "@/store/useBackupStore";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function BackupSection({ onRequestReset }: { onRequestReset?: () => void }) {
  const ready = useBackupStore((s) => s.ready);
  const records = useBackupStore((s) => s.records);
  const stats = useBackupStore((s) => s.stats);
  const lastMeta = useBackupStore((s) => s.lastMeta);
  const health = useBackupStore((s) => s.health);
  const busy = useBackupStore((s) => s.busy);
  const error = useBackupStore((s) => s.error);
  const auto = useBackupStore((s) => s.auto);
  const created = useBackupStore((s) => s.created);
  const pendingRestore = useBackupStore((s) => s.pendingRestore);
  const restoreStep = useBackupStore((s) => s.restoreStep);
  const activity = useBackupStore((s) => s.activity);

  const create = useBackupStore((s) => s.create);
  const refresh = useBackupStore((s) => s.refresh);
  const clearError = useBackupStore((s) => s.clearError);
  const saveCreated = useBackupStore((s) => s.saveCreated);
  const dismissCreated = useBackupStore((s) => s.dismissCreated);
  const restoreFromFile = useBackupStore((s) => s.restoreFromFile);
  const restoreFromVault = useBackupStore((s) => s.restoreFromVault);
  const unlockPendingRestore = useBackupStore((s) => s.unlockPendingRestore);
  const setRestoreStep = useBackupStore((s) => s.setRestoreStep);
  const confirmRestore = useBackupStore((s) => s.confirmRestore);
  const cancelRestore = useBackupStore((s) => s.cancelRestore);
  const undoLastRestore = useBackupStore((s) => s.undoLastRestore);
  const lastSafetyId = useBackupStore((s) => s.lastSafetyId);
  const deleteRecord = useBackupStore((s) => s.deleteRecord);
  const downloadRecord = useBackupStore((s) => s.downloadRecord);
  const verifyLatest = useBackupStore((s) => s.verifyLatest);
  const clearLocalCopies = useBackupStore((s) => s.clearLocalCopies);
  const updateAuto = useBackupStore((s) => s.updateAuto);
  const toggleAuto = useBackupStore((s) => s.toggleAuto);
  const runAutoNow = useBackupStore((s) => s.runAutoNow);

  const fileRef = useRef<HTMLInputElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [options, setOptions] = useState<{
    compression: boolean;
    incremental: boolean;
    encryption: boolean;
  }>({
    compression: true,
    incremental: false,
    encryption: false,
  });
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [unlockValue, setUnlockValue] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<VaultSummary | null>(null);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    void useBackupStore.getState().init();
  }, []);

  const hydrated = useHydrated();
  // The workspace's shape, cheaply. Subscribing to the counts means the line
  // under the status updates the moment something is added — and the full
  // export below only runs when it actually has to, never on every render.
  const recordCount = useAppStore(
    (s) =>
      s.roadmaps.length +
      s.notes.length +
      s.projects.length +
      s.planner.length +
      s.habits.length +
      s.habitLogs.length,
  );
  const currentSummary = useMemo(() => {
    if (!hydrated || recordCount === 0) return "";
    try {
      return describeBackupData(JSON.parse(useAppStore.getState().exportJSON()));
    } catch {
      return "";
    }
  }, [hydrated, recordCount]);

  const passwordMismatch = options.encryption && password.length > 0 && password !== passwordAgain;
  const blocked = Boolean(busy) || !ready;

  const runCreate = async () => {
    const input: CreateBackupInput = {
      compression: options.compression,
      incremental: options.incremental,
    };
    if (options.encryption) {
      if (password.length < 6) {
        haptics.error();
        sound.error();
        return;
      }
      if (password !== passwordAgain) return;
      input.encryption = true;
      input.password = password;
    }
    haptics.tap();
    const result = await create(input);
    if (result) {
      sound.success();
      setPassword("");
      setPasswordAgain("");
      setOptions((prev) => ({ ...prev, encryption: false }));
    } else {
      sound.error();
    }
  };

  const visibleRecords = showAll ? records : records.slice(0, 4);
  const statusTone = health?.status ?? (lastMeta ? "warning" : "unknown");

  return (
    <section className="space-y-6">
      {/* ---------------------------------------------------------------- status */}
      <Card className="space-y-3.5" elevated>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
              statusTone === "healthy" && "bg-emerald-400/15 text-emerald-300",
              statusTone === "warning" && "bg-amber-400/15 text-amber-300",
              statusTone === "critical" && "bg-[var(--danger)]/15 text-[var(--danger)]",
              statusTone === "unknown" && "bg-white/[0.05] text-muted-foreground",
            )}
          >
            {statusTone === "healthy" ? (
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
            ) : statusTone === "unknown" ? (
              <Database className="h-5 w-5" strokeWidth={1.75} />
            ) : (
              <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold leading-tight tracking-tight">
              {busy
                ? `${busy.label}…`
                : lastMeta
                  ? `Last backup ${formatRelative(lastMeta.createdAt)}`
                  : "Nothing is backed up yet"}
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {busy ? (
                "This stays off the main thread — keep using the app."
              ) : lastMeta ? (
                <>
                  {formatBytes(lastMeta.sizeBytes)} ·{" "}
                  {Object.values(lastMeta.recordCounts ?? {}).reduce((a, b) => a + b, 0)} records
                  {lastMeta.encrypted ? " · encrypted" : ""}
                  {lastMeta.compressed ? " · compressed" : ""}
                </>
              ) : currentSummary ? (
                <>Ready to save {currentSummary}.</>
              ) : (
                <>Back up everything in one file, or let SkillSync keep recent copies.</>
              )}
            </p>
          </div>
        </div>

        {busy && <Progress value={70} className="h-1" />}

        {!busy && health && health.recommendations.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
            <Sparkles
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.9}
            />
            {health.recommendations[0]}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={runCreate} disabled={blocked} className="gradient-primary h-11">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {lastMeta ? "Back up now" : "Create backup"}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            disabled={blocked}
            onClick={() => {
              haptics.tap();
              fileRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" />
            Restore
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-[var(--danger)]/[0.08] px-3 py-2 text-[12px] leading-relaxed">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--danger)]"
              strokeWidth={2}
            />
            <span className="min-w-0 flex-1 text-[var(--danger)]">{error}</span>
            <button onClick={clearError} className="text-[11px] text-muted-foreground underline">
              Dismiss
            </button>
          </div>
        )}

        {lastSafetyId && (
          <button
            onClick={() => void undoLastRestore()}
            className="flex w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-left text-[12px] text-muted-foreground active:scale-[0.99]"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.9} />
            Undo that restore — go back to the snapshot taken before it
          </button>
        )}
      </Card>

      {/* ---------------------------------------------------------------- options */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015]">
        <button
          onClick={() => {
            haptics.tap();
            setOptionsOpen((prev) => !prev);
          }}
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
          aria-expanded={optionsOpen}
        >
          <KeyRound className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          <span className="flex-1 text-[13px] font-medium tracking-tight">
            Options for the next backup
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            {options.encryption ? "Encrypted" : options.compression ? "Compressed" : "Plain file"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              optionsOpen && "rotate-180",
            )}
          />
        </button>

        {optionsOpen && (
          <div className="space-y-3 border-t border-white/[0.05] px-4 py-3.5">
            <OptionRow
              title="Compress"
              hint="Smaller file. Same contents; needs a modern browser to open."
              on={options.compression}
              onChange={(v) => setOptions((prev) => ({ ...prev, compression: v }))}
            />
            <OptionRow
              title="Only what changed"
              hint="Incremental: smaller and faster, but it needs the newest full backup to restore."
              on={options.incremental}
              onChange={(v) => setOptions((prev) => ({ ...prev, incremental: v }))}
            />
            <OptionRow
              title="Encrypt with a password"
              hint="The file is unreadable without it. There is no recovery — do not lose it."
              on={options.encryption}
              onChange={(v) => setOptions((prev) => ({ ...prev, encryption: v }))}
            />

            {options.encryption && (
              <div className="space-y-2 rounded-xl bg-white/[0.03] p-3">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (6+ characters)"
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
                {passwordMismatch && (
                  <p className="text-[11.5px] text-[var(--danger)]">Those two do not match yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- vault */}
      <div className="space-y-2.5">
        <SectionHeader
          title="On this device"
          action={
            stats.count > 0
              ? `${stats.count} ${stats.count === 1 ? "copy" : "copies"} · ${formatBytes(stats.bytes)}`
              : undefined
          }
        />

        {visibleRecords.length === 0 ? (
          <Card className="flex items-center gap-3 p-4">
            <HardDrive className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
            <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
              No copies yet. A backup you create is kept here as well as in the file you save, so
              you can restore without hunting for it.
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {visibleRecords.map((record) => (
              <VaultRow
                key={record.id}
                record={record}
                disabled={blocked}
                isLast={Boolean(lastMeta?.backupId === record.id)}
                onRestore={() => void restoreFromVault(record.id)}
                onDownload={() => void downloadRecord(record.id)}
                onDelete={() => setConfirmDelete(record)}
              />
            ))}
            {records.length > 4 && (
              <button
                onClick={() => {
                  haptics.tap();
                  setShowAll((prev) => !prev);
                }}
                className="w-full py-1 text-[12px] font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                {showAll ? "Show less" : `Show all ${records.length} copies`}
              </button>
            )}
          </div>
        )}

        {!stats.persistent && (
          <p className="px-1 text-[11.5px] leading-relaxed text-amber-300/90">
            This browser will not keep copies between visits (private mode, or IndexedDB is
            blocked). Always save the file somewhere permanent.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void verifyLatest()}
            disabled={blocked || stats.count === 0}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Verify newest
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActivity(true)}
            disabled={activity.length === 0}
          >
            <Hourglass className="h-3.5 w-3.5" />
            Activity
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void clearLocalCopies()}
            disabled={blocked || stats.count === 0}
            className="text-[var(--danger)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove all copies
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- cloud */}
      <CloudPanel disabled={blocked} />

      {/* ---------------------------------------------------------------- auto */}
      <div className="space-y-2.5">
        <SectionHeader title="Automatic copies" />
        <Card className="space-y-3.5 p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold tracking-tight">Keep a rolling copy</div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                SkillSync saves to this device's vault while the app is open — no dialog, no
                network. Files you save yourself are never overwritten.
              </p>
            </div>
            <Toggle on={auto.enabled} onChange={toggleAuto} label="Automatic copies" />
          </div>

          {auto.enabled && (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                {[6, 24, 48, 168].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => updateAuto({ intervalHours: hours })}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-[11.5px] font-medium transition-colors",
                      auto.intervalHours === hours
                        ? "border-transparent gradient-primary text-white"
                        : "border-white/[0.07] bg-white/[0.02] text-muted-foreground",
                    )}
                  >
                    {hours === 6
                      ? "6 h"
                      : hours === 24
                        ? "Daily"
                        : hours === 48
                          ? "2 days"
                          : "Weekly"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <span className="flex-1 text-[12px] text-muted-foreground">
                  Keep the newest {auto.maxSnapshots} {auto.maxSnapshots === 1 ? "copy" : "copies"}
                </span>
                <div className="flex items-center gap-1.5">
                  {[3, 5, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => updateAuto({ maxSnapshots: n })}
                      className={cn(
                        "h-8 w-8 rounded-lg border text-[12px] font-medium transition-colors",
                        auto.maxSnapshots === n
                          ? "border-white/[0.16] bg-white/[0.1] text-foreground"
                          : "border-white/[0.06] text-muted-foreground",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-white/[0.05] pt-3">
                <span className="min-w-0 flex-1 text-[11.5px] text-muted-foreground">
                  {auto.lastCreatedAt
                    ? `Last auto copy ${formatRelative(auto.lastCreatedAt)}`
                    : "Not run yet"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    haptics.tap();
                    void runAutoNow();
                  }}
                  disabled={blocked}
                >
                  Run now
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ---------------------------------------------------------------- reset */}
      {onRequestReset && (
        <button
          onClick={onRequestReset}
          className="flex w-full items-center gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.05] px-4 py-3.5 text-left transition-colors active:scale-[0.98]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
            <Trash2 className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold tracking-tight text-[var(--danger)]">
              Reset SkillSync
            </span>
            <span className="block text-[11.5px] text-muted-foreground">
              Erase this workspace (your backup files stay on your device)
            </span>
          </span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void restoreFromFile(file);
          event.target.value = "";
        }}
      />

      {/* ---------------------------------------------------------------- sheets */}
      <BottomSheet
        open={created !== null}
        onClose={dismissCreated}
        title="Backup created"
        description="It is already in this device's vault. A copy outside the app protects you from losing the device."
      >
        <div className="space-y-4">
          {created && (
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Size" value={formatBytes(created.meta.sizeBytes)} />
              <MiniStat
                label="Records"
                value={String(Object.values(created.meta.recordCounts ?? {}).reduce((a, b) => a + b, 0))}
              />
              <MiniStat
                label="Flags"
                value={
                  created.meta.encrypted
                    ? "Encrypted"
                    : created.meta.compressed
                      ? "Compressed"
                      : "Plain"
                }
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button className="gradient-primary" onClick={() => void saveCreated("download")}>
              <Download className="h-4 w-4" />
              Save file
            </Button>
            <Button variant="outline" onClick={() => void saveCreated("share")}>
              <CloudUpload className="h-4 w-4" />
              Share
            </Button>
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            If the password you just used is lost, the file cannot be recovered. Store it somewhere
            you trust.
          </p>
          <Button variant="ghost" className="w-full" onClick={dismissCreated}>
            Keep vault copy only
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={restoreStep === 1 && Boolean(pendingRestore)}
        onClose={cancelRestore}
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
                  This file is password-protected. Type the password to read it.
                </p>
                <Input
                  type="password"
                  autoFocus
                  value={unlockValue}
                  onChange={(e) => setUnlockValue(e.target.value)}
                  placeholder="Password"
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={cancelRestore}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gradient-primary"
                    disabled={!unlockValue}
                    onClick={() => void unlockPendingRestore(unlockValue)}
                  >
                    Unlock
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-3 text-[12.5px] leading-relaxed">
                  Restoring replaces everything in this workspace. A snapshot of what you have now
                  is saved first, so you can undo it.
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
                        : "unknown"
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
                  <Button variant="outline" className="flex-1" onClick={cancelRestore}>
                    Cancel
                  </Button>
                  <Button className="flex-1 gradient-primary" onClick={() => setRestoreStep(2)}>
                    Review
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={restoreStep === 2 && Boolean(pendingRestore)}
        onClose={cancelRestore}
        title="Confirm restore"
        description="This writes the backup into your workspace right away."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]"
              strokeWidth={2}
            />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Everything currently in SkillSync will be replaced with the contents of this backup.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={cancelRestore}>
              Cancel
            </Button>
            <Button className="flex-1 bg-[var(--danger)]" onClick={() => void confirmRestore()}>
              Restore it
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this copy?"
        description="Only the vault copy goes away — files you saved and cloud copies are untouched."
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Button>
            <Button
              className="flex-1 bg-[var(--danger)]"
              onClick={() => {
                if (confirmDelete) void deleteRecord(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={showActivity}
        onClose={() => setShowActivity(false)}
        title="Recent backup activity"
      >
        <ul className="space-y-2">
          {activity.slice(0, 20).map((entry) => (
            <li
              key={`${entry.backupId}-${entry.createdAt}`}
              className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5"
            >
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] leading-snug">{entry.notes}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {formatRelative(entry.createdAt)} · {formatBytes(entry.sizeBytes)} ·{" "}
                  {entry.source}
                </span>
              </span>
            </li>
          ))}
          {activity.length === 0 && (
            <li className="text-[12.5px] text-muted-foreground">Nothing logged yet.</li>
          )}
        </ul>
      </BottomSheet>
    </section>
  );
}

function OptionRow({
  title,
  hint,
  on,
  onChange,
}: {
  title: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium">{title}</div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <Toggle on={on} onChange={onChange} label={title} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-[12.5px] font-medium">{value}</div>
    </div>
  );
}

function VaultRow({
  record,
  disabled,
  isLast,
  onRestore,
  onDownload,
  onDelete,
}: {
  record: VaultSummary;
  disabled: boolean;
  isLast: boolean;
  onRestore: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          record.kind === "auto"
            ? "bg-white/[0.04] text-muted-foreground"
            : "bg-white/[0.05] text-foreground",
        )}
      >
        {record.encrypted ? (
          <Lock className="h-4 w-4" strokeWidth={1.8} />
        ) : (
          <Database className="h-4 w-4" strokeWidth={1.8} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium tracking-tight">
            {record.label || defaultLabel(record.kind, record.createdAt)}
          </span>
          {isLast && <Chip tone="primary">newest</Chip>}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {formatRelative(record.createdAt)} · {formatBytes(record.sizeBytes)} · {record.records}{" "}
          records
          {record.compressed ? " · gz" : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDownload}
          disabled={disabled}
          aria-label="Save as file"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDelete}
          disabled={disabled}
          aria-label="Delete copy"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onRestore} disabled={disabled}>
          Restore
        </Button>
      </div>
    </Card>
  );
}
