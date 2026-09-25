import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Boxes,
  BrainCircuit,
  Database,
  FlaskConical,
  Gauge,
  Github,
  GraduationCap,
  Keyboard,
  LayoutDashboard,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  WifiOff,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, Chip, CountUp } from "@/components/ui/primitives";
import { Reveal } from "@/components/common/Reveal";
import { useAppStore } from "@/store/useAppStore";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";

export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "Project showcase — SkillSync OS" },
      {
        name: "description",
        content:
          "SkillSync OS — a final-year B.Tech CSE major project: offline-first personal growth OS built with React 19, TypeScript, TanStack Start and a versioned local schema.",
      },
      { property: "og:title", content: "SkillSync OS — project showcase" },
      {
        property: "og:description",
        content: "Architecture, engineering decisions, live metrics and a one-tap demo workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShowcasePage,
});

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

/** Facts about this repository, not marketing copy. */
const STATS = [
  { label: "Schema versions", value: 12, hint: "v1 → v12 migrators" },
  { label: "Dashboard widgets", value: 20, hint: "hide · resize · reorder" },
  { label: "Test suites", value: 47, hint: "unit + jsdom render" },
  { label: "Automated tests", value: 388, hint: "CI: types · lint · tests · build" },
];

const STACK = [
  "React 19",
  "TypeScript 5.8",
  "TanStack Start",
  "TanStack Router",
  "Zustand 5",
  "Zod 4",
  "Tailwind v4",
  "Vite 8",
  "Vitest 4",
  "Capacitor (Android)",
];

const FEATURES = [
  {
    icon: Target,
    title: "Aims, not points",
    body: "A deliberately anti-gamification layer: pinned aims, no XP, no badges, no counters to farm. Habit streaks stay because consistency is a real signal.",
  },
  {
    icon: LayoutDashboard,
    title: "20-widget dashboard",
    body: "A drag-and-reorder grid the user owns — per-widget size, visibility and order, all persisted and repaired on load.",
  },
  {
    icon: GraduationCap,
    title: "Seven study modules",
    body: "Roadmaps with phases/topics/checklists, CGPA with a target simulator, attendance, coding prep, placement pipeline, planner, notes and expenses.",
  },
  {
    icon: Gauge,
    title: "Analytics that mean something",
    body: "Focus minutes, per-habit streaks, solve heatmaps, weekly review with effort grades and week-over-week deltas — computed from the workspace, not a server.",
  },
  {
    icon: WifiOff,
    title: "Offline-first, local-only",
    body: "Zero network calls for app data. The workspace lives in localStorage, validated by Zod at every boundary, exported to JSON or carried into native builds.",
  },
  {
    icon: Smartphone,
    title: "Native platform layer",
    body: "Capacitor Android shell, Web Audio sound design synthesised in-browser (no asset downloads), haptics, local notifications and printable/PDF views.",
  },
];

const ENGINEERING = [
  {
    icon: Database,
    title: "Versioned schema, not migrations by hand",
    body: "Every workspace carries its own `schemaVersion`. Twelve ordered migrators upgrade any old payload in place, and each field is re-parsed individually if the whole document fails — a corrupted module can never take the workspace down.",
  },
  {
    icon: ShieldCheck,
    title: "Validate at the boundary, trust inside",
    body: "Zod schemas are the single source of truth for types and runtime shape: imports, backups, localStorage rehydration and demo data all pass through the same parse.",
  },
  {
    icon: Boxes,
    title: "Composition over dependencies",
    body: "Drag-and-drop, charts, heatmaps, confetti, sound synthesis, the launch animation and the bottom-sheet system are all built in-repo. The runtime dependency list stays small and auditable.",
  },
  {
    icon: FlaskConical,
    title: "Tested where it matters",
    body: "Pure logic (migrations, analytics, streaks, backup diffing) is unit-tested; routes are rendered in jsdom to prove the real UI wires to the real store.",
  },
];

const SHORTCUTS: Array<[string, string]> = [
  ["⌘K  /  /", "Command palette"],
  ["F", "Focus timer"],
  ["C", "Code · DSA prep"],
  ["G", "Aims"],
  ["R", "Week in review"],
  ["?", "This page"],
];

