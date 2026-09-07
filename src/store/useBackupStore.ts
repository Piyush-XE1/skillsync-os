/**
 * One backup store, shared by everything.
 *
 * The previous build mounted `useAdvancedBackup()` five times on the same
 * screen (once per specialised hook). Every mount re-read IndexedDB, re-parsed
 * every payload and re-ran health analysis, and the copies never agreed with
 * each other — which is where both the stutter and the "I created a backup but
 * the list is empty" behaviour came from. This store is a module-level
 * singleton: one state, one fetch, one scheduler, selectors everywhere.
 */

import { create } from "zustand";
import { toast } from "sonner";
import { useAppStore } from "./useAppStore";
import { AppDataSchema, type AppData } from "@/lib/schema";
import { errorMessage } from "@/lib/utils";
import { saveBackupFile, shareBackupFile } from "@/lib/platform-files";
import {
  analyzeBackupHealthSync,
  createAdvancedBackup,
  createIncrementalBackup,
  clearAdvancedBackupArtifacts,
  describeBackupData,
  formatBytes,
  getAutoBackupSettings,
  getBackupHistory,
  getBackupStatus,
  getCloudBackupConfig,
  getLastBackupMeta,
  isAutoBackupDue,
  restoreAdvancedBackup,
  setAutoBackupSettings,
  setLastBackupMeta,
  setSyncState,
  validateAdvancedBackup,
  verifyBackupText,
  type AutoBackupSettings,
  type BackupHealthStatus,
  type BackupHistoryEntry,
  type BackupMeta,
  type CloudProvider,
  type ValidBackup,
} from "@/lib/backup/advanced-backup";
import {
  clearVault,
  deleteVaultRecord,
  getVaultRecord,
  listVaultRecords,
  markVaultRecord,
  migrateLegacyLocalStorageBackups,
  pruneVaultKind,
  putVaultRecord,
  vaultBackendName,
  vaultStats,
  vaultIsPersistent,
  type VaultKind,
  type VaultStats,
  type VaultSummary,
} from "@/lib/backup/vault";
import {
  type CloudProviderStatus,
  cloudDelete,
  cloudDownload,
  cloudFilename,
  cloudList,
  cloudStatus,
  cloudUpload,
  cloudVerify,
  configureCloud,
  consumeCloudRedirect,
  currentToken,
  disconnectCloud,
  markCloudSync,
  type CloudFieldKey,
  type CloudItem,
} from "@/lib/backup/cloud";
import type { CloudSetup } from "@/lib/backup/cloud";

// ============================================================================
// TYPES
// ============================================================================

export type BusyKind = "create" | "restore" | "cloud" | "verify" | "cleanup" | "init";

export type CreateBackupInput = {
  compression?: boolean;
  encryption?: boolean;
  password?: string;
  incremental?: boolean;
  kind?: VaultKind;
  quiet?: boolean;
};

export type PendingRestore = {
  source: "file" | "vault" | "cloud";
  /** Vault id or cloud file id, when it came from somewhere stored. */
  refId?: string;
  provider?: CloudProvider;
  name: string;
  createdAt: number;
  sizeBytes: number;
  records: number;
  encrypted: boolean;
  compressed: boolean;
  incremental: boolean;
  warnings: string[];
  /** Original envelope text: everything a restore needs, including re-decoding with a password. */
  text: string;
  data: AppData;
};

export type CloudState = {
  items: Partial<Record<CloudProvider, CloudItem[]>>;
  status: Partial<Record<CloudProvider, CloudProviderStatus>>;
  busy: CloudProvider | null;
  error: string | null;
};

export type BackupState = {
  ready: boolean;
  backend: "IndexedDB" | "in-memory";
  persistent: boolean;
  stats: VaultStats;
  records: VaultSummary[];
  lastMeta: BackupMeta | null;
  health: BackupHealthStatus | null;
  activity: BackupHistoryEntry[];
  auto: AutoBackupSettings;
  cloud: CloudState;
  busy: { kind: BusyKind; label: string } | null;
  error: string | null;
  /** Backup just created, waiting for "where do I save it". */
  created: { text: string; meta: BackupMeta; filename: string } | null;
  pendingRestore: PendingRestore | null;
  restoreStep: 0 | 1 | 2;
  /** Safety snapshot made before the last restore, so "undo" is one tap. */
  lastSafetyId: string | null;
};

