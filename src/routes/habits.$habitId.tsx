import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Trash2, Flame, Trophy, Percent, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { todayISO, addDaysISO, fromISO } from "@/lib/date";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/habits/$habitId")({
  head: () => ({
    meta: [
      { title: "Habit — SkillSync" },
      { name: "description", content: "Habit details, streaks and history." },
      { property: "og:title", content: "Habit — SkillSync" },
      { property: "og:description", content: "Habit details, streaks and history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HabitDetail,
});

function HabitDetail() {
  const { habitId } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useHydrated();

  const habit = useAppStore((s) => s.habits.find((h) => h.id === habitId));
  const habitLogs = useAppStore((s) => s.habitLogs);
  const startISO = habit?.startDate ?? (habit ? todayISO(new Date(habit.createdAt)) : todayISO());
  const logs = useMemo(
    () => habitLogs.filter((l) => l.habitId === habitId && l.date >= startISO),
    [habitLogs, habitId, startISO],
  );
  const renameHabit = useAppStore((s) => s.renameHabit);
  const updateHabit = useAppStore((s) => s.updateHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);
  const toggleHabitToday = useAppStore((s) => s.toggleHabitToday);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [startInput, setStartInput] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);

  const doneSet = useMemo(() => new Set(logs.map((l) => l.date)), [logs]);
  const today = todayISO();

  const currentStreak = useMemo(() => {
    let s = 0;
    for (let i = 0; ; i++) {
      if (doneSet.has(addDaysISO(today, -i))) s++;
      else break;
    }
    return s;
  }, [doneSet, today]);

  const bestStreak = useMemo(() => {
    if (logs.length === 0) return 0;
    const sorted = [...logs].map((l) => l.date).sort();
    let best = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === addDaysISO(sorted[i - 1], 1)) {
        run++;
        best = Math.max(best, run);
      } else {
        run = 1;
      }
    }
    return best;
  }, [logs]);

  const last30 = useMemo(() => {
    let hits = 0;
    for (let i = 0; i < 30; i++) {
      if (doneSet.has(addDaysISO(today, -i))) hits++;
    }
    return hits;
  }, [doneSet, today]);

  const last7Hits = useMemo(() => {
    let hits = 0;
    for (let i = 0; i < 7; i++) {
      if (doneSet.has(addDaysISO(today, -i))) hits++;
    }
    return hits;
  }, [doneSet, today]);

  const overallPct = useMemo(() => {
    if (!habit) return 0;
    const start = new Date(startISO);
    const now = new Date();
    const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) return 0;
    return Math.round((logs.length / days) * 100);
  }, [habit, logs, startISO]);

  const calendarCells = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { iso: string | null; day: number | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ iso, day: d });
    }
    return { cells, label: base.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  }, [monthOffset]);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="px-5 lg:px-2 pt-4 text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }
  if (!habit) {
    return (
      <AppShell>
        <div className="px-5 lg:px-2 pt-4">
          <Link to="/habits" className="text-muted-foreground">
            ← Back
          </Link>
          <div className="mt-6">
            <EmptyState title="Habit not found" hint="It may have been deleted." />
          </div>
        </div>
      </AppShell>
    );
  }

  const doneToday = doneSet.has(today);

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/habits"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-2">
          <IconButton
            aria-label="Edit"
            onClick={() => {
              setTitle(habit.title);
              setEmoji(habit.emoji);
              setStartInput(startISO);
              setEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton aria-label="Delete" variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      <div className="mb-6 px-5 lg:px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-[26px]">
            {habit.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.02em]">
              {habit.title}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Flame className="h-3 w-3" /> {currentStreak} day streak · Best {bestStreak}
            </div>
          </div>
        </div>

        <button
          onClick={() => toggleHabitToday(habit.id)}
          className={cn(
            "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-medium transition-all active:scale-[0.98]",
            doneToday
              ? "gradient-primary text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.6)]"
              : "border border-white/[0.08] bg-white/[0.02] text-foreground",
          )}
        >
          <Check className="h-4 w-4" />
          {doneToday ? "Done today" : "Mark today done"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 px-5 lg:px-2">
        <StatCard icon={Flame} label="Current" value={String(currentStreak)} />
        <StatCard icon={Trophy} label="Best" value={String(bestStreak)} />
        <StatCard icon={Percent} label="30-day" value={`${Math.round((last30 / 30) * 100)}%`} />
      </div>

      <section className="mt-6 space-y-3 px-5 lg:px-2">
        <SectionHeader title="This week" />
        <Card>
          <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>{last7Hits} of 7 days</span>
            <span>{Math.round((last7Hits / 7) * 100)}%</span>
          </div>
          <ProgressBar value={(last7Hits / 7) * 100} tone="gradient" />
        </Card>
      </section>

      <section className="mt-6 space-y-3 px-5 lg:px-2">
        <SectionHeader title="This month" />
        <Card>
          <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>{last30} of 30 days</span>
            <span>{Math.round((last30 / 30) * 100)}%</span>
          </div>
          <ProgressBar value={(last30 / 30) * 100} tone="gradient" />
        </Card>
      </section>

      <section className="mt-6 space-y-3 px-5 lg:px-2">
        <SectionHeader title="Overall" />
        <Card>
          <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>Success rate since start</span>
            <span>{overallPct}%</span>
          </div>
          <ProgressBar value={overallPct} tone="gradient" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip>{logs.length} check-ins</Chip>
            <Chip>
              Since{" "}
              {fromISO(startISO).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Chip>
          </div>
        </Card>
      </section>

      <section className="mt-6 space-y-3 px-5 lg:px-2">
        <SectionHeader
          title="Calendar"
          action={
            <span className="inline-flex items-center gap-2">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="rounded-md px-2 py-0.5 hover:text-foreground"
              >
                ‹
              </button>
              <span>{calendarCells.label}</span>
              <button
                onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
                className="rounded-md px-2 py-0.5 hover:text-foreground disabled:opacity-30"
                disabled={monthOffset === 0}
              >
                ›
              </button>
            </span>
          }
        />
        <Card>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.cells.map((c, i) => {
              if (!c.iso) return <div key={i} className="h-8" />;
              const done = doneSet.has(c.iso);
              const isToday = c.iso === today;
              return (
                <button
                  key={i}
                  onClick={() => toggleHabitToday(habit.id, c.iso!)}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-lg border text-[11px] font-medium transition-all active:scale-95",
                    done
                      ? "border-transparent gradient-primary text-white"
                      : "border-white/[0.05] bg-white/[0.02] text-muted-foreground",
                    isToday && !done ? "border-white/25" : "",
                  )}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
        </Card>
      </section>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit habit">
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
              className="flex-1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[12px] text-muted-foreground">Start date</label>
            <TextField
              type="date"
              value={startInput}
              max={today}
              onChange={(e) => setStartInput(e.target.value)}
            />
            <p className="text-[11.5px] text-muted-foreground/80">
              Stats and calendar are calculated from this date. Check-ins before this date are
              preserved but ignored in totals.
            </p>
          </div>
          <ActionButton
            className="w-full"
            onClick={() => {
              if (!title.trim()) return;
              renameHabit(habit.id, title.trim());
              const nextStart = startInput && startInput <= today ? startInput : startISO;
              updateHabit(habit.id, {
                emoji: emoji || "✨",
                startDate: nextStart,
              });
              setEditOpen(false);
            }}
          >
            Save changes
          </ActionButton>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete habit?"
        description="All check-ins for this habit will be removed."
        onConfirm={() => {
          deleteHabit(habit.id);
          navigate({ to: "/habits" });
        }}
      />
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-[20px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}
