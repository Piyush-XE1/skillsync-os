/**
 * Advanced Backup Storage System
 *
 * Features:
 * - IndexedDB for large backup storage
 * - LocalStorage fallback
 * - Cloud storage integration
 * - Automatic cleanup
 * - Storage quotas
 * - Performance optimization
 */

import {
  BackupMeta,
  ValidBackup,
  BackupHistoryEntry,
  CloudProvider,
  CloudBackupConfig,
  getDeviceId,
  formatBytes,
} from "./advanced-backup";

// ============================================================================
// INDEXEDDB STORAGE MANAGER
// ============================================================================

const DB_NAME = "SkillSyncBackups";
const DB_VERSION = 1;

// Store names
const BACKUP_STORE = "backups";
const METADATA_STORE = "metadata";
const CLOUD_STORE = "cloudBackups";
const HISTORY_STORE = "history";

interface BackupDBEntry {
  id: string; // backupId
  data: string; // JSON string
  meta: BackupMeta;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

interface CloudBackupDBEntry {
  id: string; // cloud backup ID
  provider: CloudProvider;
  data: string;
  meta: BackupMeta;
  uploadedAt: number;
  syncedAt: number;
  checksum: string;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private openPromise: Promise<IDBDatabase> | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.openPromise) return this.openPromise;

    this.openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = request.result;