const emptyStats: VaultStats = { count: 0, bytes: 0, persistent: false, backend: "in-memory" };

const initialState: BackupState = {
  ready: false,
  backend: "in-memory",
  persistent: false,
  stats: emptyStats,
  records: [],
  lastMeta: null,
  health: null,
  activity: [],
  auto: getAutoBackupSettings(),
  cloud: { items: {}, status: {}, busy: null, error: null },
  busy: null,
  error: null,
  created: null,
  pendingRestore: null,
  restoreStep: 0,
  lastSafetyId: null,
};

export type BackupActions = {
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setBusy: (busy: BackupState["busy"]) => void;
  clearError: () => void;
  dismissCreated: () => void;

  create: (input?: CreateBackupInput) => Promise<{ meta: BackupMeta } | null>;
  saveCreated: (destination: "download" | "share") => Promise<void>;

  restoreFromFile: (file: File) => Promise<void>;
  restoreFromVault: (id: string) => Promise<void>;
  restoreFromCloud: (provider: CloudProvider, fileId: string, name?: string) => Promise<void>;
  /** Turn backup text into a preview (asks for a password when it is encrypted). */
  stageRestore: (
    text: string,
    meta: {
      source: PendingRestore["source"];
      name: string;
      refId?: string;
      provider?: CloudProvider;
      password?: string;
    },
  ) => Promise<void>;
  unlockPendingRestore: (password: string) => Promise<void>;
  setRestoreStep: (step: 0 | 1 | 2) => void;
  confirmRestore: () => Promise<void>;
  cancelRestore: () => void;
  undoLastRestore: () => Promise<void>;

  deleteRecord: (id: string) => Promise<void>;
  downloadRecord: (id: string) => Promise<void>;
  verifyLatest: () => Promise<void>;
  clearLocalCopies: () => Promise<void>;

  updateAuto: (patch: Partial<AutoBackupSettings>) => void;
  toggleAuto: (enabled: boolean) => void;
  runAutoNow: () => Promise<void>;
  maybeAutoBackup: (reason?: "open" | "interval" | "changes") => Promise<void>;

  setupCloud: (setup: CloudSetup) => Promise<boolean>;
  forgetCloud: (provider: CloudProvider) => Promise<void>;
  testCloud: (provider: CloudProvider) => Promise<boolean>;
  refreshCloud: (provider: CloudProvider) => Promise<void>;
  uploadToCloud: (provider: CloudProvider, recordId?: string) => Promise<void>;
  deleteCloudItem: (provider: CloudProvider, fileId: string) => Promise<void>;
  setCloudAutoUpload: (provider: CloudProvider, autoUpload: boolean) => Promise<void>;
};

// ============================================================================
// HELPERS
// ============================================================================

const CLOUD_ORDER: CloudProvider[] = ["github-gist", "webdav", "google-drive", "dropbox"];

/** The provider the user has switched on, if any. */
export function getActiveCloudProvider(): CloudProvider | null {
  for (const provider of CLOUD_ORDER) {
    const config = getCloudBackupConfig(provider);
    if (config.enabled) return provider;
  }
  return null;
}

/**
 * Push a freshly created copy to whichever provider the person switched on,
 * when they asked for that. Manual and automatic copies both go — "I backed up"
 * should mean off-device too, not only the scheduled case.
 */
async function maybeUploadCreated(kind: VaultKind, backupId: string) {
  const active = getActiveCloudProvider();
  if (!active) return;
  if (!getCloudBackupConfig(active).autoUpload) return;
  await useBackupStore.getState().uploadToCloud(active, backupId);
}

