import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import {
  Download,
  Upload,
  Info,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Share2,
  Save,
  Package,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/utils";
import { BottomSheet } from "@/components/edit/Sheet";

import { useAppStore } from "@/store/useAppStore";
import {
  BACKUP_VERSION,
  backupStatus,
  backupSummary,
  formatBytes,
  fmtDate,
  fmtTime,
  getLastBackupMeta,
  moduleList,
  serializeBackup,
  setLastBackupMeta,
  createSafetySnapshot,
  createAutomaticSnapshot,
  getAutoBackupSettings,
  getAutomaticSnapshotCount,
  setAutoBackupSettings,
  totalRecords,
  validateBackup,
  type BackupMeta,
  type ValidBackup,
} from "@/lib/backup-legacy";
import { APP_VERSION } from "@/lib/version";
import { AppDataSchema, type AppData } from "@/lib/schema";
import { saveBackupFile, shareBackupFile } from "@/lib/platform-files";

export function BackupSection({ onRequestReset }: { onRequestReset: () => void }) {
  const exportJSON = useAppStore((s) => s.exportJSON);
  const importJSON = useAppStore((s) => s.importJSON);

  const [meta, setMeta] = useState<BackupMeta | null>(() => getLastBackupMeta());
  const status = backupStatus(meta);

  // Create backup state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{
    text: string;
    meta: BackupMeta;
    filename: string;
  } | null>(null);

  // Restore backup state
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<ValidBackup | null>(null);
  const [restoreStep, setRestoreStep] = useState<0 | 1 | 2>(0); // 1=preview, 2=confirm
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState<ValidBackup | null>(null);

  // Info state
  const [infoOpen, setInfoOpen] = useState(false);
  const [includedOpen, setIncludedOpen] = useState(false);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [autoSettings, setAutoSettings] = useState(() => getAutoBackupSettings());
  const [autoSnapshotCount, setAutoSnapshotCount] = useState(() => getAutomaticSnapshotCount());

  const snapshotData = (): AppData => {
    const raw = exportJSON();
    return AppDataSchema.parse(JSON.parse(raw));
  };

  const previewData = useMemo(
    () => (createOpen ? snapshotData() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createOpen],
  );

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      // small yield so the spinner paints
      await new Promise((r) => setTimeout(r, 200));
      const data = snapshotData();
      const { text, meta: m, createdAtISO } = serializeBackup(data);
      const stamp = createdAtISO.replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
      const filename = `SkillSync-Backup-${stamp}.json`;
      setCreated({ text, meta: m, filename });
      setLastBackupMeta(m);
      setMeta(m);
      setCreateOpen(false);
      toast.success("Backup created");
    } catch (e) {
      haptics.error();
      sound.error();
      toast.error(errorMessage(e, "Could not create backup"));
    } finally {
      setCreating(false);
    }
  };

  const saveCreated = async () => {
    if (!created || busy) return;
    setBusy("save");
    try {
      const result = await saveBackupFile(created);
      if (result.status === "saved" || result.status === "fallback-download") {
        haptics.success();
        sound.success();
        toast.success(
          result.status === "saved"
            ? `Saved ${created.filename}`
            : `Downloaded ${created.filename}`,
        );
      } else if (result.status === "cancelled") toast("Save cancelled");
      else {
        haptics.error();
        sound.error();
        toast.error(`Could not save backup${result.message ? `: ${result.message}` : ""}`);
      }
    } finally {
      setBusy(null);
    }
  };

  const shareCreated = async () => {
    if (!created || busy) return;
    setBusy("share");
    try {
      const result = await shareBackupFile(created);
      if (result.status === "shared") {
        haptics.success();
        sound.success();
        toast.success("Backup shared");
      } else if (result.status === "fallback-download")
        toast("File sharing is unavailable here — the backup was downloaded.");
      else if (result.status === "cancelled") toast("Share cancelled");
      else {
        haptics.error();
        sound.error();
        toast.error(`Could not share backup${result.message ? `: ${result.message}` : ""}`);
      }
    } finally {
      setBusy(null);
    }
  };

  const handleRestorePick = async (file: File) => {
    try {
      const text = await file.text();
      const result = validateBackup(text);
      if (!result.ok) {
        haptics.error();
        sound.error();
        toast.error(result.error);
        return;
      }
      setPendingRestore(result.backup);
      setRestoreStep(1);
    } catch (e) {
      haptics.error();
      sound.error();
      toast.error(errorMessage(e, "Could not read file"));
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore || restoring) return;
    setRestoring(true);
    try {
      await new Promise((r) => setTimeout(r, 0)); // let the confirmation state paint first
      // Never replace data without first persisting a local recovery snapshot.
      const safety = createSafetySnapshot(snapshotData());
      if (!safety) {
        haptics.error();
        sound.error();
        toast.error("Restore stopped: SkillSync could not create a safety snapshot.");
        return;
      }
      setAutoSnapshotCount(getAutomaticSnapshotCount());
      const result = importJSON(JSON.stringify(pendingRestore.data));
      if (!result.ok) {
        haptics.error();
        sound.error();
        toast.error(`Restore failed: ${result.error}`);
        return;
      }
      // Record a fresh meta reflecting the restored workspace
      const { meta: m } = serializeBackup(pendingRestore.data);
      setLastBackupMeta(m);
      setMeta(m);
      const done = pendingRestore;
      setPendingRestore(null);
      setRestoreStep(0);
      setRestored(done);
      toast.success("Backup restored");
    } finally {
      setRestoring(false);
    }
  };

  const includedData = useMemo(
    () => (includedOpen ? snapshotData() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [includedOpen],
  );

  const summary = pendingRestore ? backupSummary(pendingRestore.data) : null;
  const createSummary = previewData ? backupSummary(previewData) : null;
  const createSize = previewData ? new Blob([JSON.stringify(previewData)]).size : 0;

  return (
    <section className="space-y-3">
      <SectionHeader title="Backup" />

      {/* Status card */}
      <Card className="relative overflow-hidden p-4">
        <div className="flex items-start gap-3">
          <StatusIcon tone={status.tone} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold tracking-tight">{status.label}</div>
            {meta ? (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px] text-muted-foreground">
                <MetaLine k="Date" v={fmtDate(meta.createdAt)} />
                <MetaLine k="Time" v={fmtTime(meta.createdAt)} />
                <MetaLine k="Size" v={formatBytes(meta.sizeBytes)} />
                <MetaLine k="Version" v={`v${meta.backupVersion}`} />
              </div>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                No backups have been created yet.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <ActionCard
          icon={Download}
          label="Create Backup"
          hint="Snapshot everything"
          onClick={() => setCreateOpen(true)}
          tone="primary"
        />
        <ActionCard
          icon={Upload}
          label="Restore Backup"
          hint="From a .json file"
          onClick={() => restoreFileRef.current?.click()}
        />
        <ActionCard
          icon={Info}
          label="Backup Information"
          hint="How it works"
          onClick={() => setInfoOpen(true)}
        />
        <ActionCard
          icon={Package}
          label="What's included"
          hint="Data & features"
          onClick={() => setIncludedOpen(true)}
        />
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13.5px] font-semibold">Automatic local snapshots</div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {autoSettings.enabled
                ? `Daily recovery snapshots are kept on this device (up to 3). ${autoSettings.lastCreatedAt ? `Last: ${fmtDate(autoSettings.lastCreatedAt)}.` : "The next change creates one."}`
                : "Keep up to 3 daily recovery snapshots on this device. Browser apps cannot silently save files to Downloads."}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={autoSettings.enabled}
            onClick={() => {
              const next = { ...autoSettings, enabled: !autoSettings.enabled };
              setAutoBackupSettings(next);
              if (next.enabled) createAutomaticSnapshot(snapshotData(), true);
              setAutoSettings(getAutoBackupSettings());
              setAutoSnapshotCount(getAutomaticSnapshotCount());
            }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${autoSettings.enabled ? "bg-violet-500" : "bg-white/10"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${autoSettings.enabled ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
        {autoSettings.enabled ? (
          <div className="mt-3 text-[11.5px] text-muted-foreground">
            {autoSnapshotCount} local recovery {autoSnapshotCount === 1 ? "snapshot" : "snapshots"}{" "}
            retained · Offline-only
          </div>
        ) : null}
      </Card>

      {/* Reset (separated) */}
      <div className="pt-2">
        <button
          onClick={onRequestReset}
          className="flex w-full items-center gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.05] px-4 py-3.5 text-left transition-colors active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
            <RotateCcw className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold tracking-tight text-[var(--danger)]">
              Reset SkillSync
            </span>
            <span className="block text-[11.5px] text-muted-foreground">
              Permanently delete all local data
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-[var(--danger)]/60" />
        </button>
      </div>

      <input
        ref={restoreFileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleRestorePick(f);
          e.target.value = "";
        }}
      />

      {/* Create Backup preview */}
      <BottomSheet
        open={createOpen}
        onClose={() => (creating ? null : setCreateOpen(false))}
        title="Create backup"
      >
        <div className="space-y-4">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            One file containing your complete SkillSync workspace. Save it somewhere safe — you can
            restore it any time.
          </p>
          {createSummary && previewData ? (
            <SummaryGrid data={previewData} sizeBytes={createSize} />
          ) : null}
          <div className="flex gap-2">
            <button
              disabled={creating}
              onClick={() => setCreateOpen(false)}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium text-foreground active:scale-[0.97] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={creating}
              onClick={handleCreate}
              className="flex-1 rounded-xl gradient-primary py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97] disabled:opacity-70"
            >
              {creating ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating…
                </span>
              ) : (
                "Create backup"
              )}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Create success */}
      <BottomSheet open={created !== null} onClose={() => setCreated(null)} title="Backup ready">
        {created ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="text-[12.5px] leading-relaxed text-muted-foreground">
                Backup created successfully. Save the file to your device or share it to another
                location.
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBox k="Size" v={formatBytes(created.meta.sizeBytes)} />
              <StatBox k="Date" v={fmtDate(created.meta.createdAt)} />
              <StatBox k="Version" v={`v${created.meta.backupVersion}`} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={shareCreated}
                disabled={busy !== null}
                className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium text-foreground active:scale-[0.97] disabled:opacity-60"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {busy === "share" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  {busy === "share" ? "Sharing…" : "Share"}
                </span>
              </button>
              <button
                onClick={saveCreated}
                disabled={busy !== null}
                className="flex-1 rounded-xl gradient-primary py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97] disabled:opacity-70"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {busy === "save" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {busy === "save" ? "Saving…" : "Save backup"}
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      {/* Restore preview */}
      <BottomSheet
        open={restoreStep === 1 && !!pendingRestore}
        onClose={() => {
          setRestoreStep(0);
          setPendingRestore(null);
        }}
        title="Restore preview"
      >
        {pendingRestore && summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <StatBox
                k="Backup date"
                v={new Date(pendingRestore.createdAt).toLocaleDateString()}
              />
              <StatBox k="Backup version" v={`v${pendingRestore.backupVersion}`} />
              <StatBox k="App version" v={`v${pendingRestore.appVersion}`} />
              <StatBox k="Est. records" v={String(totalRecords(summary))} />
            </div>
            <SummaryGrid data={pendingRestore.data} sizeBytes={pendingRestore.sizeBytes} />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRestoreStep(0);
                  setPendingRestore(null);
                }}
                className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium text-foreground active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={() => setRestoreStep(2)}
                className="flex-1 rounded-xl gradient-primary py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97]"
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      {/* Restore confirm */}
      <BottomSheet
        open={restoreStep === 2 && !!pendingRestore}
        onClose={() => (restoring ? null : setRestoreStep(1))}
        title="Restore backup?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Restoring this backup will replace your current SkillSync workspace. This action
              cannot be undone.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={restoring}
              onClick={() => setRestoreStep(1)}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium text-foreground active:scale-[0.97] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={restoring}
              onClick={confirmRestore}
              className="flex-1 rounded-xl bg-[var(--danger)] py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97] disabled:opacity-70"
            >
              {restoring ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Restoring…
                </span>
              ) : (
                "Restore"
              )}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Restore success */}
      <BottomSheet
        open={restored !== null}
        onClose={() => setRestored(null)}
        title="Backup restored"
      >
        {restored ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="text-[12.5px] leading-relaxed text-muted-foreground">
                Your workspace has been restored. If anything feels off, close and reopen SkillSync.
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBox k="Backup date" v={new Date(restored.createdAt).toLocaleDateString()} />
              <StatBox k="Version" v={`v${restored.backupVersion}`} />
              <StatBox k="Records" v={String(totalRecords(backupSummary(restored.data)))} />
            </div>
            <button
              onClick={() => setRestored(null)}
              className="w-full rounded-xl gradient-primary py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97]"
            >
              Done
            </button>
          </div>
        ) : null}
      </BottomSheet>

      {/* Info sheet */}
      <BottomSheet open={infoOpen} onClose={() => setInfoOpen(false)} title="Backup information">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <StatBox k="Last backup" v={meta ? fmtDate(meta.createdAt) : "Never"} />
            <StatBox k="Time" v={meta ? fmtTime(meta.createdAt) : "—"} />
            <StatBox k="Size" v={meta ? formatBytes(meta.sizeBytes) : "—"} />
            <StatBox k="Backup version" v={`v${BACKUP_VERSION}`} />
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="text-[13px] font-semibold tracking-tight">
              What is a SkillSync backup?
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              One file containing your complete SkillSync workspace — every supported module — so
              you can fully restore your app later.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="text-[12.5px] font-semibold tracking-tight">Roadmap Export</div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                For sharing or transferring individual roadmaps.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <div className="text-[12.5px] font-semibold tracking-tight">SkillSync Backup</div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                For restoring your complete SkillSync workspace.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="text-[13px] font-semibold tracking-tight">Restoring</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              A restore fully replaces the workspace on this device with the contents of the file —
              it is not merged.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="text-[13px] font-semibold tracking-tight">Limitations</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Backups are plain JSON files stored on this device. There is no cloud sync — keep the
              file somewhere safe yourself.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="text-[13px] font-semibold tracking-tight">App version</div>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              SkillSync v{APP_VERSION} · Backup format v{BACKUP_VERSION}
            </p>
          </div>
        </div>
      </BottomSheet>

      {/* What's included sheet */}
      <BottomSheet
        open={includedOpen}
        onClose={() => setIncludedOpen(false)}
        title="What's included"
      >
        <div className="space-y-4">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            A backup contains everything SkillSync stores on this device. These are the live counts
            from your current workspace — restoring this backup brings all of it back exactly as it
            is now.
          </p>
          {includedData ? (
            <div className="space-y-1.5">
              {moduleList(includedData).map((m) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
                >
                  <span className="text-[12.5px] text-foreground">{m.label}</span>
                  <span className="text-[12.5px] font-semibold tabular-nums text-muted-foreground">
                    {m.count}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="text-[13px] font-semibold tracking-tight">Roadmap detail</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Every roadmap is saved in full — its phases, topics, subtopics and checklist items,
              including what you've already completed.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="text-[13px] font-semibold tracking-tight">Not included</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Nothing outside SkillSync's own local data — no device settings, no files from other
              apps, and no accounts.
            </p>
          </div>
        </div>
      </BottomSheet>
    </section>
  );
}

/* -------- helpers -------- */

function StatusIcon({ tone }: { tone: "none" | "green" | "yellow" | "red" }) {
  if (tone === "green")
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
        <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
      </span>
    );
  if (tone === "yellow")
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
        <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
      </span>
    );
  if (tone === "red")
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--danger)]/15 text-[var(--danger)]">
        <ShieldX className="h-5 w-5" strokeWidth={1.75} />
      </span>
    );
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] text-muted-foreground">
      <Clock className="h-5 w-5" strokeWidth={1.75} />
    </span>
  );
}

function MetaLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{k}</span>
      <span className="truncate text-foreground/80">{v}</span>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  label,
  hint,
  onClick,
  tone,
}: {
  icon: typeof Download;
  label: string;
  hint: string;
  onClick: () => void;
  tone?: "primary";
}) {
  return (
    <button
      onClick={onClick}
      className="card-surface flex flex-col items-start gap-2 p-3.5 text-left transition-transform active:scale-[0.98]"
    >
      <span
        className={
          "flex h-9 w-9 items-center justify-center rounded-xl " +
          (tone === "primary"
            ? "gradient-primary text-white"
            : "bg-white/[0.04] text-muted-foreground")
        }
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={1.75} />
      </span>
      <span className="text-[13px] font-semibold tracking-tight">{label}</span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </button>
  );
}

function StatBox({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-0.5 truncate text-[12.5px] font-medium">{v}</div>
    </div>
  );
}

function SummaryGrid({ data, sizeBytes }: { data: AppData; sizeBytes: number }) {
  const mods = moduleList(data);
  const s = backupSummary(data);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[12px] font-semibold tracking-tight">Modules included</div>
          <Chip>{formatBytes(sizeBytes)}</Chip>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] text-muted-foreground">
          {mods.map((m) => (
            <div key={m.key} className="flex items-center justify-between gap-2">
              <span>{m.label}</span>
              <span className="text-foreground/80">{m.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip>{s.phases} phases</Chip>
        <Chip>{s.topics} topics</Chip>
        <Chip>{s.subtopics} subtopics</Chip>
        <Chip>{s.checklists} checklists</Chip>
      </div>
    </div>
  );
}