        // Create stores
        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          const store = db.createObjectStore(BACKUP_STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
          store.createIndex("tags", "tags", { unique: false, multiEntry: true });
        }

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const store = db.createObjectStore(METADATA_STORE, { keyPath: "id" });
          store.createIndex("type", "type", { unique: false });
        }

        if (!db.objectStoreNames.contains(CLOUD_STORE)) {
          const store = db.createObjectStore(CLOUD_STORE, { keyPath: "id" });
          store.createIndex("provider", "provider", { unique: false });
          store.createIndex("uploadedAt", "uploadedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const store = db.createObjectStore(HISTORY_STORE, { keyPath: "id" });
          store.createIndex("backupId", "backupId", { unique: true });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("type", "type", { unique: false });
        }
      };
    });

    return this.openPromise;
  }

  async ensureOpen(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await this.open();
    }
    return this.db;
  }

  // Backup storage operations
  async storeBackup(backup: ValidBackup, tags: string[] = []): Promise<string> {
    const db = await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(BACKUP_STORE, "readwrite");
      const store = transaction.objectStore(BACKUP_STORE);

      const entry: BackupDBEntry = {
        id: backup.backupId,
        data: JSON.stringify(backup),
        meta: backup.meta,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags,
      };

      const request = store.put(entry);
      request.onsuccess = () => resolve(backup.backupId);
      request.onerror = () => reject(request.error);
    });
  }

  async getBackup(backupId: string): Promise<BackupDBEntry | null> {
    const db = await this.ensureOpen();

    return new Promise((resolve) => {
      const transaction = db.transaction(BACKUP_STORE, "readonly");
      const store = transaction.objectStore(BACKUP_STORE);

      const request = store.get(backupId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    const db = await this.ensureOpen();

    return new Promise((resolve) => {
      const transaction = db.transaction(BACKUP_STORE, "readwrite");
      const store = transaction.objectStore(BACKUP_STORE);

      const request = store.delete(backupId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async listBackups(
    options: {
      limit?: number;
      offset?: number;
      sortBy?: "createdAt" | "updatedAt";
      sortOrder?: "asc" | "desc";
      tags?: string[];
    } = {},
  ): Promise<BackupDBEntry[]> {
    const db = await this.ensureOpen();
    const { limit = 50, offset = 0, sortBy = "createdAt", sortOrder = "desc", tags = [] } = options;

    return new Promise((resolve) => {
      const transaction = db.transaction(BACKUP_STORE, "readonly");
      const store = transaction.objectStore(BACKUP_STORE);

      const index = store.index(sortBy);
      let range: IDBKeyRange | undefined;

      if (tags.length > 0) {
        // For tag filtering, we need a different approach
        const results: BackupDBEntry[] = [];
        const tagRequests = tags.map((tag) => {
          return new Promise<BackupDBEntry[]>((tagResolve) => {
            const tagIndex = store.index("tags");
            const tagRange = IDBKeyRange.only(tag);
            const tagRequest = tagIndex.getAll(tagRange);
            tagRequest.onsuccess = () => tagResolve(tagRequest.result || []);
            tagRequest.onerror = () => tagResolve([]);
          });
        });

        Promise.all(tagRequests).then((tagResults) => {
          const allResults = tagResults.flat();
          const uniqueResults = Array.from(new Map(allResults.map((r) => [r.id, r])).values());
          resolve(
            uniqueResults
              .sort((a, b) => {
                const aVal = a[sortBy as keyof BackupDBEntry] as number;
                const bVal = b[sortBy as keyof BackupDBEntry] as number;
                return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
              })
              .slice(offset, offset + limit),
          );
        });

        return;
      }

      const request = index.getAll();
      request.onsuccess = () => {
        const results = (request.result as BackupDBEntry[])
          .sort((a, b) => {
            const aVal = a[sortBy as keyof BackupDBEntry] as number;
            const bVal = b[sortBy as keyof BackupDBEntry] as number;
            return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
          })
          .slice(offset, offset + limit);
        resolve(results);
      };
      request.onerror = () => resolve([]);
    });
  }

  async getBackupCount(): Promise<number> {
    const db = await this.ensureOpen();

    return new Promise((resolve) => {
      const transaction = db.transaction(BACKUP_STORE, "readonly");
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.count();
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => resolve(0);
    });
  }

  async getTotalStorageSize(): Promise<number> {
    const db = await this.ensureOpen();

    return new Promise((resolve) => {
      const transaction = db.transaction(BACKUP_STORE, "readonly");
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as BackupDBEntry[];
        const totalSize = entries.reduce((sum, entry) => {
          return sum + entry.data.length + JSON.stringify(entry.meta).length;
        }, 0);
        resolve(totalSize);
      };
      request.onerror = () => resolve(0);
    });
  }

  // Cloud backup operations
  async storeCloudBackup(
    backup: ValidBackup,
    provider: CloudProvider,
    checksum: string,
  ): Promise<string> {
    const db = await this.ensureOpen();
    const id = `${provider}:${backup.backupId}:${Date.now()}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(CLOUD_STORE, "readwrite");
      const store = transaction.objectStore(CLOUD_STORE);

      const entry: CloudBackupDBEntry = {
        id,
        provider,
        data: JSON.stringify(backup),
        meta: backup.meta,
        uploadedAt: Date.now(),
        syncedAt: Date.now(),
        checksum,
      };

      const request = store.put(entry);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getCloudBackup(id: string): Promise<CloudBackupDBEntry | null> {
    const db = await this.ensureOpen();

    return new Promise((resolve) => {
      const transaction = db.transaction(CLOUD_STORE, "readonly");
      const store = transaction.objectStore(CLOUD_STORE);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  async listCloudBackups(provider?: CloudProvider): Promise<CloudBackupDBEntry[]> {
    const db = await this.ensureOpen();

    return new Promise((resolve) => {
      const transaction = db.transaction(CLOUD_STORE, "readonly");
      const store = transaction.objectStore(CLOUD_STORE);

      const index = provider ? store.index("provider") : store;

      const range = provider ? IDBKeyRange.only(provider) : undefined;

      const request = index.getAll(range);
      request.onsuccess = () => resolve((request.result as CloudBackupDBEntry[]) || []);
      request.onerror = () => resolve([]);
    });
  }

  // History operations
  async storeHistoryEntry(entry: BackupHistoryEntry): Promise<string> {
    const db = await this.ensureOpen();
    const id = `${entry.backupId}:${entry.createdAt}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(HISTORY_STORE, "readwrite");
      const store = transaction.objectStore(HISTORY_STORE);

      const historyEntry = { ...entry, id };
      const request = store.put(historyEntry);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getHistoryEntries(limit: number = 50): Promise<BackupHistoryEntry[]> {
    const db = await this.ensureOpen();

    return new Promise((resolve) => {
      const transaction = db.transaction(HISTORY_STORE, "readonly");
      const store = transaction.objectStore(HISTORY_STORE);
      const index = store.index("createdAt");
      const request = index.getAll(IDBKeyRange.upperBound(Date.now()));

      request.onsuccess = () => {
        const results = (request.result as Array<BackupHistoryEntry & { id: string }>) || [];
        resolve(
          results
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, limit)
            .map(({ id, ...rest }) => rest),
        );
      };
      request.onerror = () => resolve([]);
    });
  }

  // Cleanup operations
  async cleanupOldBackups(maxAgeHours: number = 720): Promise<number> {
    const db = await this.ensureOpen();
    const cutoff = Date.now() - maxAgeHours * 3600000;

    return new Promise((resolve) => {
      const transaction = db.transaction(BACKUP_STORE, "readwrite");
      const store = transaction.objectStore(BACKUP_STORE);
      const index = store.index("createdAt");
      const range = IDBKeyRange.upperBound(cutoff);

      let deletedCount = 0;
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const deleteRequest = cursor.delete();
          deleteRequest.onsuccess = () => {
            deletedCount++;
            cursor.continue();
          };
          deleteRequest.onerror = () => cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => resolve(deletedCount);
    });
  }

  async cleanupLargeBackups(maxSizeBytes: number = 100 * 1024 * 1024): Promise<number> {
    const db = await this.ensureOpen();

    return new Promise((resolve) => {
      const transaction = db.transaction(BACKUP_STORE, "readwrite");
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = (request.result as BackupDBEntry[]) || [];
        let deletedCount = 0;

        const deletePromises = entries
          .filter((entry) => entry.data.length > maxSizeBytes)
          .map(async (entry) => {
            const deleteResult = await this.deleteBackup(entry.id);
            if (deleteResult) deletedCount++;
          });

        Promise.all(deletePromises).then(() => resolve(deletedCount));
      };
      request.onerror = () => resolve(0);
    });
  }

  // Quota management
  async checkStorageQuota(): Promise<{
    used: number;
    available: number;
    total: number;
    percentageUsed: number;
    isOverQuota: boolean;
  }> {
    const db = await this.ensureOpen();

    // Get database usage
    const used = await this.getTotalStorageSize();

    // Estimate available storage (browser dependent)
    let available = 0;
    let total = 0;

    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        available = estimate.quota || 0;
        total = estimate.usage || 0;
      } catch {
        // Fallback to default values
        available = 500 * 1024 * 1024; // 500MB default quota
        total = used;
      }
    } else {
      available = 500 * 1024 * 1024;
      total = used;
    }

    const percentageUsed = Math.round((used / (available || 1)) * 100);
    const isOverQuota = percentageUsed > 80;

    return {
      used,
      available,
      total,
      percentageUsed,
      isOverQuota,
    };
  }

  // Clear all data
  async clearAll(): Promise<void> {
    const db = await this.ensureOpen();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [BACKUP_STORE, METADATA_STORE, CLOUD_STORE, HISTORY_STORE],
        "readwrite",
      );

      const stores = [BACKUP_STORE, METADATA_STORE, CLOUD_STORE, HISTORY_STORE];
      let completed = 0;
      const errors: Error[] = [];

      stores.forEach((storeName) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => {
          completed++;
          if (completed === stores.length) {
            if (errors.length > 0) {
              reject(errors[0]);
            } else {
              resolve();
            }
          }
        };
        request.onerror = () => {
          errors.push(request.error ?? new Error("Unknown IndexedDB error"));
          completed++;
          if (completed === stores.length) {
            reject(errors[0]);
          }
        };
      });
    });
  }
}

