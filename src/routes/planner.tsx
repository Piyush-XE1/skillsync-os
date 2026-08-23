import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarClock } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { BottomSheet } from "@/components/edit/Sheet";
import { TextField, NO_AUTOFILL_PROPS } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { addDaysISO, todayISO, fromISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — SkillSync" },
      { name: "description", content: "Daily and weekly planner for focused work." },
      { property: "og:title", content: "Planner — SkillSync" },
      { property: "og:description", content: "Plan your week with intention." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlannerPage,
});

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function PlannerPage() {
  const hydrated = useHydrated();
  const planner = useAppStore((s) => s.planner);
  const addTask = useAppStore((s) => s.addPlannerTask);
  const updateTask = useAppStore((s) => s.updatePlannerTask);
  const deleteTask = useAppStore((s) => s.deletePlannerTask);

  const [selected, setSelected] = useState<string>(todayISO());
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  /** Re-entrancy guard: a double tap must never create two tasks. */
  const addGuard = useRef(false);

  const monday = useMemo(() => {
    const d = fromISO(selected);
    const day = d.getDay();
    const monIdx = (day + 6) % 7;
    return addDaysISO(selected, -monIdx);
  }, [selected]);

  const weekDates = useMemo(() => weekdays.map((_, i) => addDaysISO(monday, i)), [monday]);

  const tasksForSelected = useMemo(
    () => planner.filter((t) => t.date === selected).sort((a, b) => a.time.localeCompare(b.time)),
    [planner, selected],
  );

  const upcoming = useMemo(() => {
    const now = todayISO();
    return planner
      .filter((t) => t.date > now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [planner]);

  const weekCounts = useMemo(
    () => weekDates.map((d) => planner.filter((t) => t.date === d).length),
    [weekDates, planner],
  );
  const maxCount = Math.max(1, ...weekCounts);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Planner"
        title="This week."
        subtitle="Design your days with intention."
        right={
          <div className="glass flex items-center rounded-full">
            <button
              onClick={() => setSelected(addDaysISO(selected, -7))}
              className="flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setSelected(addDaysISO(selected, 7))}
              className="flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
              aria-label="Next week"
            >
              <ChevronRight
                className="h-[17px] w-[17px] text-muted-foreground"
                strokeWidth={1.75}
              />
            </button>
          </div>
        }
      />

      <div className="space-y-6 px-5 lg:px-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-[13px] font-medium">
              {fromISO(selected).toLocaleString(undefined, { month: "long", year: "numeric" })}
            </span>
            <Chip tone="primary">
              {fromISO(selected).toLocaleDateString(undefined, { weekday: "long" })}
            </Chip>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((iso, i) => {
              const d = fromISO(iso);
              const isSel = iso === selected;
              const isToday = iso === todayISO();
              return (
                <button
                  key={iso}
                  onClick={() => {
                    haptics.selection();
                    setSelected(iso);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border py-2.5 transition-all active:scale-[0.96]",
                    isSel
                      ? "border-transparent gradient-primary text-white shadow-[var(--shadow-glow)]"
                      : "border-white/[0.05] bg-white/[0.02] text-muted-foreground",
                  )}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider">
                    {weekdays[i]}
                  </span>
                  <span
                    className={cn(
                      "text-[15px] font-semibold tracking-tight",
                      isSel ? "text-white" : isToday ? "text-foreground" : "text-foreground/70",
                    )}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <section className="space-y-3">
          <SectionHeader
            title={
              selected === todayISO()
                ? "Today"
                : fromISO(selected).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })
            }
            action={
              <button
                onClick={() => {
                  addGuard.current = false;
                  setOpen(true);
                }}
                className="inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            }
          />
          {hydrated && tasksForSelected.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing scheduled"
              hint="Add a task to make the day intentional."
            />
          ) : (
            <Card>
              <div className="space-y-3">
                {tasksForSelected.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (t.done) haptics.tap();
                        else haptics.success();
                        updateTask(t.id, { done: !t.done });
                      }}
                      className={cn(
                        "h-4 w-4 rounded-full border transition-colors",
                        t.done ? "border-transparent gradient-primary" : "border-white/15",
                      )}
                      aria-label="Toggle"
                    />
                    <input
                      {...NO_AUTOFILL_PROPS}
                      value={t.title}
                      onChange={(e) => updateTask(t.id, { title: e.target.value })}
                      className={cn(
                        "flex-1 bg-transparent text-[13.5px] outline-none",
                        t.done ? "text-muted-foreground line-through" : "",
                      )}
                    />
                    {t.time ? <Chip>{t.time}</Chip> : null}
                    <IconButton
                      size="sm"
                      variant="danger"
                      aria-label="Delete"
                      onClick={() => deleteTask(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader title="Upcoming" />
          {hydrated && upcoming.length === 0 ? (
            <EmptyState title="Nothing upcoming" />
          ) : (
            <Card>
              <div className="divide-y divide-white/[0.05]">
                {upcoming.map((t) => {
                  const d = fromISO(t.date);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelected(t.date)}
                      className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"
                    >
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-white/[0.03]">
                        <span className="text-[9px] font-medium uppercase text-muted-foreground">
                          {d.toLocaleString(undefined, { month: "short" })}
                        </span>
                        <span className="text-[14px] font-semibold">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{t.title}</div>
                        <div className="text-[11.5px] text-muted-foreground">
                          {t.time || "All day"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader title="Weekly Overview" />
          <Card>
            <div className="grid grid-cols-7 items-end gap-2 pt-2">
              {weekDates.map((iso, i) => {
                const h = 20 + (weekCounts[i] / maxCount) * 60;
                return (
                  <div key={iso} className="flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-[var(--primary)]/40 to-[var(--primary)]/70"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{weekdays[i][0]}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="New task">
        <div className="space-y-3">
          <TextField
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to happen?"
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField type="date" value={selected} onChange={(e) => setSelected(e.target.value)} />
            <TextField type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <ActionButton
            className="w-full"
            onClick={() => {
              if (!title.trim() || addGuard.current) return;
              addGuard.current = true;
              addTask({ title: title.trim(), date: selected, time });
              haptics.success();
              setTitle("");
              setTime("");
              setOpen(false);
            }}
          >
            Add task
          </ActionButton>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
