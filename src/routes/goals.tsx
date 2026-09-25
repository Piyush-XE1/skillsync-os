import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import {
  DragHandle,
  DragSortList,
  type DragSortRenderState,
} from "@/components/common/DragSortList";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea, NO_AUTOFILL_PROPS } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { GOAL_TITLE_MAX, GOAL_PRESETS, hasGoalNamed } from "@/lib/goals";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { Goal } from "@/lib/schema";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Aims — SkillSync" },
      {
        name: "description",
        content:
          "The goals you are working on: gym, no junk food, academics, no fap, and anything else you choose. No points, no levels.",
      },
      { property: "og:title", content: "Aims — SkillSync" },
      { property: "og:description", content: "What you are working on, front and centre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoalsPage,
});

/**
 * Aims & Goals.
 *
 * This page is the deliberate opposite of a trophy cabinet: the user declares
 * what they are working on and that list sits at the top of the dashboard.
 * There is no XP, no level, no badge and no completion state to chase — the
 * only thing a goal can do is exist, be edited, reordered or removed.
 */
function GoalsPage() {
  const hydrated = useHydrated();
  const goals = useAppStore((s) => s.goals);
  const addGoal = useAppStore((s) => s.addGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const deleteGoal = useAppStore((s) => s.deleteGoal);
  const reorderGoals = useAppStore((s) => s.reorderGoals);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [note, setNote] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);
  /** Re-entrancy guard: a double tap must never save twice. */
  const saveGuard = useRef(false);

  useEffect(() => {
    if (sheetOpen) saveGuard.current = false;
  }, [sheetOpen]);

  const openNew = (preset?: (typeof GOAL_PRESETS)[number]) => {
    setEditing(null);
    setTitle(preset?.title ?? "");
    setEmoji(preset?.emoji ?? "🎯");
    setNote(preset?.note ?? "");
    setSheetOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setTitle(goal.title);
    setEmoji(goal.emoji);
    setNote(goal.note);
    setSheetOpen(true);
  };

  const save = () => {
    if (!title.trim() || saveGuard.current) return;
    saveGuard.current = true;
    if (editing) {
      updateGoal(editing.id, { title, emoji: emoji || "🎯", note });
    } else {
      addGoal({ title, emoji: emoji || "🎯", note });
    }
    haptics.success();
    sound.success();
    setSheetOpen(false);
  };

  const quickAdd = (preset: (typeof GOAL_PRESETS)[number]) => {
    addGoal({ title: preset.title, emoji: preset.emoji, note: preset.note });
    haptics.success();
    sound.success();
  };

  const remaining = GOAL_PRESETS.filter((p) => !hasGoalNamed(goals, p.title));

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
        <PrimaryAction label="New Aim" onClick={() => openNew()} />
      </header>

      <div className="mb-6 px-5 lg:px-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Direction
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Your aims.
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          No points, no levels, no badges. Just what you are working on.
        </p>
      </div>

      <div className="space-y-5 px-5 lg:px-2">
        {/* Quick add */}
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-[var(--primary-glow)]" strokeWidth={2} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Quick add
            </span>
          </div>
          {remaining.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              Every suggested aim is already on your list. Add your own with “New Aim”.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {remaining.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => quickAdd(preset)}
                  onDoubleClick={(e) => e.preventDefault()}
                  className="pressable flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--primary)_45%,transparent)] hover:text-foreground"
                >
                  <span aria-hidden>{preset.emoji}</span>
                  {preset.title}
                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* The list */}
        {!hydrated ? null : goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No aims yet"
            hint="Tap a suggestion above, or write your own — your aims show up at the top of the dashboard."
            action={
              <ActionButton onClick={() => openNew()}>
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add an aim
              </ActionButton>
            }
          />
        ) : (
          <GoalList
            goals={goals}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            onReorder={(ids) => reorderGoals(ids)}
          />
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? "Edit aim" : "New aim"}
        description="A line to hold yourself to. Nothing to score."
        footer={
          <div className="flex gap-2">
            <ActionButton variant="ghost" className="flex-1" onClick={() => setSheetOpen(false)}>
              <X className="h-4 w-4" strokeWidth={2} />
              Cancel
            </ActionButton>
            <ActionButton className="flex-1" disabled={!title.trim()} onClick={save}>
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {editing ? "Save" : "Add aim"}
            </ActionButton>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <TextField
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-16 text-center text-[20px]"
              maxLength={4}
              aria-label="Aim emoji"
            />
            <TextField
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gym"
              maxLength={GOAL_TITLE_MAX}
              className="flex-1"
              {...NO_AUTOFILL_PROPS}
            />
          </div>
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why it matters, or the rule you keep (optional)"
            rows={3}
            {...NO_AUTOFILL_PROPS}
          />
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteGoal(pendingDelete.id);
            sound.trash();
          }
          setPendingDelete(null);
        }}
        title={`Remove "${pendingDelete?.title ?? ""}"?`}
        description="The aim disappears from your dashboard. Your habits, notes and data are untouched."
        confirmLabel="Remove"
      />
    </AppShell>
  );
}

/**
 * Draggable aim rows. All of the pointer/keyboard/scroll machinery lives in
 * `DragSortList`; this wrapper only decides how a row looks and how a finished
 * order is persisted.
 */
function GoalList({
  goals,
  onEdit,
  onDelete,
  onReorder,
}: {
  goals: Goal[];
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onReorder: (ids: string[]) => void;
}) {
  return (
    <DragSortList
      items={goals}
      className="gap-2"
      itemLabel={(goal) => goal.title}
      onReorder={onReorder}
      renderItem={({ item, dragging, sorting, setNodeRef, rowProps, handleProps }) => (
        <GoalRow
          goal={item}
          onEdit={onEdit}
          onDelete={onDelete}
          chrome={{ dragging, sorting, setNodeRef, rowProps, handleProps }}
        />
      )}
    />
  );
}

function GoalRow({
  goal,
  onEdit,
  onDelete,
  chrome,
}: {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  chrome: Pick<
    DragSortRenderState<Goal>,
    "dragging" | "sorting" | "setNodeRef" | "rowProps" | "handleProps"
  >;
}) {
  return (
    <div
      ref={chrome.setNodeRef}
      {...chrome.rowProps}
      className={cn(
        "card-surface flex items-center gap-3 p-3.5 transition-shadow duration-200",
        chrome.dragging && "z-30 shadow-[var(--shadow-float)]",
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => onEdit(goal)}
        aria-label={`Edit ${goal.title}`}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[color-mix(in_oklab,var(--primary)_28%,transparent)] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-[20px]"
          aria-hidden
        >
          {goal.emoji}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold tracking-tight">
            {goal.title}
          </span>
          {goal.note ? (
            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
              {goal.note}
            </span>
          ) : null}
        </span>
      </button>

      <IconButton size="sm" aria-label={`Edit ${goal.title}`} onClick={() => onEdit(goal)}>
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
      </IconButton>
      <IconButton
        size="sm"
        variant="danger"
        aria-label={`Remove ${goal.title}`}
        onClick={() => onDelete(goal)}
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
      </IconButton>
      <DragHandle {...chrome.handleProps} active={chrome.dragging} />
    </div>
  );
}