function currentAppData(): AppData {
  const raw = useAppStore.getState().exportJSON();
  return AppDataSchema.parse(JSON.parse(raw) as unknown);
}

async function safeBackend(): Promise<{ backend: BackupState["backend"]; persistent: boolean }> {
  // Touch the vault once so `persistent` reflects reality, not a guess.
  await listVaultRecords({ limit: 1 });
  return { backend: vaultBackendName(), persistent: vaultIsPersistent() };
}

// ============================================================================
// STORE
// ============================================================================

export const useBackupStore = create<BackupState & BackupActions>((set, get) => {
  const patch = (next: Partial<BackupState>) => set(next);

  const withBusy = async <T>(
    kind: BusyKind,
    label: string,
    run: () => Promise<T>,
  ): Promise<T | null> => {
    if (get().busy) return null;
    patch({ busy: { kind, label }, error: null });
    try {
      return await run();
    } finally {
      patch({ busy: null });
    }
  };

  async function syncDerivedState() {
    const [records, stats, backend] = await Promise.all([
      listVaultRecords({ limit: 50 }),
      vaultStats(),
      safeBackend(),
    ]);
    const lastMeta = getLastBackupMeta();
    const health = lastMeta ? healthFor(lastMeta) : null;
    patch({
      ready: true,
      records,
      stats,
      backend: backend.backend,
      persistent: backend.persistent,
      lastMeta,
      health,
      activity: getBackupHistory(),
      auto: getAutoBackupSettings(),
    });
  }

  function healthFor(meta: BackupMeta): BackupHealthStatus {
    try {
      // Health reads only the metadata pointer, so it costs nothing: no
      // payload parse, no hashing, no IndexedDB read.
      return analyzeBackupHealthSync({ meta }, currentAppData());
    } catch {
      return {
        status: "unknown",
        score: 0,
        issues: [],
        recommendations: [],
        lastCheckedAt: Date.now(),
      };
    }
  }

  /** Write a freshly built backup into the vault + local pointers. */
  async function persistCreated(
    result: { text: string; meta: BackupMeta; filename: string },
    kind: VaultKind,
    quiet: boolean,
  ): Promise<VaultSummary> {
    const summary = await putVaultRecord({ text: result.text, meta: result.meta, kind });
    if (kind !== "safety") {
      setLastBackupMeta(result.meta);
      if (kind === "auto") {
        // Rolling copies are disposable: keep exactly the number the user asked for.
        await pruneVaultKind("auto", get().auto.maxSnapshots || 5);
      }
    }
    if (!quiet) {
      toast.success(
        kind === "auto"
          ? `Auto-backup saved (${formatBytes(result.meta.sizeBytes)})`
          : `Backup ready — ${describeBackupData(currentAppData())}`,
      );
    }
    return summary;
  }

  return {
    ...initialState,

    setBusy: (busy) => patch({ busy }),
    clearError: () => patch({ error: null }),
    dismissCreated: () => patch({ created: null }),

    // ==========================================================================
    // LIFECYCLE
    // ==========================================================================
    init: async () => {
      if (get().ready || get().busy?.kind === "init") return;
      await withBusy("init", "Opening your backup vault", async () => {
        try {
          // Finish a Google/Dropbox redirect if we just came back from one.
          const returned = await consumeCloudRedirect();
          if (returned) {
            await get().testCloud(returned);
          }

          const migrated = await migrateLegacyLocalStorageBackups();
          if (migrated > 0) {
            toast(
              `Recovered ${migrated} backup${migrated === 1 ? "" : "s"} from the old storage layout`,
            );
          }

          const due = isAutoBackupDue();
          await syncDerivedState();

          // An overdue auto-backup runs once the browser is idle, never during
          // the first paint.
          if (due) scheduleIdle(() => void get().maybeAutoBackup("open"));

          await Promise.all(
            CLOUD_ORDER.map(async (provider) => {
              const status = await cloudStatus(provider);
              patch({
                cloud: { ...get().cloud, status: { ...get().cloud.status, [provider]: status } },
              });
            }),
          );
        } catch (error) {
          patch({ ready: true, error: errorMessage(error, "Backup vault could not be opened.") });
        }
      });
    },

    refresh: async () => {
      await syncDerivedState();
    },

    // ==========================================================================
    // CREATE
    // ==========================================================================
    create: async (input = {}) => {
      const kind: VaultKind = input.kind ?? "manual";
      const quiet = input.quiet === true;
      return withBusy(kind === "auto" ? "create" : "create", "Building your backup", async () => {
        try {
          const data = currentAppData();
          const compression = input.compression !== false;
          const encryption = input.encryption === true;
          if (encryption && !input.password) {
            throw new Error(
              "Type a password first — an encrypted backup without one is impossible.",
            );
          }

          let result = await createAdvancedBackup(data, {
            compression,
            encryption,
            password: encryption ? input.password : undefined,
            forceCompression: false,
          });

          // Incremental is an optimisation: fall back to a full backup when
          // there is nothing to build on.
          if (input.incremental) {
            const newest = get().records.find((r) => r.id !== result.meta.backupId);
            const base = newest ? await getVaultRecord(newest.id) : null;
            if (base) {
              const decoded = await validateAdvancedBackup(base.text);
              if (decoded.ok) {
                const incremental = await createIncrementalBackup(data, decoded.backup, {
                  compression,
                });
                if (incremental) result = incremental;
              }
            }
          }

          await persistCreated(result, kind, quiet);
          await syncDerivedState();
          patch({
            created:
              kind === "manual"
                ? { text: result.text, meta: result.meta, filename: result.filename }
                : null,
          });

          // The optional off-device hop. Fired now — for auto copies *and*
          // manual ones — so a slow network can never delay the local save the
          // person asked for. uploadToCloud reports its own result.
          void maybeUploadCreated(kind, result.meta.backupId);

          return { meta: result.meta };
        } catch (error) {
          const message = errorMessage(error, "Could not create the backup.");
          patch({ error: message });
          if (!quiet) toast.error(message);
          return null;
        }
      });
    },

    saveCreated: async (destination) => {
      const created = get().created;
      if (!created) return;
      try {
        const payload = {
          filename: created.filename,
          text: created.text,
          mimeType: "application/json",
        };
        const result =
          destination === "download"
            ? await saveBackupFile(payload)
            : await shareBackupFile(payload);
        if (destination === "download") {
          if (result.status === "saved" || result.status === "fallback-download")
            toast.success(`Saved ${created.filename}`);
          else if (result.status !== "cancelled")
            toast.error(result.message || "The browser refused to save that file.");
        } else if (result.status === "shared") toast.success("Shared");
        else if (result.status === "fallback-download")
          toast("Sharing is unavailable here — the file was downloaded instead");
        else if (result.status !== "cancelled") toast.error(result.message || "Sharing failed.");

        if (
          result.status === "saved" ||
          result.status === "shared" ||
          result.status === "fallback-download"
        ) {
          patch({ created: null });
        }
      } catch (error) {
        toast.error(errorMessage(error, "Could not hand the file to the browser."));
      }
    },

    // ==========================================================================
    // RESTORE
    // ==========================================================================
    restoreFromFile: async (file) => {
      try {
        const text = await file.text();
        await get().stageRestore(text, { source: "file", name: file.name });
      } catch (error) {
        toast.error(errorMessage(error, "That file could not be read."));
      }
    },

    restoreFromVault: async (id) => {
      const record = await getVaultRecord(id);
      if (!record) {
        toast.error("That backup is no longer in this device's vault.");
        return;
      }
      await get().stageRestore(record.text, { source: "vault", refId: id, name: record.label });
    },

    restoreFromCloud: async (provider, fileId, name) => {
      const downloaded = await withBusy("cloud", "Downloading from the cloud", async () => {
        const result = await cloudDownload(provider, fileId);
        if (!result.ok) {
          toast.error(result.error);
          return null;
        }
        return result.text;
      });
      if (typeof downloaded !== "string") return;
      await get().stageRestore(downloaded, {
        source: "cloud",
        provider,
        refId: fileId,
        name: name ?? fileId,
      });
    },

    // Staging lives outside the public action list on purpose: it is the one
    // place that knows how to turn text into a PendingRestore.
    stageRestore: async (
      text: string,
      meta: {
        source: PendingRestore["source"];
        name: string;
        refId?: string;
        provider?: CloudProvider;
        password?: string;
      },
    ) => {
      // Never stack dialogs: if the "backup created" sheet is still up it steps
      // aside, so there is exactly one modal flow on screen at a time.
      patch({ created: null });
      const result = await validateAdvancedBackup(
        text,
        meta.password ? { password: meta.password } : {},
      );
      if (!result.ok) {
        if (result.needsPassword) {
          patch({
            pendingRestore: {
              source: meta.source,
              refId: meta.refId,
              provider: meta.provider,
              name: meta.name,
              createdAt: 0,
              sizeBytes: text.length,
              records: 0,
              encrypted: true,
              compressed: false,
              incremental: false,
              warnings: [],
              text,
              data: null as unknown as AppData,
            },
            restoreStep: 1,
          });
          return;
        }
        patch({ error: result.error });
        toast.error(result.error);
        return;
      }

      const backup = result.backup;
      const summary = describeBackupData(backup.data);
      patch({
        pendingRestore: {
          source: meta.source,
          refId: meta.refId,
          provider: meta.provider,
          name: meta.name,
          createdAt: Date.parse(backup.createdAt) || Date.now(),
          sizeBytes: backup.sizeBytes,
          records: Object.values(backup.meta.recordCounts).reduce((a, b) => a + b, 0),
          encrypted: backup.encrypted === true,
          compressed: backup.compressed === true,
          incremental: backup.incremental === true,
          warnings: result.warnings,
          text,
          data: backup.data as AppData,
        },
        restoreStep: 1,
      });
      toast(`Loaded ${summary}`);
    },

    unlockPendingRestore: async (password) => {
      const pending = get().pendingRestore;
      if (!pending) return;
      const result = await validateAdvancedBackup(pending.text, { password });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      patch({
        pendingRestore: {
          ...pending,
          createdAt: Date.parse(result.backup.createdAt) || pending.createdAt,
          records: Object.values(result.backup.meta.recordCounts).reduce((a, b) => a + b, 0),
          encrypted: true,
          warnings: result.warnings,
          data: result.backup.data as AppData,
        },
      });
      toast.success("Unlocked");
    },

    setRestoreStep: (step) => patch({ restoreStep: step }),

    cancelRestore: () => patch({ pendingRestore: null, restoreStep: 0, error: null }),

    confirmRestore: async () => {
      const pending = get().pendingRestore;
      if (!pending) return;
      if (!pending.data) {
        toast.error("Unlock this backup with its password first.");
        return;
      }

      await withBusy("restore", "Restoring", async () => {
        // 1. safety snapshot, so a restore is always reversible in one tap.
        let safetyId: string | null = null;
        try {
          const safety = await createAdvancedBackup(currentAppData(), { compression: true });
          await putVaultRecord({
            text: safety.text,
            meta: safety.meta,
            kind: "safety",
            label: "Before restore (undo)",
          });
          safetyId = safety.meta.backupId;
        } catch {
          /* a missing snapshot must not block a restore the user asked for */
        }

        // 2. incremental restores need their base.
        let data = pending.data;
        if (pending.incremental) {
          const candidates = await listVaultRecords({ limit: 100 });
          const base = candidates.find((candidate) => candidate.id !== pending.refId);
          const baseRecord = base ? await getVaultRecord(base.id) : null;
          if (!baseRecord) {
            const message =
              "This is an incremental backup and its base backup is not in this vault.";
            patch({ error: message });
            toast.error(message);
            return;
          }
          const decodedBase = await validateAdvancedBackup(baseRecord.text);
          if (!decodedBase.ok) {
            patch({ error: decodedBase.error });
            toast.error(decodedBase.error);
            return;
          }
          const merged = await restoreAdvancedBackup(
            { ...(JSON.parse(pending.text) as ValidBackup), data: pending.data },
            { baseBackup: decodedBase.backup },
          );
          if (!merged.ok) {
            patch({ error: merged.error });
            toast.error(merged.error);
            return;
          }
          data = merged.data;
        }

        // 3. apply
        const applied = useAppStore.getState().importJSON(JSON.stringify(data));
        if (!applied.ok) {
          const message = applied.error || "The workspace could not be replaced.";
          patch({ error: message });
          toast.error(message);
          return;
        }

        if (safetyId) patch({ lastSafetyId: safetyId });
        patch({ pendingRestore: null, restoreStep: 0 });
        await syncDerivedState();
        toast.success(
          "Workspace restored. A snapshot of the previous state is in your list if you change your mind.",
        );
      });
    },

    /**
     * Hand the workspace back to the snapshot taken just before the last
     * restore. Deliberately immediate: the confirmation already happened, so a
     * second review loop here would be ceremony. The snapshot is consumed — the
     * workspace now matches it, and keeping it would only clutter the vault with
     * a copy that looks like a backup but is not.
     */
    undoLastRestore: async () => {
      const id = get().lastSafetyId;
      if (!id) {
        toast("There is no snapshot to go back to.");
        return;
      }
      await withBusy("restore", "Undoing that restore", async () => {
        const record = await getVaultRecord(id);
        if (!record) {
          patch({
            lastSafetyId: null,
            error: "That snapshot is no longer in this device's vault.",
          });
          return;
        }
        const decoded = await validateAdvancedBackup(record.text);
        if (!decoded.ok) {
          patch({ error: decoded.error });
          toast.error(decoded.error);
          return;
        }
        const applied = useAppStore.getState().importJSON(JSON.stringify(decoded.backup.data));
        if (!applied.ok) {
          const message = applied.error || "The workspace could not be put back.";
          patch({ error: message });
          toast.error(message);
          return;
        }
        await deleteVaultRecord(id);
        patch({ lastSafetyId: null, pendingRestore: null, restoreStep: 0 });
        await syncDerivedState();
        toast.success("Back to where you were before the restore.");
      });
    },

    // ==========================================================================
    // VAULT MANAGEMENT
    // ==========================================================================
    deleteRecord: async (id) => {
      const removed = await deleteVaultRecord(id);
      if (!removed) {
        toast.error("That copy could not be deleted.");
        return;
      }
      if (get().lastMeta?.backupId === id) setLastBackupMeta(null);
      await syncDerivedState();
      toast.success("Deleted from this device");
    },

    downloadRecord: async (id) => {
      const record = await getVaultRecord(id);
      if (!record) {
        toast.error("That copy is gone.");
        return;
      }
      const filename = `SkillSync-${new Date(record.createdAt).toISOString().slice(0, 16).replace(/[T:]/g, "-")}.json`;
      const result = await saveBackupFile({
        filename,
        text: record.text,
        mimeType: "application/json",
      });
      if (result.status === "saved" || result.status === "fallback-download")
        toast.success(`Saved ${filename}`);
      else if (result.status !== "cancelled")
        toast.error(result.message || "The browser refused to save that file.");
    },

    verifyLatest: async () => {
      const newest = get().records[0];
      if (!newest) {
        toast("There is nothing to verify yet.");
        return;
      }
      await withBusy("verify", "Checking the newest backup", async () => {
        const record = await getVaultRecord(newest.id);
        if (!record) {
          toast.error("That copy is no longer readable.");
          return;
        }
        const result = await verifyBackupText(record.text);
        if (!result.ok) {
          toast.error(`Verification failed: ${result.message}`);
          return;
        }
        toast.success(`Verified: ${result.message}`);
        await syncDerivedState();
      });
    },

    clearLocalCopies: async () => {
      await withBusy("cleanup", "Clearing local copies", async () => {
        const removed = await clearVault();
        clearAdvancedBackupArtifacts();
        await syncDerivedState();
        toast.success(
          `Removed ${removed} local cop${removed === 1 ? "y" : "ies"}. Cloud files were left alone.`,
        );
      });
    },

    // ==========================================================================
    // AUTO-BACKUP
    // ==========================================================================
    updateAuto: (settings) => {
      const next = setAutoBackupSettings(settings);
      patch({ auto: next });
    },

    toggleAuto: (enabled) => {
      const next = setAutoBackupSettings({ enabled });
      patch({ auto: next });
      if (enabled) {
        toast.success("Automatic backups are on — I will save a copy in this device's vault.");
        void get().maybeAutoBackup("interval");
      } else {
        toast("Automatic backups turned off");
      }
      void startAutoScheduler();
    },

    runAutoNow: async () => {
      const created = await get().create({ kind: "auto", quiet: true });
      if (created) {
        const keep = get().auto.maxSnapshots || 5;
        await pruneVaultKind("auto", keep);
        await syncDerivedState();
        toast.success(`Saved a snapshot (${formatBytes(created.meta.sizeBytes)})`);
      }
    },

    maybeAutoBackup: async (reason = "interval") => {
      const state = get();
      if (!state.ready || state.busy) return;
      if (!state.auto.enabled) return;
      if (reason !== "changes" && !isAutoBackupDue(state.auto)) return;

      const created = await state.create({
        kind: "auto",
        compression: state.auto.compression,
        quiet: true,
      });
      if (!created) return;
      await pruneVaultKind("auto", state.auto.maxSnapshots || 5);
      get().updateAuto({ lastCreatedAt: created.meta.createdAt });
      // The cloud hop already happened inside create().
    },

    // ==========================================================================
    // CLOUD
    // ==========================================================================
    setupCloud: async (setup) => {
      await configureCloud(setup);
      const ok = await get().testCloud(setup.provider);
      await get().refreshCloud(setup.provider);
      return ok;
    },

    forgetCloud: async (provider) => {
      await disconnectCloud(provider);
      patch({
        cloud: {
          ...get().cloud,
          status: {
            ...get().cloud.status,
            [provider]: {
              configured: false,
              connected: false,
              enabled: false,
              autoUpload: false,
              missing: [],
            },
          },
          items: { ...get().cloud.items, [provider]: [] },
        },
      });
      toast("Disconnected. Anything you saved in the cloud is still there.");
    },

    testCloud: async (provider) => {
      patch({ cloud: { ...get().cloud, busy: provider, error: null } });
      const result = await cloudVerify(provider);
      if (result.ok) markCloudSync(provider, { enabled: true });
      const status = await cloudStatus(provider);
      patch({
        cloud: {
          ...get().cloud,
          busy: null,
          error: result.ok ? null : result.error,
          status: { ...get().cloud.status, [provider]: { ...status, connected: result.ok } },
        },
      });
      if (result.ok) {
        toast.success(
          `${provider === "github-gist" ? "GitHub" : provider === "webdav" ? "WebDAV" : provider === "dropbox" ? "Dropbox" : "Google Drive"} is connected`,
        );
        void get().refreshCloud(provider);
      } else {
        toast.error(result.hint ? `${result.error} ${result.hint}` : result.error);
      }
      return result.ok;
    },

    refreshCloud: async (provider) => {
      patch({ cloud: { ...get().cloud, busy: provider, error: null } });
      const result = await cloudList(provider);
      if (result.ok) markCloudSync(provider);
      if (!result.ok) {
        patch({ cloud: { ...get().cloud, busy: null, error: result.error } });
        return;
      }
      patch({
        cloud: {
          ...get().cloud,
          busy: null,
          items: { ...get().cloud.items, [provider]: result.items },
        },
      });
    },

    uploadToCloud: async (provider, recordId) => {
      const state = get();
      const target = recordId ? state.records.find((r) => r.id === recordId) : state.records[0];
      if (!target) {
        toast.error("Create a backup first, then send it to the cloud.");
        return;
      }
      const record = await getVaultRecord(target.id);
      if (!record) {
        toast.error("That backup is no longer in the vault.");
        return;
      }
      patch({ cloud: { ...state.cloud, busy: provider, error: null } });
      const result = await cloudUpload(provider, {
        filename: cloudFilename(new Date(record.createdAt).toISOString(), record.id),
        text: record.text,
        fileId: record.cloud?.provider === provider ? record.cloud.fileId : undefined,
      });

      if (!result.ok) {
        patch({ cloud: { ...get().cloud, busy: null, error: result.error } });
        toast.error(result.hint ? `${result.error} ${result.hint}` : result.error);
        return;
      }

      await markVaultRecord(record.id, {
        provider,
        fileId: result.fileId,
        uploadedAt: Date.now(),
        url: result.url,
      });
      markCloudSync(provider, { enabled: true });
      const status = await cloudStatus(provider);
      patch({
        cloud: {
          ...get().cloud,
          busy: null,
          status: {
            ...get().cloud.status,
            [provider]: { ...status, connected: true, enabled: true },
          },
        },
      });
      toast.success(
        `Uploaded to ${provider === "github-gist" ? "your GitHub gists" : provider === "webdav" ? "your WebDAV folder" : provider === "dropbox" ? "Dropbox" : "Google Drive"}`,
      );
      void get().refreshCloud(provider);
    },

    deleteCloudItem: async (provider, fileId) => {
      patch({ cloud: { ...get().cloud, busy: provider, error: null } });
      const result = await cloudDelete(provider, fileId);
      if (!result.ok) {
        patch({ cloud: { ...get().cloud, busy: null, error: result.error } });
        toast.error(result.error);
        return;
      }
      toast.success("Deleted from the cloud");
      await get().refreshCloud(provider);
    },

    setCloudAutoUpload: async (provider, autoUpload) => {
      await configureCloud({
        provider,
        autoUpload,
        enabled: autoUpload ? true : get().cloud.status[provider]?.enabled,
      });
      const status = await cloudStatus(provider);
      patch({
        cloud: {
          ...get().cloud,
          status: {
            ...get().cloud.status,
            [provider]: { ...status, enabled: autoUpload || status.connected },
          },
        },
      });
    },
  } as BackupState & BackupActions;
});

