import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Brain,
  Coffee,
  Flame,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
  Sparkles,
  Music,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { Toggle } from "@/components/common/Toggle";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { formatClock, focusTotals, focusStreak, minutesByDay } from "@/lib/focus";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { fireConfetti } from "@/lib/confetti";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Focus — SkillSync" },
      {
        name: "description",
        content: "Pomodoro deep-work timer with session history and a focus streak.",
      },
      { property: "og:title", content: "Focus — SkillSync" },
      { property: "og:description", content: "Deep work, measured." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FocusPage,
});

type Phase = "focus" | "break" | "longBreak";

const RING = 2 * Math.PI * 120;

function FocusPage() {
  const hydrated = useHydrated();
  const sessions = useAppStore((s) => s.focus.sessions);
  const settings = useAppStore((s) => s.focus.settings);
  const addFocusSession = useAppStore((s) => s.addFocusSession);
  const updateFocusSettings = useAppStore((s) => s.updateFocusSettings);

  const [phase, setPhase] = useState<Phase>("focus");
  const [task, setTask] = useState("");
  const [totalSeconds, setTotalSeconds] = useState(settings.workMin * 60);
  const [left, setLeft] = useState(settings.workMin * 60);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const deadlineRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(0); // focus sessions done since entering the page
  // Latest-render refs so the ticking interval never runs stale closures.
  const phaseRef = useRef<Phase>("focus");
  phaseRef.current = phase;
  const soundOnRef = useRef(settings.sound);
  soundOnRef.current = settings.sound;

  const phaseMeta: Record<Phase, { label: string; minutes: number }> = useMemo(
    () => ({
      focus: { label: "Deep Focus", minutes: settings.workMin },
      break: { label: "Short Break", minutes: settings.breakMin },
      longBreak: { label: "Long Break", minutes: settings.longBreakMin },
    }),
    [settings],
  );

  const loadPhase = useCallback(
    (next: Phase) => {
      const seconds = phaseMeta[next].minutes * 60;
      setPhase(next);
      setTotalSeconds(seconds);
      setLeft(seconds);
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    },
    [phaseMeta],
  );

  /** Starts (or restarts) a countdown of `seconds` — closure-free by design. */
  const begin = useCallback((seconds: number) => {
    deadlineRef.current = Date.now() + seconds * 1000;
    setRunning(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setLeft(remaining);
      // A quiet tick for the last five seconds of a focus phase — you can hear
      // the landing without watching the ring.
      if (remaining > 0 && remaining <= 5 && phaseRef.current === "focus" && soundOnRef.current) {
        sound.tick();
      }
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        finishRef.current(phaseRef.current);
      }
    }, 500);
  }, []);

  const finishRef = useRef<(finished: Phase) => void>(() => {});
  finishRef.current = (finished: Phase) => {
    haptics.milestone();
    // The completion chime respects both the timer's own toggle and the
    // workspace-wide sound preference (the engine is muted when sound is off).
    if (settings.sound) sound.chime();
    if (finished === "focus") {
      completedRef.current += 1;
      const minutes = phaseMeta.focus.minutes;
      addFocusSession({ minutes, mode: "focus", task: task.trim() || undefined });
      // Reward the deep-work win with a quiet celebratory scatter.
      fireConfetti({ count: 90, origin: { x: 0.5, y: 0.6 }, ttl: 1.8 });
      toast.success("Focus session complete", {
        description: `${formatClock(minutes * 60)} of deep work logged.`,
      });
      const next: Phase =
        completedRef.current % settings.longBreakEvery === 0 ? "longBreak" : "break";
      loadPhase(next);
      if (settings.autoStartBreaks) {
        window.setTimeout(() => begin(phaseMeta[next].minutes * 60), 400);
      } else {
        toast("Break is ready", { description: "Hit play when you're back." });
      }
    } else {
      loadPhase("focus");
      if (settings.autoStartFocus) {
        window.setTimeout(() => begin(phaseMeta.focus.minutes * 60), 400);
      } else {
        toast("Focus is ready", { description: "New session when you are." });
      }
    }
  };

  const start = () => {
    if (running) return;
    haptics.tap();
    sound.toggle();
    begin(left);
  };

  /** Applies a preset duration to the current phase without stale settings. */
  const applySeconds = (seconds: number) => {
    setTotalSeconds(seconds);
    setLeft(seconds);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const pause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    haptics.tap();
    sound.tap();
  };

  const reset = () => {
    pause();
    loadPhase(phase);
  };

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const totals = useMemo(() => focusTotals(sessions), [sessions]);
  const streak = useMemo(() => focusStreak(sessions), [sessions]);
  const week = useMemo(() => minutesByDay(sessions, 7), [sessions]);

  const progress = totalSeconds > 0 ? (totalSeconds - left) / totalSeconds : 0;
  const isFocus = phase === "focus";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Deep Work"
        title="Focus."
        subtitle="One session at a time. Completed focus sessions build your focus streak."
      />

      <div className="space-y-6 px-5 lg:px-2 lg:auto-grid-wide lg:items-start lg:space-y-0">
        {/* Timer card */}
        <section className="space-y-3">
          <Card className="relative overflow-hidden p-6 text-center">
            <div
              className={cn(
                "pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-1000",
                isFocus ? "gradient-mesh" : "opacity-40",
              )}
            />
            <div className="relative">
              {/* Phase switcher */}
              <div className="glass mx-auto inline-flex items-center gap-1 rounded-full p-1">
                {(
                  [
                    { key: "focus", label: "Focus", icon: Brain },
                    { key: "break", label: "Break", icon: Coffee },
                    { key: "longBreak", label: "Long", icon: Flame },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      haptics.selection();
                      sound.select();
                      loadPhase(key);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                      phase === key ? "bg-white/[0.08] text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Ring */}
              <div className="relative mx-auto mt-6 h-[260px] w-[260px]">
                <svg width="260" height="260" className="-rotate-90">
                  <defs>
                    <linearGradient id="focus-ring" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--secondary)" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="130"
                    cy="130"
                    r="120"
                    fill="none"
                    stroke="oklch(1 0 0 / 0.06)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="130"
                    cy="130"
                    r="120"
                    fill="none"
                    stroke="url(#focus-ring)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={RING}
                    strokeDashoffset={RING * (1 - progress)}
                    style={{ transition: "stroke-dashoffset 500ms linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-[54px] font-semibold tabular-nums leading-none tracking-tight">
                    {formatClock(left)}
                  </span>
                  <span className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {phaseMeta[phase].label}
                  </span>
                </div>
              </div>

              {/* Task input */}
              <input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={isFocus ? "What are you working on?" : "Take a breather…"}
                className="mx-auto mt-5 w-full max-w-[280px] rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-center text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-[var(--primary)]/40 focus:outline-none"
              />

              {/* Controls */}
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  onClick={reset}
                  aria-label="Reset timer"
                  className="glass flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95"
                >
                  <RotateCcw className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                </button>
                <button
                  onClick={running ? pause : start}
                  aria-label={running ? "Pause" : "Start"}
                  className="gradient-primary flex h-16 w-16 items-center justify-center rounded-full shadow-[var(--shadow-glow)] transition-transform hover:brightness-110 active:scale-95"
                >
                  {running ? (
                    <Pause className="h-6 w-6 text-white" strokeWidth={2.25} />
                  ) : (
                    <Play className="ml-1 h-6 w-6 text-white" strokeWidth={2.25} />
                  )}
                </button>
                <button
                  onClick={() => finishRef.current(phase)}
                  aria-label="Skip phase"
                  className="glass flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95"
                >
                  <SkipForward className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                </button>
              </div>

              {/* Presets */}
              <div className="mt-5 flex items-center justify-center gap-2">
                {[25, 45, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      haptics.selection();
                      sound.select();
                      updateFocusSettings({ workMin: m });
                      if (phase === "focus") applySeconds(m * 60);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                      settings.workMin === m
                        ? "border-[var(--primary)]/40 bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-foreground"
                        : "border-white/[0.08] text-muted-foreground",
                    )}
                  >
                    {m}m
                  </button>
                ))}
                <button
                  onClick={() => setShowSettings((v) => !v)}
                  aria-label="Timer settings"
                  className="glass flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </Card>

          {showSettings ? (
            <Card className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium">Auto-start breaks</span>
                <Toggle
                  on={settings.autoStartBreaks}
                  onChange={(v) => updateFocusSettings({ autoStartBreaks: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium">Auto-start focus</span>
                <Toggle
                  on={settings.autoStartFocus}
                  onChange={(v) => updateFocusSettings({ autoStartFocus: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <Music className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  Completion chime
                </span>
                <Toggle on={settings.sound} onChange={(v) => updateFocusSettings({ sound: v })} />
              </div>
            </Card>
          ) : null}
        </section>

        {/* Stats */}
        <section className="space-y-3">
          <SectionHeader title="Today" />
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Timer className="h-3.5 w-3.5" strokeWidth={2} />
                Deep work today
              </div>
              <div className="mt-2 text-[26px] font-semibold tracking-tight">
                {hydrated ? `${totals.todayMinutes}m` : "—"}
              </div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">
                {totals.sessionsToday} sessions
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-[var(--warning)]" strokeWidth={2} />
                Focus streak
              </div>
              <div className="mt-2 text-[26px] font-semibold tracking-tight">
                {hydrated ? streak : "—"}
              </div>
              <div className="mt-1 text-[11.5px] text-muted-foreground">consecutive days</div>
            </Card>
          </div>

          <SectionHeader title="Last 7 days" className="pt-3" />
          <Card className="p-4">
            <div className="flex h-24 items-end gap-2">
              {week.map(({ date, minutes }) => (
                <div key={date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-[var(--primary)]/40 to-[var(--primary)]/90"
                    style={{
                      height: `${minutes > 0 ? Math.max(6, (minutes / 120) * 88) : 3}px`,
                      opacity: minutes > 0 ? 1 : 0.25,
                    }}
                    title={`${minutes}m`}
                  />
                  <span className="text-[9.5px] text-muted-foreground">
                    {new Date(date).getDate()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted-foreground">
              <span>Total focus time</span>
              <Chip tone="primary">{totals.totalMinutes} min all-time</Chip>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
