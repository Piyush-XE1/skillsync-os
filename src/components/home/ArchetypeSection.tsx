import { useState } from "react";
import { Check, ChevronDown, PenLine, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DragHandle, DragSortList } from "@/components/common/DragSortList";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { TextArea, TextField } from "@/components/edit/Fields";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { EditorialSectionHeader } from "./EditorialSectionHeader";
import { newId } from "@/lib/id";
import type { ArchetypeSubTenet, ArchetypeTrait } from "@/lib/schema";
import { useAppStore } from "@/store/useAppStore";

type TraitDraft = {
  id: string | null;
  text: string;
  category: string;
  notes: string;
  subTenets: ArchetypeSubTenet[];
};

const emptyDraft = (): TraitDraft => ({
  id: null,
  text: "",
  category: "",
  notes: "",
  subTenets: [],
});

export function ArchetypeSection() {
  const traits = useAppStore((state) => state.archetypeTraits);
  const addTrait = useAppStore((state) => state.addArchetypeTrait);
  const updateTrait = useAppStore((state) => state.updateArchetypeTrait);
  const deleteTrait = useAppStore((state) => state.deleteArchetypeTrait);
  const reorderTraits = useAppStore((state) => state.reorderArchetypeTraits);
  const reflect = useAppStore((state) => state.reflectOnArchetypeTrait);

  const [draft, setDraft] = useState<TraitDraft | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<ArchetypeTrait | null>(null);

  const openEdit = (trait: ArchetypeTrait) =>
    setDraft({
      id: trait.id,
      text: trait.text,
      category: trait.category,
      notes: trait.notes,
      subTenets: trait.subTenets.map((item) => ({ ...item })),
    });

  const save = () => {
    if (!draft?.text.trim()) {
      toast.error("Give this tenet a clear statement.");
      return;
    }
    const input = {
      text: draft.text,
      category: draft.category,
      notes: draft.notes,
      subTenets: draft.subTenets,
    };
    if (draft.id) updateTrait(draft.id, input);
    else addTrait(input);
    toast.success(draft.id ? "Tenet revised" : "Tenet added");
    setDraft(null);
  };

  return (
    <section aria-labelledby="archetype-heading" className="px-5 py-16 lg:px-2 lg:py-24">
      <EditorialSectionHeader
        index="01 / 04"
        title="The Archetype"
        subtitle="The person I am becoming."
        meta={`${traits.length} active tenet${traits.length === 1 ? "" : "s"}`}
        action={
          <ActionButton size="sm" variant="outline" onClick={() => setDraft(emptyDraft())}>
            <Plus className="h-4 w-4" /> Add tenet
          </ActionButton>
        }
      />
      <h2 id="archetype-heading" className="sr-only">
        The Archetype — the person I am becoming
      </h2>

      {traits.length === 0 ? (
        <div className="grid border-y border-border py-10 md:grid-cols-[minmax(0,1fr)_18rem] md:gap-12 md:py-14">
          <p className="font-editorial max-w-2xl text-[clamp(2rem,4vw,3.5rem)] leading-[1.02] tracking-[-0.03em]">
            Identity is written one deliberate sentence at a time.
          </p>
          <div className="mt-7 md:mt-0">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Name a quality you are practising. Add context only when it makes the statement more
              useful.
            </p>
            <button
              type="button"
              onClick={() => setDraft(emptyDraft())}
              className="mt-5 min-h-10 border-b border-primary text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground"
            >
              Write the first tenet
            </button>
          </div>
        </div>
      ) : (
        <DragSortList
          items={[...traits].sort((a, b) => a.sortOrder - b.sortOrder)}
          onReorder={reorderTraits}
          handleOnly
          className="border-t border-border"
          itemLabel={(item) => item.text}
          renderItem={({ item, index, setNodeRef, rowProps, handleProps, dragging }) => {
            const details = item.notes || item.subTenets.length > 0;
            const isExpanded = expanded.has(item.id);
            return (
              <article
                ref={setNodeRef}
                {...rowProps}
                className={
                  "group border-b border-border py-6 transition-opacity sm:grid sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-5 sm:py-8 " +
                  (dragging ? "relative z-10 opacity-80" : "")
                }
              >
                <div className="mb-3 flex items-center justify-between sm:mb-0 sm:block">
                  <span className="font-numerical text-[11px] text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <DragHandle {...handleProps} active={dragging} className="sm:mt-3" />
                </div>
                <div className="min-w-0">
                  {item.category ? (
                    <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                      {item.category}
                    </div>
                  ) : null}
                  <p className="font-editorial text-[clamp(1.6rem,3vw,2.7rem)] leading-[1.05] tracking-[-0.025em]">
                    {item.text}
                  </p>
                  {details ? (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpanded((current) => {
                          const next = new Set(current);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        })
                      }
                      className="mt-4 inline-flex min-h-9 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown
                        className={
                          "h-3.5 w-3.5 transition-transform " + (isExpanded ? "rotate-180" : "")
                        }
                      />
                      {isExpanded ? "Close notes" : "Supporting principles"}
                    </button>
                  ) : null}

                  {isExpanded ? (
                    <div className="mt-4 border-l border-primary/40 pl-5">
                      {item.notes ? (
                        <p className="whitespace-pre-wrap text-[13px] leading-7 text-muted-foreground">
                          {item.notes}
                        </p>
                      ) : null}
                      {item.subTenets.length > 0 ? (
                        <ol className={item.notes ? "mt-5 space-y-3" : "space-y-3"}>
                          {item.subTenets.map((sub, subIndex) => (
                            <li
                              key={sub.id}
                              className="flex gap-3 text-[12.5px] leading-relaxed text-foreground/85"
                            >
                              <span className="font-numerical text-[10px] text-primary/80">
                                {String.fromCharCode(97 + subIndex)}.
                              </span>
                              <span>{sub.text}</span>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        reflect(item.id);
                        toast.success("Reflection noted", {
                          description: "A quiet check-in — no score attached.",
                        });
                      }}
                      className="inline-flex min-h-9 items-center gap-2 border-b border-border text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground hover:border-primary hover:text-foreground"
                    >
                      <Check className="h-3.5 w-3.5" /> I reviewed this
                    </button>
                    {item.lastReflectedAt ? (
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(item.lastReflectedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-5 flex items-start gap-1 sm:mt-0 sm:opacity-65 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <IconButton
                    size="sm"
                    aria-label={`Edit tenet: ${item.text}`}
                    onClick={() => openEdit(item)}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="danger"
                    aria-label={`Delete tenet: ${item.text}`}
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              </article>
            );
          }}
        />
      )}

      <TraitEditor draft={draft} setDraft={setDraft} onSave={save} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteTrait(deleteTarget.id);
          toast.success("Tenet removed");
        }}
        title="Remove this tenet?"
        description="Its notes, supporting principles, and reflection history will be removed from this device."
        confirmLabel="Remove tenet"
      />
    </section>
  );
}

function TraitEditor({
  draft,
  setDraft,
  onSave,
}: {
  draft: TraitDraft | null;
  setDraft: (draft: TraitDraft | null) => void;
  onSave: () => void;
}) {
  if (!draft) return null;
  return (
    <BottomSheet
      open
      onClose={() => setDraft(null)}
      title={draft.id ? "Revise tenet" : "New tenet"}
      description="Write it as a present-tense identity, not a task to complete."
      footer={
        <div className="flex gap-2">
          <ActionButton variant="outline" className="flex-1" onClick={() => setDraft(null)}>
            Cancel
          </ActionButton>
          <ActionButton className="flex-1" onClick={onSave}>
            Save tenet
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
            Identity statement
          </span>
          <TextArea
            autoFocus
            rows={3}
            maxLength={280}
            value={draft.text}
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            placeholder="I remain focused when pressure rises."
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
            Category · optional
          </span>
          <TextField
            maxLength={80}
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
            placeholder="Conduct, work, relationships…"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
            Context · optional
          </span>
          <TextArea
            rows={5}
            maxLength={2400}
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            placeholder="What this means in practice…"
          />
        </label>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
              Supporting principles
            </span>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  subTenets: [...draft.subTenets, { id: newId(), text: "" }],
                })
              }
              className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-medium text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {draft.subTenets.map((sub, index) => (
              <div key={sub.id} className="flex items-center gap-2">
                <span className="font-numerical w-5 text-[10px] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <TextField
                  value={sub.text}
                  maxLength={240}
                  aria-label={`Supporting principle ${index + 1}`}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      subTenets: draft.subTenets.map((item) =>
                        item.id === sub.id ? { ...item, text: event.target.value } : item,
                      ),
                    })
                  }
                  placeholder="A concrete supporting principle"
                />
                <IconButton
                  size="sm"
                  aria-label={`Remove supporting principle ${index + 1}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      subTenets: draft.subTenets.filter((item) => item.id !== sub.id),
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
