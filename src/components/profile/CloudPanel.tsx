/**
 * Cloud panel: connect a provider, push the newest backup, pull one back.
 *
 * There are no fake states here — a provider is either verified (a real API
 * call succeeded) or it shows exactly what is still missing, with the steps to
 * get it.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  CloudOff,
  CloudUpload,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button, Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { BottomSheet } from "@/components/edit/Sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/common/Toggle";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { cn, errorMessage } from "@/lib/utils";
import {
  formatBytes,
  formatRelative,
  getCloudBackupConfig,
  type CloudProvider,
} from "@/lib/backup/advanced-backup";
import {
  CLOUD_PROVIDERS,
  currentToken,
  describeCloudProvider,
  getCloudExtras,
  requestGoogleToken,
  startDropboxSignIn,
  type CloudField,
} from "@/lib/backup/cloud";
import { useBackupStore } from "@/store/useBackupStore";

const PROVIDER_LABEL: Record<CloudProvider, string> = {
  "github-gist": "GitHub Gist",
  webdav: "WebDAV",
  "google-drive": "Google Drive",
  dropbox: "Dropbox",
  none: "Cloud",
};

export function CloudPanel({ disabled = false }: { disabled?: boolean }) {
  const cloud = useBackupStore((s) => s.cloud);
  const records = useBackupStore((s) => s.records);
  const setupCloud = useBackupStore((s) => s.setupCloud);
  const testCloud = useBackupStore((s) => s.testCloud);
  const forgetCloud = useBackupStore((s) => s.forgetCloud);
  const refreshCloud = useBackupStore((s) => s.refreshCloud);
  const uploadToCloud = useBackupStore((s) => s.uploadToCloud);
  const deleteCloudItem = useBackupStore((s) => s.deleteCloudItem);
  const setCloudAutoUpload = useBackupStore((s) => s.setCloudAutoUpload);
  const restoreFromCloud = useBackupStore((s) => s.restoreFromCloud);

  const [setupFor, setSetupFor] = useState<CloudProvider | null>(null);
  const [browsing, setBrowsing] = useState<CloudProvider | null>(null);

  const activeProvider = useMemo(
    () =>
      CLOUD_PROVIDERS.map((p) => p.provider).find((provider) => cloud.status[provider]?.enabled) ??
      null,
    [cloud.status],
  );

  useEffect(() => {
    if (!browsing) return;
    if ((cloud.items[browsing] ?? []).length === 0 && !cloud.busy) void refreshCloud(browsing);
  }, [browsing, cloud.items, cloud.busy, refreshCloud]);

  const connected = CLOUD_PROVIDERS.filter(
    (descriptor) => cloud.status[descriptor.provider]?.connected,
  );

  return (
    <div className="space-y-2.5">
      <SectionHeader
        title="Cloud copies"
        action={activeProvider ? `${PROVIDER_LABEL[activeProvider]} is on` : undefined}
      />

      <Card className="space-y-2 p-3">
        {CLOUD_PROVIDERS.map((descriptor) => {
          const status = cloud.status[descriptor.provider];
          const items = cloud.items[descriptor.provider] ?? [];
          const busy = cloud.busy === descriptor.provider;
          return (
            <div
              key={descriptor.provider}
              className="flex items-center gap-3 rounded-xl px-1 py-1.5"
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  status?.connected
                    ? "bg-emerald-400/12 text-emerald-300"
                    : "bg-white/[0.04] text-muted-foreground",
                )}
              >
                {status?.connected ? (
                  <Cloud className="h-4 w-4" strokeWidth={1.8} />
                ) : (
                  <CloudOff className="h-4 w-4" strokeWidth={1.8} />
                )}
              </span>
              <button
                onClick={() => {
                  haptics.tap();
                  setSetupFor(descriptor.provider);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-[13px] font-medium tracking-tight">
                  {descriptor.name}
                </span>
                <span className="block truncate text-[11.5px] text-muted-foreground">
                  {busy
                    ? "Working…"
                    : status?.connected
                      ? `${items.length ? `${items.length} in the cloud · ` : ""}${status.lastSyncAt ? `synced ${formatRelative(status.lastSyncAt)}` : "ready"}`
                      : status?.configured
                        ? "Set up — press test to connect"
                        : descriptor.provider === "github-gist"
                          ? "Easiest: paste a GitHub token"
                          : "Needs a token, folder URL or app key"}
                </span>
              </button>
              {status?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || busy || records.length === 0}
                  onClick={() => void uploadToCloud(descriptor.provider)}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="h-3.5 w-3.5" />
                  )}
                  Upload
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setSetupFor(descriptor.provider)}>
                  Set up
                </Button>
              )}
            </div>
          );
        })}

        {cloud.error && (
          <p className="rounded-xl bg-[var(--danger)]/[0.07] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--danger)]">
            {cloud.error}
          </p>
        )}

        {connected.length > 0 && (
          <div className="flex items-center gap-2 border-t border-white/[0.05] pt-2">
            <span className="min-w-0 flex-1 text-[11.5px] text-muted-foreground">
              Show what is stored in {PROVIDER_LABEL[connected[0].provider]}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setBrowsing(connected[0].provider)}>
              Browse
            </Button>
          </div>
        )}
      </Card>

      {setupFor && (
        <CloudSetupSheet
          provider={setupFor}
          onClose={() => setSetupFor(null)}
          onSaved={async (values) => {
            const ok = await setupCloud({ provider: setupFor, ...values });
            if (ok) setSetupFor(null);
          }}
          onForgot={async () => {
            await forgetCloud(setupFor);
            setSetupFor(null);
          }}
        />
      )}

      {browsing && (
        <BottomSheet
          open
          onClose={() => setBrowsing(null)}
          title={`${PROVIDER_LABEL[browsing]} files`}
          description="Anything listed here can be restored straight into this workspace."
        >
          <div className="space-y-2">
            {cloud.busy === browsing && (
              <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching the list…
              </div>
            )}
            {(cloud.items[browsing] ?? []).length === 0 && cloud.busy !== browsing && (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Nothing here yet{cloud.error ? ` (${cloud.error})` : ". Upload a backup first."}
              </p>
            )}
            {(cloud.items[browsing] ?? []).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {item.updatedAt ? formatRelative(item.updatedAt) : "unknown date"} ·{" "}
                    {formatBytes(item.sizeBytes)}
                  </div>
                </div>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open in the provider"
                    className="text-muted-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Delete from cloud"
                  onClick={() => void deleteCloudItem(browsing, item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void restoreFromCloud(browsing, item.id, item.name)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Restore
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void refreshCloud(browsing)}
              disabled={cloud.busy === browsing}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh list
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ============================================================================
// SETUP SHEET
// ============================================================================

type FormValues = {
  token?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  clientId?: string;
  folderId?: string;
  autoUpload?: boolean;
};

function CloudSetupSheet({
  provider,
  onClose,
  onSaved,
  onForgot,
}: {
  provider: CloudProvider;
  onClose: () => void;
  onSaved: (values: FormValues) => Promise<boolean | void>;
  onForgot: () => Promise<void>;
}) {
  const descriptor = describeCloudProvider(provider);
  const status = useBackupStore((s) => s.cloud.status[provider]);
  const busy = useBackupStore((s) => s.cloud.busy === provider);
  const setCloudAutoUpload = useBackupStore((s) => s.setCloudAutoUpload);

  const [values, setValues] = useState<FormValues>({});
  const [secretSaved, setSecretSaved] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let alive = true;
    const extras = getCloudExtras(provider);
    const config = getCloudBackupConfig(provider);
    void currentToken(provider).then((token) => {
      if (!alive) return;
      setSecretSaved(Boolean(token));
      setValues({
        baseUrl: extras.baseUrl ?? "",
        username: extras.username ?? "",
        clientId: config.clientId ?? "",
        token: "",
      });
    });
    return () => {
      alive = false;
    };
  }, [provider]);

  if (!descriptor) return null;

  const requiredMissing = descriptor.fields.some(
    (field) => field.required && !values[field.key] && !(field.secret && secretSaved),
  );

  const save = async () => {
    const payload: FormValues = { autoUpload: values.autoUpload ?? false };
    for (const field of descriptor.fields) {
      const value = values[field.key]?.trim();
      if (value) payload[field.key === "clientId" ? "clientId" : field.key] = value;
    }
    const ok = await onSaved(payload);
    if (ok === false)
      toast.error("Saved, but the test connection failed — check the details above.");
  };

  const googleSignIn = async () => {
    setSigningIn(true);
    try {
      const clientId = (values.clientId ?? "").trim();
      const result = await requestGoogleToken(clientId);
      if (!result.ok) {
        toast.error(result.hint ? `${result.error} ${result.hint}` : result.error);
        return;
      }
      await onSaved({ clientId, token: result.token, autoUpload: values.autoUpload });
      toast.success("Google Drive connected");
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
      title={descriptor.name}
      description={descriptor.blurb}
      footer={
        <div className="flex gap-2 pb-[max(env(safe-area-inset-bottom),12px)]">
          {status?.connected && (
            <Button variant="outline" onClick={() => void onForgot()}>
              Disconnect
            </Button>
          )}
          <Button
            className="flex-1 gradient-primary"
            disabled={requiredMissing || busy}
            onClick={() => void save()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            {status?.connected ? "Save & test" : "Save & connect"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="space-y-3">
          {descriptor.fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              secretSaved={Boolean(field.secret && secretSaved)}
              value={values[field.key] ?? ""}
              onChange={(next) => setValues((prev) => ({ ...prev, [field.key]: next }))}
            />
          ))}
        </div>

        {provider === "google-drive" && (
          <Button
            variant="outline"
            className="w-full"
            disabled={signingIn || !(values.clientId ?? "").trim()}
            onClick={() => void googleSignIn()}
          >
            {signingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            Connect with Google
          </Button>
        )}
        {provider === "dropbox" && (
          <Button
            variant="outline"
            className="w-full"
            disabled={signingIn || !(values.clientId ?? "").trim()}
            onClick={() => {
              setSigningIn(true);
              void startDropboxSignIn((values.clientId ?? "").trim());
            }}
          >
            {signingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            Sign in to Dropbox
          </Button>
        )}

        <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium">Send every new backup up too</div>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
              Runs after an automatic copy is made, and after a manual one.
            </p>
          </div>
          <Toggle
            on={values.autoUpload ?? Boolean(status?.autoUpload)}
            onChange={(next) => {
              setValues((prev) => ({ ...prev, autoUpload: next }));
              if (status?.connected) void setCloudAutoUpload(provider, next);
            }}
            label="Auto-upload"
          />
        </div>

        <div className="rounded-2xl border border-white/[0.06] p-3.5">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Setup steps
          </div>
          <ol className="mt-2 space-y-1.5">
            {descriptor.steps.map((step, index) => (
              <li
                key={step}
                className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {descriptor.notes && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {descriptor.notes.map((note) => (
                <Chip key={note}>{note}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function FieldRow({
  field,
  value,
  secretSaved,
  onChange,
}: {
  field: CloudField;
  value: string;
  secretSaved: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-2 text-[12px] font-medium">
        {field.label}
        {field.required && <span className="text-[10px] text-muted-foreground">required</span>}
      </Label>
      <Input
        type={field.secret ? "password" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={secretSaved ? "Saved on this device — type to replace" : field.placeholder}
        autoComplete={field.secret ? "off" : "on"}
        spellCheck={false}
      />
      {field.help && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{field.help}</p>
      )}
    </div>
  );
}
