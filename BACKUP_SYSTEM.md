# SkillSync Advanced Backup & Restore System

## 🚀 Overview

The **MAX LEVEL** backup and restore system for SkillSync provides enterprise-grade data protection with comprehensive features including compression, encryption, cloud integration, and multi-device synchronization.

## 📋 Features

### ✅ Core Features
- **Full & Incremental Backups** - Complete snapshots or only changed data
- **Compression** - Reduce backup size with GZIP compression
- **Encryption** - AES-256-GCM encryption for sensitive data
- **Checksum Verification** - SHA-256 integrity checks
- **Multi-format Support** - JSON with optional compression/encryption

### ✅ Advanced Features
- **Cloud Integration** - Google Drive, Dropbox, GitHub Gist, Custom
- **Multi-device Sync** - Automatic synchronization across devices
- **Backup Health Monitoring** - Proactive issue detection
- **Storage Optimization** - Automatic cleanup and compression
- **Version History** - Track and manage backup versions
- **Conflict Resolution** - Smart merging of changes

### ✅ Management Features
- **Automatic Backups** - Scheduled with customizable intervals
- **Backup Queue** - Handle multiple backup operations
- **Backup Cache** - Fast access to recent backups
- **Storage Quotas** - Monitor and manage storage usage
- **Backup History** - Complete audit trail of all operations

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ BackupSection│  │  Hooks       │  │ Advanced UI      │   │
│  │ (Advanced)   │  │ useAdvanced  │  │ Components       │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CORE BACKUP SYSTEM                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ advanced-backup  │  │ backup-storage   │  │ cloud-backup │  │
│  │ .ts             │  │ .ts              │  │ .ts          │  │
│  │                 │  │                 │  │               │  │
│  │ - Creation      │  │ - IndexedDB      │  │ - Providers  │  │
│  │ - Validation    │  │ - LocalStorage   │  │ - Sync       │  │
│  │ - Restoration   │  │ - Queue          │  │ - Manager    │  │
│  │ - Compression   │  │ - Cache          │  │             │  │
│  │ - Encryption    │  │ - Optimization   │  │             │  │
│  │ - Health Check  │  │                 │  │             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYERS                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ LocalStorage │  │ IndexedDB    │  │ Cloud Providers  │   │
│  │ (Small)      │  │ (Large)      │  │ (Unlimited)      │   │
│  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Installation & Setup

### 1. Import the Advanced Backup System

```typescript
// Import everything from the main entry point
import * as backup from '@/lib/backup';

// Or import specific functions
import {
  createAdvancedBackup,
  validateAdvancedBackup,
  restoreAdvancedBackup,
  useAdvancedBackup
} from '@/lib/backup';
```

### 2. Use in React Components

```typescript
import { useAdvancedBackup } from '@/hooks/use-advanced-backup';

function MyComponent() {
  const backup = useAdvancedBackup();
  
  // Access state
  const { backups, isCreating, lastBackupMeta, backupHealth } = backup;
  
  // Use actions
  const createBackup = async () => {
    await backup.createBackup({
      compression: true,
      encryption: true,
      password: 'my-secret-password'
    });
  };
  
  return (
    <button onClick={createBackup}>
      Create Backup
    </button>
  );
}
```

## 🔧 API Reference

### Core Backup Functions

#### `createAdvancedBackup(data, options)`

Create a backup with advanced options.

```typescript
interface BackupStrategy {
  type: 'full' | 'incremental' | 'smart';
  compression: boolean;
  encryption: boolean;
  password?: string;
  includeModules: string[];
  excludeModules: string[];
}

const result = await createAdvancedBackup(data, {
  compression: true,
  encryption: true,
  password: 'my-password',
  strategy: 'full'
});
// Returns: { text: string; meta: BackupMeta; createdAtISO: string; checksum: string; }
```

#### `validateAdvancedBackup(input)`

Validate a backup file with integrity checks.

