import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BrainCircuit, Flame, Target, Timer, Trophy } from "lucide-react";
import { CircularProgress, CountUp } from "@/components/ui/primitives";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { activityStrip, todaySummary } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * The dashboard hero — "today, in one glance".
 *
 * This is the first thing a user sees after the brand opening, so it leads with
 * live telemetry rather than decoration: today's habit ring, deep-work ring,
 * solves, streak, a 7-day activity strip and the aims the user is working on.
 * Numbers count up once, the strip grows in with a stagger, and everything is
 * reduced-motion safe through the global stylesheet guard.
 */
export function TodayHero({ className }: { className?: string }) {
  const hydrated = useHydrated();

  const goals = useAppStore((s) => s.goals);
  const habits = useAppStore((s) => s.habits);
  const habitLogs = useAppStore((s) => s.habitLogs);
  const planner = useAppStore((s) => s.planner);
  const coding = useAppStore((s) => s.coding.problems);
  const sessions = useAppStore((s) => s.focus.sessions);

  const input = useMemo(
    () => ({ goals, habits, habitLogs, planner, coding, focusSessions: sessions }),
    [goals, habits, habitLogs, planner, coding, sessions],
  );

  const summary = useMemo(() => todaySummary(input), [input]);
  const strip = useMemo(() => activityStrip(input, new Date(), 7), [input]);

  const onTrack = summary.habitPct >= 60 || summary.focusPct >= 60;

  return (
    <section
      aria-label="Today at a glance"
      className={cn("aurora-panel animate-rise sheen relative mb-4 p-4 lg:p-5", className)}
    >
      {/* Ambient orbs — decorative, never interactive. */}
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 60%, transparent), transparent 70%)",
        }}
      />

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--primary)_28%,transparent)] bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color-mix(in_oklab,var(--primary-glow)_88%,white)]">
          <span
            aria-hidden
            className="animate-breathe h-1.5 w-1.5 rounded-full bg-[var(--primary-glow)]"
          />
          Today
        </span>
        <LiveClock />
        <span className="ml-auto text-[11px] font-medium text-muted-foreground">
          <WeekRail pct={summary.weekPct} day={summary.dayOfWeek} />
        </span>
      </div>

      <div className="relative mt-4 grid gap-4 lg:grid-cols-[auto_1fr] lg:gap-6">
        {/* Rings */}
        <div className="flex items-center justify-center gap-4 sm:justify-start">
          <Ring
            value={hydrated ? summary.habitPct : 0}
            label={`${hydrated ? summary.habitsDone : 0}/${summary.habitsTotal || 0}`}
            sublabel="Habits"
          />
          <Ring
            value={hydrated ? summary.focusPct : 0}
            label={`${hydrated ? summary.focusMinutes : 0}m`}
            sublabel="Focus"
          />
        </div>

        {/* Telemetry */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Tile
            icon={Timer}
            label="Deep work"
            value={hydrated ? summary.focusMinutes : 0}
            suffix=" min"
            hint={`Goal ${summary.focusGoalMinutes} min`}
          />
          <Tile
            icon={BrainCircuit}
            label="Solved"
            value={hydrated ? summary.solvesToday : 0}
            hint={`${hydrated ? summary.solvesWeek : 0} this week`}
          />
          <Tile
            icon={Trophy}
            label="Tasks today"
            value={hydrated ? summary.tasksDoneToday : 0}
            suffix={`/${summary.tasksToday}`}
            hint={summary.tasksToday === 0 ? "Nothing due" : "Planner"}
          />
          <Tile
            icon={Flame}
            label="Best streak"
            value={hydrated ? summary.bestStreak : 0}
            suffix="d"
            hint={`${hydrated ? summary.habitsActiveThisWeek : 0} habits active`}
          />
        </div>
      </div>

      {/* 7-day activity strip */}
      <div className="relative mt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Last 7 days
          </span>
          <span className="text-[11px] text-muted-foreground/80">habits · focus · solves</span>
        </div>
        <div className="flex h-14 items-end gap-1.5">
          {strip.map((day, i) => (
            <div key={day.date} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className="flex h-10 w-full items-end overflow-hidden rounded-[6px] bg-white/[0.05]"
                title={`${day.label} · ${day.habitsDone} habits · ${day.focusMinutes} min · ${day.solves} solved`}
              >
                <div
                  className="animate-rise w-full rounded-[6px] gradient-primary transition-[height] duration-700 ease-[var(--ease-out-soft)]"
                  style={riseStyle(i + 3, {
                    height: `${Math.max(4, day.intensity)}%`,
                    opacity: day.intensity === 0 ? 0.25 : 1,
                  })}
                />
              </div>
              <span className="truncate text-[9.5px] uppercase tracking-wide text-muted-foreground/70">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Aims + actions */}
      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        {goals.slice(0, 4).map((goal, i) => (
          <Link
            key={goal.id}
            to="/goals"
            className="animate-rise pressable inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.045] px-2.5 py-1 text-[11.5px] font-medium text-foreground/90"
            style={riseStyle(i)}
          >
            <span aria-hidden>{goal.emoji}</span>
            <span className="max-w-[9rem] truncate">{goal.title}</span>
          </Link>
        ))}
        {goals.length > 4 ? (
          <span className="text-[11.5px] text-muted-foreground">+{goals.length - 4} more</span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/goals"
            className="pressable glass inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Target className="h-3.5 w-3.5" strokeWidth={1.9} />
            Aims
          </Link>
          <Link
            to="/focus"
            className="pressable gradient-primary inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-semibold text-white shadow-[var(--shadow-glow)] transition-transform hover:brightness-110"
          >
            Start focus
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Link>
        </div>
      </div>

      {hydrated && habits.length === 0 ? (
        <p className="relative mt-3 text-[11.5px] text-muted-foreground">
          Nothing tracked yet — add a habit to light this panel up.{" "}
          <Link
            to="/habits"
            className="font-medium text-[color-mix(in_oklab,var(--primary-glow)_85%,white)] underline-offset-2 hover:underline"
          >
            Add a habit
          </Link>
        </p>
      ) : null}

      {/* Status line, tuned to how the day is actually going. */}
      <p className="relative mt-3 text-[11.5px] text-muted-foreground">
        {onTrack
          ? "You are on pace today. Keep the streak honest."
          : summary.habitsDone + summary.focusMinutes + summary.solvesToday === 0
            ? "Fresh day, clean slate. One habit is enough to start."
            : "Momentum is building — a short focus block would round today out."}
      </p>
    </section>
  );
}

/**
 * Stagger helper: writes the `--i` custom property consumed by `.animate-rise`
 * (the delays are declared in the stylesheet, not inline).
 */
function riseStyle(index: number, extra?: CSSProperties): CSSProperties {
  return { ...(extra ?? {}), "--i": index } as CSSProperties;
}

function Ring({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  return (
    <CircularProgress
      value={value}
      size={86}
      stroke={7}
      label={label}
      sublabel={sublabel}
      className="[--ring-glow:var(--glow)]"
    />
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  suffix = "",
  hint,
}: {
  icon: typeof Timer;
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="stat-tile animate-rise flex flex-col gap-1 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" strokeWidth={2} />
        {label}
      </span>
      <span className="text-[19px] font-semibold leading-none tracking-tight text-foreground">
        <CountUp value={value} duration={900} />
        {suffix ? <span className="text-[13px] text-muted-foreground">{suffix}</span> : null}
      </span>
      {hint ? (
        <span className="truncate text-[10.5px] text-muted-foreground/75">{hint}</span>
      ) : null}
    </div>
  );
}

/** Ticking clock, isolated so the rest of the hero never re-renders. */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return (
      <span className="text-[11.5px] font-medium text-muted-foreground">
        {new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "short",
        })}
      </span>
    );
  }

  const time = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <span className="flex items-center gap-2 text-[11.5px] font-medium text-muted-foreground">
      <span className="tabular-nums tracking-tight text-foreground/85">{time}</span>
      <span aria-hidden className="h-3 w-px bg-white/15" />
      <span>
        {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
      </span>
    </span>
  );
}

/** Seven tick marks showing how much of the week has already elapsed. */
function WeekRail({ pct, day }: { pct: number; day: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Day ${day} of 7 · ${pct}% of the week`}
    >
      <span className="hidden sm:inline">Week {pct}%</span>
      <span aria-hidden className="flex items-center gap-[3px]">
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-[3px] rounded-full",
              i < day ? "bg-[var(--primary)]" : "bg-white/15",
            )}
          />
        ))}
      </span>
    </span>
  );
}
