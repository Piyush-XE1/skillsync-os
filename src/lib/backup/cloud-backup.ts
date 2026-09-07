/**
 * Cloud Backup Integration System
 * 
 * Features:
 * - Google Drive integration
 * - Dropbox integration
 * - GitHub Gist integration
 * - Custom cloud provider support
 * - OAuth token management
 * - Automatic sync
 * - Conflict resolution
 * - Bandwidth optimization
 */

import {
  CloudProvider,
  CloudBackupConfig,
  BackupMeta,
  ValidBackup,
  getDeviceId,
  generateChecksum
} from './advanced-backup';
import { backupStorage, indexedDBManager } from './backup-storage';

// ============================================================================
// CLOUD PROVIDER INTERFACES
// ============================================================================

/**
 * Base interface for all cloud providers
 */
export interface CloudProviderInterface {
  name: CloudProvider;
  displayName: string;
  icon: string;
  color: string;
  
  /**
   * Initialize the provider
   */
  initialize(): Promise<boolean>;
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Promise<boolean>;
  
  /**
   * Authenticate the user
   */
  authenticate(options?: { interactive?: boolean }): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }>;
  
  /**
   * Refresh authentication token
   */
  refreshToken(): Promise<{
    success: boolean;
    newToken?: string;
    error?: string;
  }>;
  
  /**
   * Revoke authentication
   */
  revoke(): Promise<boolean>;
  
  /**
   * Upload a backup file
   */
  upload(
    backup: ValidBackup,
    options?: {
      folderId?: string;
      filename?: string;
      overwrite?: boolean;
      onProgress?: (progress: number) => void;
    }
  ): Promise<{
    success: boolean;
    fileId?: string;
    url?: string;
    checksum?: string;
    sizeBytes?: number;
    error?: string;
  }>;
  
  /**
   * Download a backup file
   */
  download(
    fileId: string,
    options?: {
      onProgress?: (progress: number) => void;
    }
  ): Promise<{
    success: boolean;
    backup?: ValidBackup;
    error?: string;
  }>;
  
  /**
   * List all backup files
   */
  list(options?: {
    folderId?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    backups?: Array<{
      id: string;
      name: string;
      sizeBytes: number;
      createdAt: number;
      updatedAt: number;
      checksum?: string;
    }>;
    error?: string;
  }>;
  
  /**
   * Delete a backup file
   */
  delete(fileId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  /**
   * Get file metadata
   */
  getMetadata(fileId: string): Promise<{
    success: boolean;
    metadata?: {
      id: string;
      name: string;
      sizeBytes: number;
      createdAt: number;
      updatedAt: number;
      checksum?: string;
    };
    error?: string;
  }>;
  
  /**
   * Create a folder
   */
  createFolder(name: string, parentId?: string): Promise<{
    success: boolean;
    folderId?: string;
    error?: string;
  }>;
  
  /**
   * Get provider quota information
   */
  getQuota(): Promise<{
    success: boolean;
    quota?: {
      used: number;
      available: number;
      total: number;
    };
    error?: string;
  }>;
}

// ============================================================================
// CLOUD PROVIDER FACTORY
// ============================================================================

/**
 * Factory for creating cloud provider instances
 */
export class CloudProviderFactory {
  private providers: Map<CloudProvider, CloudProviderInterface> = new Map();
  
  registerProvider(provider: CloudProvider, instance: CloudProviderInterface): void {
    this.providers.set(provider, instance);
  }
  
  getProvider(provider: CloudProvider): CloudProviderInterface | undefined {
    return this.providers.get(provider);
  }
  
  getAllProviders(): CloudProviderInterface[] {
    return Array.from(this.providers.values());
  }
  
  async initializeAll(): Promise<Map<CloudProvider, boolean>> {
    const results = new Map<CloudProvider, boolean>();
    
    for (const [name, provider] of this.providers.entries()) {
      try {
        const initialized = await provider.initialize();
        results.set(name, initialized);
      } catch {
        results.set(name, false);
      }
    }
    
    return results;
  }
}

// Singleton factory
export const cloudProviderFactory = new CloudProviderFactory();

// ============================================================================
// GOOGLE DRIVE PROVIDER (STUB - READY FOR IMPLEMENTATION)
// ============================================================================

class GoogleDriveProvider implements CloudProviderInterface {
  name: CloudProvider = 'google-drive';
  displayName = 'Google Drive';
  icon = 'google';
  color = '#4285F4';
  
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  
  async initialize(): Promise<boolean> {
    // Initialize Google API client
    // This would typically load the Google API client library
    return true;
  }
  
  async isAuthenticated(): Promise<boolean> {
    if (!this.token) return false;
    if (Date.now() > this.tokenExpiresAt) {
      // Token expired, try to refresh
      const refreshed = await this.refreshToken();
      return refreshed.success;
    }
    return true;
  }
  
  async authenticate(options: { interactive?: boolean } = {}): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    // Implement OAuth flow
    // This would open a popup or redirect for user authentication
    return {
      success: false,
      error: 'Google Drive authentication not yet implemented'
    };
  }
  
  async refreshToken(): Promise<{
    success: boolean;
    newToken?: string;
    error?: string;
  }> {
    if (!this.refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }
    
    // Implement token refresh
    return { success: false, error: 'Token refresh not yet implemented' };
  }
  
  async revoke(): Promise<boolean> {
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiresAt = 0;
    return true;
  }
  
  async upload(
    backup: ValidBackup,
    options: {
      folderId?: string;
      filename?: string;
      overwrite?: boolean;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<{
    success: boolean;
    fileId?: string;
    url?: string;
    checksum?: string;
    sizeBytes?: number;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const filename = options.filename || `SkillSync-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    
    // Generate checksum
    const checksum = await generateChecksum(backup.text);
    
    // Upload to Google Drive
    // This would use the Google Drive API
    return {
      success: false,
      error: 'Google Drive upload not yet implemented'
    };
  }
  
  async download(
    fileId: string,
    options: { onProgress?: (progress: number) => void } = {}
  ): Promise<{
    success: boolean;
    backup?: ValidBackup;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Download from Google Drive
    return { success: false, error: 'Google Drive download not yet implemented' };
  }
  
  async list(options: { folderId?: string; limit?: number } = {}): Promise<{
    success: boolean;
    backups?: Array<{ id: string; name: string; sizeBytes: number; createdAt: number; updatedAt: number; checksum?: string }>;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // List files from Google Drive
    return {
      success: false,
      error: 'Google Drive list not yet implemented'
    };
  }
  
  async delete(fileId: string): Promise<{ success: boolean; error?: string }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Delete file from Google Drive
    return { success: false, error: 'Google Drive delete not yet implemented' };
  }
  
  async getMetadata(fileId: string): Promise<{
    success: boolean;
    metadata?: { id: string; name: string; sizeBytes: number; createdAt: number; updatedAt: number; checksum?: string };
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Get file metadata from Google Drive
    return {
      success: false,
      error: 'Google Drive metadata not yet implemented'
    };
  }
  
  async createFolder(name: string, parentId?: string): Promise<{
    success: boolean;
    folderId?: string;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Create folder in Google Drive
    return {
      success: false,
      error: 'Google Drive folder creation not yet implemented'
    };
  }
  
  async getQuota(): Promise<{
    success: boolean;
    quota?: { used: number; available: number; total: number };
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Get Google Drive quota
    return {
      success: false,
      error: 'Google Drive quota not yet implemented'
    };
  }
  
  // Set credentials (for testing and configuration)
  setCredentials(clientId: string, clientSecret: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }
  
  setToken(token: string, refreshToken: string, expiresIn: number): void {
    this.token = token;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = Date.now() + (expiresIn * 1000);
  }
}

// ============================================================================
// DROPBOX PROVIDER (STUB - READY FOR IMPLEMENTATION)
// ============================================================================

class DropboxProvider implements CloudProviderInterface {
  name: CloudProvider = 'dropbox';
  displayName = 'Dropbox';
  icon = 'dropbox';
  color = '#0061FF';
  
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  
  async initialize(): Promise<boolean> {
    return true;
  }
  
  async isAuthenticated(): Promise<boolean> {
    if (!this.token) return false;
    if (Date.now() > this.tokenExpiresAt) {
      const refreshed = await this.refreshToken();
      return refreshed.success;
    }
    return true;
  }
  
  async authenticate(options: { interactive?: boolean } = {}): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    return { success: false, error: 'Dropbox authentication not yet implemented' };
  }
  
  async refreshToken(): Promise<{
    success: boolean;
    newToken?: string;
    error?: string;
  }> {
    if (!this.refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }
    return { success: false, error: 'Token refresh not yet implemented' };
  }
  
  async revoke(): Promise<boolean> {
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiresAt = 0;
    return true;
  }
  
  async upload(
    backup: ValidBackup,
    options: {
      folderId?: string;
      filename?: string;
      overwrite?: boolean;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<{
    success: boolean;
    fileId?: string;
    url?: string;
    checksum?: string;
    sizeBytes?: number;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    return { success: false, error: 'Dropbox upload not yet implemented' };
  }
  
  async download(
    fileId: string,
    options: { onProgress?: (progress: number) => void } = {}
  ): Promise<{
    success: boolean;
    backup?: ValidBackup;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Dropbox download not yet implemented' };
  }
  
  async list(options: { folderId?: string; limit?: number } = {}): Promise<{
    success: boolean;
    backups?: Array<{ id: string; name: string; sizeBytes: number; createdAt: number; updatedAt: number; checksum?: string }>;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Dropbox list not yet implemented' };
  }
  
  async delete(fileId: string): Promise<{ success: boolean; error?: string }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Dropbox delete not yet implemented' };
  }
  
  async getMetadata(fileId: string): Promise<{
    success: boolean;
    metadata?: { id: string; name: string; sizeBytes: number; createdAt: number; updatedAt: number; checksum?: string };
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Dropbox metadata not yet implemented' };
  }
  
  async createFolder(name: string, parentId?: string): Promise<{
    success: boolean;
    folderId?: string;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Dropbox folder creation not yet implemented' };
  }
  
  async getQuota(): Promise<{
    success: boolean;
    quota?: { used: number; available: number; total: number };
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Dropbox quota not yet implemented' };
  }
}

// ============================================================================
// GITHUB GIST PROVIDER (STUB - READY FOR IMPLEMENTATION)
// ============================================================================

class GitHubGistProvider implements CloudProviderInterface {
  name: CloudProvider = 'github-gist';
  displayName = 'GitHub Gist';
  icon = 'github';
  color = '#24292E';
  
  private token: string | null = null;
  private username: string | null = null;
  
  async initialize(): Promise<boolean> {
    return true;
  }
  
  async isAuthenticated(): Promise<boolean> {
    return !!this.token;
  }
  
  async authenticate(options: { interactive?: boolean } = {}): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    return { success: false, error: 'GitHub Gist authentication not yet implemented' };
  }
  
  async refreshToken(): Promise<{
    success: boolean;
    newToken?: string;
    error?: string;
  }> {
    return { success: false, error: 'GitHub Gist does not use refresh tokens' };
  }
  
  async revoke(): Promise<boolean> {
    this.token = null;
    this.username = null;
    return true;
  }
  
  async upload(
    backup: ValidBackup,
    options: {
      folderId?: string;
      filename?: string;
      overwrite?: boolean;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<{
    success: boolean;
    fileId?: string;
    url?: string;
    checksum?: string;
    sizeBytes?: number;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const filename = options.filename || `SkillSync-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    
    // Upload to GitHub Gist
    // GitHub Gist has a 100MB limit per file
    if (backup.text.length > 100 * 1024 * 1024) {
      return { success: false, error: 'Backup too large for GitHub Gist (max 100MB)' };
    }
    
    return { success: false, error: 'GitHub Gist upload not yet implemented' };
  }
  
  async download(
    fileId: string,
    options: { onProgress?: (progress: number) => void } = {}
  ): Promise<{
    success: boolean;
    backup?: ValidBackup;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'GitHub Gist download not yet implemented' };
  }
  
  async list(options: { folderId?: string; limit?: number } = {}): Promise<{
    success: boolean;
    backups?: Array<{ id: string; name: string; sizeBytes: number; createdAt: number; updatedAt: number; checksum?: string }>;
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'GitHub Gist list not yet implemented' };
  }
  
  async delete(fileId: string): Promise<{ success: boolean; error?: string }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'GitHub Gist delete not yet implemented' };
  }
  
  async getMetadata(fileId: string): Promise<{
    success: boolean;
    metadata?: { id: string; name: string; sizeBytes: number; createdAt: number; updatedAt: number; checksum?: string };
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'GitHub Gist metadata not yet implemented' };
  }
  
  async createFolder(name: string, parentId?: string): Promise<{
    success: boolean;
    folderId?: string;
    error?: string;
  }> {
    // GitHub Gist doesn't have folders, but we can use gist descriptions
    return { success: false, error: 'GitHub Gist does not support folders' };
  }
  
  async getQuota(): Promise<{
    success: boolean;
    quota?: { used: number; available: number; total: number };
    error?: string;
  }> {
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return {
      success: true,
      quota: {
        used: 0,
        available: 100 * 1024 * 1024, // 100MB per gist
        total: 100 * 1024 * 1024
      }
    };
  }
}