```typescript
const result = await validateAdvancedBackup(backupText);
// Returns: 
// { ok: true; backup: ValidBackup; warnings: string[]; } 
// OR
// { ok: false; error: string; recoverable?: boolean; }
```

#### `validateEncryptedBackup(input, password)`

Validate and decrypt an encrypted backup.

```typescript
const result = await validateEncryptedBackup(encryptedText, 'my-password');
// Same return type as validateAdvancedBackup
```

#### `restoreAdvancedBackup(backup, options)`

Restore a backup with advanced options.

```typescript
const result = await restoreAdvancedBackup(backup, {
  baseBackup: baseBackup, // For incremental restores
  mergeStrategy: 'replace', // 'replace' | 'merge' | 'selective'
  modulesToRestore: ['notes', 'projects'],
  onProgress: (progress: number) => console.log(progress)
});
// Returns: { ok: true; data: AppData; warnings: string[]; stats: { ... }; }
// OR { ok: false; error: string; }
```

### Incremental Backup Functions

#### `createIncrementalBackup(data, previousBackup, options)`

Create an incremental backup based on a previous backup.

```typescript
const result = await createIncrementalBackup(currentData, previousBackup, {
  compression: true,
  encryption: false
});
// Returns: { text: string; meta: BackupMeta; createdAtISO: string; checksum: string; } | null
```

#### `detectChanges(oldData, newData)`

Detect changes between two datasets.

```typescript
const changes = detectChanges(oldData, newData);
// Returns: ModuleChangeSummary[]
// Each summary contains: module, created, updated, deleted, totalChanges, lastChangeAt
```

#### `extractChangedData(newData, oldData, changes)`

Extract only the changed data for incremental backup.

```typescript
const changedData = extractChangedData(newData, oldData, changes);
// Returns: Partial<AppData>
```

#### `applyIncrementalChanges(baseData, changes)`

Apply incremental changes to base data.

```typescript
const restoredData = applyIncrementalChanges(baseData, changedData);
// Returns: AppData
```

### Health Monitoring Functions

#### `analyzeBackupHealth(backup, currentData)`

Analyze the health of a backup.

```typescript
const health = await analyzeBackupHealth(backup, currentData);
// Returns: BackupHealthStatus
// {
//   status: 'healthy' | 'warning' | 'critical' | 'unknown',
//   score: number, // 0-100
//   issues: BackupHealthIssue[],
//   recommendations: string[],
//   lastCheckedAt: number
// }
```

### Storage Management Functions

#### `backupStorage.storeBackup(backup, options)`

Store a backup using the best available method.

```typescript
const result = await backupStorage.storeBackup(backup, {
  tags: ['manual', 'important'],
  priority: 'high'
});
// Returns: { success: boolean; storageMethod: string; backupId: string; sizeBytes: number; warnings: string[]; }
```

#### `backupStorage.getBackup(backupId)`

Retrieve a backup by ID.

```typescript
const backup = await backupStorage.getBackup(backupId);
// Returns: ValidBackup | null
```

#### `backupStorage.listAllBackups()`

List all available backups.

```typescript
const backups = await backupStorage.listAllBackups();
// Returns: ValidBackup[]
```

#### `backupStorage.deleteBackup(backupId)`

Delete a backup.

```typescript
const success = await backupStorage.deleteBackup(backupId);
// Returns: boolean
```

#### `backupStorage.getStorageStats()`

Get storage statistics.

```typescript
const stats = await backupStorage.getStorageStats();
// Returns: {
//   totalBackups: number;
//   totalSize: number;
//   storageMethod: string;
//   quota: { used: number; available: number; percentageUsed: number; }
// }
```

#### `backupStorage.cleanup(maxAgeHours)`

Clean up old backups.

```typescript
const result = await backupStorage.cleanup(720); // 30 days
// Returns: { deleted: number; total: number; spaceFreed: number; }
```

#### `backupStorage.optimizeStorage()`

Optimize storage by moving large backups to IndexedDB.

