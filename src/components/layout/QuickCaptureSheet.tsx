import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookText, Check, CircleDollarSign, Flame, StickyNote } from "lucide-react";
import { BottomSheet } from "@/components/edit/Sheet";
import { useAppStore } from "@/store/useAppStore";
import { useUiStore, type QuickCaptureAction } from "@/store/useUiStore";
import { todayISO } from "@/lib/date";
import type { ModuleKey } from "@/lib/schema";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Food", "Transit", "Study"] as const;
type ExpenseCategory = (typeof CATEGORIES)[number];

const CAPTURE_ACTIONS: {
  id: QuickCaptureAction;
  title: string;
  hint: string;
  module: ModuleKey;
  icon: typeof CircleDollarSign;
}[] = [
  {
    id: "expense",
    title: "Quick expense",
    hint: "Log a spend",
    module: "expenses",
    icon: CircleDollarSign,
  },
  {
    id: "habit",
    title: "Habit tick",
    hint: "Protect today's streak",
    module: "habits",
    icon: Flame,
  },
  {
    id: "note",
    title: "Quick note",
    hint: "Save to your inbox",
    module: "notes",
    icon: StickyNote,
  },
];

function captureTitle(action: QuickCaptureAction | null) {
  if (action === "expense") return "Quick expense";
  if (action === "habit") return "Habit tick";
  if (action === "note") return "Quick note";
  return "Quick capture";
}