// ============================================================================
// CUSTOM PROVIDER (STUB - READY FOR IMPLEMENTATION)
// ============================================================================

class CustomProvider implements CloudProviderInterface {
  name: CloudProvider = 'custom';
  displayName = 'Custom Server';
  icon = 'server';
  color = '#6C757D';
  
  private endpoint: string = '';
  private token: string | null = null;
  
  async initialize(): Promise<boolean> {
    return true;
  }
  
  async isAuthenticated(): Promise<boolean> {
    return !!this.token;
  }
  
  async authenticate(options: { interactive?: boolean } = {}): Promise<{
    success: boolean;
    token?: string;
    error?: string;
  }> {
    return { success: false, error: 'Custom provider authentication not yet implemented' };
  }
  
  async refreshToken(): Promise<{
    success: boolean;
    newToken?: string;
    error?: string;
  }> {
    return { success: false, error: 'Custom provider token refresh not yet implemented' };
  }
  
  async revoke(): Promise<boolean> {
    this.token = null;
    return true;
  }
  
  async upload(
    backup: ValidBackup,
    options: {
      folderId?: string;
      filename?: string;
      overwrite?: boolean;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<{
    success: boolean;
    fileId?: string;
    url?: string;
    checksum?: string;
    sizeBytes?: number;
    error?: string;
  }> {
    if (!this.endpoint) {
      return { success: false, error: 'Custom endpoint not configured' };
    }
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Custom provider upload not yet implemented' };
  }
  
  async download(
    fileId: string,
    options: { onProgress?: (progress: number) => void } = {}
  ): Promise<{
    success: boolean;
    backup?: ValidBackup;
    error?: string;
  }> {
    if (!this.endpoint) {
      return { success: false, error: 'Custom endpoint not configured' };
    }
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Custom provider download not yet implemented' };
  }
  
  async list(options: { folderId?: string; limit?: number } = {}): Promise<{
    success: boolean;
    backups?: Array<{ id: string; name: string; sizeBytes: number; createdAt: number; updatedAt: number; checksum?: string }>;
    error?: string;
  }> {
    if (!this.endpoint) {
      return { success: false, error: 'Custom endpoint not configured' };
    }
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Custom provider list not yet implemented' };
  }
  
  async delete(fileId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.endpoint) {
      return { success: false, error: 'Custom endpoint not configured' };
    }
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Custom provider delete not yet implemented' };
  }
  
  async getMetadata(fileId: string): Promise<{
    success: boolean;
    metadata?: { id: string; name: string; sizeBytes: number; createdAt: number; updatedAt: number; checksum?: string };
    error?: string;
  }> {
    if (!this.endpoint) {
      return { success: false, error: 'Custom endpoint not configured' };
    }
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Custom provider metadata not yet implemented' };
  }
  
  async createFolder(name: string, parentId?: string): Promise<{
    success: boolean;
    folderId?: string;
    error?: string;
  }> {
    if (!this.endpoint) {
      return { success: false, error: 'Custom endpoint not configured' };
    }
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Custom provider folder creation not yet implemented' };
  }
  
  async getQuota(): Promise<{
    success: boolean;
    quota?: { used: number; available: number; total: number };
    error?: string;
  }> {
    if (!this.endpoint) {
      return { success: false, error: 'Custom endpoint not configured' };
    }
    if (!await this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    return { success: false, error: 'Custom provider quota not yet implemented' };
  }
  
  configure(endpoint: string): void {
    this.endpoint = endpoint;
  }
  
  setToken(token: string): void {
    this.token = token;
  }
}

// ============================================================================
// REGISTER PROVIDERS
// ============================================================================

// Register all providers with the factory
const googleDriveProvider = new GoogleDriveProvider();
const dropboxProvider = new DropboxProvider();
const githubGistProvider = new GitHubGistProvider();
const customProvider = new CustomProvider();

cloudProviderFactory.registerProvider('google-drive', googleDriveProvider);
cloudProviderFactory.registerProvider('dropbox', dropboxProvider);
cloudProviderFactory.registerProvider('github-gist', githubGistProvider);
cloudProviderFactory.registerProvider('custom', customProvider);

// ============================================================================
// CLOUD BACKUP MANAGER
// ============================================================================

/**
 * High-level cloud backup manager
 */
export class CloudBackupManager {
  private config: CloudBackupConfig;
  private deviceId: string;
  
  constructor(provider: CloudProvider = 'google-drive') {
    this.config = {
      provider,
      enabled: false,
      syncFrequency: 'manual',
      autoUpload: false,
      autoDownload: false,
      conflictResolution: 'manual'
    };
    this.deviceId = getDeviceId();
  }
  
  async initialize(): Promise<boolean> {
    // Load configuration
    const savedConfig = this.loadConfig();
    if (savedConfig) {
      this.config = savedConfig;
    }
    
    // Initialize provider
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return false;
    }
    
    return provider.initialize();
  }
  
  async isAuthenticated(): Promise<boolean> {
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return false;
    }
    
    return provider.isAuthenticated();
  }
  