// Singleton instance
export const indexedDBManager = new IndexedDBManager();

// ============================================================================
// STORAGE STRATEGY MANAGER
// ============================================================================

/**
 * Storage strategy based on data size and browser capabilities
 */
export type StorageStrategy = {
  name: "localStorage" | "indexedDB" | "cloud" | "hybrid";
  priority: number;
  maxSize: number;
  description: string;
};

/**
 * Determine best storage strategy for a backup
 */
export function determineStorageStrategy(sizeBytes: number): StorageStrategy {
  // Check browser support
  const supportsIndexedDB = typeof indexedDB !== "undefined";
  const supportsLocalStorage = typeof localStorage !== "undefined";

  // Define strategies
  const strategies: StorageStrategy[] = [
    {
      name: "cloud",
      priority: 100,
      maxSize: Infinity,
      description: "Cloud storage (unlimited)",
    },
    {
      name: "indexedDB",
      priority: 80,
      maxSize: 500 * 1024 * 1024, // 500MB
      description: "IndexedDB (large capacity)",
    },
    {
      name: "hybrid",
      priority: 60,
      maxSize: 100 * 1024 * 1024, // 100MB
      description: "Hybrid (IndexedDB + LocalStorage)",
    },
    {
      name: "localStorage",
      priority: 40,
      maxSize: 5 * 1024 * 1024, // 5MB
      description: "LocalStorage (limited capacity)",
    },
  ];

  // Filter by support and size
  const availableStrategies = strategies.filter((s) => {
    if (s.name === "cloud") return false; // Not implemented yet
    if (s.name === "indexedDB") return supportsIndexedDB && sizeBytes <= s.maxSize;
    if (s.name === "localStorage") return supportsLocalStorage && sizeBytes <= s.maxSize;
    return true;
  });

  // Sort by priority
  availableStrategies.sort((a, b) => b.priority - a.priority);

  return availableStrategies[0] || strategies.find((s) => s.name === "localStorage")!;
}

