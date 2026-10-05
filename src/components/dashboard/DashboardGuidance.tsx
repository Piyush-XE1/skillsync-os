import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing, Sparkles } from "lucide-react";
import { todayISO } from "@/lib/date";
import { firstRecoveryHabit } from "@/lib/habit-streaks";
import { useAppStore } from "@/store/useAppStore";
import { useUiStore } from "@/store/useUiStore";
import { cn } from "@/lib/utils";

/** Gentle, local habit guidance; never treats a missed day as a failure. */
export function DashboardGuidance() {
  const modules = useAppStore((state) => state.preferences.modules);
  const habits = useAppStore((state) => state.habits);
  const habitLogs = useAppStore((state) => state.habitLogs);
  const openQuickCapture = useUiStore((state) => state.openQuickCapture);
  const [now, setNow] = useState(() => new Date());
  const today = todayISO(now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const recoveryHabit = useMemo(
    () => (modules.habits ? firstRecoveryHabit(habits, habitLogs, today) : null),
    [habits, habitLogs, modules.habits, today],
  );
  const incompleteHabits = useMemo(() => {
    if (!modules.habits) return [];
    const completed = new Set(
      habitLogs.filter((log) => log.date === today).map((log) => log.habitId),
    );
    return habits.filter((habit) => !completed.has(habit.id));
  }, [habits, habitLogs, modules.habits, today]);
  const protectStreak = modules.habits && now.getHours() >= 20 && incompleteHabits.length > 0;

  if (!recoveryHabit && !protectStreak) return null;

  return (
    <section className="mb-5 space-y-2.5" aria-label="Today's guidance">
      {recoveryHabit ? (
        <button
          type="button"
          onClick={() => openQuickCapture("habit")}
          className={cn(
            "pressable flex w-full items-center gap-3 rounded-[17px] border border-[color-mix(in_oklab,var(--primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--primary)_7%,var(--surface))] px-3.5 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--primary)_11%,var(--surface))] active:scale-[0.99]",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--primary-glow)]" strokeWidth={1.9} />
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold">
              A tiny restart for {recoveryHabit.title}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              Two missed days are not a reset. Try the smallest version today — even two minutes
              counts.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--primary-glow)]" />
        </button>
      ) : null}

      {protectStreak ? (
        <button
          type="button"
          onClick={() => openQuickCapture("habit")}
          className="pressable flex w-full items-center gap-3 rounded-[17px] border border-[color-mix(in_oklab,var(--primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--primary)_7%,var(--surface))] px-3.5 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--primary)_11%,var(--surface))] active:scale-[0.99]"
        >
          <BellRing className="h-4 w-4 shrink-0 text-[var(--primary-glow)]" strokeWidth={1.9} />
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold">Protect your streak</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              {incompleteHabits.length} habit{incompleteHabits.length === 1 ? "" : "s"} still need a
              check-in. One small win keeps the chain alive.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--primary-glow)]" />
        </button>
      ) : null}
    </section>
  );
}