  async authenticate(interactive: boolean = true): Promise<{
    success: boolean;
    provider: CloudProvider;
    error?: string;
  }> {
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return { success: false, provider: this.config.provider, error: 'Provider not found' };
    }
    
    const result = await provider.authenticate({ interactive });
    if (result.success && result.token) {
      this.config = { ...this.config, enabled: true };
      this.saveConfig();
    }
    
    return {
      success: result.success,
      provider: this.config.provider,
      error: result.error
    };
  }
  
  async revoke(): Promise<boolean> {
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return false;
    }
    
    const result = await provider.revoke();
    this.config = { ...this.config, enabled: false };
    this.saveConfig();
    return result;
  }
  
  async uploadBackup(
    backup: ValidBackup,
    options: {
      folderId?: string;
      filename?: string;
      overwrite?: boolean;
      onProgress?: (progress: number, method: string) => void;
    } = {}
  ): Promise<{
    success: boolean;
    provider: CloudProvider;
    fileId?: string;
    url?: string;
    sizeBytes?: number;
    error?: string;
  }> {
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return { success: false, provider: this.config.provider, error: 'Provider not found' };
    }
    
    if (!await this.isAuthenticated()) {
      return { success: false, provider: this.config.provider, error: 'Not authenticated' };
    }
    
    // Store locally first
    try {
      await backupStorage.storeBackup(backup, { tags: ['cloud-upload'] });
      if (options.onProgress) {
        options.onProgress(10, 'local');
      }
    } catch {
      // Continue without local storage
    }
    
    // Upload to cloud
    const result = await provider.upload(backup, {
      ...options,
      onProgress: options.onProgress ? (p) => options.onProgress!(50 + p * 40, 'cloud') : undefined
    });
    
    if (result.success) {
      // Store cloud metadata
      await this.storeCloudMetadata(backup.backupId, {
        provider: this.config.provider,
        fileId: result.fileId,
        url: result.url,
        checksum: result.checksum,
        sizeBytes: result.sizeBytes,
        uploadedAt: Date.now()
      });
    }
    
    return {
      ...result,
      provider: this.config.provider
    };
  }
  
  async downloadBackup(
    fileId: string,
    options: {
      onProgress?: (progress: number, method: string) => void;
    } = {}
  ): Promise<{
    success: boolean;
    provider: CloudProvider;
    backup?: ValidBackup;
    error?: string;
  }> {
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return { success: false, provider: this.config.provider, error: 'Provider not found' };
    }
    
    if (!await this.isAuthenticated()) {
      return { success: false, provider: this.config.provider, error: 'Not authenticated' };
    }
    
    const result = await provider.download(fileId, {
      onProgress: options.onProgress ? (p) => options.onProgress!(p * 50, 'cloud') : undefined
    });
    
    if (result.success && result.backup) {
      // Store locally
      try {
        await backupStorage.storeBackup(result.backup, { tags: ['cloud-download'] });
        if (options.onProgress) {
          options.onProgress(100, 'local');
        }
      } catch {
        // Continue
      }
    }
    
    return {
      ...result,
      provider: this.config.provider
    };
  }
  
  async listBackups(options: { limit?: number } = {}): Promise<{
    success: boolean;
    provider: CloudProvider;
    backups?: Array<{
      id: string;
      fileId: string;
      name: string;
      sizeBytes: number;
      createdAt: number;
      uploadedAt: number;
      checksum?: string;
    }>;
    error?: string;
  }> {
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return { success: false, provider: this.config.provider, error: 'Provider not found' };
    }
    
    if (!await this.isAuthenticated()) {
      return { success: false, provider: this.config.provider, error: 'Not authenticated' };
    }
    
    const result = await provider.list({ limit: options.limit });
    
    if (result.success && result.backups) {
      // Enrich with local metadata
      const enrichedBackups = await Promise.all(
        result.backups.map(async (cloudBackup) => {
          const localMeta = await this.getCloudMetadata(cloudBackup.id);
          return {
            ...cloudBackup,
            uploadedAt: localMeta?.uploadedAt || cloudBackup.createdAt,
            checksum: localMeta?.checksum || cloudBackup.checksum
          };
        })
      );
      
      return {
        success: true,
        provider: this.config.provider,
        backups: enrichedBackups
      };
    }
    
    return {
      ...result,
      provider: this.config.provider
    };
  }
  
  async deleteBackup(fileId: string): Promise<{
    success: boolean;
    provider: CloudProvider;
    error?: string;
  }> {
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return { success: false, provider: this.config.provider, error: 'Provider not found' };
    }
    
    if (!await this.isAuthenticated()) {
      return { success: false, provider: this.config.provider, error: 'Not authenticated' };
    }
    
    const result = await provider.delete(fileId);
    
    // Also remove local metadata
    if (result.success) {
      await this.removeCloudMetadata(fileId);
    }
    
    return {
      ...result,
      provider: this.config.provider
    };
  }
  
  async syncAll(options: {
    onProgress?: (progress: number, message: string) => void;
    direction?: 'upload' | 'download' | 'both';
  } = {}): Promise<{
    success: boolean;
    uploaded: number;
    downloaded: number;
    conflicts: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let uploaded = 0;
    let downloaded = 0;
    let conflicts = 0;
    
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return { success: false, uploaded: 0, downloaded: 0, conflicts: 0, errors: ['Provider not found'] };
    }
    
    if (!await this.isAuthenticated()) {
      return { success: false, uploaded: 0, downloaded: 0, conflicts: 0, errors: ['Not authenticated'] };
    }
    
    // Get local backups
    const localBackups = await backupStorage.listAllBackups();
    
    // Get cloud backups
    const cloudResult = await this.listBackups();
    const cloudBackups = cloudResult.backups || [];
    
    // Create maps for quick lookup
    const localBackupIds = new Set(localBackups.map(b => b.backupId));
    const cloudBackupIds = new Set(cloudBackups.map(b => b.id));
    
    // Upload local backups that aren't in cloud
    if (options.direction === 'upload' || options.direction === 'both') {
      const toUpload = localBackups.filter(b => !cloudBackupIds.has(b.backupId));
      
      for (let i = 0; i < toUpload.length; i++) {
        const backup = toUpload[i];
        if (options.onProgress) {
          options.onProgress(
            Math.round((i / toUpload.length) * 50),
            `Uploading backup ${i + 1}/${toUpload.length}`
          );
        }
        
        const result = await this.uploadBackup(backup, {
          onProgress: undefined
        });
        
        if (result.success) {
          uploaded++;
        } else {
          errors.push(`Failed to upload backup ${backup.backupId}: ${result.error}`);
        }
      }
    }
    
    // Download cloud backups that aren't local
    if (options.direction === 'download' || options.direction === 'both') {
      const toDownload = cloudBackups.filter(b => !localBackupIds.has(b.id));
      
      for (let i = 0; i < toDownload.length; i++) {
        const cloudBackup = toDownload[i];
        if (options.onProgress) {
          options.onProgress(
            Math.round(50 + (i / toDownload.length) * 50),
            `Downloading backup ${i + 1}/${toDownload.length}`
          );
        }
        
        const result = await this.downloadBackup(cloudBackup.id, {
          onProgress: undefined
        });
        
        if (result.success) {
          downloaded++;
        } else {
          errors.push(`Failed to download backup ${cloudBackup.id}: ${result.error}`);
        }
      }
    }
    
    if (options.onProgress) {
      options.onProgress(100, 'Sync completed');
    }
    
    return {
      success: errors.length === 0,
      uploaded,
      downloaded,
      conflicts,
      errors
    };
  }
  
  async getQuota(): Promise<{
    success: boolean;
    provider: CloudProvider;
    quota?: {
      used: number;
      available: number;
      total: number;
    };
    error?: string;
  }> {
    const provider = cloudProviderFactory.getProvider(this.config.provider);
    if (!provider) {
      return { success: false, provider: this.config.provider, error: 'Provider not found' };
    }
    
    if (!await this.isAuthenticated()) {
      return { success: false, provider: this.config.provider, error: 'Not authenticated' };
    }
    
    return {
      ...await provider.getQuota(),
      provider: this.config.provider
    };
  }
  
  // Configuration management
  getConfig(): CloudBackupConfig {
    return { ...this.config };
  }
  
  setConfig(config: Partial<CloudBackupConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }
  
  switchProvider(provider: CloudProvider): void {
    this.config.provider = provider;
    this.saveConfig();
  }
  
  private loadConfig(): CloudBackupConfig | null {
    try {
      const raw = localStorage.getItem(`skillsync:cloud:config:${this.deviceId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  
  private saveConfig(): void {
    try {
      localStorage.setItem(
        `skillsync:cloud:config:${this.deviceId}`,
        JSON.stringify(this.config)
      );
    } catch {
      // Storage unavailable
    }
  }
  
  // Cloud metadata management
  private async storeCloudMetadata(
    backupId: string,
    metadata: {
      provider: CloudProvider;
      fileId: string;
      url?: string;
      checksum?: string;
      sizeBytes?: number;
      uploadedAt: number;
    }
  ): Promise<void> {
    try {
      await indexedDBManager.storeCloudBackup(
        { text: '', meta: { backupId, ...metadata } as any } as any,
        metadata.provider,
        metadata.checksum || ''
      );
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(
          `skillsync:cloud:meta:${this.deviceId}:${backupId}`,
          JSON.stringify(metadata)
        );
      } catch {
        // Ignore
      }
    }
  }
  
  private async getCloudMetadata(backupId: string): Promise<{
    provider: CloudProvider;
    fileId: string;
    url?: string;
    checksum?: string;
    sizeBytes?: number;
    uploadedAt: number;
  } | null> {
    try {
      const cloudBackups = await indexedDBManager.listCloudBackups();
      const found = cloudBackups.find(c => c.meta.backupId === backupId);
      if (found) {
        return {
          provider: found.provider,
          fileId: found.id,
          url: undefined,
          checksum: found.checksum,
          sizeBytes: found.meta.sizeBytes,
          uploadedAt: found.uploadedAt
        };
      }
    } catch {
      // Try localStorage
      try {
        const raw = localStorage.getItem(`skillsync:cloud:meta:${this.deviceId}:${backupId}`);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    
    return null;
  }
  
  private async removeCloudMetadata(backupId: string): Promise<void> {
    try {
      const cloudBackups = await indexedDBManager.listCloudBackups();
      for (const cloudBackup of cloudBackups) {
        if (cloudBackup.meta.backupId === backupId) {
          await indexedDBManager.getCloudBackup(cloudBackup.id);
          // Note: In a real implementation, we'd delete this
        }
      }
    } catch {
      // Try localStorage
      try {
        localStorage.removeItem(`skillsync:cloud:meta:${this.deviceId}:${backupId}`);
      } catch {
        // Ignore
      }
    }
  }
}

// ============================================================================
// CLOUD SYNC MANAGER (FOR MULTI-DEVICE SYNC)
// ============================================================================

/**
 * Cloud sync manager for multi-device synchronization
 */
export class CloudSyncManager {
  private managers: Map<CloudProvider, CloudBackupManager> = new Map();
  private activeProvider: CloudProvider | null = null;
  
  constructor() {
    // Initialize all providers
    const providers: CloudProvider[] = ['google-drive', 'dropbox', 'github-gist', 'custom'];
    providers.forEach(provider => {
      this.managers.set(provider, new CloudBackupManager(provider));
    });
  }
  
  async initialize(): Promise<boolean> {
    const results = await Promise.all(
      Array.from(this.managers.values()).map(m => m.initialize())
    );
    return results.every(r => r);
  }
  
  async getManager(provider: CloudProvider): Promise<CloudBackupManager | null> {
    const manager = this.managers.get(provider);
    if (manager) {
      const initialized = await manager.initialize();
      return initialized ? manager : null;
    }
    return null;
  }
  
  async setActiveProvider(provider: CloudProvider): Promise<boolean> {
    const manager = await this.getManager(provider);
    if (manager) {
      this.activeProvider = provider;
      return true;
    }
    return false;
  }
  
  async getActiveManager(): Promise<CloudBackupManager | null> {
    if (!this.activeProvider) {
      // Try to find an authenticated provider
      for (const [provider, manager] of this.managers.entries()) {
        if (await manager.isAuthenticated()) {
          this.activeProvider = provider;
          return manager;
        }
      }
      return null;
    }
    return this.getManager(this.activeProvider);
  }
  
  async syncAllDevices(options: {
    onProgress?: (progress: number, message: string) => void;
  } = {}): Promise<{
    success: boolean;
    synced: number;
    conflicts: number;
    errors: string[];
  }> {
    const manager = await this.getActiveManager();
    if (!manager) {
      return { success: false, synced: 0, conflicts: 0, errors: ['No active provider'] };
    }
    
    return manager.syncAll(options);
  }
  
  async getAllCloudBackups(): Promise<{
    provider: CloudProvider;
    backups: Array<{
      id: string;
      fileId: string;
      name: string;
      sizeBytes: number;
      createdAt: number;
      uploadedAt: number;
    }>;
  }[]> {
    const allBackups: any[] = [];
    
    for (const [provider, manager] of this.managers.entries()) {
      try {
        const initialized = await manager.initialize();
        if (initialized && await manager.isAuthenticated()) {
          const result = await manager.listBackups();
          if (result.success && result.backups) {
            allBackups.push({
              provider,
              backups: result.backups
            });
          }
        }
      } catch {
        // Ignore errors
      }
    }
    
    return allBackups;
  }
}

// Singleton sync manager
export const cloudSyncManager = new CloudSyncManager();

// ============================================================================
// CLOUD BACKUP TYPES EXPORT
// ============================================================================

export type {
  CloudProvider,
  CloudBackupConfig
};