// ============================================================================
// UNIFIED STORAGE API
// ============================================================================

/**
 * Unified storage API that automatically selects the best storage method
 */
export class BackupStorage {
  private static instance: BackupStorage;

  static getInstance(): BackupStorage {
    if (!BackupStorage.instance) {
      BackupStorage.instance = new BackupStorage();
    }
    return BackupStorage.instance;
  }

  private constructor() {}

  /**
   * Store a backup using the best available method
   */
  async storeBackup(
    backup: ValidBackup,
    options: {
      tags?: string[];
      priority?: "low" | "normal" | "high";
      cloudProviders?: CloudProvider[];
    } = {},
  ): Promise<{
    success: boolean;
    storageMethod: string;
    backupId: string;
    sizeBytes: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const strategy = determineStorageStrategy(backup.meta.sizeBytes);

    // Try IndexedDB first for larger backups
    if (strategy.name === "indexedDB" || backup.meta.sizeBytes > 1024 * 1024) {
      try {
        const backupId = await indexedDBManager.storeBackup(backup, options.tags || []);
        return {
          success: true,
          storageMethod: "indexedDB",
          backupId,
          sizeBytes: backup.meta.sizeBytes,
          warnings,
        };
      } catch (error) {
        warnings.push(`IndexedDB storage failed: ${error}`);
        // Fall through to localStorage
      }
    }

    // Try localStorage
    try {
      // Check if backup is too large for localStorage
      if (backup.meta.sizeBytes > 5 * 1024 * 1024) {
        warnings.push("Backup too large for localStorage, using IndexedDB fallback");
        const backupId = await indexedDBManager.storeBackup(backup, options.tags || []);
        return {
          success: true,
          storageMethod: "indexedDB",
          backupId,
          sizeBytes: backup.meta.sizeBytes,
          warnings,
        };
      }

      // Store in localStorage
      const storageKey = `skillsync:backup:${backup.backupId}`;
      localStorage.setItem(storageKey, JSON.stringify(backup));

      // Also store metadata
      const metaKey = `skillsync:backup:meta:${backup.backupId}`;
      localStorage.setItem(metaKey, JSON.stringify(backup.meta));

      return {
        success: true,
        storageMethod: "localStorage",
        backupId: backup.backupId,
        sizeBytes: backup.meta.sizeBytes,
        warnings,
      };
    } catch (error) {
      warnings.push(`LocalStorage failed: ${error}`);

      // Final fallback to IndexedDB
      try {
        const backupId = await indexedDBManager.storeBackup(backup, options.tags || []);
        return {
          success: true,
          storageMethod: "indexedDB",
          backupId,
          sizeBytes: backup.meta.sizeBytes,
          warnings,
        };
      } catch {
        return {
          success: false,
          storageMethod: "none",
          backupId: "",
          sizeBytes: 0,
          warnings: [...warnings, "All storage methods failed"],
        };
      }
    }
  }

  /**
   * Retrieve a backup by ID
   */
  async getBackup(backupId: string): Promise<ValidBackup | null> {
    // Try IndexedDB first
    try {
      const entry = await indexedDBManager.getBackup(backupId);
      if (entry) {
        return {
          ...JSON.parse(entry.data),
          sizeBytes: entry.data.length,
          meta: entry.meta,
        };
      }
    } catch {
      // Continue to localStorage
    }

    // Try localStorage
    try {
      const storageKey = `skillsync:backup:${backupId}`;
      const metaKey = `skillsync:backup:meta:${backupId}`;

      const text = localStorage.getItem(storageKey);
      const metaStr = localStorage.getItem(metaKey);

      if (text && metaStr) {
        const meta = JSON.parse(metaStr) as BackupMeta;
        return {
          ...JSON.parse(text),
          sizeBytes: text.length,
          meta,
        };
      }
    } catch {
      // Continue
    }

    return null;
  }

