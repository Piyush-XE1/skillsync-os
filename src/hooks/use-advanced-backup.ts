/**
 * Advanced Backup Hooks for React Components
 * 
 * Features:
 * - Backup creation with advanced options
 * - Backup validation and restoration
 * - Cloud backup integration
 * - Backup health monitoring
 * - Automatic backup management
 * - Multi-device synchronization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/useAppStore';
import {
  // Core backup functions
  createAdvancedBackup,
  validateAdvancedBackup,
  validateEncryptedBackup,
  restoreAdvancedBackup,
  detectChanges,
  countRecords,
  getBackupSummary,
  getBackupStatus,
  analyzeBackupHealth,
  
  // Storage functions
  getLastBackupMeta,
  setLastBackupMeta,
  getAutoBackupSettings,
  setAutoBackupSettings,
  createAdvancedAutomaticSnapshot,
  createAdvancedSafetySnapshot,
  getAdvancedAutomaticSnapshotCount,
  clearAdvancedBackupArtifacts,
  getDeviceId,
  
  // Types
  type BackupMeta,
  type ValidBackup,
  type BackupStrategy,
  type AutoBackupSettings,
  type BackupHealthStatus,
  type CloudProvider,
  type CloudBackupConfig,
  
  // Constants
  BACKUP_VERSION,
  MAX_AUTO_SNAPSHOTS
} from '@/lib/backup/advanced-backup';

import {
  backupStorage,
  backupQueue,
  backupCache,
  determineStorageStrategy,
  getStorageRecommendation,
  canStoreBackup
} from '@/lib/backup/backup-storage';

import {
  cloudSyncManager,
  cloudProviderFactory,
  type CloudProviderInterface
} from '@/lib/backup/cloud-backup';

import { AppDataSchema, type AppData } from '@/lib/schema';
import { errorMessage } from '@/lib/utils';
import { saveBackupFile, shareBackupFile, platformCapabilities } from '@/lib/platform-files';

// ============================================================================
// MAIN BACKUP HOOK
// ============================================================================

export interface UseBackupOptions {
  autoBackupEnabled?: boolean;
  autoBackupIntervalHours?: number;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  cloudBackupEnabled?: boolean;
  cloudProvider?: CloudProvider;
}

export interface BackupState {
  // Backup list
  backups: ValidBackup[];
  isLoading: boolean;
  error: string | null;
  
  // Current backup
  currentBackup: ValidBackup | null;
  lastBackupMeta: BackupMeta | null;
  backupStatus: ReturnType<typeof getBackupStatus>;
  
  // Backup creation
  isCreating: boolean;
  createProgress: number;
  createdBackup: { text: string; meta: BackupMeta; filename: string } | null;
  
  // Backup restoration
  isRestoring: boolean;
  restoreProgress: number;
  pendingRestore: ValidBackup | null;
  restoreStep: 0 | 1 | 2; // 0 = none, 1 = preview, 2 = confirm
  
  // Auto-backup
  autoBackupSettings: AutoBackupSettings;
  autoSnapshotCount: number;
  
  // Cloud backup
  cloudConfigs: CloudBackupConfig[];
  cloudProviders: CloudProviderInterface[];
  isSyncing: boolean;
  syncProgress: number;
  syncErrors: string[];
  
  // Backup health
  backupHealth: BackupHealthStatus | null;
  
  // Storage
  storageStats: {
    totalBackups: number;
    totalSize: number;
    quota: {
      used: number;
      available: number;
      percentageUsed: number;
    };
  } | null;
}

export interface BackupActions {
  // Backup creation
  createBackup: (options?: {
    compression?: boolean;
    encryption?: boolean;
    password?: string;
    strategy?: BackupStrategy['type'];
    onProgress?: (progress: number) => void;
  }) => Promise<void>;
  
  saveCreatedBackup: (destination: 'download' | 'share' | 'cloud') => Promise<void>;
  
  // Backup restoration
  handleRestorePick: (file: File) => Promise<void>;
  handleRestoreFromHistory: (backupId: string) => Promise<void>;
  confirmRestore: () => Promise<void>;
  cancelRestore: () => void;
  
  // Auto-backup
  toggleAutoBackup: (enabled: boolean) => void;
  setAutoBackupInterval: (hours: number) => void;
  triggerAutoBackup: () => Promise<void>;
  
  // Cloud backup
  toggleCloudBackup: (provider: CloudProvider, enabled: boolean) => Promise<void>;
  authenticateCloud: (provider: CloudProvider) => Promise<void>;
  syncWithCloud: (direction?: 'upload' | 'download' | 'both') => Promise<void>;
  
  // Backup management
  deleteBackup: (backupId: string) => Promise<void>;
  cleanupOldBackups: (maxAgeHours?: number) => Promise<void>;
  optimizeStorage: () => Promise<void>;
  
  // Health monitoring
  checkBackupHealth: () => Promise<void>;
  
  // Reset
  clearBackupArtifacts: () => void;
}

export function useAdvancedBackup(options: UseBackupOptions = {}): BackupState & BackupActions {
  const exportJSON = useAppStore((s) => s.exportJSON);
  const importJSON = useAppStore((s) => s.importJSON);
  
  // State management
  const [state, setState] = useState<BackupState>({
    backups: [],
    isLoading: true,
    error: null,
    currentBackup: null,
    lastBackupMeta: getLastBackupMeta(),
    backupStatus: getBackupStatus(getLastBackupMeta()),
    isCreating: false,
    createProgress: 0,
    createdBackup: null,
    isRestoring: false,
    restoreProgress: 0,
    pendingRestore: null,
    restoreStep: 0,
    autoBackupSettings: getAutoBackupSettings(),
    autoSnapshotCount: getAdvancedAutomaticSnapshotCount(),
    cloudConfigs: [],
    cloudProviders: [],
    isSyncing: false,
    syncProgress: 0,
    syncErrors: [],
    backupHealth: null,
    storageStats: null
  });

  // Helper to get current data
  const getCurrentData = useCallback((): AppData => {
    const raw = exportJSON();
    return AppDataSchema.parse(JSON.parse(raw));
  }, [exportJSON]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load backups
        const backups = await backupStorage.listAllBackups();
        
        // Load cloud providers
        const providers = cloudProviderFactory.getAllProviders();
        
        // Load cloud configs
        const cloudConfigs: CloudBackupConfig[] = [];
        const allProviders: CloudProvider[] = ['google-drive', 'dropbox', 'github-gist', 'custom'];
        allProviders.forEach(provider => {
          const config: CloudBackupConfig = {
            provider,
            enabled: false,
            syncFrequency: 'manual',
            autoUpload: false,
            autoDownload: false,
            conflictResolution: 'manual'
          };
          cloudConfigs.push(config);
        });
        
        // Load storage stats
        const storageStats = await backupStorage.getStorageStats();
        
        // Load backup health
        const lastBackupMeta = getLastBackupMeta();
        let backupHealth: BackupHealthStatus | null = null;
        if (lastBackupMeta) {
          const lastBackup = backups.find(b => b.backupId === lastBackupMeta.backupId);
          if (lastBackup) {
            backupHealth = await analyzeBackupHealth(lastBackup, getCurrentData());
          }
        }
        
        setState(prev => ({
          ...prev,
          backups,
          isLoading: false,
          lastBackupMeta,
          backupStatus: getBackupStatus(lastBackupMeta),
          cloudProviders: providers,
          cloudConfigs,
          storageStats,
          backupHealth
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage(error, 'Failed to load backup data')
        }));
      }
    };

    loadInitialData();
  }, [getCurrentData]);

  // Periodically check backup health
  useEffect(() => {
    const interval = setInterval(() => {
      const lastBackupMeta = getLastBackupMeta();
      if (lastBackupMeta) {
        const lastBackup = state.backups.find(b => b.backupId === lastBackupMeta.backupId);
        if (lastBackup) {
          analyzeBackupHealth(lastBackup, getCurrentData())
            .then(health => {
              setState(prev => ({ ...prev, backupHealth: health }));
            });
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [getCurrentData, state.backups]);

  // Auto-backup effect
  useEffect(() => {
    const settings = getAutoBackupSettings();
    
    if (settings.enabled && settings.backupOnChanges) {
      // Set up change detection
      // This would integrate with the app's data change tracking
    }
  }, [state.autoBackupSettings]);

  // ============================================================================
  // BACKUP CREATION
  // ============================================================================

  const createBackup = useCallback(async (options: {
    compression?: boolean;
    encryption?: boolean;
    password?: string;
    strategy?: BackupStrategy['type'];
    onProgress?: (progress: number) => void;
  } = {}) => {
    setState(prev => ({ ...prev, isCreating: true, createProgress: 0, error: null }));
    
    try {
      const data = getCurrentData();
      
      // Check storage capability
      const canStore = await canStoreBackup(JSON.stringify(data).length);
      if (!canStore.canStore) {
        throw new Error(canStore.reason || 'Cannot create backup - storage unavailable');
      }
      
      // Create backup
      const result = await createAdvancedBackup(data, {
        type: options.strategy || 'full',
        compression: options.compression !== false,
        encryption: options.encryption === true,
        password: options.encryption ? options.password : undefined
      });
      
      if (options.onProgress) {
        options.onProgress(50);
      }
      
      // Generate filename
      const stamp = result.createdAtISO.replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
      const filename = `SkillSync-Backup-${stamp}.json`;
      
      // Update state
      setState(prev => ({
        ...prev,
        isCreating: false,
        createProgress: 100,
        createdBackup: {
          text: result.text,
          meta: result.meta,
          filename
        },
        lastBackupMeta: result.meta
      }));
      
      // Store in local storage
      setLastBackupMeta(result.meta);
      
      // Add to backup storage
      await backupStorage.storeBackup({
        ...JSON.parse(result.text),
        sizeBytes: result.meta.sizeBytes,
        meta: result.meta
      }, { tags: ['manual', options.strategy || 'full'] });
      
      // Update backup list
      const backups = await backupStorage.listAllBackups();
      setState(prev => ({ ...prev, backups }));
      
      // Check health
      const health = await analyzeBackupHealth(
        { ...JSON.parse(result.text), sizeBytes: result.meta.sizeBytes, meta: result.meta } as ValidBackup,
        data
      );
      setState(prev => ({ ...prev, backupHealth: health }));
      
      if (options.onProgress) {
        options.onProgress(100);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isCreating: false,
        error: errorMessage(error, 'Failed to create backup')
      }));
      toast.error(errorMessage(error, 'Failed to create backup'));
    }
  }, [getCurrentData]);

  const saveCreatedBackup = useCallback(async (destination: 'download' | 'share' | 'cloud') => {
    const created = state.createdBackup;
    if (!created) return;

    try {
      switch (destination) {
        case 'download':
          const result = await saveBackupFile({
            filename: created.filename,
            text: created.text,
            mimeType: 'application/json'
          });
          
          if (result.status === 'saved' || result.status === 'fallback-download') {
            toast.success(`Backup saved: ${created.filename}`);
          } else if (result.status === 'cancelled') {
            toast('Save cancelled');
          } else {
            toast.error(`Failed to save backup: ${result.message || 'Unknown error'}`);
          }
          break;
          
        case 'share':
          const shareResult = await shareBackupFile({
            filename: created.filename,
            text: created.text,
            mimeType: 'application/json'
          });
          
          if (shareResult.status === 'shared') {
            toast.success('Backup shared');
          } else if (shareResult.status === 'fallback-download') {
            toast('File sharing unavailable - backup downloaded');
          } else if (shareResult.status === 'cancelled') {
            toast('Share cancelled');
          } else {
            toast.error(`Failed to share backup: ${shareResult.message || 'Unknown error'}`);
          }
          break;
          
        case 'cloud':
          // Upload to cloud
          const manager = await cloudSyncManager.getActiveManager();
          if (manager) {
            const cloudResult = await manager.uploadBackup({
              ...JSON.parse(created.text),
              sizeBytes: created.meta.sizeBytes,
              meta: created.meta
            } as ValidBackup);
            
            if (cloudResult.success) {
              toast.success('Backup uploaded to cloud');
            } else {
              toast.error(`Failed to upload to cloud: ${cloudResult.error}`);
            }
          } else {
            toast.error('No active cloud provider');
          }
          break;
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to save backup'));
    } finally {
      // Clear created backup
      setState(prev => ({ ...prev, createdBackup: null }));
    }
  }, [state.createdBackup]);

  // ============================================================================
  // BACKUP RESTORATION
  // ============================================================================

  const handleRestorePick = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isRestoring: true, restoreProgress: 0, error: null }));
    
    try {
      const text = await file.text();
      
      // Try regular validation first
      let result = await validateAdvancedBackup(text);
      
      // If encrypted, prompt for password
      if (!result.ok && result.recoverable && result.error.includes('encrypted')) {
        // In a real implementation, you would prompt the user for a password
        toast.error('Backup is encrypted. Please provide the password.');
        setState(prev => ({ ...prev, isRestoring: false }));
        return;
      }
      
      if (!result.ok) {
        throw new Error(result.error);
      }
      
      setState(prev => ({
        ...prev,
        isRestoring: false,
        pendingRestore: result.backup,
        restoreStep: 1
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRestoring: false,
        error: errorMessage(error, 'Failed to read backup file')
      }));
      toast.error(errorMessage(error, 'Failed to read backup file'));
    }
  }, []);

  const handleRestoreFromHistory = useCallback(async (backupId: string) => {
    setState(prev => ({ ...prev, isRestoring: true, restoreProgress: 0, error: null }));
    
    try {
      const backup = await backupStorage.getBackup(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }
      
      setState(prev => ({
        ...prev,
        isRestoring: false,
        pendingRestore: backup,
        restoreStep: 1
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRestoring: false,
        error: errorMessage(error, 'Failed to load backup from history')
      }));
      toast.error(errorMessage(error, 'Failed to load backup from history'));
    }
  }, []);

  const confirmRestore = useCallback(async () => {
    const pending = state.pendingRestore;
    if (!pending) return;

    setState(prev => ({ ...prev, isRestoring: true, restoreStep: 2, restoreProgress: 0 }));
    
    try {
      // Create safety snapshot first
      const safety = await createAdvancedSafetySnapshot(getCurrentData());
      if (!safety) {
        throw new Error('Could not create safety snapshot');
      }
      
      setState(prev => ({ ...prev, restoreProgress: 30 }));
      
      // Handle incremental backup
      let finalBackup = pending;
      if (pending.meta.incremental && pending.meta.baseBackupId) {
        const baseBackup = await backupStorage.getBackup(pending.meta.baseBackupId);
        if (baseBackup) {
          const restoreResult = await restoreAdvancedBackup(pending, {
            baseBackup,
            onProgress: (progress) => {
              setState(prev => ({ ...prev, restoreProgress: 30 + progress * 50 }));
            }
          });
          
          if (!restoreResult.ok) {
            throw new Error(restoreResult.error);
          }
          finalBackup = { ...baseBackup, data: restoreResult.data } as ValidBackup;
        } else {
          throw new Error('Base backup not found for incremental restore');
        }
      }
      
      // Import data
      setState(prev => ({ ...prev, restoreProgress: 80 }));
      
      const result = importJSON(JSON.stringify(finalBackup.data));
      if (!result.ok) {
        throw new Error(result.error);
      }
      
      // Update backup metadata
      const { meta: m } = await createAdvancedBackup(finalBackup.data);
      setLastBackupMeta(m);
      
      setState(prev => ({
        ...prev,
        isRestoring: false,
        restoreStep: 0,
        pendingRestore: null,
        restoreProgress: 100,
        lastBackupMeta: m,
        backupStatus: getBackupStatus(m)
      }));
      
      // Refresh backup list
      const backups = await backupStorage.listAllBackups();
      setState(prev => ({ ...prev, backups }));
      
      toast.success('Backup restored successfully');
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRestoring: false,
        restoreStep: 0,
        error: errorMessage(error, 'Failed to restore backup')
      }));
      toast.error(errorMessage(error, 'Failed to restore backup'));
    }
  }, [getCurrentData, state.pendingRestore]);

  const cancelRestore = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRestoring: false,
      restoreStep: 0,
      pendingRestore: null,
      error: null
    }));
  }, []);

  // ============================================================================
  // AUTO-BACKUP MANAGEMENT
  // ============================================================================

  const toggleAutoBackup = useCallback((enabled: boolean) => {
    const settings = getAutoBackupSettings();
    setAutoBackupSettings({ ...settings, enabled });
    setState(prev => ({ ...prev, autoBackupSettings: { ...settings, enabled } }));
    
    if (enabled) {
      // Trigger immediate backup
      triggerAutoBackup();
    }
  }, []);

  const setAutoBackupInterval = useCallback((hours: number) => {
    const settings = getAutoBackupSettings();
    setAutoBackupSettings({ ...settings, intervalHours: hours });
    setState(prev => ({ ...prev, autoBackupSettings: { ...settings, intervalHours: hours } }));
  }, []);

  const triggerAutoBackup = useCallback(async () => {
    try {
      const data = getCurrentData();
      await createAdvancedAutomaticSnapshot(data, true);
      
      // Update snapshot count
      const count = getAdvancedAutomaticSnapshotCount();
      setState(prev => ({ ...prev, autoSnapshotCount: count }));
      
      toast.success('Auto-backup created');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create auto-backup'));
    }
  }, [getCurrentData]);

  // ============================================================================
  // CLOUD BACKUP MANAGEMENT
  // ============================================================================

  const toggleCloudBackup = useCallback(async (provider: CloudProvider, enabled: boolean) => {
    try {
      const manager = new CloudBackupManager(provider);
      await manager.initialize();
      
      manager.setConfig({ enabled });
      
      // Update state
      setState(prev => ({
        ...prev,
        cloudConfigs: prev.cloudConfigs.map(c =>
          c.provider === provider ? { ...c, enabled } : c
        )
      }));
      
      if (enabled) {
        toast.success(`Cloud backup enabled for ${provider}`);
      } else {
        toast.success(`Cloud backup disabled for ${provider}`);
      }
    } catch (error) {
      toast.error(errorMessage(error, `Failed to ${enabled ? 'enable' : 'disable'} cloud backup`));
    }
  }, []);

  const authenticateCloud = useCallback(async (provider: CloudProvider) => {
    try {
      const manager = new CloudBackupManager(provider);
      await manager.initialize();
      
      const result = await manager.authenticate(true);
      
      if (result.success) {
        manager.setConfig({ enabled: true });
        
        // Update state
        setState(prev => ({
          ...prev,
          cloudConfigs: prev.cloudConfigs.map(c =>
            c.provider === provider ? { ...c, enabled: true } : c
          )
        }));
        
        toast.success(`Authenticated with ${provider}`);
      } else {
        toast.error(`Failed to authenticate with ${provider}: ${result.error}`);
      }
    } catch (error) {
      toast.error(errorMessage(error, `Failed to authenticate with ${provider}`));
    }
  }, []);

  const syncWithCloud = useCallback(async (direction: 'upload' | 'download' | 'both' = 'both') => {
    setState(prev => ({ ...prev, isSyncing: true, syncProgress: 0, syncErrors: [] }));
    
    try {
      const manager = await cloudSyncManager.getActiveManager();
      if (!manager) {
        throw new Error('No active cloud provider');
      }
      
      const result = await manager.syncAll({
        onProgress: (progress, message) => {
          setState(prev => ({
            ...prev,
            syncProgress: progress,
            error: message
          }));
        },
        direction
      });
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: result.errors
      }));
      
      if (result.errors.length > 0) {
        toast.error(`Sync completed with ${result.errors.length} errors`);
      } else {
        toast.success(`Sync completed: ${result.uploaded} uploaded, ${result.downloaded} downloaded`);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [errorMessage(error, 'Sync failed')]
      }));
      toast.error(errorMessage(error, 'Sync failed'));
    }
  }, []);

  // ============================================================================
  // BACKUP MANAGEMENT
  // ============================================================================

  const deleteBackup = useCallback(async (backupId: string) => {
    try {
      const success = await backupStorage.deleteBackup(backupId);
      
      if (success) {
        // Update state
        const backups = await backupStorage.listAllBackups();
        setState(prev => ({ ...prev, backups }));
        
        // Check if this was the last backup
        const lastBackupMeta = getLastBackupMeta();
        if (lastBackupMeta?.backupId === backupId) {
          setLastBackupMeta(null);
          setState(prev => ({
            ...prev,
            lastBackupMeta: null,
            backupStatus: getBackupStatus(null)
          }));
        }
        
        toast.success('Backup deleted');
      } else {
        toast.error('Failed to delete backup');
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete backup'));
    }
  }, []);

  const cleanupOldBackups = useCallback(async (maxAgeHours: number = 720) => {
    try {
      const result = await backupStorage.cleanup(maxAgeHours);
      
      // Update state
      const backups = await backupStorage.listAllBackups();
      const storageStats = await backupStorage.getStorageStats();
      
      setState(prev => ({
        ...prev,
        backups,
        storageStats
      }));
      
      toast.success(`Cleaned up ${result.deleted} old backups, freed ${formatBytes(result.spaceFreed)}`);
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to cleanup old backups'));
    }
  }, []);

  const optimizeStorage = useCallback(async () => {
    try {
      const result = await backupStorage.optimizeStorage();
      
      if (result.moved > 0) {
        const storageStats = await backupStorage.getStorageStats();
        setState(prev => ({ ...prev, storageStats }));
        toast.success(`Optimized storage: moved ${result.moved} backups to IndexedDB`);
      } else {
        toast('Storage is already optimized');
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to optimize storage'));
    }
  }, []);

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  const checkBackupHealth = useCallback(async () => {
    try {
      const lastBackupMeta = getLastBackupMeta();
      if (lastBackupMeta) {
        const lastBackup = state.backups.find(b => b.backupId === lastBackupMeta.backupId);
        if (lastBackup) {
          const health = await analyzeBackupHealth(lastBackup, getCurrentData());
          setState(prev => ({ ...prev, backupHealth: health }));
        }
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to check backup health'));
    }
  }, [getCurrentData, state.backups]);

  // ============================================================================
  // RESET
  // ============================================================================

  const clearBackupArtifacts = useCallback(() => {
    clearAdvancedBackupArtifacts();
    setState(prev => ({
      ...prev,
      lastBackupMeta: null,
      backupStatus: getBackupStatus(null),
      autoBackupSettings: getAutoBackupSettings(),
      autoSnapshotCount: 0
    }));
    toast.success('Backup artifacts cleared');
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const backupSummary = useMemo(() => {
    if (!state.currentBackup) return null;
    return getBackupSummary(state.currentBackup.data);
  }, [state.currentBackup]);

  const canCreateBackup = useMemo(() => {
    return !state.isCreating && !state.isLoading;
  }, [state.isCreating, state.isLoading]);

  const canRestore = useMemo(() => {
    return !state.isRestoring && state.pendingRestore !== null && state.restoreStep === 2;
  }, [state.isRestoring, state.pendingRestore, state.restoreStep]);

  const activeCloudProvider = useMemo(() => {
    return state.cloudConfigs.find(c => c.enabled)?.provider || null;
  }, [state.cloudConfigs]);

  // Return combined state and actions
  return {
    // State
    ...state,
    backupSummary,
    canCreateBackup,
    canRestore,
    activeCloudProvider,
    
    // Actions
    createBackup,
    saveCreatedBackup,
    handleRestorePick,
    handleRestoreFromHistory,
    confirmRestore,
    cancelRestore,
    toggleAutoBackup,
    setAutoBackupInterval,
    triggerAutoBackup,
    toggleCloudBackup,
    authenticateCloud,
    syncWithCloud,
    deleteBackup,
    cleanupOldBackups,
    optimizeStorage,
    checkBackupHealth,
    clearBackupArtifacts
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for managing auto-backup settings
 */
