import { useEffect, useState, type ComponentType } from "react";
import {
  BookOpen,
  Brain,
  ChevronRight,
  Circle,
  Dumbbell,
  History,
  Moon,
  Pause,
  PenLine,
  Play,
  Plus,
  Square,
  Timer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { TextArea, TextField } from "@/components/edit/Fields";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { EditorialSectionHeader } from "./EditorialSectionHeader";
import { haptics } from "@/lib/haptics";
import type { Stopwatch, StopwatchRun } from "@/lib/schema";
import { elapsedStopwatchMs, formatCompactDuration, stopwatchParts } from "@/lib/stopwatch";
import { useAppStore } from "@/store/useAppStore";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const TIMER_ICONS: Array<{ id: string; label: string; icon: IconType }> = [
  { id: "Timer", label: "Timer", icon: Timer },
  { id: "BookOpen", label: "Reading", icon: BookOpen },
  { id: "Brain", label: "Study", icon: Brain },
  { id: "Dumbbell", label: "Practice", icon: Dumbbell },
  { id: "Moon", label: "Screen-free", icon: Moon },
  { id: "Circle", label: "Simple", icon: Circle },
];

function iconFor(id: string): IconType {
  return TIMER_ICONS.find((item) => item.id === id)?.icon ?? Timer;
}

type TimerDraft = { id: string | null; title: string; icon: string };

export function UniversalStopwatchModule() {
  const enabled = useAppStore((state) => state.stopwatchEnabled);
  const stopwatches = useAppStore((state) => state.stopwatches);
  const setEnabled = useAppStore((state) => state.setStopwatchEnabled);
  const addStopwatch = useAppStore((state) => state.addStopwatch);
  const updateStopwatch = useAppStore((state) => state.updateStopwatch);
  const deleteStopwatch = useAppStore((state) => state.deleteStopwatch);
  const startStopwatch = useAppStore((state) => state.startStopwatch);
  const pauseStopwatch = useAppStore((state) => state.pauseStopwatch);
  const finishStopwatch = useAppStore((state) => state.finishStopwatch);

  const [draft, setDraft] = useState<TimerDraft | null>(null);
  const [finishTarget, setFinishTarget] = useState<Stopwatch | null>(null);
  const [finishNote, setFinishNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Stopwatch | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const historyTimer = stopwatches.find((timer) => timer.id === historyId) ?? null;

  const saveTimer = () => {
    if (!draft?.title.trim()) {
      toast.error("Give this chronometer a title.");
      return;
    }
    if (draft.id) updateStopwatch(draft.id, { title: draft.title, icon: draft.icon });
    else addStopwatch({ title: draft.title, icon: draft.icon });
    toast.success(draft.id ? "Chronometer updated" : "Chronometer added");
    setDraft(null);
  };

  return (
    <section aria-labelledby="chronometers-heading" className="px-5 py-16 lg:px-2 lg:py-24">
      <EditorialSectionHeader
        index="04 / 04"
        title="Chronometers"
        subtitle="Time the practice. Keep the history."
        meta={
          enabled
            ? `${stopwatches.length} independent timer${stopwatches.length === 1 ? "" : "s"}`
            : "Optional module"
        }
        action={
          enabled ? (
            <div className="flex items-center gap-2">
              <ActionButton
                size="sm"
                variant="outline"
                onClick={() => setDraft({ id: null, title: "", icon: "Timer" })}
              >
                <Plus className="h-4 w-4" /> New timer
              </ActionButton>
              <button
                type="button"
                onClick={() => {
                  setEnabled(false);
                  toast.message("Chronometers hidden", {
                    description: "Your timers and history remain intact.",
                  });
                }}
                className="min-h-9 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground"
              >
                Hide
              </button>
            </div>
          ) : undefined
        }
      />
      <h2 id="chronometers-heading" className="sr-only">
        Universal stopwatches and run history
      </h2>

      {!enabled ? (
        <div className="border-y border-border py-10 sm:grid sm:grid-cols-[minmax(0,1fr)_20rem] sm:gap-12 sm:py-14">
          <p className="font-editorial max-w-2xl text-[clamp(2rem,4vw,3.7rem)] leading-[1.02] tracking-[-0.03em]">
            A clock for work that matters on its own terms.
          </p>
          <div className="mt-7 sm:mt-0">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Add independent timers for deep work, reading, study, or any practice. Timestamps keep
              them accurate through sleep, refresh, and restarts.
            </p>
            <ActionButton
              size="sm"
              className="mt-6"
              onClick={() => {
                setEnabled(true);
                if (stopwatches.length === 0) setDraft({ id: null, title: "", icon: "Timer" });
              }}
            >
              Enable chronometers
            </ActionButton>
          </div>
        </div>
      ) : stopwatches.length === 0 ? (
        <div className="border-y border-border py-12 text-center">
          <Timer className="mx-auto h-6 w-6 text-primary" strokeWidth={1.4} />
          <p className="font-editorial mt-5 text-3xl">No clocks are running yet.</p>
          <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
            Name the practice first. The clock exists to witness it, not judge it.
          </p>
          <ActionButton
            size="sm"
            variant="outline"
            className="mt-6"
            onClick={() => setDraft({ id: null, title: "", icon: "Timer" })}
          >
            <Plus className="h-4 w-4" /> Add first timer
          </ActionButton>
        </div>
      ) : (
        <div className="space-y-8">
          {stopwatches.map((timer, index) => {
            const TimerIcon = iconFor(timer.icon);
            return (
              <article key={timer.id} className="border border-border bg-surface p-4 sm:p-6 lg:p-8">
                <header className="mb-6 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border text-primary">
                      <TimerIcon className="h-4.5 w-4.5" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-editorial truncate text-2xl leading-none sm:text-3xl">
                          {timer.title}
                        </h3>
                        {timer.status === "running" ? (
                          <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-primary">
                            <span className="animate-breathe h-1.5 w-1.5 rounded-full bg-primary" />{" "}
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Clock {String(index + 1).padStart(2, "0")} · {timer.history.length}{" "}
                        completed run{timer.history.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      size="sm"
                      aria-label={`Edit ${timer.title}`}
                      onClick={() =>
                        setDraft({ id: timer.id, title: timer.title, icon: timer.icon })
                      }
                    >
                      <PenLine className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="danger"
                      aria-label={`Delete ${timer.title}`}
                      onClick={() => setDeleteTarget(timer)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </header>

                <StopwatchClock timer={timer} />

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-5">
                  {timer.status === "running" ? (
                    <ActionButton
                      size="sm"
                      variant="outline"
                      onClick={() => pauseStopwatch(timer.id)}
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </ActionButton>
                  ) : (
                    <ActionButton
                      size="sm"
                      onClick={() => {
                        haptics.success();
                        startStopwatch(timer.id);
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />{" "}
                      {timer.status === "paused" ? "Resume" : "Start"}
                    </ActionButton>
                  )}

                  {timer.status !== "idle" ? (
                    <ActionButton
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFinishTarget(timer);
                        setFinishNote("");
                      }}
                    >
                      <Square className="h-3.5 w-3.5" /> Finish run
                    </ActionButton>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setHistoryId(timer.id)}
                    className="ml-auto inline-flex min-h-9 items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground"
                  >
                    <History className="h-3.5 w-3.5" /> History
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {draft ? <TimerEditor draft={draft} setDraft={setDraft} onSave={saveTimer} /> : null}

      <BottomSheet
        open={Boolean(finishTarget)}
        onClose={() => setFinishTarget(null)}
        title="Finish this run?"
        description="The exact elapsed time will be written to history, then the active clock will return to zero. Pausing alone never ends a run."
        footer={
          <div className="flex gap-2">
            <ActionButton
              variant="outline"
              className="flex-1"
              onClick={() => setFinishTarget(null)}
            >
              Keep timing
            </ActionButton>
            <ActionButton
              className="flex-1"
              onClick={() => {
                if (finishTarget) finishStopwatch(finishTarget.id, finishNote);
                setFinishTarget(null);
                setFinishNote("");
                toast.success("Run saved to history");
              }}
            >
              Finish & save
            </ActionButton>
          </div>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
            Run note · optional
          </span>
          <TextArea
            rows={5}
            maxLength={1200}
            value={finishNote}
            onChange={(event) => setFinishNote(event.target.value)}
            placeholder="What did this time hold?"
          />
        </label>
      </BottomSheet>

      <HistorySheet timer={historyTimer} onClose={() => setHistoryId(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteStopwatch(deleteTarget.id);
          toast.success("Chronometer deleted");
        }}
        title="Delete this chronometer?"
        description="The timer configuration and every completed run in its history will be removed. Other chronometers are untouched."
        confirmLabel="Delete timer"
      />
    </section>
  );
}

function StopwatchClock({ timer }: { timer: Stopwatch }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.status !== "running") {
      setNow(Date.now());
      return;
    }
    let interval = 0;
    const tick = () => setNow(Date.now());
    const start = () => {
      window.clearInterval(interval);
      tick();
      if (!document.hidden) interval = window.setInterval(tick, 1_000);
    };
    const onVisibility = () => start();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [timer.status, timer.startedAt]);

  const parts = stopwatchParts(elapsedStopwatchMs(timer, now));
  const values: Array<[string, number]> = [
    ["Days", parts.days],
    ["Hours", parts.hours],
    ["Minutes", parts.minutes],
    ["Seconds", parts.seconds],
  ];

  return (
    <div className="stopwatch-clock" role="timer" aria-label={`${timer.title} elapsed time`}>
      {values.map(([label, value]) => (
        <div key={label}>
          <div className="font-numerical text-[clamp(1.8rem,5vw,4.5rem)] leading-none tracking-[-0.06em]">
            {String(value).padStart(2, "0")}
          </div>
          <div className="mt-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimerEditor({
  draft,
  setDraft,
  onSave,
}: {
  draft: TimerDraft;
  setDraft: (draft: TimerDraft | null) => void;
  onSave: () => void;
}) {
  return (
    <BottomSheet
      open
      onClose={() => setDraft(null)}
      title={draft.id ? "Edit chronometer" : "New chronometer"}
      description="Choose a name that describes the practice, not a score to chase."
      footer={
        <div className="flex gap-2">
          <ActionButton variant="outline" className="flex-1" onClick={() => setDraft(null)}>
            Cancel
          </ActionButton>
          <ActionButton className="flex-1" onClick={onSave}>
            Save timer
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
            Purpose
          </span>
          <TextField
            autoFocus
            maxLength={100}
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="Deep Work"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
            Mark
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {TIMER_ICONS.map((item) => {
              const Icon = item.icon;
              const active = draft.icon === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDraft({ ...draft, icon: item.id })}
                  className={
                    "flex min-h-16 flex-col items-center justify-center gap-1.5 border text-[9px] uppercase tracking-[0.1em] " +
                    (active
                      ? "border-primary bg-primary/[0.06] text-foreground"
                      : "border-border text-muted-foreground")
                  }
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} /> {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
    </BottomSheet>
  );
}

function HistorySheet({ timer, onClose }: { timer: Stopwatch | null; onClose: () => void }) {
  return (
    <BottomSheet
      open={Boolean(timer)}
      onClose={onClose}
      title={timer ? `${timer.title} · history` : "Run history"}
      description="Completed runs are newest first. Notes can be revised without changing recorded time."
    >
      {timer?.history.length ? (
        <div className="divide-y divide-border border-y border-border">
          {timer.history.map((run, index) => (
            <RunHistoryRow key={run.id} timerId={timer.id} run={run} index={index} />
          ))}
        </div>
      ) : (
        <div className="border-l border-primary/50 py-4 pl-5">
          <p className="font-editorial text-2xl">No completed runs yet.</p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Pause when you need to. Use Finish run only when this chapter of work is complete.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}

function RunHistoryRow({
  timerId,
  run,
  index,
}: {
  timerId: string;
  run: StopwatchRun;
  index: number;
}) {
  const updateNote = useAppStore((state) => state.updateStopwatchRunNote);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(run.note);

  useEffect(() => setNote(run.note), [run.note]);

  return (
    <article className="py-5">
      <div className="flex items-start gap-4">
        <span className="font-numerical mt-1 text-[9px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-numerical text-xl text-foreground">
            {formatCompactDuration(run.durationMs)}
          </div>
          <time className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {new Date(run.endedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          {editing ? (
            <div className="mt-3">
              <TextArea
                rows={4}
                maxLength={1200}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a private note…"
              />
              <div className="mt-2 flex gap-2">
                <ActionButton
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNote(run.note);
                    setEditing(false);
                  }}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  size="sm"
                  onClick={() => {
                    updateNote(timerId, run.id, note);
                    setEditing(false);
                    toast.success("Run note saved");
                  }}
                >
                  Save note
                </ActionButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-3 block min-h-8 text-left text-[12px] leading-relaxed text-muted-foreground hover:text-foreground"
            >
              {run.note || "Add a note to this run"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