// ============================================================================
// AUTO-BACKUP SCHEDULER (one timer for the whole app)
// ============================================================================

function scheduleIdle(run: () => void) {
  const w = globalThis as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1200);
}

let schedulerStarted = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let changeDebounce: ReturnType<typeof setTimeout> | null = null;

/**
 * Starts the single auto-backup timer. Safe to call repeatedly; only the first
 * call does anything. Runs on open, then every minute, and (optionally) after
 * a burst of edits.
 */
export async function startAutoScheduler(): Promise<void> {
  if (schedulerStarted || typeof window === "undefined") return;
  schedulerStarted = true;

  await useBackupStore.getState().init();

  const tick = () => {
    if (document.visibilityState === "hidden") return;
    void useBackupStore.getState().maybeAutoBackup("interval");
  };
  schedulerTimer = setInterval(tick, 60_000);
  setTimeout(tick, 6000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setTimeout(tick, 2000);
  });

  // "Back up after significant changes" — deliberately coarse (10 minutes of
  // quiet) so typing, dragging and route changes never touch the disk.
  let lastChangeAt = 0;
  useAppStore.subscribe(() => {
    if (!useBackupStore.getState().auto.backupOnChanges) return;
    lastChangeAt = Date.now();
    if (changeDebounce) clearTimeout(changeDebounce);
    changeDebounce = setTimeout(() => {
      if (Date.now() - lastChangeAt < 9_500) return;
      void useBackupStore.getState().maybeAutoBackup("changes");
    }, 10 * 60_000);
  });
}

export function stopAutoScheduler(): void {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
  schedulerStarted = false;
}

/** Convenience selector for the status line used in several places. */
export function useBackupStatusLine() {
  const lastMeta = useBackupStore((s) => s.lastMeta);
  return getBackupStatus(lastMeta);
}