export function useAutoBackup() {
  const {
    autoBackupSettings,
    autoSnapshotCount,
    toggleAutoBackup,
    setAutoBackupInterval,
    triggerAutoBackup
  } = useAdvancedBackup();

  const [isBusy, setIsBusy] = useState(false);

  const updateSettings = useCallback((settings: Partial<AutoBackupSettings>) => {
    // This would update the settings in the store
    // For now, we'll just call the individual setters
    if (settings.enabled !== undefined) {
      toggleAutoBackup(settings.enabled);
    }
    if (settings.intervalHours !== undefined) {
      setAutoBackupInterval(settings.intervalHours);
    }
  }, [toggleAutoBackup, setAutoBackupInterval]);

  const testBackup = useCallback(async () => {
    setIsBusy(true);
    try {
      await triggerAutoBackup();
    } finally {
      setIsBusy(false);
    }
  }, [triggerAutoBackup]);

  return {
    settings: autoBackupSettings,
    snapshotCount: autoSnapshotCount,
    isBusy,
    updateSettings,
    testBackup
  };
}

/**
 * Hook for cloud backup management
 */
export function useCloudBackup(provider?: CloudProvider) {
  const {
    cloudConfigs,
    cloudProviders,
    isSyncing,
    syncProgress,
    syncErrors,
    toggleCloudBackup,
    authenticateCloud,
    syncWithCloud
  } = useAdvancedBackup();

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const getProviderConfig = useCallback((p: CloudProvider) => {
    return cloudConfigs.find(c => c.provider === p) || cloudConfigs[0];
  }, [cloudConfigs]);

  const getProvider = useCallback((p: CloudProvider) => {
    return cloudProviders.find(provider => provider.name === p);
  }, [cloudProviders]);

  const handleAuthenticate = useCallback(async (p: CloudProvider) => {
    setIsAuthenticating(true);
    try {
      await authenticateCloud(p);
    } finally {
      setIsAuthenticating(false);
    }
  }, [authenticateCloud]);

  const handleSync = useCallback(async (direction?: 'upload' | 'download' | 'both') => {
    await syncWithCloud(direction);
  }, [syncWithCloud]);

  return {
    configs: cloudConfigs,
    providers: cloudProviders,
    isSyncing,
    syncProgress,
    syncErrors,
    isAuthenticating,
    getProviderConfig,
    getProvider,
    toggleCloudBackup,
    handleAuthenticate,
    handleSync
  };
}

