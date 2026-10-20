/** Google Drive is the single cloud destination shown by Backup & Restore. */

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  ExternalLink,
  FolderSync,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import { BottomSheet } from "@/components/edit/Sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/common/Toggle";
import { toast } from "sonner";
import { formatBytes, formatRelative, getCloudBackupConfig } from "@/lib/backup/advanced-backup";
import { currentToken, requestGoogleToken } from "@/lib/backup/cloud";
import { haptics } from "@/lib/haptics";
import { errorMessage } from "@/lib/utils";
import { useBackupStore } from "@/store/useBackupStore";

const PROVIDER = "google-drive" as const;

export function CloudPanel({ disabled = false }: { disabled?: boolean }) {
  const cloud = useBackupStore((state) => state.cloud);
  const create = useBackupStore((state) => state.create);
  const setupCloud = useBackupStore((state) => state.setupCloud);
  const forgetCloud = useBackupStore((state) => state.forgetCloud);
  const refreshCloud = useBackupStore((state) => state.refreshCloud);
  const uploadToCloud = useBackupStore((state) => state.uploadToCloud);
  const setCloudAutoUpload = useBackupStore((state) => state.setCloudAutoUpload);
  const restoreFromCloud = useBackupStore((state) => state.restoreFromCloud);

  const [setupOpen, setSetupOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const status = cloud.status[PROVIDER];
  const items = cloud.items[PROVIDER] ?? [];
  const cloudBusy = cloud.busy === PROVIDER;
  const connected = Boolean(status?.connected && hasToken);

  useEffect(() => {
    let alive = true;
    void currentToken(PROVIDER).then((token) => {
      if (alive) setHasToken(Boolean(token));
    });
    return () => {
      alive = false;
    };
  }, [status?.connected, status?.configured]);

  useEffect(() => {
    if (!browserOpen || cloudBusy || items.length > 0) return;
    void refreshCloud(PROVIDER);
  }, [browserOpen, cloudBusy, items.length, refreshCloud]);

  const syncNow = async () => {
    setSyncing(true);
    haptics.tap();
    try {
      const made = await create({
        compression: true,
        quiet: true,
        suppressSavePrompt: true,
        skipAutoUpload: true,
      });
      if (made) await uploadToCloud(PROVIDER, made.meta.backupId);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Card className="backup-destination-card space-y-5 p-5" elevated>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-foreground">
            {connected ? (
              <Cloud className="h-5 w-5" strokeWidth={1.65} />
            ) : (
              <CloudOff className="h-5 w-5" strokeWidth={1.65} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="section-kicker">02 / CLOUD</p>
            <h2 className="mt-1 font-display text-xl leading-tight">
              Backup sync with Google Drive
            </h2>
          </div>
          {connected && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Google Drive connection settings"
              onClick={() => setSetupOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Keep a private, restorable copy in a dedicated SkillSync Backups folder in your Google
          Drive.
        </p>

        {connected ? (
          <>
            <div className="flex items-start gap-2.5 border-y border-white/[0.07] py-3">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                strokeWidth={1.8}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-foreground">Google Drive connected</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  {status?.lastSyncAt
                    ? `Last synced ${formatRelative(status.lastSyncAt)}`
                    : "Ready for the first sync"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                className="gradient-primary h-11 w-full"
                disabled={disabled || cloudBusy || syncing}
                onClick={() => void syncNow()}
              >
                {cloudBusy || syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderSync className="h-4 w-4" />
                )}
                Sync now
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full"
                disabled={disabled || cloudBusy}
                onClick={() => {
                  haptics.tap();
                  setBrowserOpen(true);
                }}
              >
                <Download className="h-4 w-4" />
                Restore from Google Drive
              </Button>
            </div>

            <div className="flex items-start gap-3 pt-1">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium">Keep new backups synced</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                  Upload a private-safe Drive copy whenever SkillSync creates a new backup.
                </p>
              </div>
              <Toggle
                on={Boolean(status?.autoUpload)}
                onChange={(next) => void setCloudAutoUpload(PROVIDER, next)}
                label="Keep new backups synced with Google Drive"
              />
            </div>
          </>
        ) : (
          <>
            <div className="border-y border-white/[0.07] py-3 text-[11.5px] leading-relaxed text-muted-foreground">
              Sign in through Google. SkillSync requests access only to files it creates and never
              receives your Google password.
            </div>
            <Button
              className="gradient-primary h-11 w-full"
              disabled={disabled}
              onClick={() => {
                haptics.tap();
                setSetupOpen(true);
              }}
            >
              <Cloud className="h-4 w-4" />
              Connect Google Drive
            </Button>
          </>
        )}

        {cloud.error && (
          <p role="alert" className="text-[11px] leading-relaxed text-[var(--danger)]">
            {cloud.error}
          </p>
        )}
      </Card>

      {setupOpen && (
        <GoogleSetupSheet
          connected={connected}
          autoUpload={Boolean(status?.autoUpload)}
          busy={cloudBusy}
          onConnected={() => {
            setHasToken(true);
            setSetupOpen(false);
          }}
          onConnect={async (clientId, token, autoUpload) =>
            setupCloud({
              provider: PROVIDER,
              clientId,
              token,
              enabled: true,
              autoUpload,
            })
          }
          onDisconnect={async () => {
            await forgetCloud(PROVIDER);
            setHasToken(false);
            setSetupOpen(false);
          }}
          onClose={() => setSetupOpen(false)}
        />
      )}

      <BottomSheet
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        title="Google Drive backups"
        description="Choose a SkillSync backup to inspect before restoring it."
      >
        <div className="space-y-3 pb-2">
          {cloudBusy && (
            <div className="flex min-h-12 items-center gap-2 text-[12.5px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your Drive backups…
            </div>
          )}

          {!cloudBusy && items.length === 0 && (
            <div className="border border-white/[0.07] px-3 py-4 text-[12px] leading-relaxed text-muted-foreground">
              No SkillSync backups are in Google Drive yet. Close this panel and choose Sync now.
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-2.5 border-b border-white/[0.07] py-3 last:border-0"
            >
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-[12.5px] font-medium">{item.name}</p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {item.updatedAt ? formatRelative(item.updatedAt) : "Unknown date"} ·{" "}
                  {formatBytes(item.sizeBytes)}
                </p>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${item.name} in Google Drive`}
                  className="focus-ring flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                disabled={cloudBusy}
                onClick={() => {
                  setBrowserOpen(false);
                  void restoreFromCloud(PROVIDER, item.id, item.name);
                }}
              >
                Restore
              </Button>
            </div>
          ))}

          <Button
            variant="ghost"
            className="min-h-11 w-full"
            disabled={cloudBusy}
            onClick={() => void refreshCloud(PROVIDER)}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Drive backups
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}

function GoogleSetupSheet({
  connected,
  autoUpload,
  busy,
  onConnect,
  onConnected,
  onDisconnect,
  onClose,
}: {
  connected: boolean;
  autoUpload: boolean;
  busy: boolean;
  onConnect: (clientId: string, token: string, autoUpload: boolean) => Promise<boolean>;
  onConnected: () => void;
  onDisconnect: () => Promise<void>;
  onClose: () => void;
}) {
  const deploymentClientId = String(import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID ?? "").trim();
  const [clientId, setClientId] = useState(
    () => getCloudBackupConfig(PROVIDER).clientId ?? deploymentClientId,
  );
  const [keepSynced, setKeepSynced] = useState(autoUpload);
  const [signingIn, setSigningIn] = useState(false);

  const connect = async () => {
    const id = clientId.trim();
    if (!id) return;
    setSigningIn(true);
    try {
      const result = await requestGoogleToken(id);
      if (!result.ok) {
        toast.error(result.hint ? `${result.error} ${result.hint}` : result.error);
        return;
      }
      const ok = await onConnect(id, result.token, keepSynced);
      if (ok) {
        toast.success("Google Drive connected");
        onConnected();
      }
    } catch (error) {
      toast.error(errorMessage(error, "Google sign-in failed."));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={connected ? "Google Drive settings" : "Connect Google Drive"}
      description={
        connected
          ? "This device is authorized to sync SkillSync backups."
          : "A one-time OAuth client ID lets Google securely identify this SkillSync installation."
      }
      footer={
        <div className="space-y-2 pb-[max(env(safe-area-inset-bottom),12px)]">
          <Button
            className="gradient-primary h-11 w-full"
            disabled={busy || signingIn || !clientId.trim()}
            onClick={() => void connect()}
          >
            {busy || signingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            {connected ? "Reconnect Google account" : "Continue with Google"}
          </Button>
          {connected && (
            <Button
              variant="ghost"
              className="h-11 w-full text-[var(--danger)]"
              disabled={busy || signingIn}
              onClick={() => void onDisconnect()}
            >
              Disconnect Google Drive
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <div className="space-y-1.5">
          <Label htmlFor="google-drive-client-id">Google OAuth client ID</Label>
          <Input
            id="google-drive-client-id"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="1234-abc.apps.googleusercontent.com"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            Stored only on this device. No client secret is required.
          </p>
        </div>

        <div className="flex items-start gap-3 border-y border-white/[0.07] py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium">Keep new backups synced</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
              Send new private-safe copies to Drive after they are created.
            </p>
          </div>
          <Toggle on={keepSynced} onChange={setKeepSynced} label="Keep new backups synced" />
        </div>

        <details className="group border border-white/[0.07] px-3 py-2.5">
          <summary className="focus-ring flex min-h-11 cursor-pointer items-center text-[12px] font-medium">
            Where do I get a client ID?
          </summary>
          <ol className="mt-3 space-y-2 pl-4 text-[11px] leading-relaxed text-muted-foreground">
            <li>1. In Google Cloud Console, enable the Google Drive API.</li>
            <li>2. Create a Web application OAuth client with the drive.file scope.</li>
            <li>3. Add this app's exact origin under Authorized JavaScript origins.</li>
            <li>4. Paste the generated client ID above, then continue with Google.</li>
          </ol>
        </details>
      </div>
    </BottomSheet>
  );
}