/** One-tap local logging for three everyday micro-actions. */
export function QuickCaptureSheet() {
  const open = useUiStore((state) => state.quickCaptureOpen);
  const action = useUiStore((state) => state.quickCaptureAction);
  const setAction = useUiStore((state) => state.openQuickCapture);
  const closeStore = useUiStore((state) => state.closeQuickCapture);

  const habits = useAppStore((state) => state.habits);
  const modules = useAppStore((state) => state.preferences.modules);
  const availableActions = CAPTURE_ACTIONS.filter(({ module }) => modules[module]);
  const habitLogs = useAppStore((state) => state.habitLogs);
  const addTransaction = useAppStore((state) => state.addTransaction);
  const toggleHabitToday = useAppStore((state) => state.toggleHabitToday);
  const addNote = useAppStore((state) => state.addNote);
  const updateNote = useAppStore((state) => state.updateNote);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [noteDraft, setNoteDraft] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const draftId = useRef<string | null>(null);
  const today = todayISO();

  const doneToday = useMemo(
    () => new Set(habitLogs.filter((log) => log.date === today).map((log) => log.habitId)),
    [habitLogs, today],
  );
  const incompleteHabits = habits.filter((habit) => !doneToday.has(habit.id));
  const selectedModule = action
    ? CAPTURE_ACTIONS.find((candidate) => candidate.id === action)?.module
    : undefined;

  useEffect(() => {
    if (open && selectedModule && !modules[selectedModule]) setAction();
  }, [open, selectedModule, modules, setAction]);

  const persistNoteDraft = (body: string) => {
    if (!body.trim()) return;
    const firstLine = body.trim().split(/\r?\n/, 1)[0]?.slice(0, 64) || "Quick note";
    const title = `Inbox · ${firstLine}`;
    const patch = { title, body, tags: ["Inbox", "Quick capture"] };
    if (draftId.current) {
      updateNote(draftId.current, patch);
    } else {
      draftId.current = addNote(patch).id;
    }
  };

  useEffect(() => {
    if (!open || action !== "note" || !noteDraft.trim()) return;
    const timer = window.setTimeout(() => persistNoteDraft(noteDraft), 180);
    return () => window.clearTimeout(timer);
    // `persistNoteDraft` deliberately reads the stable store actions and draft ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, action, noteDraft]);

  useEffect(() => {
    if (!open || (action !== "expense" && action !== "note")) return;
    const frame = requestAnimationFrame(() => {
      if (action === "expense") amountRef.current?.focus({ preventScroll: true });
      if (action === "note") noteRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, action]);

  const close = () => {
    if (action === "note") persistNoteDraft(noteDraft);
    setAmount("");
    setCategory("Food");
    setNoteDraft("");
    draftId.current = null;
    closeStore();
  };

  const chooseAction = (next: QuickCaptureAction) => {
    haptics.selection();
    sound.select();
    setAction(next);
  };

  const saveExpense = () => {
    const value = Number(amount.replace(/,/g, "."));
    if (!Number.isFinite(value) || value <= 0) {
      haptics.error();
      sound.error();
      return;
    }
    addTransaction({
      title: category,
      amount: value,
      type: "debit",
      tags: [category],
      at: Date.now(),
    });
    haptics.success();
    sound.coin();
    close();
  };

  const markHabit = (habitId: string) => {
    toggleHabitToday(habitId, today);
    haptics.success();
    sound.complete();
    close();
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title={captureTitle(action)}
      description={
        action ? "Quick logs save on this device, instantly." : "Choose one small thing to log."
      }
      className="border-t border-[var(--border-strong)]"
    >
      {action === null ? (
        <div className="space-y-4 pb-2">
          {availableActions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {availableActions.map(({ id, title, hint, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => chooseAction(id)}
                  className="pressable card-surface flex min-h-[112px] flex-col items-start justify-between rounded-[18px] p-3.5 text-left transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,transparent)] active:scale-[0.98]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary-glow)]">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="mt-3">
                    <span className="block text-[12.5px] font-semibold leading-tight">{title}</span>
                    <span className="mt-1 block text-[10.5px] text-muted-foreground">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-border px-4 py-6 text-center">
              <p className="text-[13px] font-medium">No quick actions enabled</p>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                Turn on modules in Profile → Modules to add shortcuts here.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 border-t border-border pt-3 text-[10.5px] text-muted-foreground">
            <BookText className="h-3.5 w-3.5 shrink-0 text-[var(--primary-glow)]" />
            <span>Private, offline, and saved as you go.</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pb-2">
          <button
            type="button"
            onClick={() => {
              if (action === "note") persistNoteDraft(noteDraft);
              setAction();
            }}
            className="pressable inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All quick actions
          </button>

          {action === "expense" ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                    className={cn(
                      "flex-1 rounded-full border px-3 py-2 text-[12px] font-medium transition-colors",
                      category === item
                        ? "border-[color-mix(in_oklab,var(--primary)_45%,transparent)] bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-foreground"
                        : "border-border bg-white/[0.02] text-muted-foreground",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Amount · ₹
                </span>
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      saveExpense();
                    }
                  }}
                  placeholder="0"
                  className="h-[58px] w-full rounded-[16px] border border-border-strong bg-surface px-4 text-[26px] font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/45 focus:border-[color-mix(in_oklab,var(--primary)_55%,transparent)]"
                />
              </label>
              <button
                type="button"
                onClick={saveExpense}
                disabled={!amount.trim()}
                className="pressable gradient-primary flex h-12 w-full items-center justify-center gap-2 rounded-[15px] text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-45"
              >
                <Check className="h-4 w-4" /> Save {category}
              </button>
            </div>
          ) : null}

          {action === "habit" ? (
            <div>
              {incompleteHabits.length === 0 ? (
                <div className="rounded-[18px] border border-[color-mix(in_oklab,var(--success)_24%,transparent)] bg-[color-mix(in_oklab,var(--success)_7%,transparent)] px-4 py-6 text-center">
                  <Check className="mx-auto h-6 w-6 text-[var(--success)]" />
                  <p className="mt-2 text-[13px] font-semibold">All caught up today</p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">
                    Every habit is checked in. Keep the streak going.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-[11.5px] text-muted-foreground">
                    Tap a habit to check it off for today.
                  </p>
                  <div className="no-scrollbar -mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
                    {incompleteHabits.map((habit) => (
                      <button
                        key={habit.id}
                        type="button"
                        aria-label={`Check in ${habit.title}`}
                        onClick={() => markHabit(habit.id)}
                        className="pressable flex min-w-[105px] shrink-0 flex-col items-center gap-2 rounded-[17px] border border-border bg-white/[0.025] px-3 py-3.5 transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,transparent)] active:scale-[0.97]"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[20px]">
                          {habit.emoji}
                        </span>
                        <span className="max-w-[100px] truncate text-[11px] font-medium">
                          {habit.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {action === "note" ? (
            <div className="space-y-2.5">
              <textarea
                ref={noteRef}
                rows={5}
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Capture a thought…"
                autoComplete="off"
                className="min-h-[132px] w-full resize-y rounded-[16px] border border-border-strong bg-surface px-4 py-3.5 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/55 focus:border-[color-mix(in_oklab,var(--primary)_55%,transparent)]"
              />
              <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5 text-[var(--primary-glow)]" />
                <span>Autosaves locally to your Notes inbox.</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </BottomSheet>
  );
}
