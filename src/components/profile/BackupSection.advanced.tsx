/**
 * Advanced Backup Section Component
 *
 * Features:
 * - Enhanced backup creation with compression & encryption
 * - Cloud backup integration
 * - Backup health monitoring
 * - Advanced auto-backup settings
 * - Multi-device synchronization
 * - Backup history & management
 * - Storage optimization
 */

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Share2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Settings,
  Cloud,
  Database,
  Trash2,
  RefreshCw,
  Search,
  MoreVertical,
  Zap,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import { Card, Chip, SectionHeader, Button } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/utils";
import { BottomSheet } from "@/components/edit/Sheet";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import {
  useAdvancedBackup,
  useAutoBackup,
  useCloudBackup,
  useBackupHealth,
  useBackupStorage,
} from "@/hooks/use-advanced-backup";
import {
  type ValidBackup,
  type CloudBackupConfig,
  type CloudProvider,
} from "@/lib/backup/advanced-backup";
import { type CloudProviderInterface } from "@/lib/backup/cloud-backup";
import { saveBackupFile, shareBackupFile } from "@/lib/platform-files";

// ============================================================================
// TYPES
// ============================================================================

type BackupCardProps = {
  backup: ValidBackup;
  onRestore: (backup: ValidBackup) => void;
  onDelete: (backupId: string) => void;
  onShare: (backup: ValidBackup) => void;
  onDownload: (backup: ValidBackup) => void;
};

type HealthIndicatorProps = {
  status: "healthy" | "warning" | "critical" | "unknown";
  score: number;
};