const ARCH_LAYERS = [
  {
    title: "Presentation",
    detail: "React 19 · TanStack Router · 24 routes",
    items: [
      "Route-level code splitting",
      "Keyboard-first navigation",
      "Reduced-motion aware motion system",
    ],
  },
  {
    title: "Domain",
    detail: "Pure TypeScript modules",
    items: [
      "analytics · streaks · review · focus · cgpa · backup diffing",
      "Deterministic, clock-injected functions",
      "Unit-tested without a DOM",
    ],
  },
  {
    title: "State",
    detail: "Zustand store + Zod contracts",
    items: [
      "Single store, selector-subscribed components",
      "Every mutation goes through an action",
      "Imports, backups and demo data share one validator",
    ],
  },
  {
    title: "Persistence",
    detail: "localStorage · versioned schema v12",
    items: [
      "Ordered migrators v1 → v12",
      "Per-field salvage on corruption",
      "JSON export/import + advanced backup vault",
    ],
  },
  {
    title: "Platform",
    detail: "PWA · Capacitor Android · CLI",
    items: [
      "Installable web app with service-worker shell",
      "Native haptics, notifications, file saving",
      "Print/PDF surfaces for reports",
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

function ShowcasePage() {
  const navigate = useNavigate();
  const demoMode = useAppStore((s) => s.demoMode);
  const loadDemoWorkspace = useAppStore((s) => s.loadDemoWorkspace);
  const exitDemoWorkspace = useAppStore((s) => s.exitDemoWorkspace);

  const [busy, setBusy] = useState(false);

  const startDemo = () => {
    haptics.success();
    sound.success();
    setBusy(true);
    const snapshotSaved = loadDemoWorkspace();
    toast.success("Demo workspace loaded", {
      description: snapshotSaved
        ? "Your real data is safely stashed — exit the demo any time to get it back."
        : "Heads up: browser storage is unavailable, so this demo cannot be restored automatically.",
      duration: 5200,
    });
    void navigate({ to: "/" });
  };

  const endDemo = () => {
    haptics.tap();
    sound.close();
    const restored = exitDemoWorkspace();
    toast[restored ? "success" : "message"](restored ? "Welcome back" : "Demo closed", {
      description: restored
        ? "Your own workspace is exactly where you left it."
        : "There was no saved workspace to restore — you are on a fresh one.",
    });
    setBusy(false);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Final year major project · B.Tech CSE"
        title="SkillSync OS."
        subtitle="An offline-first personal growth operating system — one workspace for aims, study, habits, placements and reflection. This page is the project dossier: what it does, how it is built, and how to try it."
        right={
          <a
            href="https://github.com/Piyush-XE1/skillsync-os"
            target="_blank"
            rel="noreferrer"
            aria-label="Repository on GitHub"
            className="glass pressable flex h-10 items-center gap-2 rounded-full px-3.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" strokeWidth={1.8} />
            <span className="hidden sm:inline">Source</span>
          </a>
        }
      />

      <div className="space-y-6 px-5 pb-24 lg:px-2">
        {/* ---------------- Hero ---------------- */}
        <section className="aurora-panel sheen animate-rise relative overflow-hidden p-5 lg:p-7">
          <div
            aria-hidden
            className="animate-drift pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full opacity-55 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--primary) 65%, transparent), transparent 70%)",
            }}
          />
          <div className="relative flex flex-wrap items-center gap-2">
            <Chip tone="primary">
              <Sparkles className="h-3 w-3" strokeWidth={2.2} />
              Built solo, end to end
            </Chip>
            <Chip>
              <WifiOff className="h-3 w-3" strokeWidth={2} />
              Works with no network
            </Chip>
            <Chip>
              <Smartphone className="h-3 w-3" strokeWidth={2} />
              Ships to Android
            </Chip>
          </div>

          <h2 className="relative mt-4 max-w-3xl text-balance text-fluid-title font-semibold leading-[1.12] tracking-[-0.03em]">
            A personal growth OS that treats the student as the{" "}
            <span className="gradient-text">system architect</span>, not the player.
          </h2>
          <p className="relative mt-3 max-w-2xl text-fluid-body text-muted-foreground">
            SkillSync replaces the usual pile of apps — a roadmap tracker here, a habit grid there,
            a CGPA spreadsheet somewhere else — with one offline-first workspace. Everything is
            local, versioned and exportable: your data never depends on a server staying online.
          </p>

          <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className="stat-tile animate-rise px-3.5 py-3"
                style={riseStyle(i)}
              >
                <div className="text-[24px] font-semibold leading-none tracking-tight">
                  <CountUp value={stat.value} duration={1100} />
                </div>
                <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {stat.label}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground/75">{stat.hint}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2.5">
            {demoMode ? (
              <button
                type="button"
                onClick={endDemo}
                className="pressable glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-foreground"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.9} />
                Exit demo · restore my data
              </button>
            ) : (
              <button
                type="button"
                onClick={startDemo}
                disabled={busy}
                className="pressable gradient-primary inline-flex h-10 items-center gap-2 rounded-full px-4.5 text-[13px] font-semibold text-white shadow-[var(--shadow-glow)] transition-transform hover:brightness-110 disabled:opacity-70"
              >
                <Play className="h-4 w-4" strokeWidth={2.2} />
                Load demo workspace
              </button>
            )}
            <Link
              to="/"
              className="pressable glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Open the dashboard
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>

          <p className="relative mt-3 max-w-xl text-[11.5px] leading-relaxed text-muted-foreground">
            Demo mode drops in a fully populated persona — six semesters of CGPA, 148 solved
            problems, a placement pipeline, 120 days of habit history — and puts your real workspace
            back, byte for byte, the moment you exit.
          </p>
        </section>

        {/* ---------------- Stack ---------------- */}
        <Reveal>
          <section>
            <SectionTitle eyebrow="Built with" title="The stack" />
            <div className="mt-3 flex flex-wrap gap-2">
              {STACK.map((tech) => (
                <span
                  key={tech}
                  className="pressable rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-foreground/85"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ---------------- Features ---------------- */}
        <Reveal>
          <section>
            <SectionTitle eyebrow="What it does" title="Feature highlights" />
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="glow-hover flex gap-3.5 p-4">
                  <span className="icon-tile-accent h-11 w-11 rounded-[15px]">
                    <feature.icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold tracking-tight">
                      {feature.title}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">
                      {feature.body}
                    </span>
                  </span>
                </Card>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ---------------- Architecture ---------------- */}
        <Reveal>
          <section>
            <SectionTitle
              eyebrow="How it is built"
              title="Architecture"
              hint="Five layers, one direction of dependency"
            />
            <div className="mt-3 space-y-2.5">
              {ARCH_LAYERS.map((layer, i) => (
                <div key={layer.title} className="relative">
                  <Card className="glow-hover flex flex-col gap-1.5 p-4 lg:flex-row lg:items-center lg:gap-5">
                    <div className="flex items-center gap-3 lg:w-64 lg:shrink-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.04] text-[11px] font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold tracking-tight">
                          {layer.title}
                        </div>
                        <div className="truncate text-[11.5px] text-muted-foreground">
                          {layer.detail}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 lg:flex-1">
                      {layer.items.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[11px] text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </Card>
                  {i < ARCH_LAYERS.length - 1 ? (
                    <span
                      aria-hidden
                      className="mx-auto mt-1 block h-3 w-px bg-gradient-to-b from-[color-mix(in_oklab,var(--primary)_60%,transparent)] to-transparent"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ---------------- Engineering notes ---------------- */}
        <Reveal>
          <section>
            <SectionTitle eyebrow="Engineering decisions" title="The interesting problems" />
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {ENGINEERING.map((item) => (
                <Card key={item.title} className="glow-hover p-4">
                  <div className="flex items-center gap-3">
                    <span className="icon-tile h-9 w-9 rounded-[13px]">
                      <item.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                    </span>
                    <span className="text-[13.5px] font-semibold tracking-tight">{item.title}</span>
                  </div>
                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ---------------- Shortcuts + demo ---------------- */}
        <Reveal>
          <section className="grid gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
                <Keyboard className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                Keyboard-first
              </div>
              <div className="mt-3 divide-y divide-white/[0.05]">
                {SHORTCUTS.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-[12.5px] text-muted-foreground">{label}</span>
                    <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
                <BrainCircuit className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                Try it in one tap
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                The demo persona is generated deterministically from a fixed seed — same numbers
                every time, which makes it safe for screenshots and for showing in a viva. Your own
                data is snapshotted first and restored on exit.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {demoMode ? (
                  <button
                    type="button"
                    onClick={endDemo}
                    className="pressable glass inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                    Exit demo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startDemo}
                    className="pressable gradient-primary inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-semibold text-white shadow-[var(--shadow-glow)]"
                  >
                    <Play className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Load demo workspace
                  </button>
                )}
                <Link
                  to="/profile"
                  className="pressable glass inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Backup &amp; data
                </Link>
              </div>
            </Card>
          </section>
        </Reveal>

        {/* ---------------- Footer ---------------- */}
        <Reveal>
          <footer className="pt-2 text-center">
            <p className="text-[12.5px] text-muted-foreground">
              SkillSync OS · built with React, TypeScript and a lot of late nights by{" "}
              <span className="font-medium text-foreground/85">Piyush</span>
            </p>
            <p className="mt-1 text-[11.5px] text-muted-foreground/70">
              Offline-first · schema v12 · no analytics, no tracking, no server
            </p>
          </footer>
        </Reveal>
      </div>
    </AppShell>
  );
}

function SectionTitle({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div className="px-1">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-fluid-heading font-semibold tracking-[-0.02em]">{title}</h2>
        {hint ? <span className="text-[11.5px] text-muted-foreground/75">{hint}</span> : null}
      </div>
    </div>
  );
}

/** Writes the `--i` stagger index consumed by `.animate-rise`. */
function riseStyle(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}