```typescript
const result = await backupStorage.optimizeStorage();
// Returns: { moved: number; errors: string[]; }
```

### Cloud Backup Functions

#### `CloudBackupManager`

High-level cloud backup manager.

```typescript
const manager = new CloudBackupManager('google-drive');

// Initialize
await manager.initialize();

// Authenticate
await manager.authenticate(true);

// Upload backup
const result = await manager.uploadBackup(backup, {
  folderId: 'my-folder',
  filename: 'backup.json',
  onProgress: (progress) => console.log(progress)
});

// Download backup
const result = await manager.downloadBackup(fileId);

// List backups
const result = await manager.listBackups();

// Sync all
const result = await manager.syncAll({
  direction: 'both',
  onProgress: (progress, message) => console.log(progress, message)
});
```

#### `cloudSyncManager`

Multi-provider cloud sync manager.

```typescript
// Initialize all providers
await cloudSyncManager.initialize();

// Set active provider
await cloudSyncManager.setActiveProvider('google-drive');

// Get active manager
const manager = await cloudSyncManager.getActiveManager();

// Sync across all devices
const result = await cloudSyncManager.syncAllDevices();

// Get all cloud backups
const allBackups = await cloudSyncManager.getAllCloudBackups();
```

### React Hooks

#### `useAdvancedBackup()`

Main hook for backup management.

```typescript
const backup = useAdvancedBackup();

// State
const {
  backups,           // All available backups
  isLoading,        // Loading state
  error,            // Error state
  currentBackup,    // Current backup being processed
  lastBackupMeta,   // Last backup metadata
  backupStatus,     // Status of last backup
  isCreating,       // Creating state
  createProgress,   // Creation progress (0-100)
  createdBackup,    // Recently created backup
  isRestoring,      // Restoring state
  restoreProgress,  // Restore progress (0-100)
  pendingRestore,   // Backup to be restored
  restoreStep,      // Restore step (0=none, 1=preview, 2=confirm)
  autoBackupSettings, // Auto-backup settings
  autoSnapshotCount, // Number of automatic snapshots
  cloudConfigs,     // Cloud backup configurations
  cloudProviders,   // Available cloud providers
  isSyncing,        // Sync state
  syncProgress,     // Sync progress (0-100)
  syncErrors,       // Sync errors
  backupHealth,     // Backup health status
  storageStats      // Storage statistics
} = backup;

// Actions
const {
  createBackup,           // Create a new backup
  saveCreatedBackup,     // Save created backup to destination
  handleRestorePick,     // Handle file pick for restore
  handleRestoreFromHistory, // Restore from backup history
  confirmRestore,         // Confirm restore operation
  cancelRestore,          // Cancel restore operation
  toggleAutoBackup,      // Toggle auto-backup
  setAutoBackupInterval,  // Set auto-backup interval
  triggerAutoBackup,      // Trigger immediate auto-backup
  toggleCloudBackup,     // Toggle cloud backup for provider
  authenticateCloud,      // Authenticate with cloud provider
  syncWithCloud,          // Sync with cloud
  deleteBackup,           // Delete a backup
  cleanupOldBackups,      // Clean up old backups
  optimizeStorage,        // Optimize storage
  checkBackupHealth,      // Check backup health
  clearBackupArtifacts     // Clear all backup artifacts
} = backup;
```

#### `useAutoBackup()`

Hook for auto-backup management.

```typescript
const autoBackup = useAutoBackup();

const {
  settings,       // Auto-backup settings
  snapshotCount, // Number of snapshots
  isBusy,        // Busy state
  updateSettings, // Update settings
  testBackup      // Test backup creation
} = autoBackup;
```

#### `useCloudBackup(provider?)`

Hook for cloud backup management.