type CloudProviderCardProps = {
  provider: CloudProviderInterface;
  config: CloudBackupConfig;
  onToggle: (provider: string, enabled: boolean) => void;
  onAuthenticate: (provider: string) => void;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AdvancedBackupSection({ onRequestReset }: { onRequestReset: () => void }) {
  const backup = useAdvancedBackup();
  const autoBackup = useAutoBackup();
  const cloudBackup = useCloudBackup();
  const health = useBackupHealth();
  const storage = useBackupStorage();

  // Local state
  const [activeTab, setActiveTab] = useState("backup");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCloudSetup, setShowCloudSetup] = useState(false);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<string>("google-drive");
  const [showBackupOptions, setShowBackupOptions] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    compression: true,
    encryption: false,
    strategy: "full" as "full" | "incremental" | "smart",
  });

  const restoreFileRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateBackup = async () => {
    try {
      await backup.createBackup({
        compression: backupOptions.compression,
        encryption: backupOptions.encryption,
        password: backupOptions.encryption ? encryptionPassword : undefined,
        strategy: backupOptions.strategy,
      });

      haptics.success();
      sound.success();
      toast.success("Backup created successfully");

      // Reset options
      setBackupOptions({
        compression: true,
        encryption: false,
        strategy: "full",
      });
      setEncryptionPassword("");
      setConfirmPassword("");
      setShowBackupOptions(false);
      setShowEncryptionDialog(false);
    } catch (error) {
      haptics.error();
      sound.error();
      toast.error(errorMessage(error, "Failed to create backup"));
    }
  };

  const handleSaveBackup = async (destination: "download" | "share" | "cloud") => {
    await backup.saveCreatedBackup(destination);
  };

  const handleRestoreFromFile = async (file: File) => {
    await backup.handleRestorePick(file);
  };

  const handleRestoreFromHistory = async (backupId: string) => {
    await backup.handleRestoreFromHistory(backupId);
  };

  const handleDeleteBackup = async (backupId: string) => {
    await backup.deleteBackup(backupId);
    setShowDeleteConfirm(null);
  };

  const handleCloudToggle = async (provider: string, enabled: boolean) => {
    await backup.toggleCloudBackup(provider as CloudProvider, enabled);
  };

  const handleCloudAuthenticate = async (provider: string) => {
    await backup.authenticateCloud(provider as CloudProvider);
  };

  const handleSync = async (direction?: "upload" | "download" | "both") => {
    await backup.syncWithCloud(direction);
  };

  const handleCleanup = async () => {
    await storage.cleanupOldBackups();
  };

  const handleOptimize = async () => {
    await storage.optimizeStorage();
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredBackups = useMemo(() => {
    if (!searchQuery) return backup.backups;
    return backup.backups.filter(
      (b) =>
        b.backupId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(b.meta.createdAt).toLocaleDateString().includes(searchQuery),
    );
  }, [backup.backups, searchQuery]);

  const healthColor = useMemo(() => {
    if (health.healthScore >= 80) return "text-emerald-400";
    if (health.healthScore >= 50) return "text-amber-400";
    if (health.healthScore >= 30) return "text-orange-400";
    return "text-red-400";
  }, [health.healthScore]);

  const storagePercentage = useMemo(() => {
    return storage.storageStats?.quota.percentageUsed || 0;
  }, [storage.storageStats]);

  const lastBackup = useMemo(() => {
    return backup.backups[0] || null;
  }, [backup.backups]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderBackupStatus = () => {
    if (backup.isLoading) {
      return (
        <Card className="relative overflow-hidden p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Card>
      );
    }

    if (!lastBackup) {
      return (
        <Card className="relative overflow-hidden p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] text-muted-foreground">
              <Clock className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold tracking-tight">No backup available</div>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                No backups have been created yet. Your data is at risk!
              </p>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden p-4">
        <div className="flex items-start gap-3">
          <HealthIndicator status={health.healthStatus} score={health.healthScore} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold tracking-tight">
              {backup.backupStatus.label}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px] text-muted-foreground">
              <MetaLine k="Date" v={new Date(lastBackup.meta.createdAt).toLocaleDateString()} />
              <MetaLine k="Time" v={new Date(lastBackup.meta.createdAt).toLocaleTimeString()} />
              <MetaLine k="Size" v={formatBytes(lastBackup.meta.sizeBytes)} />
              <MetaLine
                k="Records"
                v={String(
                  lastBackup.meta.recordCounts
                    ? Object.values(lastBackup.meta.recordCounts).reduce(
                        (a: number, b: number) => a + b,
                        0,
                      )
                    : 0,
                )}
              />
              <MetaLine k="Version" v={`v${lastBackup.meta.backupVersion}`} />
              <MetaLine k="Compressed" v={lastBackup.meta.compressed ? "Yes" : "No"} />
            </div>
          </div>
        </div>

        {health.healthIssues.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {health.healthIssues.map((issue) => (
              <Tooltip key={issue.id}>
                <TooltipTrigger asChild>
                  <Chip
                    tone={
                      issue.severity === "critical"
                        ? "danger"
                        : issue.severity === "high"
                          ? "warning"
                          : "default"
                    }
                  >
                    {issue.message}
                  </Chip>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-[12px]">
                    <div className="font-semibold">{issue.type}</div>
                    <div>{issue.message}</div>
                    {issue.fixable && (
                      <div className="text-muted-foreground">Fix: {issue.fixAction}</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </Card>
    );
  };

  const renderActionCards = () => (
    <div className="grid grid-cols-2 gap-2.5">
      <ActionCard
        icon={Download}
        label="Create Backup"
        hint="Advanced options"
        onClick={() => setShowBackupOptions(true)}
        tone="primary"
      />
      <ActionCard
        icon={Upload}
        label="Restore Backup"
        hint="From file or history"
        onClick={() => restoreFileRef.current?.click()}
      />
      <ActionCard
        icon={Cloud}
        label="Cloud Backup"
        hint="Sync to cloud"
        onClick={() => setShowCloudSetup(true)}
      />
      <ActionCard
        icon={Settings}
        label="Backup Settings"
        hint="Configure options"
        onClick={() => setActiveTab("settings")}
      />
    </div>
  );

  const renderBackupHistory = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search backups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")}>
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear search</TooltipContent>
        </Tooltip>
      </div>

      {filteredBackups.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Database className="mx-auto h-12 w-12 opacity-50" />
          <p className="mt-4 text-[13px]">No backups found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredBackups.map((entry) => (
            <BackupCard
              key={entry.backupId}
              backup={entry}
              onRestore={(b) => handleRestoreFromHistory(b.backupId)}
              onDelete={(id) => setShowDeleteConfirm(id)}
              onShare={async (b) => {
                const result = await shareBackupFile({
                  filename: `SkillSync-Backup-${b.backupId.slice(0, 8)}.json`,
                  text: JSON.stringify(b, null, 2),
                  mimeType: "application/json",
                });
                if (result.status === "shared") {
                  toast.success("Backup shared");
                } else if (result.status === "fallback-download") {
                  toast("File sharing unavailable - backup downloaded");
                } else if (result.status !== "cancelled") {
                  toast.error(result.message || "Failed to share backup");
                }
              }}
              onDownload={async (b) => {
                const result = await saveBackupFile({
                  filename: `SkillSync-Backup-${b.backupId.slice(0, 8)}.json`,
                  text: JSON.stringify(b, null, 2),
                  mimeType: "application/json",
                });
                if (result.status === "saved" || result.status === "fallback-download") {
                  toast.success(`Backup saved: SkillSync-Backup-${b.backupId.slice(0, 8)}.json`);
                } else if (result.status !== "cancelled") {
                  toast.error(result.message || "Failed to save backup");
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderHealthMonitoring = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px] font-semibold">Backup Health</div>
            <p className="text-[12px] text-muted-foreground mt-1">
              Overall status of your backup system
            </p>
          </div>
          <div className={`flex items-center gap-2 ${healthColor}`}>
            <span className="text-[14px] font-semibold">{health.healthScore}</span>
            <HealthIndicator status={health.healthStatus} score={health.healthScore} small />
          </div>
        </div>

        <Progress value={health.healthScore} max={100} className="mt-3 h-2" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</div>
            <div className={`mt-1 text-[13px] font-semibold ${healthColor}`}>
              {health.healthStatus}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Issues</div>
            <div className="mt-1 text-[13px] font-semibold">{health.healthIssues.length}</div>
          </div>
        </div>
      </div>

      {health.healthIssues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold">Issues Found</h3>
          {health.healthIssues.map((issue, index) => (
            <div
              key={issue.id}
              className={
                issue.severity === "critical"
                  ? "rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3"
                  : issue.severity === "high"
                    ? "rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3"
                    : "rounded-xl border border-white/[0.05] bg-white/[0.05] p-3"
              }
            >
              <div className="flex items-start gap-2">
                <span
                  className={`text-[10px] font-bold uppercase ${issue.severity === "critical" ? "text-red-400" : issue.severity === "high" ? "text-amber-400" : "text-yellow-400"}`}
                >
                  {issue.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium">{issue.message}</div>
                  <div className="text-[11px] text-muted-foreground">{issue.type}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {health.healthRecommendations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[13px] font-semibold">Recommendations</h3>
          {health.healthRecommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-[12.5px]"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStorageManagement = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px] font-semibold">Storage Usage</div>
            <p className="text-[12px] text-muted-foreground mt-1">
              {formatBytes(storage.totalSize)} used across {storage.backupCount} backups
            </p>
          </div>
          <div className="text-right">
            <div className="text-[14px] font-semibold">{storage.quotaUsed}%</div>
            <div className="text-[11px] text-muted-foreground">of quota</div>
          </div>
        </div>

        <Progress
          value={storage.quotaUsed}
          max={100}
          className="mt-3 h-2"
          indicatorClassName={
            storage.quotaUsed > 80
              ? "bg-red-500"
              : storage.quotaUsed > 60
                ? "bg-amber-500"
                : "bg-emerald-500"
          }
        />

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimize}
            disabled={storage.isOverQuota}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Optimize
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
            disabled={storage.backupCount === 0}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Cleanup
          </Button>
        </div>
      </div>

      {storage.isOverQuota && (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
          <AlertCircle className="h-5 w-5 text-[var(--danger)] shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-[var(--danger)]">Storage Over Quota</div>
            <p className="text-[12px] text-muted-foreground mt-1">
              Your backup storage is {storage.quotaUsed}% full. Consider cleaning up old backups or
              enabling cloud storage.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderCloudBackup = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13.5px] font-semibold">Cloud Backup Providers</div>
          <p className="text-[12px] text-muted-foreground mt-1">
            Sync your backups to the cloud for safekeeping
          </p>
        </div>
        <Select value={selectedCloudProvider} onValueChange={setSelectedCloudProvider}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {cloudBackup.cloudProviders.map((provider) => (
              <SelectItem key={provider.name} value={provider.name}>
                <div className="flex items-center gap-2">
                  <span className={`h-5 w-5 rounded-full bg-[${provider.color}]`} />
                  <span>{provider.displayName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {cloudBackup.cloudProviders.map((provider) => {
          const config = cloudBackup.getProviderConfig(provider.name);
          return (
            <CloudProviderCard
              key={provider.name}
              provider={provider}
              config={config}
              onToggle={handleCloudToggle}
              onAuthenticate={handleCloudAuthenticate}
            />
          );
        })}
      </div>

      {cloudBackup.activeProvider && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13.5px] font-semibold">Sync Status</div>
              <p className="text-[12px] text-muted-foreground mt-1">
                {cloudBackup.isSyncing ? "Syncing..." : "Idle"}
              </p>
            </div>
            <Button size="sm" onClick={() => handleSync()} disabled={cloudBackup.isSyncing}>
              {cloudBackup.isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              Sync Now
            </Button>
          </div>

          {cloudBackup.isSyncing && (
            <div className="mt-3">
              <Progress value={cloudBackup.syncProgress} max={100} className="h-2" />
            </div>
          )}

          {cloudBackup.syncErrors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {cloudBackup.syncErrors.map((error, index) => (
                <Chip key={index} tone="danger">
                  {error}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      {/* Auto-backup settings */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px] font-semibold">Automatic Backups</div>
            <p className="text-[12px] text-muted-foreground mt-1">
              Create backups automatically at regular intervals
            </p>
          </div>
          <Switch
            checked={autoBackup.settings.enabled}
            onCheckedChange={autoBackup.toggleAutoBackup}
          />
        </div>

        {autoBackup.settings.enabled && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium">Interval</Label>
                <Select
                  value={String(autoBackup.settings.intervalHours)}
                  onValueChange={(v) => autoBackup.setAutoBackupInterval(Number(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Every Hour</SelectItem>
                    <SelectItem value="6">Every 6 Hours</SelectItem>
                    <SelectItem value="12">Every 12 Hours</SelectItem>
                    <SelectItem value="24">Daily</SelectItem>
                    <SelectItem value="48">Every 2 Days</SelectItem>
                    <SelectItem value="168">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px] font-medium">Max Snapshots</Label>
                <Select
                  value={String(autoBackup.settings.maxSnapshots)}
                  onValueChange={(v) => {
                    // Update max snapshots
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Snapshots</SelectItem>
                    <SelectItem value="5">5 Snapshots</SelectItem>
                    <SelectItem value="10">10 Snapshots</SelectItem>
                    <SelectItem value="20">20 Snapshots</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={autoBackup.testBackup}>
                <Zap className="h-3.5 w-3.5 mr-1" />
                Test Backup
              </Button>
              <Button variant="outline" size="sm" onClick={handleCleanup}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Cleanup Old
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Backup strategy settings */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-[13.5px] font-semibold mb-3">Backup Strategy</div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="strategy"
              checked={backupOptions.strategy === "full"}
              onChange={() => setBackupOptions({ ...backupOptions, strategy: "full" })}
              className="accent-violet-500"
            />
            <span className="text-[12.5px]">Full Backup</span>
            <span className="text-[11px] text-muted-foreground">Complete snapshot of all data</span>
          </Label>

          <Label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="strategy"
              checked={backupOptions.strategy === "incremental"}
              onChange={() => setBackupOptions({ ...backupOptions, strategy: "incremental" })}
              className="accent-violet-500"
            />
            <span className="text-[12.5px]">Incremental Backup</span>
            <span className="text-[11px] text-muted-foreground">Only changed data</span>
          </Label>

          <Label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="strategy"
              checked={backupOptions.strategy === "smart"}
              onChange={() => setBackupOptions({ ...backupOptions, strategy: "smart" })}
              className="accent-violet-500"
            />
            <span className="text-[12.5px]">Smart Backup</span>
            <span className="text-[11px] text-muted-foreground">Auto-detect best strategy</span>
          </Label>
        </div>
      </div>

      {/* Compression & Encryption */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-[13.5px] font-semibold mb-3">Advanced Options</div>

        <div className="space-y-3">
          <Label className="flex items-center justify-between cursor-pointer">
            <span className="text-[12.5px]">Enable Compression</span>
            <Switch
              checked={backupOptions.compression}
              onCheckedChange={(checked) =>
                setBackupOptions({ ...backupOptions, compression: checked })
              }
            />
          </Label>

          <Label className="flex items-center justify-between cursor-pointer">
            <span className="text-[12.5px]">Enable Encryption</span>
            <Switch
              checked={backupOptions.encryption}
              onCheckedChange={(checked) => {
                setBackupOptions({ ...backupOptions, encryption: checked });
                if (checked) {
                  setShowEncryptionDialog(true);
                }
              }}
            />
          </Label>
        </div>
      </div>

      {/* Reset */}
      <div className="pt-2">
        <button
          onClick={() => {
            backup.clearBackupArtifacts();
            toast.success("Backup artifacts cleared");
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.05] px-4 py-3.5 text-left transition-colors active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
            <RotateCcw className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold tracking-tight text-[var(--danger)]">
              Clear Backup Data
            </span>
            <span className="block text-[11.5px] text-muted-foreground">
              Remove all local backup artifacts
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-[var(--danger)]/60" />
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <section className="space-y-4">
      <SectionHeader title="Backup & Restore" />

      {/* Status Card */}
      {renderBackupStatus()}

      {/* Action Cards */}
      {renderActionCards()}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="backup">Backups</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="mt-0">
          {renderBackupHistory()}
        </TabsContent>

        <TabsContent value="health" className="mt-0">
          {renderHealthMonitoring()}
        </TabsContent>

        <TabsContent value="storage" className="mt-0">
          {renderStorageManagement()}
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          {renderSettings()}
        </TabsContent>
      </Tabs>

      {/* Reset Button */}
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

      {/* File Input */}
      <input
        ref={restoreFileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleRestoreFromFile(f);
          e.target.value = "";
        }}
      />

      {/* Backup Options Sheet */}
      <BottomSheet
        open={showBackupOptions}
        onClose={() => setShowBackupOptions(false)}
        title="Create Backup"
      >
        <div className="space-y-4">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Create a backup of your complete SkillSync workspace with advanced options.
          </p>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={backupOptions.compression}
                onChange={(e) =>
                  setBackupOptions({ ...backupOptions, compression: e.target.checked })
                }
                className="accent-violet-500"
              />
              <span className="text-[12.5px]">
                Compress backup (recommended for large datasets)
              </span>
            </Label>

            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={backupOptions.encryption}
                onChange={(e) =>
                  setBackupOptions({ ...backupOptions, encryption: e.target.checked })
                }
                className="accent-violet-500"
              />
              <span className="text-[12.5px]">Encrypt backup with password</span>
            </Label>

            {backupOptions.encryption && (
              <div className="space-y-2">
                <Label className="text-[12px] font-medium">Password</Label>
                <Input
                  type="password"
                  value={encryptionPassword}
                  onChange={(e) => setEncryptionPassword(e.target.value)}
                  placeholder="Enter encryption password"
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
                {encryptionPassword &&
                  confirmPassword &&
                  encryptionPassword !== confirmPassword && (
                    <p className="text-[11px] text-[var(--danger)]">Passwords do not match</p>
                  )}
              </div>
            )}

            <Label className="text-[12px] font-medium mt-4">Backup Strategy</Label>
            <Select
              value={backupOptions.strategy}
              onValueChange={(v) =>
                setBackupOptions({
                  ...backupOptions,
                  strategy: v as "full" | "incremental" | "smart",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Backup</SelectItem>
                <SelectItem value="incremental">Incremental Backup</SelectItem>
                <SelectItem value="smart">Smart (Recommended)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowBackupOptions(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBackup}
              disabled={
                backup.isCreating ||
                (backupOptions.encryption &&
                  (!encryptionPassword || encryptionPassword !== confirmPassword))
              }
              className="flex-1 gradient-primary"
            >
              {backup.isCreating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Backup"
              )}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Save Backup Sheet */}
      <BottomSheet
        open={backup.createdBackup !== null}
        onClose={() => backup.saveCreatedBackup("download")}
        title="Backup Ready"
      >
        {backup.createdBackup && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="text-[12.5px] leading-relaxed text-muted-foreground">
                Backup created successfully. Choose where to save it.
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatBox k="Size" v={formatBytes(backup.createdBackup.meta.sizeBytes)} />
              <StatBox
                k="Date"
                v={new Date(backup.createdBackup.meta.createdAt).toLocaleDateString()}
              />
              <StatBox k="Version" v={`v${backup.createdBackup.meta.backupVersion}`} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => backup.saveCreatedBackup("download")}
                className="gradient-primary"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button onClick={() => backup.saveCreatedBackup("share")} variant="outline">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button
                onClick={() => backup.saveCreatedBackup("cloud")}
                variant="outline"
                disabled={!cloudBackup.activeProvider}
              >
                <Cloud className="h-4 w-4 mr-1" />
                Cloud
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Restore Preview Sheet */}
      <BottomSheet
        open={backup.restoreStep === 1 && !!backup.pendingRestore}
        onClose={() => backup.cancelRestore()}
        title="Restore Preview"
      >
        {backup.pendingRestore && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="text-[12.5px] leading-relaxed text-muted-foreground">
                Restoring this backup will replace your current workspace. This cannot be undone.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <StatBox
                k="Backup date"
                v={new Date(backup.pendingRestore.createdAt).toLocaleDateString()}
              />
              <StatBox k="Backup version" v={`v${backup.pendingRestore.backupVersion}`} />
              <StatBox k="App version" v={`v${backup.pendingRestore.appVersion}`} />
              <StatBox k="Size" v={formatBytes(backup.pendingRestore.sizeBytes)} />
            </div>

            {backup.pendingRestore.meta.incremental && (
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="text-[12px] font-semibold">Incremental Backup</div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  This is an incremental backup. Base backup will be used for complete restore.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={backup.cancelRestore} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => backup.setRestoreStep(2)} className="flex-1 gradient-primary">
                Continue
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Restore Confirm Sheet */}
      <BottomSheet
        open={backup.restoreStep === 2 && !!backup.pendingRestore}
        onClose={backup.cancelRestore}
        title="Confirm Restore"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
            <AlertTriangle className="h-4 w-4 text-[var(--danger)] shrink-0" />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Are you sure you want to restore this backup? Your current workspace will be replaced
              with the backup data. A safety snapshot will be created before restore.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={backup.cancelRestore} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={backup.confirmRestore}
              className="flex-1 bg-[var(--danger)]"
              disabled={backup.isRestoring}
            >
              {backup.isRestoring ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Restoring...
                </span>
              ) : (
                "Restore Backup"
              )}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Delete Confirm Sheet */}
      <BottomSheet
        open={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Backup?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
            <AlertCircle className="h-4 w-4 text-[var(--danger)] shrink-0" />
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Are you sure you want to delete this backup? This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowDeleteConfirm(null)} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => handleDeleteBackup(showDeleteConfirm!)}
              className="flex-1 bg-[var(--danger)]"
            >
              Delete Backup
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Cloud Setup Sheet */}
      <BottomSheet
        open={showCloudSetup}
        onClose={() => setShowCloudSetup(false)}
        title="Cloud Backup Setup"
      >
        <div className="space-y-4">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Connect to a cloud provider to automatically sync your backups.
          </p>

          <div className="space-y-2">
            {cloudBackup.cloudProviders.map((provider) => {
              const config = cloudBackup.getProviderConfig(provider.name);
              return (
                <CloudProviderCard
                  key={provider.name}
                  provider={provider}
                  config={config}
                  onToggle={(p, enabled) => {
                    handleCloudToggle(p, enabled);
                    if (enabled) {
                      setShowCloudSetup(false);
                    }
                  }}
                  onAuthenticate={(p) => {
                    handleCloudAuthenticate(p);
                    setShowCloudSetup(false);
                  }}
                />
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </section>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function HealthIndicator({
  status,
  score,
  small = false,
}: HealthIndicatorProps & { small?: boolean }) {
  const size = small ? "h-6 w-6" : "h-11 w-11";
  const iconSize = small ? "h-3 w-3" : "h-5 w-5";

  if (status === "healthy") {
    return (
      <span
        className={`flex ${size} shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300`}
      >
        <ShieldCheck className={iconSize} strokeWidth={1.75} />
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span
        className={`flex ${size} shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300`}
      >
        <ShieldAlert className={iconSize} strokeWidth={1.75} />
      </span>
    );
  }
  if (status === "critical") {
    return (
      <span
        className={`flex ${size} shrink-0 items-center justify-center rounded-2xl bg-[var(--danger)]/15 text-[var(--danger)]`}
      >
        <ShieldX className={iconSize} strokeWidth={1.75} />
      </span>
    );
  }
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] text-muted-foreground`}
    >
      <Clock className={iconSize} strokeWidth={1.75} />
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

function StatBox({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-0.5 truncate text-[12.5px] font-medium">{v}</div>
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

function BackupCard({ backup, onRestore, onDelete, onShare, onDownload }: BackupCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <Card className="relative p-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold">SkillSync Backup</div>
              <div className="text-[11px] text-muted-foreground">
                {backup.meta.backupId.slice(0, 8)}...
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {new Date(backup.meta.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            <Chip tone="default">{formatBytes(backup.meta.sizeBytes)}</Chip>
            <Chip tone="default">{backup.meta.compressed ? "Compressed" : "Uncompressed"}</Chip>
            {backup.meta.encrypted && <Chip tone="default">Encrypted</Chip>}
            {backup.meta.incremental && <Chip tone="default">Incremental</Chip>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onRestore(backup)} className="h-8 w-8">
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowActions(!showActions)}
            className="h-8 w-8"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {showActions && (
            <>
              <div
                className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 shadow-lg backdrop-blur-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDownload(backup);
                    setShowActions(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-[12px]">Download</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onShare(backup);
                    setShowActions(false);
                  }}
                  className="w-full justify-start gap-2"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="text-[12px]">Share</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDelete(backup.backupId);
                    setShowActions(false);
                  }}
                  className="w-full justify-start gap-2 text-[var(--danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="text-[12px]">Delete</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function CloudProviderCard({ provider, config, onToggle, onAuthenticate }: CloudProviderCardProps) {
  const isEnabled = config.enabled;
  const isAuthenticated = false; // Would check auth status in real implementation

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: provider.color }}
        >
          <span className="text-white text-[14px] font-bold">{provider.icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">{provider.displayName}</div>
          <div className="text-[11px] text-muted-foreground">
            {isAuthenticated ? "Connected" : "Not connected"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => onToggle(provider.name, checked)}
            />
          ) : (
            <Button size="sm" onClick={() => onAuthenticate(provider.name)}>
              Connect
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(2)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}
