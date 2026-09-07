/**
 * SkillSync backup system — public surface.
 *
 * Four modules, one job each:
 * - `advanced-backup`  the envelope format: create / validate / restore /
 *                      checksum / compress / encrypt + the small bits of
 *                      backup settings kept in localStorage.
 * - `vault`            where SkillSync's own copies live (IndexedDB, with an
 *                      in-memory fallback for private mode).
 * - `cloud`            real provider clients (GitHub Gist, WebDAV, Google
 *                      Drive, Dropbox) + OAuth helpers.
 * - `../store/useBackupStore` the single state + actions + auto scheduler.
 *
 * `backup-legacy` (one level up) stays exported only so the older `Profile →
 * Export` helper and its tests keep working; new code must not import it.
 */

export {
  // ---- constants -----------------------------------------------------------
  BACKUP_VERSION,
  MIN_BACKUP_VERSION,
  MAX_AUTO_SNAPSHOTS,
  MAX_BACKUP_HISTORY,
  MAX_BACKUP_BYTES,
  COMPRESSION_THRESHOLD,
  LAST_META_KEY,
  AUTO_SETTINGS_KEY,
  BACKUP_HISTORY_KEY,
  CLOUD_SYNC_KEY,
  DEVICE_ID_KEY,
  SYNC_STATE_KEY,
  // ---- types ---------------------------------------------------------------
  type BackupEnvelope,
  type BackupMeta,
  type BackupStrategy,
  type ValidBackup,
  type DecodedBackup,
  type ValidateResult,
  type ValidateOptions,
  type CreatedBackup,
  type CreateBackupOptions,
  type RestoreOptions,
  type RestoreResult,
  type AutoBackupSettings,
  type BackupHealthStatus,
  type BackupHealthIssue,
  type BackupHistoryEntry,
  type ModuleChangeSummary,
  type CloudProvider,
  type CloudBackupConfig,
  type DeviceInfo,
  type SyncState,
  // ---- create / validate / restore ----------------------------------------
  createAdvancedBackup,
  createIncrementalBackup,
  validateAdvancedBackup,
  validateEncryptedBackup,
  verifyBackupText,
  restoreAdvancedBackup,
  resolveEnvelopeData,
  backupFilename,
  // ---- data helpers --------------------------------------------------------
  countRecords,
  getBackupSummary,
  describeBackupData,
  detectChanges,
  extractChangedData,
  applyIncrementalChanges,
  canonicalStringify,
  // ---- integrity / transforms ---------------------------------------------
  cryptoAvailable,
  compressionAvailable,
  compressText,
  decompressText,
  encryptData,
  decryptData,
  generateChecksum,
  checksumOfData,
  verifyChecksum,
  // ---- health / status -----------------------------------------------------
  analyzeBackupHealth,
  analyzeBackupHealthSync,
  getBackupStatus,
  // ---- settings & pointers -------------------------------------------------
  getLastBackupMeta,
  setLastBackupMeta,
  getBackupHistory,
  addToBackupHistory,
  clearBackupHistory,
  getAutoBackupSettings,
  setAutoBackupSettings,
  isAutoBackupDue,
  clearAdvancedBackupArtifacts,
  getDeviceId,
  getDeviceName,
  getSyncState,
  setSyncState,
  defaultCloudConfig,
  getCloudBackupConfig,
  setCloudBackupConfig,
  listCloudConfigs,
  // ---- formatting ----------------------------------------------------------
  formatBytes,
  formatDate,
  formatTime,
  formatRelative,
} from "./advanced-backup";

export {
  type VaultKind,
  type VaultRecord,
  type VaultStats,
  type VaultSummary,
  type CloudMark,
  defaultLabel,
  vaultIsPersistent,
  vaultBackendName,
  putVaultRecord,
  listVaultRecords,
  getVaultRecord,
  deleteVaultRecord,
  markVaultRecord,
  pruneVaultKind,
  clearVault,
  vaultStats,
  kvGet,
  kvSet,
  kvDelete,
  loadCloudToken,
  saveCloudToken,
  migrateLegacyLocalStorageBackups,
} from "./vault";

export {
  type CloudDescriptor,
  type CloudField,
  type CloudFieldKey,
  type CloudItem,
  type CloudResult,
  type CloudSetup,
  type CloudVerifyInfo,
  CLOUD_PROVIDERS,
  describeCloudProvider,
  cloudList,
  cloudUpload,
  cloudDownload,
  cloudDelete,
  cloudVerify,
  cloudStatus,
  cloudFilename,
  backupIdFromCloudName,
  configureCloud,
  disconnectCloud,
  currentToken,
  requestGoogleToken,
  startDropboxSignIn,
  consumeCloudRedirect,
  cloudRedirectTarget,
} from "./cloud";

export {
  useBackupStore,
  startAutoScheduler,
  stopAutoScheduler,
  getActiveCloudProvider,
  useBackupStatusLine,
  type BackupState,
  type BackupActions,
  type PendingRestore,
  type CreateBackupInput,
} from "@/store/useBackupStore";

export {
  saveBackupFile,
  shareBackupFile,
  platformCapabilities,
  type FileOperation,
} from "../platform-files";