```typescript
const cloudBackup = useCloudBackup('google-drive');

const {
  configs,           // Cloud configurations
  providers,         // Available providers
  isSyncing,        // Sync state
  syncProgress,     // Sync progress
  syncErrors,       // Sync errors
  isAuthenticating, // Authentication state
  getProviderConfig, // Get config for provider
  getProvider,       // Get provider instance
  toggleCloudBackup, // Toggle cloud backup
  handleAuthenticate, // Authenticate with provider
  handleSync        // Sync with provider
} = cloudBackup;
```

#### `useBackupHealth()`

Hook for backup health monitoring.

```typescript
const health = useBackupHealth();

const {
  healthScore,        // Health score (0-100)
  healthStatus,       // Status ('healthy' | 'warning' | 'critical' | 'unknown')
  healthIssues,      // Array of health issues
  healthRecommendations, // Array of recommendations
  backupStatus,      // Status of last backup
  lastBackupMeta,    // Last backup metadata
  refreshHealth     // Refresh health analysis
} = health;
```

#### `useBackupStorage()`

Hook for storage management.

```typescript
const storage = useBackupStorage();

const {
  totalSize,       // Total storage used
  quotaUsed,       // Percentage of quota used
  isOverQuota,    // Whether over quota
  backupCount,     // Number of backups
  storageStats,    // Storage statistics
  backups,         // All backups
  cleanupOldBackups, // Clean up old backups
  optimizeStorage,  // Optimize storage
  deleteBackup     // Delete a backup
} = storage;
```

## 🎯 Usage Examples

### Example 1: Basic Backup Creation

```typescript
import { createAdvancedBackup } from '@/lib/backup';
import { useAppStore } from '@/store/useAppStore';

function CreateBackupButton() {
  const exportJSON = useAppStore((s) => s.exportJSON);

  const handleCreate = async () => {
    const data = JSON.parse(exportJSON());
    
    const result = await createAdvancedBackup(data, {
      compression: true,
      encryption: false,
      strategy: 'full'
    });

    console.log('Backup created:', result.meta.backupId);
    console.log('Size:', result.meta.sizeBytes, 'bytes');
    console.log('Checksum:', result.checksum);
  };

  return <button onClick={handleCreate}>Create Backup</button>;
}
```

### Example 2: Backup with Encryption

```typescript
import { createAdvancedBackup, saveBackupFile } from '@/lib/backup';

async function createEncryptedBackup(data: AppData, password: string) {
  const result = await createAdvancedBackup(data, {
    compression: true,
    encryption: true,
    password: password
  });

  // Save to file
  await saveBackupFile({
    filename: `SkillSync-Backup-${result.meta.backupId}.json`,
    text: result.text,
    mimeType: 'application/json'
  });

  return result.meta;
}
```

### Example 3: Incremental Backup

```typescript
import { createIncrementalBackup, detectChanges } from '@/lib/backup';

async function createIncremental(data: AppData, previousBackup: ValidBackup) {
  // Check for changes
  const changes = detectChanges(previousBackup.data, data);
  
  if (changes.length === 0) {
    console.log('No changes detected');
    return null;
  }

  console.log('Changes detected:', changes);

  // Create incremental backup
  const result = await createIncrementalBackup(data, previousBackup, {
    compression: true
  });

  if (result) {
    console.log('Incremental backup created:', result.meta.backupId);
    console.log('Based on:', result.meta.baseBackupId);
  }

  return result;
}
```

### Example 4: Cloud Backup

```typescript
import { cloudSyncManager } from '@/lib/backup';

async function uploadToCloud(backup: ValidBackup) {
  // Initialize
  await cloudSyncManager.initialize();

  // Set active provider
  await cloudSyncManager.setActiveProvider('google-drive');

  // Get manager
  const manager = await cloudSyncManager.getActiveManager();

  if (manager) {
    // Upload
    const result = await manager.uploadBackup(backup, {
      filename: `SkillSync-Backup-${backup.meta.backupId}.json`,
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress}%`);
      }
    });

    if (result.success) {
      console.log('Uploaded to cloud:', result.fileId);
      return result;
    } else {
      console.error('Upload failed:', result.error);
    }
  }
}
```

### Example 5: Full React Component

```typescript
import { useAdvancedBackup } from '@/hooks/use-advanced-backup';
import { Button } from '@/components/ui/button';

