import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Flame, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { BottomSheet } from "@/components/edit/Sheet";
import { TextField } from "@/components/edit/Fields";
import { ActionButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { todayISO, addDaysISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { fireConfetti } from "@/lib/confetti";

export const Route = createFileRoute("/habits/")({
  head: () => ({
    meta: [
      { title: "Habits — SkillSync" },
      { name: "description", content: "Daily habit tracking. Small steps compound." },
      { property: "og:title", content: "Habits — SkillSync" },
      { property: "og:description", content: "Small steps compound daily." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HabitsPage,
});

function HabitsPage() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const habits = useAppStore((s) => s.habits);
  const habitLogs = useAppStore((s) => s.habitLogs);
  const addHabit = useAppStore((s) => s.addHabit);
  const toggleHabitToday = useAppStore((s) => s.toggleHabitToday);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✨");
  /** Re-entrancy guard: a double tap must never create two habits. */
  const addGuard = useRef(false);
  useEffect(() => {
    if (open) addGuard.current = false;
  }, [open]);

  const today = todayISO();
  const last7 = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDaysISO(today, -6 + i)),
    [today],
  );

  const streakFor = (habitId: string) => {
    let streak = 0;
    for (let i = 0; ; i++) {
      const d = addDaysISO(today, -i);
      const hit = habitLogs.some((l) => l.habitId === habitId && l.date === d);
      if (hit) streak++;
      else break;
    }
    return streak;
  };

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <PrimaryAction label="Add Habit" onClick={() => setOpen(true)} />
      </header>

      <div className="mb-6 px-5 lg:px-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Operation Rebirth
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Habits.
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Tap a habit to view stats. Tap the emoji to check in.
        </p>
      </div>

      <div className="auto-grid px-5 lg:px-2">
        {hydrated && habits.length === 0 ? (
          <EmptyState
            title="No habits yet"
            hint="Add habits like Sleep, Reading, Workout."
            action={
              <ActionButton onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> Add habit
              </ActionButton>
            }
          />
        ) : null}
        {hydrated &&
          habits.map((h) => {
            const doneToday = habitLogs.some((l) => l.habitId === h.id && l.date === today);
            const streak = streakFor(h.id);
            return (
              <Card
                key={h.id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${h.title} details`}
                onClick={() =>
                  navigate({
                    to: "/habits/$habitId",
                    params: { habitId: h.id },
                  })
                }
                onKeyDown={(e) => {
                  // Ignore keys bubbling from the nested check-in button —
                  // otherwise Enter on it toggles AND navigates.
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({
                      to: "/habits/$habitId",
                      params: { habitId: h.id },
                    });
                  }
                }}
                className="cursor-pointer p-4"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (doneToday) {
                        haptics.tap();
                        sound.tap();
                      } else if ((streak + 1) % 7 === 0) {
                        // Weekly streak milestone earns a richer confirmation.
                        haptics.milestone();
                        sound.streak();
                        fireConfetti({ count: 70, origin: { x: 0.5, y: 0.6 }, ttl: 1.5 });
                      } else {
                        haptics.success();
                        sound.complete();
                      }
                      toggleHabitToday(h.id);
                    }}
                    aria-label="Toggle today"
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl text-[18px] transition-all active:scale-95",
                      doneToday
                        ? "gradient-primary shadow-[var(--shadow-glow)]"
                        : "bg-white/[0.04]",
                    )}
                  >
                    <span>{h.emoji}</span>
                  </button>
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-semibold tracking-tight">
                        {h.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted-foreground">
                        <Flame className="h-3 w-3" /> {streak} day streak
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                </div>

                <div className="mt-4 flex justify-between gap-1.5">
                  {last7.map((iso) => {
                    const done = habitLogs.some((l) => l.habitId === h.id && l.date === iso);
                    const isToday = iso === today;
                    return (
                      <div
                        key={iso}
                        className={cn(
                          "flex h-8 flex-1 items-center justify-center rounded-lg border text-[10px] font-medium",
                          done
                            ? "border-transparent gradient-primary text-white"
                            : "border-white/[0.06] bg-white/[0.02] text-muted-foreground",
                          isToday && !done ? "border-white/20" : "",
                        )}
                      >
                        {new Date(iso).getDate()}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="New habit">
        <div className="space-y-3">
          <div className="flex gap-2">
            <TextField
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-16 text-center text-[20px]"
              maxLength={2}
            />
            <TextField
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Habit name"
              className="flex-1"
            />
          </div>
          <ActionButton
            className="w-full"
            onClick={() => {
              if (!title.trim() || addGuard.current) return;
              addGuard.current = true;
              addHabit(title.trim(), emoji || "✨");
              haptics.success();
              sound.success();
              setTitle("");
              setEmoji("✨");
              setOpen(false);
            }}
          >
            Add habit
          </ActionButton>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
