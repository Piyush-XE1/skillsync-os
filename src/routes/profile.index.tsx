import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  Info,
  Bell,
  Shield,
  BarChart3,
  Activity,
  Camera,
  Trash2,
  Code2,
  Database,
  FileJson,
  Sparkles,
  HardDrive,
  Lock,
  AlertTriangle,
  Save,
  SlidersHorizontal,
  GraduationCap,
  Wallet,
  Vibrate,
  Volume2,
  Timer,
  Award,
  FileText,
  Target,
} from "lucide-react";
import { AppShell, AppFooter, PageHeader } from "@/components/layout/AppShell";
import { Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { BottomSheet } from "@/components/edit/Sheet";
import { TextField } from "@/components/edit/Fields";
import { ActionButton } from "@/components/edit/Buttons";
import { Toggle } from "@/components/common/Toggle";
import { useShallow } from "zustand/react/shallow";
import { STORAGE_KEY, toAppData, useAppStore, useHydrated } from "@/store/useAppStore";
import { BACKGROUND_OPTIONS, type BackgroundStyle } from "@/components/layout/backgrounds";
import { ACCENT_PRESETS, defaultAccentFor, safeAccent } from "@/lib/accent";
import { formatBytes, formatRelative, getBackupStatus } from "@/lib/backup/advanced-backup";
import { useBackupStore } from "@/store/useBackupStore";
import { APP_VERSION } from "@/lib/version";
import { haptics, hapticsSupported, type HapticIntensity } from "@/lib/haptics";
import { SOUND_CUES, previewSound, sound, soundSupported, type SoundCue } from "@/lib/sound";
import { focusTotals } from "@/lib/focus";

export const Route = createFileRoute("/profile/")({
  head: () => ({
    meta: [
      { title: "Profile — SkillSync" },
      { name: "description", content: "Your aims, preferences and backups." },
      { property: "og:title", content: "Profile — SkillSync" },
      { property: "og:description", content: "Your growth, at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

/** The cues worth auditioning in settings — the rest fire on their own. */
const PREVIEW_CUES: SoundCue[] = [
  "tap",
  "toggle",
  "select",
  "success",
  "complete",
  "drop",
  "coin",
  "streak",
  "chime",
  "error",
];

async function fileToResizedDataUrl(file: File, max = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ProfilePage() {
  const hydrated = useHydrated();
  const lastBackupMeta = useBackupStore((s) => s.lastMeta);
  const backupStatus = getBackupStatus(lastBackupMeta);
  const profile = useAppStore((s) => s.profile);
  const preferences = useAppStore((s) => s.preferences);
  const goals = useAppStore((s) => s.goals);
  const habits = useAppStore((s) => s.habits);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const exportJSON = useAppStore((s) => s.exportJSON);
  const resetAll = useAppStore((s) => s.resetAll);
  const focusSessions = useAppStore((s) => s.focus.sessions);
  const focusTotal = focusTotals(focusSessions).totalMinutes;

  const [openProfile, setOpenProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [openJson, setOpenJson] = useState(false);
  const [openAppearance, setOpenAppearance] = useState(false);
  const [openHaptics, setOpenHaptics] = useState(false);
  const [openSound, setOpenSound] = useState(false);

  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Friction dialogs
  const [openDevVerify, setOpenDevVerify] = useState(false);
  const [devNameInput, setDevNameInput] = useState("");
  // Reset flow: 'demo' or 'all'; step1 = confirm intent, step2 = type-to-confirm
  const [resetMode, setResetMode] = useState<null | "demo" | "all">(null);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetPhraseInput, setResetPhraseInput] = useState("");

  const initials =
    (profile.name || "L")
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "L";

  // export/import handled by BackupSection now

  const openNameEditor = () => {
    setNameDraft(profile.name);
    setOpenProfile(true);
  };

  // Committed on Done / dismiss — the previous blur-only commit silently lost
  // the new name when the sheet was closed without the input losing focus.
  const commitName = () => {
    const next = nameDraft.trim();
    if (next !== profile.name) updateProfile({ name: next });
  };

  const handleAvatarPick = async (file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 256);
      updateProfile({ avatar: dataUrl });
    } catch {
      haptics.error();
      sound.error();
      toast.error("Couldn't read that image.");
    }
  };

  const handleDevToggle = (v: boolean) => {
    if (!v) {
      updatePreferences({ developerMode: false });
      toast("Developer mode disabled");
      return;
    }
    setDevNameInput("");
    setOpenDevVerify(true);
  };

  const submitDevVerify = () => {
    const expected = (profile.name || "").trim().toLowerCase();
    const got = devNameInput.trim().toLowerCase();
    setOpenDevVerify(false);
    if (expected && got === expected) {
      updatePreferences({ developerMode: true });
      toast.success("Developer mode enabled");
    } else {
      haptics.error();
      sound.error();
      toast.error("Entered name doesn't match. Developer mode was not enabled.");
    }
    setDevNameInput("");
  };

  const beginReset = (mode: "demo" | "all") => {
    setResetMode(mode);
    setResetPhraseInput("");
    setResetStep(1);
  };

  const closeReset = () => {
    setResetStep(0);
    setResetMode(null);
    setResetPhraseInput("");
  };

  const resetPhrase = resetMode === "all" ? "wipe everything" : "reset demo";

  const submitResetPhrase = () => {
    const ok = resetPhraseInput.trim().toLowerCase() === resetPhrase;
    const mode = resetMode;
    closeReset();
    if (ok) {
      resetAll();
      toast.success(
        mode === "all" ? "All data wiped. Fresh start." : "Reset to starter demo data.",
      );
    } else {
      haptics.error();
      sound.error();
      toast.error("The entered text was wrong. No data was wiped.");
    }
  };

  // Re-measure whenever any persisted slice of the store changes.
  const data = useAppStore(useShallow(toAppData));
  const storageSize = useMemo(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) return new Blob([raw]).size;
    } catch {
      /* fall through to the serialized estimate */
    }
    return new Blob([JSON.stringify(data)]).size;
  }, [data]);

  const jsonPreview = useMemo(() => (openJson ? exportJSON() : ""), [openJson, exportJSON]);

  return (
    <AppShell>
      <PageHeader eyebrow="You" title="Profile." />

      <div className="space-y-6 px-5 lg:px-2">
        {/* Identity */}
        <Card className="relative overflow-hidden p-5">
          <div className="relative flex items-center gap-4">
            <button
              onClick={() => avatarFileRef.current?.click()}
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/[0.04] text-[20px] font-semibold text-white ring-1 ring-white/[0.08] transition-transform active:scale-95"
              aria-label="Change profile picture"
            >
              {hydrated && profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-primary-foreground">
                  {initials}
                </span>
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-[16px] font-semibold tracking-tight">
                  {hydrated ? profile.name || "Learner" : "…"}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                <button onClick={openNameEditor} className="underline-offset-2 hover:underline">
                  Edit name
                </button>
                <span className="text-white/10">·</span>
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                >
                  <Camera className="h-3 w-3" /> Change photo
                </button>
                {hydrated && profile.avatar ? (
                  <>
                    <span className="text-white/10">·</span>
                    <button
                      onClick={() => updateProfile({ avatar: "" })}
                      className="text-[var(--danger)] underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <input
            ref={avatarFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAvatarPick(f);
              e.target.value = "";
            }}
          />

          <div className="relative mt-5 grid grid-cols-3 gap-3">
            {[
              { k: "Aims", v: hydrated ? String(goals.length) : "—" },
              { k: "Habits", v: hydrated ? String(habits.length) : "—" },
              {
                k: "Focus",
                v: hydrated ? `${Math.round(focusTotal / 60)}h` : "—",
              },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="text-[11px] text-muted-foreground">{s.k}</div>
                <div className="mt-1 text-[18px] font-semibold tracking-tight">{s.v}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Aims */}
        <section className="space-y-3">
          <SectionHeader
            title={goals.length > 0 ? `Aims · ${goals.length}` : "Aims"}
            action={<Link to="/goals">Manage</Link>}
          />
          <Card className="p-4">
            {goals.length === 0 ? (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                No aims yet. Add what you are working on — gym, no junk food, academics — and they
                stay pinned to the top of your dashboard. No points, no levels.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {goals.map((goal) => (
                  <span
                    key={goal.id}
                    className="flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--primary)_24%,transparent)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] px-3 py-1.5 text-[12.5px] font-medium"
                  >
                    <span aria-hidden>{goal.emoji}</span>
                    {goal.title}
                  </span>
                ))}
              </div>
            )}
            <Link
              to="/goals"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Target className="h-3.5 w-3.5" strokeWidth={1.75} />
              Edit your aims
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </section>

        {/* Insights */}
        <section className="space-y-3">
          <SectionHeader title="Insights" />
          <Link
            to="/analytics"
            className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary">
              <BarChart3 className="h-5 w-5 text-white" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold tracking-tight">View analytics</div>
              <div className="text-[12px] text-muted-foreground">
                Learning, projects and habit trends
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </Link>
          <Link
            to="/habits"
            className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04]">
              <Activity className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold tracking-tight">Operation Rebirth</div>
              <div className="text-[12px] text-muted-foreground">Daily habit tracking</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </Link>
          {preferences.modules.attendance ? (
            <Link
              to="/attendance"
              className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04]">
                <GraduationCap className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold tracking-tight">College Attendance</div>
                <div className="text-[12px] text-muted-foreground">
                  Semester-wise attendance tracker
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
          ) : null}
          {preferences.modules.expenses ? (
            <Link
              to="/expenses"
              className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Wallet className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold tracking-tight">Expense Manager</div>
                <div className="text-[12px] text-muted-foreground">
                  Track monthly credits and debits
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
          ) : null}
        </section>

        {/* Career & Academics */}
        <section className="space-y-3">
          <SectionHeader title="Career & Academics" />
          {preferences.modules.focus ? (
            <Link
              to="/focus"
              className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary">
                <Timer className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold tracking-tight">Focus timer</div>
                <div className="text-[12px] text-muted-foreground">
                  {focusTotal > 0
                    ? `${focusTotal} minutes of deep work logged`
                    : "Pomodoro sessions and deep-work stats"}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
          ) : null}
          {preferences.modules.cgpa ? (
            <Link
              to="/cgpa"
              className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04]">
                <Award className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold tracking-tight">CGPA tracker</div>
                <div className="text-[12px] text-muted-foreground">
                  Semester-wise grades & target simulator
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
          ) : null}
          {preferences.modules.resume ? (
            <Link
              to="/resume"
              className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04]">
                <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold tracking-tight">Resume builder</div>
                <div className="text-[12px] text-muted-foreground">
                  Print-ready resume with autosave
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
          ) : null}
        </section>

        {/* Data */}
        <section className="space-y-3">
          <SectionHeader title="Data" />
          <Link
            to="/profile/backup"
            className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary">
              <Save className="h-5 w-5 text-white" strokeWidth={1.75} />
              <span
                aria-hidden
                className={
                  "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] " +
                  (backupStatus.tone === "green"
                    ? "bg-emerald-400"
                    : backupStatus.tone === "yellow"
                      ? "bg-amber-400"
                      : backupStatus.tone === "red"
                        ? "bg-[var(--danger)]"
                        : "bg-zinc-500")
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold tracking-tight">Backup &amp; Restore</div>
              <div className="truncate text-[12px] text-muted-foreground">
                {lastBackupMeta
                  ? `${backupStatus.label} · ${formatRelative(lastBackupMeta.createdAt)}`
                  : "Nothing saved yet — make the first copy"}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </Link>
        </section>

        {/* Modules */}
        <section className="space-y-3">
          <SectionHeader title="Modules" />
          <Link
            to="/profile/modules"
            className="card-surface flex items-center gap-3 p-4 transition-all active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04]">
              <SlidersHorizontal className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold tracking-tight">Optional modules</div>
              <div className="text-[12px] text-muted-foreground">
                Enable Attendance, Expenses and more
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </Link>
        </section>

        {/* Preferences */}
        <section className="space-y-3">
          <SectionHeader title="Preferences" />
          <Card className="p-2">
            <div className="divide-y divide-white/[0.05]">
              <Link to="/profile/notifications" className="block">
                <SettingRow
                  icon={Bell}
                  label="Notifications"
                  hint={preferences.notifications ? "On" : "Off"}
                  right={<ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
                />
              </Link>

              <button
                type="button"
                onClick={() => setOpenHaptics(true)}
                className="w-full text-left transition-transform active:scale-[0.99]"
              >
                <SettingRow
                  icon={Vibrate}
                  label="Haptic feedback"
                  right={
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] text-muted-foreground">
                        {(preferences.haptics ?? true) ? "On" : "Off"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                  }
                />
              </button>
              <button
                type="button"
                onClick={() => setOpenSound(true)}
                className="w-full text-left transition-transform active:scale-[0.99]"
              >
                <SettingRow
                  icon={Volume2}
                  label="Sound design"
                  right={
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] text-muted-foreground">
                        {(preferences.sound ?? true)
                          ? `${Math.round((preferences.soundVolume ?? 0.7) * 100)}%`
                          : "Off"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                  }
                />
              </button>
              <button
                type="button"
                onClick={() => setOpenAppearance(true)}
                className="w-full text-left transition-transform active:scale-[0.99]"
              >
                <SettingRow
                  icon={Sparkles}
                  label="Appearance & accent"
                  right={
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] text-muted-foreground">
                        {
                          BACKGROUND_OPTIONS.find(
                            (o) => o.id === (preferences.background ?? "aurora"),
                          )?.label
                        }
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </span>
                  }
                />
              </button>
            </div>
          </Card>

          {/* Developer mode explainer */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.03]">
                <Code2 className="h-[16px] w-[16px] text-muted-foreground" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[14px] font-semibold tracking-tight">Developer mode</div>
                  <Toggle
                    on={preferences.developerMode}
                    onChange={handleDevToggle}
                    label="Developer mode"
                  />
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  Unlocks tools built for power-users and testing.
                </p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-white/30" />
                    Raw JSON data viewer
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-white/30" />
                    Storage size & diagnostics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-white/30" />
                    Reset to demo (seed) data
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-white/30" />
                    Roadmap import helpers &amp; experimental features
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {preferences.developerMode ? (
            <Card className="p-2">
              <div className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                Developer tools
              </div>
              <div className="divide-y divide-white/[0.05]">
                <SettingRow
                  icon={HardDrive}
                  label="Storage size"
                  hint={hydrated ? formatBytes(storageSize) : "—"}
                />
                <SettingButtonRow
                  icon={FileJson}
                  label="View raw JSON"
                  onClick={() => setOpenJson(true)}
                />
                <SettingButtonRow
                  icon={Database}
                  label="Reset to demo data"
                  onClick={() => beginReset("demo")}
                  danger
                />
              </div>
            </Card>
          ) : null}
        </section>

        {/* About */}
        <section className="space-y-3">
          <SectionHeader title="About" />
          <Card className="relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--primary)]/15 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary">
                <Sparkles className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold tracking-tight">SkillSync OS</div>
                <div className="text-[12.5px] text-muted-foreground">
                  Your personal growth operating system.
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip>v{APP_VERSION}</Chip>
                  <Chip>
                    <Shield className="h-3 w-3" /> Local-first
                  </Chip>
                  <Chip>Offline</Chip>
                  <Chip>Private</Chip>
                </div>
              </div>
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <AboutStat icon={Info} label="Build" value={`v${APP_VERSION}`} />
              <AboutStat
                icon={HardDrive}
                label="Storage"
                value={hydrated ? formatBytes(storageSize) : "—"}
              />
            </div>
            <p className="relative mt-4 text-[11.5px] leading-relaxed text-muted-foreground">
              Built for daily use. No accounts, no tracking, no cloud — every roadmap, note and
              habit stays on your device.
            </p>
          </Card>
        </section>

        <p className="pb-4 text-center text-[11px] text-muted-foreground">
          SkillSync · Made for the long game.
        </p>
      </div>

      <BottomSheet open={openHaptics} onClose={() => setOpenHaptics(false)} title="Haptic feedback">
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Subtle vibrations on taps, toggles and completions. Mobile only — desktop simply ignores
          it.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-white/[0.03] px-4 py-3.5">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold tracking-tight">Haptics</div>
              <div className="text-[12px] text-muted-foreground">
                {hapticsSupported() ? "Supported on this device" : "Not supported on this device"}
              </div>
            </div>
            <Toggle
              on={preferences.haptics ?? true}
              onChange={(v) => updatePreferences({ haptics: v })}
              label="Haptics"
            />
          </div>

          <div
            className={
              "rounded-[18px] border border-border bg-white/[0.03] p-4 transition-opacity " +
              ((preferences.haptics ?? true) ? "" : "pointer-events-none opacity-40")
            }
          >
            <div className="text-[13px] font-semibold tracking-tight">Intensity</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["light", "standard", "strong"] as HapticIntensity[]).map((lvl) => {
                const active = (preferences.hapticIntensity ?? "standard") === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      updatePreferences({ hapticIntensity: lvl });
                      haptics.selection();
                    }}
                    className={
                      "rounded-[12px] py-2.5 text-[12.5px] font-medium capitalize transition-all active:scale-[0.97] " +
                      (active
                        ? "gradient-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                        : "bg-white/[0.05] text-muted-foreground")
                    }
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={openSound} onClose={() => setOpenSound(false)} title="Sound design">
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Short synthesised cues for taps, toggles, drops and celebrations — no audio files, nothing
          downloaded. Everything is mixed live from oscillators, so it stays tiny and instant.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-white/[0.03] px-4 py-3.5">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold tracking-tight">Interface sounds</div>
              <div className="text-[12px] text-muted-foreground">
                {soundSupported() ? "Supported on this device" : "Not supported on this device"}
              </div>
            </div>
            <Toggle
              on={preferences.sound ?? true}
              onChange={(v) => {
                updatePreferences({ sound: v });
                if (v) window.setTimeout(() => previewSound("success"), 60);
              }}
              label="Interface sounds"
            />
          </div>

          <div
            className={
              "rounded-[18px] border border-border bg-white/[0.03] p-4 transition-opacity " +
              ((preferences.sound ?? true) ? "" : "pointer-events-none opacity-40")
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold tracking-tight">Volume</span>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {Math.round((preferences.soundVolume ?? 0.7) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round((preferences.soundVolume ?? 0.7) * 100)}
              aria-label="Interface sound volume"
              onChange={(e) => updatePreferences({ soundVolume: Number(e.target.value) / 100 })}
              onPointerUp={() => previewSound("tap")}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.09] accent-[var(--primary)]"
            />
            <div className="mt-2 flex justify-between text-[10.5px] uppercase tracking-wider text-muted-foreground/70">
              <span>Subtle</span>
              <span>Balanced</span>
              <span>Bold</span>
            </div>
          </div>

          <div
            className={
              "rounded-[18px] border border-border bg-white/[0.03] p-4 transition-opacity " +
              ((preferences.sound ?? true) ? "" : "pointer-events-none opacity-40")
            }
          >
            <div className="text-[13px] font-semibold tracking-tight">Preview a cue</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PREVIEW_CUES.map((cue) => (
                <button
                  key={cue}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    previewSound(cue);
                  }}
                  className="pressable rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--primary)_40%,transparent)] hover:text-foreground"
                >
                  {SOUND_CUES[cue].label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            The Focus timer has its own completion-chime switch under the timer's settings icon; it
            follows this master volume too.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={openAppearance}
        onClose={() => setOpenAppearance(false)}
        title="Appearance"
      >
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          Tap a style to apply it instantly across the whole app.
        </p>
        <div className="space-y-3">
          {BACKGROUND_OPTIONS.map((opt) => {
            const active = (preferences.background ?? "aurora") === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  haptics.selection();
                  updatePreferences({ background: opt.id as BackgroundStyle });
                }}
                className={
                  "w-full overflow-hidden rounded-[18px] border text-left transition-all active:scale-[0.98] " +
                  (active
                    ? "border-[color-mix(in_oklab,var(--primary)_55%,transparent)] shadow-[var(--shadow-glow)]"
                    : "border-border")
                }
              >
                <div
                  className="h-24 w-full"
                  style={{ background: opt.swatch }}
                  aria-hidden="true"
                />
                <div className="flex items-center justify-between gap-3 bg-white/[0.03] px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold tracking-tight">{opt.label}</div>
                    <div className="text-[12px] leading-relaxed text-muted-foreground">
                      {opt.description}
                    </div>
                  </div>
                  {active ? (
                    <span className="shrink-0 rounded-full bg-[var(--primary)] px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                      Active
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="!mt-6 border-t border-white/[0.06] pt-5">
          <div className="mb-3">
            <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Accent colour
            </div>
          </div>
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground">
            Re-skin the entire OS. Pick an accent and the whole app follows instantly.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {ACCENT_PRESETS.map((preset) => {
              const active =
                (
                  preferences.accent ?? defaultAccentFor(preferences.background ?? "aurora")
                ).toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={preset.label}
                  title={preset.label}
                  aria-pressed={active}
                  onClick={() => {
                    haptics.selection();
                    updatePreferences({ accent: preset.color });
                  }}
                  className={
                    "relative flex h-14 flex-col items-center justify-center rounded-2xl border transition-all active:scale-[0.96] " +
                    (active
                      ? "border-[color-mix(in_oklab,var(--primary)_60%,transparent)] shadow-[var(--shadow-glow)]"
                      : "border-border")
                  }
                >
                  <span className="h-8 w-8 rounded-full" style={{ background: preset.color }} />
                  <span className="mt-1 text-[9.5px] font-medium text-muted-foreground">
                    {preset.label}
                  </span>
                  {active ? (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-primary-foreground">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <label
              htmlFor="custom-accent"
              className="flex flex-1 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <input
                id="custom-accent"
                type="color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(preferences.accent ?? "")
                    ? preferences.accent
                    : defaultAccentFor(preferences.background ?? "aurora")
                }
                onChange={(e) => {
                  haptics.tap();
                  updatePreferences({ accent: safeAccent(e.target.value) });
                }}
                className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              />
              <span className="text-[12.5px] text-muted-foreground">
                Custom colour{" "}
                <span className="ml-1 font-mono text-[11px] text-foreground">
                  {preferences.accent ?? ""}
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                updatePreferences({ accent: defaultAccentFor(preferences.background ?? "aurora") });
              }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              Theme default
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={openProfile}
        onClose={() => {
          commitName();
          setOpenProfile(false);
        }}
        title="Edit profile"
      >
        <div className="space-y-3">
          <label className="block text-[12px] text-muted-foreground">Name</label>
          <TextField
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitName();
                setOpenProfile(false);
              }
            }}
          />
          <ActionButton
            className="w-full"
            onClick={() => {
              commitName();
              setOpenProfile(false);
            }}
          >
            Done
          </ActionButton>
        </div>
      </BottomSheet>

      <BottomSheet
        open={openJson}
        onClose={() => setOpenJson(false)}
        title="Raw data"
        className="max-h-[92dvh]"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>{formatBytes(storageSize)} in localStorage</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(jsonPreview).catch(() => {});
              }}
              className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11.5px] font-medium text-foreground active:scale-95"
            >
              Copy
            </button>
          </div>
          <pre className="max-h-[65dvh] overflow-auto rounded-xl border border-white/[0.06] bg-black/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
            {jsonPreview}
          </pre>
        </div>
      </BottomSheet>

      {/* Developer mode verification */}
      <BottomSheet
        open={openDevVerify}
        onClose={() => setOpenDevVerify(false)}
        title="Unlock developer mode"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary-glow)]">
              <Lock className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Developer mode unlocks raw data access and destructive reset tools. Type your profile
              name to confirm it's really you.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] text-muted-foreground">Your profile name</label>
            <TextField
              autoFocus
              placeholder={profile.name || "Your name"}
              value={devNameInput}
              onChange={(e) => setDevNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitDevVerify();
              }}
            />
          </div>
          <ActionButton className="w-full" onClick={submitDevVerify}>
            Unlock
          </ActionButton>
        </div>
      </BottomSheet>

      {/* Reset — step 1: intent */}
      <BottomSheet
        open={resetStep === 1}
        onClose={closeReset}
        title={resetMode === "all" ? "Wipe everything?" : "Reset to demo data?"}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              {resetMode === "all"
                ? "This will permanently erase every roadmap, note, project, planner task, habit log and profile change on this device."
                : "Your current data will be replaced with the starter demo content. This cannot be undone."}
            </p>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            You'll be asked to type a confirmation phrase on the next step.
          </p>
          <div className="flex gap-2">
            <button
              onClick={closeReset}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium text-foreground active:scale-[0.97]"
            >
              No, cancel
            </button>
            <button
              onClick={() => setResetStep(2)}
              className="flex-1 rounded-xl bg-[var(--danger)] py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97]"
            >
              Yes, continue
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Reset — step 2: type to confirm */}
      <BottomSheet
        open={resetStep === 2}
        onClose={closeReset}
        title={resetMode === "all" ? "Confirm wipe" : "Confirm reset"}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              This action is permanent. To proceed, type the phrase below exactly and press Confirm.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] text-muted-foreground">
              Type <span className="font-mono text-foreground">{resetPhrase}</span>
            </label>
            <TextField
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={resetPhrase}
              value={resetPhraseInput}
              onChange={(e) => setResetPhraseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitResetPhrase();
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={closeReset}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium text-foreground active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              onClick={submitResetPhrase}
              className="flex-1 rounded-xl bg-[var(--danger)] py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97]"
            >
              Confirm
            </button>
          </div>
        </div>
      </BottomSheet>

      <AppFooter />
    </AppShell>
  );
}

function AboutStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Info;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-[12.5px] font-medium">{value}</div>
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  hint,
  right,
}: {
  icon: typeof Info;
  label: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03]">
        <Icon className="h-[16px] w-[16px] text-muted-foreground" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-[14px] font-medium">{label}</span>
      {right ?? (hint ? <Chip>{hint}</Chip> : null)}
    </div>
  );
}

function SettingButtonRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Info;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.02]"
    >
      <span
        className={
          "flex h-9 w-9 items-center justify-center rounded-xl " +
          (danger
            ? "bg-[var(--danger)]/10 text-[var(--danger)]"
            : "bg-white/[0.03] text-muted-foreground")
        }
      >
        <Icon className="h-[16px] w-[16px]" strokeWidth={1.75} />
      </span>
      <span className={"flex-1 text-[14px] font-medium " + (danger ? "text-[var(--danger)]" : "")}>
        {label}
      </span>
      {danger ? (
        <Trash2 className="h-4 w-4 text-[var(--danger)]/70" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
      )}
    </button>
  );
}