/**
 * Hook for backup health monitoring
 */
export function useBackupHealth() {
  const {
    backupHealth,
    checkBackupHealth,
    lastBackupMeta,
    backupStatus
  } = useAdvancedBackup();

  const healthScore = useMemo(() => {
    return backupHealth?.score || 0;
  }, [backupHealth]);

  const healthStatus = useMemo(() => {
    return backupHealth?.status || 'unknown';
  }, [backupHealth]);

  const healthIssues = useMemo(() => {
    return backupHealth?.issues || [];
  }, [backupHealth]);

  const healthRecommendations = useMemo(() => {
    return backupHealth?.recommendations || [];
  }, [backupHealth]);

  const refreshHealth = useCallback(() => {
    checkBackupHealth();
  }, [checkBackupHealth]);

  return {
    healthScore,
    healthStatus,
    healthIssues,
    healthRecommendations,
    backupStatus,
    lastBackupMeta,
    refreshHealth
  };
}

/**
 * Hook for backup storage management
 */
export function useBackupStorage() {
  const {
    storageStats,
    backups,
    cleanupOldBackups,
    optimizeStorage,
    deleteBackup
  } = useAdvancedBackup();

  const totalSize = useMemo(() => {
    return storageStats?.totalSize || 0;
  }, [storageStats]);

  const quotaUsed = useMemo(() => {
    return storageStats?.quota.percentageUsed || 0;
  }, [storageStats]);

  const isOverQuota = useMemo(() => {
    return storageStats?.quota.percentageUsed > 80;
  }, [storageStats]);

  const backupCount = useMemo(() => {
    return backups.length;
  }, [backups]);

  return {
    totalSize,
    quotaUsed,
    isOverQuota,
    backupCount,
    storageStats,
    backups,
    cleanupOldBackups,
    optimizeStorage,
    deleteBackup
  };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  UseBackupOptions,
  BackupState,
  BackupActions
};