  /**
   * List all available backups
   */
  async listAllBackups(): Promise<ValidBackup[]> {
    const backups: ValidBackup[] = [];

    // Get from IndexedDB
    try {
      const entries = await indexedDBManager.listBackups();
      for (const entry of entries) {
        try {
          const backup = JSON.parse(entry.data);
          backups.push({
            ...backup,
            sizeBytes: entry.data.length,
            meta: entry.meta,
          });
        } catch {
          // Skip corrupted entries
        }
      }
    } catch {
      // Continue
    }

    // Get from localStorage
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter((key) => key.startsWith("skillsync:backup:"));

      for (const key of backupKeys) {
        const backupId = key.replace("skillsync:backup:", "");
        const metaKey = `skillsync:backup:meta:${backupId}`;

        const text = localStorage.getItem(key);
        const metaStr = localStorage.getItem(metaKey);

        if (text && metaStr) {
          try {
            const meta = JSON.parse(metaStr) as BackupMeta;
            const backup = JSON.parse(text);
            backups.push({
              ...backup,
              sizeBytes: text.length,
              meta,
            });
          } catch {
            // Skip corrupted entries
          }
        }
      }
    } catch {
      // Continue
    }

    // Sort by creation date (newest first)
    return backups.sort((a, b) => b.meta.createdAt - a.meta.createdAt);
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    let success = false;

    // Try IndexedDB
    try {
      success = await indexedDBManager.deleteBackup(backupId);
    } catch {
      // Continue
    }

    // Try localStorage
    try {
      const storageKey = `skillsync:backup:${backupId}`;
      const metaKey = `skillsync:backup:meta:${backupId}`;

      localStorage.removeItem(storageKey);
      localStorage.removeItem(metaKey);
      success = true;
    } catch {
      // Continue
    }

