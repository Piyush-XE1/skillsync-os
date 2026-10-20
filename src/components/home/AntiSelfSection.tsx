import { useState } from "react";
import { ChevronDown, PenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DragHandle, DragSortList } from "@/components/common/DragSortList";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { TextArea } from "@/components/edit/Fields";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { EditorialSectionHeader } from "./EditorialSectionHeader";
import type { AntiSelfEntry } from "@/lib/schema";
import { useAppStore } from "@/store/useAppStore";

type AntiDraft = { id: string | null; text: string; notes: string };

export function AntiSelfSection() {
  const entries = useAppStore((state) => state.antiSelfEntries);
  const addEntry = useAppStore((state) => state.addAntiSelfEntry);
  const updateEntry = useAppStore((state) => state.updateAntiSelfEntry);
  const deleteEntry = useAppStore((state) => state.deleteAntiSelfEntry);
  const reorder = useAppStore((state) => state.reorderAntiSelfEntries);

  const [open, setOpen] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [draft, setDraft] = useState<AntiDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AntiSelfEntry | null>(null);

  const save = () => {
    if (!draft?.text.trim()) {
      toast.error("Name the pattern you are refusing.");
      return;
    }
    if (draft.id) updateEntry(draft.id, { text: draft.text, notes: draft.notes });
    else addEntry({ text: draft.text, notes: draft.notes });
    toast.success(draft.id ? "Entry revised" : "Entry added");
    setDraft(null);
  };

  return (
    <section aria-labelledby="anti-self-heading" className="px-5 py-16 lg:px-2 lg:py-24">
      <EditorialSectionHeader
        index="02 / 04"
        title="The Anti-Self"
        subtitle="What I refuse to become."
        meta={
          entries.length
            ? `${entries.length} private inversion${entries.length === 1 ? "" : "s"}`
            : "Optional reflection"
        }
        action={
          <button
            type="button"
            aria-expanded={open}
            aria-controls="anti-self-content"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-h-10 items-center gap-2 border-b border-border px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:border-primary hover:text-foreground"
          >
            {open ? "Close" : "Open reflection"}
            <ChevronDown
              className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")}
            />
          </button>
        }
      />
      <h2 id="anti-self-heading" className="sr-only">
        The Anti-Self — what I refuse to become
      </h2>

      <div id="anti-self-content" hidden={!open}>
        <div className="mb-5 flex justify-end">
          <ActionButton
            size="sm"
            variant="outline"
            onClick={() => setDraft({ id: null, text: "", notes: "" })}
          >
            <Plus className="h-4 w-4" /> Add inversion
          </ActionButton>
        </div>

        {entries.length === 0 ? (
          <div className="border-y border-border py-10 sm:grid sm:grid-cols-2 sm:gap-10">
            <p className="font-editorial text-3xl leading-tight">
              A boundary can be quiet and still be firm.
            </p>
            <div className="mt-5 sm:mt-0">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Record a pattern, compromise, or way of behaving you do not want to normalize.
                Nothing here is scored.
              </p>
              <button
                type="button"
                onClick={() => setDraft({ id: null, text: "", notes: "" })}
                className="mt-5 min-h-10 border-b border-primary text-[11px] font-semibold uppercase tracking-[0.13em]"
              >
                Add the first inversion
              </button>
            </div>
          </div>
        ) : (
          <DragSortList
            items={[...entries].sort((a, b) => a.sortOrder - b.sortOrder)}
            onReorder={reorder}
            handleOnly
            className="border-t border-border"
            itemLabel={(item) => item.text}
            renderItem={({ item, index, setNodeRef, rowProps, handleProps, dragging }) => (
              <article
                ref={setNodeRef}
                {...rowProps}
                className={
                  "group border-b border-border py-5 sm:grid sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-5 sm:py-7 " +
                  (dragging ? "relative z-10 opacity-80" : "")
                }
              >
                <div className="mb-2 flex items-center justify-between sm:mb-0 sm:block">
                  <span className="font-numerical text-[10px] text-muted-foreground/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <DragHandle {...handleProps} active={dragging} className="sm:mt-3" />
                </div>
                <div className="min-w-0">
                  <p className="font-editorial text-[clamp(1.4rem,2.4vw,2.15rem)] leading-[1.08] text-foreground/90">
                    {item.text}
                  </p>
                  {item.notes ? (
                    <>
                      <button
                        type="button"
                        aria-expanded={expandedNote === item.id}
                        onClick={() =>
                          setExpandedNote((current) => (current === item.id ? null : item.id))
                        }
                        className="mt-3 min-h-8 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground hover:text-foreground"
                      >
                        {expandedNote === item.id ? "Hide reflection" : "Read reflection"}
                      </button>
                      {expandedNote === item.id ? (
                        <p className="mt-2 max-w-2xl whitespace-pre-wrap border-l border-border pl-4 text-[12.5px] leading-7 text-muted-foreground">
                          {item.notes}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="mt-4 flex gap-1 sm:mt-0 sm:opacity-65 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <IconButton
                    size="sm"
                    aria-label={`Edit Anti-Self entry: ${item.text}`}
                    onClick={() => setDraft({ id: item.id, text: item.text, notes: item.notes })}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="danger"
                    aria-label={`Delete Anti-Self entry: ${item.text}`}
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              </article>
            )}
          />
        )}
      </div>

      {draft ? (
        <BottomSheet
          open
          onClose={() => setDraft(null)}
          title={draft.id ? "Revise inversion" : "New inversion"}
          description="Neutral, precise language is enough. This is a boundary, not a verdict."
          footer={
            <div className="flex gap-2">
              <ActionButton variant="outline" className="flex-1" onClick={() => setDraft(null)}>
                Cancel
              </ActionButton>
              <ActionButton className="flex-1" onClick={save}>
                Save entry
              </ActionButton>
            </div>
          }
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
                What I refuse
              </span>
              <TextArea
                autoFocus
                rows={3}
                maxLength={280}
                value={draft.text}
                onChange={(event) => setDraft({ ...draft, text: event.target.value })}
                placeholder="Drifting into distraction without choosing it."
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-muted-foreground">
                Reflection · optional
              </span>
              <TextArea
                rows={6}
                maxLength={2400}
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                placeholder="Why this boundary matters, and what choosing differently looks like…"
              />
            </label>
          </div>
        </BottomSheet>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteEntry(deleteTarget.id);
          toast.success("Entry removed");
        }}
        title="Remove this inversion?"
        description="This private entry and its reflection note will be removed from this device."
        confirmLabel="Remove entry"
      />
    </section>
  );
}
