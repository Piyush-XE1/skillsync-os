import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Pin, PinOff, StickyNote, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { useKeyboardInset, useScrollFocusedIntoView } from "@/hooks/use-keyboard-inset";

export const Route = createFileRoute("/notes/$noteId_/edit")({
  head: () => ({
    meta: [
      { title: "Edit note — SkillSync" },
      { name: "description", content: "Edit a saved note." },
      { property: "og:title", content: "Edit note — SkillSync" },
      { property: "og:description", content: "Edit a saved note." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NoteEditor,
});

const AUTOSAVE_MS = 700;

type Draft = { title: string; body: string; tags: string };

function parseTags(input: string) {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function NoteEditor() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const note = useAppStore((s) => s.notes.find((n) => n.id === noteId));
  const updateNote = useAppStore((s) => s.updateNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const kbInset = useKeyboardInset();
  useScrollFocusedIntoView(scrollRef, kbInset > 120);

  /* ---- local draft: seeded once the note exists, so typing never fights the store ---- */
  const [draft, setDraft] = useState<Draft | null>(null);
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!note) return;
    if (seededFor.current === note.id) return;
    seededFor.current = note.id;
    setDraft({ title: note.title, body: note.body, tags: note.tags.join(", ") });
  }, [note]);

  /* ---- debounced autosave with a flush-on-exit guarantee ---- */
  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const d = draftRef.current;
    if (!dirtyRef.current || !d) return;
    dirtyRef.current = false;
    updateNote(noteId, { title: d.title, body: d.body, tags: parseTags(d.tags) });
    setStatus("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setStatus("idle"), 1600);
  }, [noteId, updateNote]);

  const patch = useCallback(
    (p: Partial<Draft>) => {
      setDraft((prev) => (prev ? { ...prev, ...p } : prev));
      dirtyRef.current = true;
      setStatus("saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush],
  );

  // Flush when the app is backgrounded / page hidden, and on unmount (leaving the editor).
  useEffect(() => {
    const onHide = () => flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      flush();
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [flush]);

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/notes/$noteId"
          params={{ noteId }}
          onClick={() => flush()}
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back to note"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-2">
          <span
            aria-live="polite"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            {status === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            ) : status === "saved" ? (
              <>
                <Check className="h-3 w-3" /> Saved
              </>
            ) : null}
          </span>
          {note ? (
            <IconButton
              aria-label={note.pinned ? "Unpin note" : "Pin note"}
              variant={note.pinned ? "primary" : "ghost"}
              size="lg"
              onClick={() => updateNote(note.id, { pinned: !note.pinned })}
            >
              {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </IconButton>
          ) : null}
        </div>
      </header>

      {!note || !draft ? (
        hydrated && !note ? (
          <div className="px-5 lg:px-2">
            <EmptyState icon={StickyNote} title="Note not found" hint="It may have been deleted." />
          </div>
        ) : null
      ) : (
        <div
          ref={scrollRef}
          className="space-y-4 overflow-y-auto px-5 lg:px-2"
          style={{ paddingBottom: kbInset > 120 ? kbInset + 24 : undefined }}
        >
          <TextField
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Title"
            className="text-[16px] font-semibold"
          />
          <TextArea
            rows={14}
            value={draft.body}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="Start typing…"
          />
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
              Tags (comma separated)
            </label>
            <TextField
              className="mt-1.5"
              value={draft.tags}
              onChange={(e) => patch({ tags: e.target.value })}
              onBlur={() => flush()}
            />
          </div>
          <ActionButton variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete note
          </ActionButton>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete note?"
        onConfirm={() => {
          dirtyRef.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
          deleteNote(noteId);
          navigate({ to: "/notes" });
        }}
      />
    </AppShell>
  );
}