    return success;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    storageMethod: string;
    quota: {
      used: number;
      available: number;
      percentageUsed: number;
    };
  }> {
    const allBackups = await this.listAllBackups();
    const totalSize = allBackups.reduce((sum, backup) => sum + backup.sizeBytes, 0);

    let quota = { used: 0, available: 0, percentageUsed: 0 };
    try {
      quota = await indexedDBManager.checkStorageQuota();
    } catch {
      // Fallback
      quota = {
        used: totalSize,
        available: 500 * 1024 * 1024,
        percentageUsed: Math.round((totalSize / (500 * 1024 * 1024)) * 100),
      };
    }

    return {
      totalBackups: allBackups.length,
      totalSize,
      storageMethod: "hybrid",
      quota,
    };
  }

  /**
   * Cleanup old backups
   */
  async cleanup(maxAgeHours: number = 720): Promise<{
    deleted: number;
    total: number;
    spaceFreed: number;
  }> {
    const allBackups = await this.listAllBackups();
    const cutoff = Date.now() - maxAgeHours * 3600000;

    let deleted = 0;
    let spaceFreed = 0;

    for (const backup of allBackups) {
      if (backup.meta.createdAt < cutoff) {
        const success = await this.deleteBackup(backup.backupId);
        if (success) {
          deleted++;
          spaceFreed += backup.sizeBytes;
        }
      }
    }

    // Also cleanup IndexedDB
    try {
      const deletedFromIndexedDB = await indexedDBManager.cleanupOldBackups(maxAgeHours);
      deleted += deletedFromIndexedDB;
    } catch {
      // Continue
    }

    return {
      deleted,
      total: allBackups.length,
      spaceFreed,
    };
  }

  /**
   * Optimize storage by moving large backups to IndexedDB
   */
  async optimizeStorage(): Promise<{
    moved: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let moved = 0;

    // Check localStorage for large backups
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter((key) => key.startsWith("skillsync:backup:"));

      for (const key of backupKeys) {
        const backupId = key.replace("skillsync:backup:", "");
        const metaKey = `skillsync:backup:meta:${backupId}`;

        const text = localStorage.getItem(key);
        const metaStr = localStorage.getItem(metaKey);

        if (text && metaStr && text.length > 1024 * 1024) {
          // >1MB
          try {
            const meta = JSON.parse(metaStr) as BackupMeta;
            const backup: ValidBackup = {
              ...JSON.parse(text),
              sizeBytes: text.length,
              meta,
            };

            // Store in IndexedDB
            await indexedDBManager.storeBackup(backup, ["migrated"]);

            // Remove from localStorage
            localStorage.removeItem(key);
            localStorage.removeItem(metaKey);

            moved++;
          } catch (error) {
            errors.push(`Failed to migrate backup ${backupId}: ${error}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Storage optimization failed: ${error}`);
    }

    return { moved, errors };
  }
}

// Export singleton
export const backupStorage = BackupStorage.getInstance();

// ============================================================================
// BACKUP QUEUE SYSTEM
// ============================================================================

/**
 * Backup queue for handling multiple backup operations
 */
interface QueueItem {
  id: string;
  backup: ValidBackup;
  options: {
    tags?: string[];
    priority?: "low" | "normal" | "high";
    cloudProviders?: CloudProvider[];
  };
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  result?: {
    storageMethod: string;
    backupId: string;
    sizeBytes: number;
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

class BackupQueue {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private maxConcurrent: number = 1;

  constructor(private storage: BackupStorage = backupStorage) {}

  add(backup: ValidBackup, options: QueueItem["options"] = {}): string {
    const item: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      backup,
      options,
      status: "queued",
      progress: 0,
      createdAt: Date.now(),
    };

    this.queue.push(item);

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return (
        priorityOrder[a.options.priority || "normal"] -
        priorityOrder[b.options.priority || "normal"]
      );
    });

    // Start processing if not already
    this.processNext();

    return item.id;
  }

  async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const item = this.queue[0];
    item.status = "processing";
    item.startedAt = Date.now();

    try {
      const result = await this.storage.storeBackup(item.backup, item.options);

      item.status = "completed";
      item.completedAt = Date.now();
      item.result = {
        storageMethod: result.storageMethod,
        backupId: result.backupId,
        sizeBytes: result.sizeBytes,
      };
      item.progress = 100;
    } catch (error) {
      item.status = "failed";
      item.completedAt = Date.now();
      item.error = error instanceof Error ? error.message : String(error);
    }

    // Remove from queue
    this.queue.shift();
    this.processing = false;

    // Process next item
    this.processNext();
  }

  getItem(id: string): QueueItem | undefined {
    return this.queue.find((item) => item.id === id);
  }

  getAll(): QueueItem[] {
    return [...this.queue];
  }

  getStatus(): {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    current?: QueueItem;
  } {
    const queued = this.queue.filter((i) => i.status === "queued").length;
    const processing = this.queue.filter((i) => i.status === "processing").length;
    const completed = this.queue.filter((i) => i.status === "completed").length;
    const failed = this.queue.filter((i) => i.status === "failed").length;

    return {
      queued,
      processing,
      completed,
      failed,
      current: this.queue.find((i) => i.status === "processing"),
    };
  }

  clearCompleted(): void {
    this.queue = this.queue.filter((item) => item.status !== "completed");
  }

  clearFailed(): void {
    this.queue = this.queue.filter((item) => item.status !== "failed");
  }

  clearAll(): void {
    this.queue = [];
    this.processing = false;
  }
}

// Singleton queue
export const backupQueue = new BackupQueue();

// ============================================================================
// BACKUP CACHE
// ============================================================================

/**
 * Backup cache for frequently accessed backups
 */
class BackupCache {
  private cache = new Map<string, { backup: ValidBackup; accessedAt: number }>();
  private maxSize: number = 5;
  private ttl: number = 30 * 60 * 1000; // 30 minutes

  async get(backupId: string): Promise<ValidBackup | null> {
    // Check cache first
    const cached = this.cache.get(backupId);
    if (cached && Date.now() - cached.accessedAt < this.ttl) {
      cached.accessedAt = Date.now();
      return cached.backup;
    }

    // Get from storage
    const backup = await backupStorage.getBackup(backupId);
    if (backup) {
      // Update cache
      this.cache.set(backupId, { backup, accessedAt: Date.now() });

      // Cleanup old entries
      this.cleanup();

      return backup;
    }

    return null;
  }

  put(backup: ValidBackup): void {
    this.cache.set(backup.backupId, { backup, accessedAt: Date.now() });
    this.cleanup();
  }

