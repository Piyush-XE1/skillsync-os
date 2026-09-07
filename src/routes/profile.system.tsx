import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Layers,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { systemSnapshot } from "@/lib/system-info";
import { formatBytes } from "@/lib/backup/advanced-backup";

export const Route = createFileRoute("/profile/system")({
  head: () => ({
    meta: [
      { title: "System — SkillSync" },
      { name: "description", content: "Workspace diagnostics and storage details." },
    ],
  }),
  component: SystemPage,
});

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[12.5px] font-medium text-foreground">{value}</span>
    </div>
  );
}

function SystemPage() {
  const hydrated = useHydrated();
  const data = useAppStore((s) => s);
  const snapshot = useMemo(() => systemSnapshot(data as never), [data]);

  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  return (
    <AppShell>
      <header className="mb-5 flex items-center gap-3 px-5 pt-1 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Developer mode
          </div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">System.</h1>
        </div>
      </header>

      <div className="space-y-6 px-5 lg:px-2 lg:auto-grid-wide lg:items-start lg:space-y-0">
        <section className="space-y-3">
          <SectionHeader title="Runtime" />
          <Card className="divide-y divide-white/[0.05] p-4">
            <Row label="App version" value={`v${snapshot.appVersion}`} />
            <Row label="Schema version" value={`v${snapshot.schemaVersion}`} />
            <Row label="Local storage used" value={formatBytes(snapshot.storageBytes)} />
            <Row label="Network" value={online ? "online" : "offline-first ✓"} />
            <div className="flex items-center justify-between py-2">
              <span className="text-[12.5px] text-muted-foreground">Data residency</span>
              <Chip tone="success">
                <ShieldCheck className="h-3 w-3" strokeWidth={2} /> On-device only
              </Chip>
            </div>
          </Card>

          <SectionHeader title="Totals" className="pt-3" />
          <Card className="divide-y divide-white/[0.05] p-4">
            <Row label="Level" value={hydrated ? snapshot.totals.level : "—"} />
            <Row label="XP (lifetime)" value={hydrated ? snapshot.totals.totalXp : "—"} />
            <Row label="Day streak" value={hydrated ? snapshot.totals.streak : "—"} />
            <Row label="Best habit streak" value={snapshot.totals.bestHabitStreak} />
            <Row
              label="CGPA"
              value={snapshot.totals.cgpa !== null ? snapshot.totals.cgpa.toFixed(2) : "—"}
            />
            <Row label="Credits" value={snapshot.totals.credits} />
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Records" />
          <Card className="divide-y divide-white/[0.05] p-4">
            <Row label="Roadmaps" value={snapshot.records.roadmaps} />
            <Row
              label="Topics"
              value={`${snapshot.records.topicsDone} / ${snapshot.records.topics}`}
            />
            <Row label="Notes" value={snapshot.records.notes} />
            <Row
              label="Projects"
              value={`${snapshot.records.projectsDone} / ${snapshot.records.projects}`}
            />
            <Row
              label="Planner tasks"
              value={`${snapshot.records.plannerDone} / ${snapshot.records.plannerTasks}`}
            />
            <Row label="Habits" value={snapshot.records.habits} />
            <Row label="Habit check-ins" value={snapshot.records.habitCheckIns} />
            <Row label="Focus sessions" value={snapshot.records.focusSessions} />
            <Row label="Focus minutes" value={snapshot.records.focusMinutes} />
            <Row label="CGPA semesters" value={snapshot.records.cgpaSemesters} />
            <Row label="Attendance subjects" value={snapshot.records.subjects} />
            <Row label="Transactions" value={snapshot.records.transactions} />
            <Row label="Notifications" value={snapshot.records.notifications} />
          </Card>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Architecture" />
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: Layers,
                title: "Zustand",
                desc: "Local-first store, schema-versioned persist",
              },
              {
                icon: Database,
                title: "Zod v7",
                desc: "Runtime validation + salvaging migrations",
              },
              { icon: Gauge, title: "TanStack", desc: "Router + Start, file-based routes" },
              { icon: Cpu, title: "Capacitor", desc: "Android shell, haptics, notifications" },
              { icon: HardDrive, title: "Vitest", desc: "150+ unit & render tests" },
              {
                icon: Wifi,
                title: "Offline-first",
                desc: "Zero network calls; data never leaves device",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-4">
                <Icon className="h-4.5 w-4.5 text-[var(--primary)]" strokeWidth={1.75} />
                <div className="mt-2.5 text-[13px] font-semibold">{title}</div>
                <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  {desc}
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