export function BackupComponent() {
  const backup = useAdvancedBackup();

  const handleCreate = async () => {
    try {
      await backup.createBackup({
        compression: true,
        strategy: 'full'
      });
      
      if (backup.createdBackup) {
        await backup.saveCreatedBackup('download');
      }
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  const handleRestore = async (file: File) => {
    await backup.handleRestorePick(file);
  };

  return (
    <div>
      <Button onClick={handleCreate} disabled={backup.isCreating}>
        {backup.isCreating ? 'Creating...' : 'Create Backup'}
      </Button>

      <input
        type="file"
        accept=".json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleRestore(file);
        }}
      />

      {backup.backupHealth && (
        <div>
          <h3>Backup Health: {backup.backupHealth.status}</h3>
          <p>Score: {backup.backupHealth.score}/100</p>
          {backup.backupHealth.issues.map(issue => (
            <div key={issue.id}>{issue.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 🔒 Security Considerations

### Encryption
- Uses AES-256-GCM for authenticated encryption
- Password is derived using PBKDF2 with 100,000 iterations
- Each backup has a unique salt and IV
- Encryption metadata is stored with the backup

### Data Integrity
- SHA-256 checksums verify backup integrity
- Checksums are generated for both compressed and uncompressed data
- Validation fails if checksums don't match

### Storage
- Sensitive data (tokens, passwords) are never stored in backups
- Cloud tokens are stored separately and can be revoked
- Local storage uses browser's built-in security

## ⚡ Performance Optimization

### Compression
- Automatic compression for backups >1MB
- GZIP compression using browser APIs
- Compression ratio is tracked in metadata

### Storage Strategy
- Small backups (<5MB) use localStorage
- Large backups use IndexedDB
- Cloud backups have no size limit
- Automatic optimization moves large backups to IndexedDB

### Caching
- Backup cache stores frequently accessed backups
- Cache TTL of 30 minutes
- Max cache size of 5 backups

### Queue System
- Backup operations are queued
- Priority system (high, normal, low)
- Concurrent operation support

## 📊 Monitoring & Analytics

### Backup Health
- **Age**: Backups older than 30 days are flagged
- **Completeness**: Missing modules are detected
- **Size**: Large backups (>50MB) are flagged
- **Integrity**: Checksum verification
- **Encryption**: Unencrypted backups are flagged

### Health Score
- 100: Perfect health
- 70-99: Healthy
- 30-69: Warning
- 0-29: Critical
- Issues reduce the score based on severity

### Storage Monitoring
- Tracks total storage used
- Monitors quota usage
- Warns when >80% quota used
- Provides optimization recommendations

## 🚨 Error Handling

### Backup Creation Errors
- **Storage Full**: Falls back to alternative storage
- **Quota Exceeded**: Prompts user to clean up
- **Encryption Failed**: Continues without encryption
- **Compression Failed**: Continues without compression

### Backup Validation Errors
- **Invalid JSON**: Clear error message
- **Wrong Version**: Clear version mismatch message
- **Corrupted Data**: Integrity check failure
- **Encrypted**: Prompts for password

### Restore Errors
- **Missing Base**: For incremental backups
- **Data Invalid**: Schema validation failure
- **Merge Conflict**: Conflict resolution required

## 🎨 UI Components

### `BackupSection` (Legacy)
The original backup section component with basic functionality.

### `AdvancedBackupSection` (New)
Enhanced backup section with:
- Tab-based navigation
- Backup history
- Health monitoring
- Cloud backup integration
- Storage management
- Advanced settings

### Usage

```typescript
// Use the advanced backup section
import { AdvancedBackupSection } from '@/components/profile/BackupSection.advanced';

function SettingsPage() {
  return (
    <div>
      <AdvancedBackupSection onRequestReset={() => {}} />
    </div>
  );
}
```

## 🔄 Migration Guide

### From Legacy to Advanced

The advanced backup system is fully backward compatible. Existing backups will continue to work.

### Steps to Migrate

1. **Import the new system**:
   ```typescript
   import { createAdvancedBackup } from '@/lib/backup';
   ```

2. **Replace legacy functions**:
   ```typescript
   // Old
   const backup = serializeBackup(data);
   
   // New
   const backup = await createAdvancedBackup(data);
   ```

3. **Use new hooks**:
   ```typescript
   // Old
   import { useBackup } from '@/hooks/use-backup';
   
   // New
   import { useAdvancedBackup } from '@/hooks/use-advanced-backup';
   ```

4. **Update UI components**:
   ```typescript
   // Old
   import { BackupSection } from '@/components/profile/BackupSection';
   
   // New
   import { AdvancedBackupSection } from '@/components/profile/BackupSection.advanced';
   ```

## 📚 File Structure

```
├── src/
│   ├── lib/
│   │   └── backup/
│   │       ├── index.ts              # Main entry point
│   │       ├── backup.ts             # Legacy system (backward compatible)
│   │       ├── advanced-backup.ts    # Advanced backup functions
│   │       ├── backup-storage.ts     # Storage management
│   │       ├── cloud-backup.ts       # Cloud integration
│   │       └── advanced-backup.test.ts # Tests
│   │
│   ├── hooks/
│   │   └── use-advanced-backup.ts    # React hooks
│   │
│   └── components/
│       └── profile/
│           ├── BackupSection.tsx     # Legacy component
│           └── BackupSection.advanced.tsx # Advanced component
│
├── BACKUP_SYSTEM.md                  # This documentation
└── package.json                       # Dependencies
```

## 🧪 Testing

Run the test suite:

```bash
npm test -- --filter backup
```

Or run all tests:

```bash
npm test
```

## 📖 Best Practices

### 1. Regular Backups
- Enable automatic backups
- Set appropriate interval based on usage
- Test backups regularly

### 2. Cloud Integration
- Enable at least one cloud provider
- Monitor sync status
- Resolve conflicts promptly

### 3. Security
- Use encryption for sensitive data
- Store encryption passwords securely
- Rotate cloud tokens periodically

### 4. Storage Management
- Monitor storage usage
- Clean up old backups regularly
- Optimize storage when needed

### 5. Monitoring
- Check backup health regularly
- Address issues promptly
- Follow recommendations

## 🐛 Troubleshooting

### Common Issues

#### Backup creation fails
- **Cause**: Storage quota exceeded
- **Solution**: Clean up old backups or enable cloud storage

#### Backup validation fails
- **Cause**: Corrupted backup file
- **Solution**: Try another backup or create a new one

#### Cloud sync fails
- **Cause**: Authentication expired
- **Solution**: Re-authenticate with the cloud provider

#### Incremental backup fails
- **Cause**: Base backup missing
- **Solution**: Create a full backup first

#### Storage optimization fails
- **Cause**: Browser restrictions
- **Solution**: Try in a different browser or clear browser data

### Debug Mode

Enable debug logging:

```typescript
// In development, enable debug mode
if (import.meta.env.DEV) {
  // Enable debug logging for backup operations
  window.localStorage.setItem('skillsync:debug', 'true');
}
```

## 🔮 Future Enhancements

- **End-to-end encryption**: Client-side encryption before cloud upload
- **Backup scheduling**: More granular scheduling options
- **Cross-platform sync**: Sync between different device types
- **Backup sharing**: Share backups with other users
- **Backup templates**: Pre-configured backup profiles
- **AI-powered optimization**: Automatic backup strategy selection

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the API documentation
3. Examine the test cases for usage examples
4. Create an issue in the repository

## 🏆 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

## 📄 License

This backup system is part of SkillSync and is licensed under the same terms as the main project.

---

**Version**: 3.0.0  
**Last Updated**: 2026-09-07  
**Author**: SkillSync Team
