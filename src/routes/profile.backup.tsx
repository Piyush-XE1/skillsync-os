import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BottomSheet } from "@/components/edit/Sheet";
import { TextField } from "@/components/edit/Fields";
import { BackupSection } from "@/components/profile/BackupSection";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/profile/backup")({
  head: () => ({
    meta: [
      { title: "Backup & Restore — SkillSync" },
      {
        name: "description",
        content: "Create backups, restore your workspace, and reset SkillSync.",
      },
      { property: "og:title", content: "Backup & Restore — SkillSync" },
      { property: "og:description", content: "Snapshot and restore your SkillSync workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BackupPage,
});

function BackupPage() {
  const navigate = useNavigate();
  const resetAll = useAppStore((s) => s.resetAll);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [phrase, setPhrase] = useState("");
  const PHRASE = "wipe everything";

  const submit = () => {
    const ok = phrase.trim().toLowerCase() === PHRASE;
    setStep(0);
    setPhrase("");
    if (ok) {
      resetAll();
      toast.success("All data wiped. Fresh start.");
      navigate({ to: "/profile" });
    } else {
      haptics.error();
      toast.error("The entered text was wrong. No data was wiped.");
    }
  };

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3 px-5 lg:px-2 pt-1">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Data</div>
          <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">
            Backup &amp; Restore
          </h1>
        </div>
      </header>

      <div className="space-y-6 px-5 lg:px-2 pb-24">
        <BackupSection onRequestReset={() => setStep(1)} />
      </div>

      <BottomSheet open={step === 1} onClose={() => setStep(0)} title="Wipe everything?">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.06] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/15 text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              This will permanently erase every roadmap, note, project, planner task, habit log and
              profile change on this device.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium text-foreground active:scale-[0.97]"
            >
              No, cancel
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl bg-[var(--danger)] py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97]"
            >
              Yes, continue
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={step === 2} onClose={() => setStep(0)} title="Confirm wipe">
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
              Type <span className="font-mono text-foreground">{PHRASE}</span>
            </label>
            <TextField
              autoFocus
              placeholder={PHRASE}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium text-foreground active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              className="flex-1 rounded-xl bg-[var(--danger)] py-2.5 text-[13.5px] font-medium text-white active:scale-[0.97]"
            >
              Confirm
            </button>
          </div>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
