import { useEffect, useMemo, useState } from "react";
import { Copy, PenLine, Plus, RefreshCw, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { TextArea, TextField } from "@/components/edit/Fields";
import { haptics } from "@/lib/haptics";
import { localDateISO, quotePool, selectDisplayQuote } from "@/lib/monograph";
import type { CustomQuote, QuoteFilterPreference } from "@/lib/schema";
import { useAppStore } from "@/store/useAppStore";

const MODES: Array<{ id: QuoteFilterPreference; label: string; short: string }> = [
  { id: "stoic", label: "Masculine & Stoic", short: "Stoic" },
  { id: "custom", label: "Personal Monologue", short: "My quotes" },
  { id: "mixed", label: "The Crucible", short: "Crucible" },
];

type QuoteDraft = { id: string | null; quote: string; author: string };

export function TypographicQuoteObelisk() {
  const mode = useAppStore((state) => state.quoteFilterPreference);
  const customQuotes = useAppStore((state) => state.customQuotes);
  const selectedCustomQuoteId = useAppStore((state) => state.selectedCustomQuoteId);
  const setMode = useAppStore((state) => state.setQuoteFilterPreference);
  const selectCustomQuote = useAppStore((state) => state.selectCustomQuote);

  const [cursor, setCursor] = useState(0);
  const [managerOpen, setManagerOpen] = useState(false);
  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomQuote | null>(null);
  const dayKey = localDateISO();

  const displayed = useMemo(
    () =>
      selectDisplayQuote({
        mode,
        customQuotes,
        selectedCustomQuoteId,
        dayKey,
        cursor,
      }),
    [mode, customQuotes, selectedCustomQuoteId, dayKey, cursor],
  );

  useEffect(() => setCursor(0), [mode, selectedCustomQuoteId]);

  const refresh = () => {
    const pool = quotePool(mode, customQuotes);
    if (pool.length < 2) {
      toast.message(
        pool.length === 0
          ? "No quotations in this collection yet."
          : "This is the only quotation here.",
      );
      return;
    }
    let nextCursor = cursor + 1;
    for (let attempt = 0; attempt < pool.length; attempt += 1) {
      const candidate = selectDisplayQuote({
        mode,
        customQuotes,
        selectedCustomQuoteId,
        dayKey,
        cursor: nextCursor,
      });
      if (candidate?.id !== displayed?.id) break;
      nextCursor += 1;
    }
    haptics.selection();
    setCursor(nextCursor);
  };

  const copy = async () => {
    if (!displayed) return;
    try {
      await navigator.clipboard.writeText(`“${displayed.quote}”\n— ${displayed.author}`);
      haptics.success();
      toast.success("Quotation copied");
    } catch {
      toast.error("Copy is not available on this device.");
    }
  };

  const share = async () => {
    if (!displayed) return;
    const text = `“${displayed.quote}” — ${displayed.author}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "A line from SkillSync", text });
        haptics.success();
        toast.success("Quotation shared");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error("Sharing was not completed.");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Sharing is unavailable, so the quotation was copied.");
    } catch {
      toast.error("Sharing is not available on this device.");
    }
  };

  return (
    <section
      aria-labelledby="quote-obelisk-heading"
      className="px-5 pb-20 pt-4 lg:px-2 lg:pb-28 lg:pt-10"
    >
      <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="editorial-kicker">Vol. I · Daily inscription</div>
          <h1 id="quote-obelisk-heading" className="sr-only">
            Daily quotation
          </h1>
        </div>
        <div className="font-numerical text-[10px] tracking-[0.14em] text-muted-foreground">
          {dayKey.replaceAll("-", " · ")}
        </div>
      </div>

      <div className="relative min-h-[24rem] py-12 sm:min-h-[29rem] sm:py-16 lg:min-h-[34rem] lg:py-20">
        {displayed ? (
          <>
            <span
              aria-hidden="true"
              className="font-editorial absolute left-0 top-7 text-[5.5rem] leading-none text-primary/30 sm:top-10 sm:text-[8rem]"
            >
              “
            </span>
            <blockquote className="relative z-10 ml-auto max-w-[68rem]">
              <p className="font-editorial text-balance text-[clamp(2.35rem,7.1vw,6.7rem)] font-normal leading-[0.94] tracking-[-0.045em] text-foreground">
                {displayed.quote}
              </p>
              <footer className="mt-9 flex items-start gap-4 sm:mt-12">
                <span
                  className="mt-[0.55rem] h-px w-10 shrink-0 bg-primary sm:w-16"
                  aria-hidden="true"
                />
                <cite className="max-w-xl text-[10px] font-medium not-italic uppercase leading-relaxed tracking-[0.17em] text-muted-foreground">
                  {displayed.author}
                </cite>
              </footer>
            </blockquote>
          </>
        ) : (
          <div className="flex min-h-[18rem] flex-col items-start justify-center border-l border-primary/50 pl-6 sm:pl-10">
            <p className="font-editorial max-w-xl text-[clamp(2rem,5vw,4rem)] leading-[1.02] tracking-[-0.03em]">
              Your own words belong here.
            </p>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-muted-foreground">
              Personal Monologue is empty. Add a reminder, principle, or line you want to return to.
            </p>
            <ActionButton
              size="sm"
              className="mt-7"
              onClick={() => {
                setManagerOpen(true);
                setDraft({ id: null, quote: "", author: "Me" });
              }}
            >
              <Plus className="h-4 w-4" /> Add the first quotation
            </ActionButton>
          </div>
        )}
      </div>

      <div className="border-y border-border py-3 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div
          className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto"
          role="group"
          aria-label="Quotation mode"
        >
          {MODES.map((item) => {
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                title={item.label}
                onClick={() => {
                  haptics.selection();
                  setMode(item.id);
                  setCursor(0);
                }}
                className={
                  "min-h-10 shrink-0 border-b px-3 text-[10px] font-semibold uppercase tracking-[0.13em] transition-colors sm:px-4 " +
                  (active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-end gap-1 sm:mt-0">
          <IconButton aria-label="Another quotation" title="Another quotation" onClick={refresh}>
            <RefreshCw className="h-4 w-4" strokeWidth={1.7} />
          </IconButton>
          <IconButton
            aria-label="Copy quotation"
            title="Copy quotation"
            onClick={() => void copy()}
            disabled={!displayed}
          >
            <Copy className="h-4 w-4" strokeWidth={1.7} />
          </IconButton>
          <IconButton
            aria-label="Share quotation"
            title="Share quotation"
            onClick={() => void share()}
            disabled={!displayed}
          >
            <Share2 className="h-4 w-4" strokeWidth={1.7} />
          </IconButton>
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              setManagerOpen(true);
            }}
            className="pressable ml-1 min-h-10 border border-border px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground hover:border-border-strong hover:text-foreground"
          >
            My quotes · {customQuotes.length}
          </button>
        </div>
      </div>

      <QuoteManager
        open={managerOpen}
        onClose={() => {
          setDraft(null);
          setManagerOpen(false);
        }}
        draft={draft}
        setDraft={setDraft}
        quotes={customQuotes}
        selectedId={selectedCustomQuoteId}
        onSelect={(id) => {
          selectCustomQuote(id);
          setMode("custom");
          setCursor(0);
          toast.success("Quotation selected");
        }}
        onDelete={setDeleteTarget}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this quotation?"
        description="This removes the private quotation from this device. The rest of your collection is unchanged."
        confirmLabel="Delete quotation"
        onConfirm={() => {
          if (deleteTarget) useAppStore.getState().deleteCustomQuote(deleteTarget.id);
          toast.success("Quotation deleted");
        }}
      />
    </section>
  );
}

function QuoteManager({
  open,
  onClose,
  draft,
  setDraft,
  quotes,
  selectedId,
  onSelect,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  draft: QuoteDraft | null;
  setDraft: (draft: QuoteDraft | null) => void;
  quotes: CustomQuote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (quote: CustomQuote) => void;
}) {
  const addQuote = useAppStore((state) => state.addCustomQuote);
  const updateQuote = useAppStore((state) => state.updateCustomQuote);

  const save = () => {
    if (!draft?.quote.trim()) {
      toast.error("Write a quotation before saving.");
      return;
    }
    if (draft.id) updateQuote(draft.id, { quote: draft.quote, author: draft.author });
    else addQuote({ quote: draft.quote, author: draft.author });
    haptics.success();
    toast.success(draft.id ? "Quotation updated" : "Quotation added");
    setDraft(null);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={draft ? (draft.id ? "Edit quotation" : "New quotation") : "My quotations"}
      description={
        draft
          ? "Private words, saved in this workspace."
          : "Write, revise, and choose the lines that belong in your Personal Monologue."
      }
      footer={
        draft ? (
          <div className="flex gap-2">
            <ActionButton variant="outline" className="flex-1" onClick={() => setDraft(null)}>
              Cancel
            </ActionButton>
            <ActionButton className="flex-1" onClick={save}>
              Save quotation
            </ActionButton>
          </div>
        ) : undefined
      }
    >
      {draft ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Quotation
            </span>
            <TextArea
              autoFocus
              rows={7}
              maxLength={1200}
              value={draft.quote}
              onChange={(event) => setDraft({ ...draft, quote: event.target.value })}
              placeholder="A line you want to remember…"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Attribution
            </span>
            <TextField
              maxLength={120}
              value={draft.author}
              onChange={(event) => setDraft({ ...draft, author: event.target.value })}
              placeholder="Me"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <ActionButton
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setDraft({ id: null, quote: "", author: "Me" })}
          >
            <Plus className="h-4 w-4" /> Add quotation
          </ActionButton>
          {quotes.length === 0 ? (
            <div className="border-l border-primary/50 py-5 pl-5">
              <p className="font-editorial text-2xl">No private lines yet.</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                Start with something true enough to return to on a difficult day.
              </p>
            </div>
          ) : (
            quotes.map((quote) => (
              <article
                key={quote.id}
                className={
                  "border p-4 " +
                  (selectedId === quote.id
                    ? "border-primary/60 bg-primary/[0.04]"
                    : "border-border")
                }
              >
                <p className="font-editorial text-xl leading-snug">“{quote.quote}”</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
                  {quote.author}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(quote.id)}
                    className="min-h-9 border border-border px-3 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    {selectedId === quote.id ? "Selected" : "Display this"}
                  </button>
                  <IconButton
                    size="sm"
                    aria-label={`Edit quotation by ${quote.author}`}
                    onClick={() =>
                      setDraft({ id: quote.id, quote: quote.quote, author: quote.author })
                    }
                  >
                    <PenLine className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="danger"
                    aria-label={`Delete quotation by ${quote.author}`}
                    onClick={() => onDelete(quote)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </BottomSheet>
  );
}
