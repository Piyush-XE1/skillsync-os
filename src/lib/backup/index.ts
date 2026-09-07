/**
 * SkillSync Backup & Restore System - Main Entry Point
 * 
 * This file exports all backup-related functionality from both
 * the legacy system and the new advanced system.
 * 
 * For new projects, use the advanced backup system:
 * - createAdvancedBackup()
 * - validateAdvancedBackup()
 * - restoreAdvancedBackup()
 * - useAdvancedBackup() hook
 * 
 * For backward compatibility, the legacy functions are still available:
 * - serializeBackup()
 * - validateBackup()
 * - backupSummary()
 * - etc.
 */

// ============================================================================
// LEGACY BACKUP SYSTEM (for backward compatibility)
// ============================================================================

export {
  // Constants
  BACKUP_VERSION,
  LAST_META_KEY,
  AUTO_SETTINGS_KEY,
  AUTO_SNAPSHOTS_KEY,
  MAX_AUTO_SNAPSHOTS,
  
  // Types
  type BackupMeta,
  type BackupEnvelope,
  type ValidBackup,
  type BackupSummary,
  type BackupStatus,
  type AutoBackupSettings,
  type BackupHealth,
  
  // Functions
  serializeBackup,
  validateBackup,
  backupSummary,
  totalRecords,
  moduleList,
  getLastBackupMeta,
  setLastBackupMeta,
  clearBackupArtifacts,
  backupStatus,
  formatBytes,
  fmtDate,
  fmtTime,
  getAutoBackupSettings,
  setAutoBackupSettings,
  createAutomaticSnapshot,
  getAutomaticSnapshotCount,
  createSafetySnapshot,
} from './backup';

// ============================================================================
// ADVANCED BACKUP SYSTEM (recommended)
// ============================================================================

export {
  // Constants
  BACKUP_VERSION as ADVANCED_BACKUP_VERSION,
  LAST_META_KEY as ADVANCED_LAST_META_KEY,
  AUTO_SETTINGS_KEY as ADVANCED_AUTO_SETTINGS_KEY,
  AUTO_SNAPSHOTS_KEY as ADVANCED_AUTO_SNAPSHOTS_KEY,
  BACKUP_HISTORY_KEY,
  BACKUP_HEALTH_KEY,
  CLOUD_SYNC_KEY,
  DEVICE_ID_KEY,
  SYNC_STATE_KEY,
  MAX_AUTO_SNAPSHOTS as ADVANCED_MAX_AUTO_SNAPSHOTS,
  MAX_BACKUP_HISTORY,
  MAX_SNAPSHOT_SIZE,
  COMPRESSION_THRESHOLD,
  
  // Types
  type BackupMeta as AdvancedBackupMeta,
  type BackupEnvelope as AdvancedBackupEnvelope,
  type ValidBackup as AdvancedValidBackup,
  type BackupStrategy,
  type AutoBackupSettings as AdvancedAutoBackupSettings,
  type CloudProvider,
  type CloudBackupConfig,
  type DeviceInfo,
  type SyncState,
  type SyncConflict,
  type BackupHealthStatus,
  type BackupHealthIssue,
  type BackupHistoryEntry,
  type ChangeLogEntry,
  type ModuleChangeSummary,
  
  // Core backup functions
  createAdvancedBackup,
  createIncrementalBackup,
  validateAdvancedBackup,
  validateEncryptedBackup,
  restoreAdvancedBackup,
  
  // Data utilities
  detectChanges,
  extractChangedData,
  applyIncrementalChanges,
  countRecords,
  getBackupSummary,
  
  // Backup management
  getBackupHistory,
  addToBackupHistory,
  getLastBackupMeta as getAdvancedLastBackupMeta,
  setLastBackupMeta as setAdvancedLastBackupMeta,
  getAutoBackupSettings as getAdvancedAutoBackupSettings,
  setAutoBackupSettings as setAdvancedAutoBackupSettings,
  createAdvancedAutomaticSnapshot,
  createAdvancedSafetySnapshot,
  getAdvancedAutomaticSnapshotCount,
  getSnapshotByIndex,
  clearAdvancedBackupArtifacts,
  
  // Health monitoring
  analyzeBackupHealth,
  getBackupStatus as getAdvancedBackupStatus,
  
  // Device management
  getDeviceId,
  getDeviceName,
  getSyncState,
  setSyncState,
  
  // Cloud backup
  getCloudBackupConfig,
  setCloudBackupConfig,
  cloudProviderFactory,
  cloudSyncManager,
  
  // Storage
  indexedDBManager,
  backupStorage,
  backupQueue,
  backupCache,
  determineStorageStrategy,
  getStorageRecommendation,
  canStoreBackup,
  
  // Utility functions
  formatBytes as advancedFormatBytes,
  formatDate,
  formatTime as advancedFormatTime,
  generateChecksum,
  verifyChecksum,
  encryptData,
  decryptData,
} from './advanced-backup';

// Re-export everything from advanced-backup as the primary API
export * from './advanced-backup';

// ============================================================================
// BACKUP STORAGE SYSTEM
// ============================================================================

export {
  // IndexedDB Manager
  indexedDBManager,
  
  // Backup Storage
  backupStorage,
  
  // Backup Queue
  backupQueue,
  
  // Backup Cache
  backupCache,
  
  // Types
  type StorageStrategy,
  
  // Functions
  determineStorageStrategy,
  getStorageRecommendation,
  canStoreBackup,
} from './backup-storage';

// ============================================================================
// CLOUD BACKUP SYSTEM
// ============================================================================

export {
  // Cloud Backup Manager
  CloudBackupManager,
  
  // Cloud Sync Manager
  cloudSyncManager,
  
  // Cloud Provider Factory
  cloudProviderFactory,
  
  // Provider Classes
  GoogleDriveProvider,
  DropboxProvider,
  GitHubGistProvider,
  CustomProvider,
  
  // Types
  type CloudProviderInterface,
  type CloudProvider as CloudProviderType,
  type CloudBackupConfig as CloudBackupConfigType,
} from './cloud-backup';

// ============================================================================
// REACT HOOKS
// ============================================================================

export {
  useAdvancedBackup,
  useAutoBackup,
  useCloudBackup,
  useBackupHealth,
  useBackupStorage,
  
  type UseBackupOptions,
  type BackupState,
  type BackupActions,
} from '@/hooks/use-advanced-backup';

// ============================================================================
// PLATFORM FILES (existing)
// ============================================================================

export {
  saveBackupFile,
  shareBackupFile,
  platformCapabilities,
  type FileOperation,
} from './platform-files';