  delete(backupId: string): void {
    this.cache.delete(backupId);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    // Remove old entries
    for (const [key, value] of this.cache.entries()) {
      if (Date.now() - value.accessedAt > this.ttl) {
        this.cache.delete(key);
      }
    }

    // Remove excess entries
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Singleton cache
export const backupCache = new BackupCache();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get storage recommendation based on device capabilities
 */
export function getStorageRecommendation(sizeBytes: number): {
  recommended: StorageStrategy;
  alternatives: StorageStrategy[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const allStrategies = determineStorageStrategy(sizeBytes);

  // Check for issues
  if (sizeBytes > 500 * 1024 * 1024) {
    // >500MB
    warnings.push("Backup is very large. Consider splitting or compressing.");
  }

  if (typeof indexedDB === "undefined") {
    warnings.push("IndexedDB not available. Falling back to localStorage.");
  }

  if (typeof localStorage === "undefined") {
    warnings.push("LocalStorage not available. Using IndexedDB only.");
  }

  // Get all available strategies
  const availableStrategies: StorageStrategy[] = [];
  const unavailableStrategies: StorageStrategy[] = [];

  // Test IndexedDB
  const supportsIndexedDB = typeof indexedDB !== "undefined";
  if (supportsIndexedDB) {
    availableStrategies.push({
      name: "indexedDB",
      priority: 80,
      maxSize: 500 * 1024 * 1024,
      description: "IndexedDB (recommended for large backups)",
    });
  } else {
    unavailableStrategies.push({
      name: "indexedDB",
      priority: 80,
      maxSize: 500 * 1024 * 1024,
      description: "IndexedDB (not available)",
    });
  }

  // Test localStorage
  const supportsLocalStorage = typeof localStorage !== "undefined";
  if (supportsLocalStorage) {
    try {
      const testKey = "skillsync:storage-test";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      availableStrategies.push({
        name: "localStorage",
        priority: 40,
        maxSize: 5 * 1024 * 1024,
        description: "LocalStorage (limited to ~5MB)",
      });
    } catch {
      unavailableStrategies.push({
        name: "localStorage",
        priority: 40,
        maxSize: 5 * 1024 * 1024,
        description: "LocalStorage (quota exceeded)",
      });
    }
  } else {
    unavailableStrategies.push({
      name: "localStorage",
      priority: 40,
      maxSize: 5 * 1024 * 1024,
      description: "LocalStorage (not available)",
    });
  }

  // Sort by priority
  availableStrategies.sort((a, b) => b.priority - a.priority);

  return {
    recommended: availableStrategies[0] || {
      name: "localStorage",
      priority: 0,
      maxSize: 0,
      description: "No storage available",
    },
    alternatives: availableStrategies.slice(1),
    warnings,
  };
}

/**
 * Check if backup can be stored
 */
export async function canStoreBackup(sizeBytes: number): Promise<{
  canStore: boolean;
  reason?: string;
  recommendations: string[];
}> {
  const recommendations: string[] = [];

  // Check localStorage quota
  if (typeof localStorage !== "undefined") {
    try {
      const testKey = "skillsync:quota-test";
      let availableSpace = 0;

      // Try to estimate available space
      try {
        let testData = "x";
        while (true) {
          localStorage.setItem(testKey, testData);
          testData += "x";
          if (testData.length > 1024 * 1024) break; // Don't test beyond 1MB
        }
        availableSpace = testData.length;
      } catch {
        // Quota exceeded
      } finally {
        localStorage.removeItem(testKey);
      }

      if (availableSpace < sizeBytes) {
        recommendations.push("Free up localStorage space by removing old backups.");
        recommendations.push("Enable IndexedDB for larger backups.");
      }
    } catch {
      // localStorage not available
    }
  }

  // Check IndexedDB quota
  try {
    const quota = await indexedDBManager.checkStorageQuota();
    if (quota.isOverQuota) {
      recommendations.push("Free up IndexedDB space by removing old backups.");
      recommendations.push("Enable cloud backup for unlimited storage.");
    }
  } catch {
    // IndexedDB not available
  }

  // Overall check
  const canStore = !(
    (typeof localStorage === "undefined" || localStorage.length >= 100) &&
    typeof indexedDB === "undefined"
  );

  return {
    canStore,
    reason: canStore ? undefined : "No storage available",
    recommendations,
  };
}
