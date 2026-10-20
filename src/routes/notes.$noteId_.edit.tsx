import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  Download,
  Eye,
  FileText,
  Files,
  Loader2,
  PanelLeft,
  Pin,
  PinOff,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BottomSheet } from "@/components/edit/Sheet";
import { MarkdownNote } from "@/components/notes/MarkdownNote";
import { MarkdownToolbar } from "@/components/notes/MarkdownToolbar";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { useKeyboardInset, useScrollFocusedIntoView } from "@/hooks/use-keyboard-inset";
import {
  applyMarkdownFormat,
  collectNotebooks,
  DEFAULT_NOTEBOOK,
  downloadNoteMarkdown,
  extractHeadings,
  normalizeNotebook,
  normalizeTags,
  noteReadingMinutes,
  noteWordCount,
  type MarkdownFormat,
} from "@/lib/notes";
import { cn } from "@/lib/utils";
import { useAppStore, useHydrated } from "@/store/useAppStore";

export const Route = createFileRoute("/notes/$noteId_/edit")({
  head: () => ({
    meta: [
      { title: "Write note — SkillSync" },
      { name: "description", content: "Write and preview a local Markdown note." },
      { property: "og:title", content: "Write note — SkillSync" },
      { property: "og:description", content: "Write and preview a local Markdown note." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NoteEditor,
});

const AUTOSAVE_MS = 550;
type SaveStatus = "idle" | "saving" | "saved" | "error";
type EditorMode = "write" | "split" | "preview";
type Draft = {
  title: string;
  body: string;
  tags: string[];
  notebook: string;
  pinned: boolean;
  archived: boolean;
};

function NoteEditor() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const note = useAppStore((state) => state.notes.find((item) => item.id === noteId));
  const notes = useAppStore((state) => state.notes);
  const updateNote = useAppStore((state) => state.updateNote);
  const duplicateNote = useAppStore((state) => state.duplicateNote);
  const deleteNote = useAppStore((state) => state.deleteNote);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [mode, setMode] = useState<EditorMode>("write");
  const [tagInput, setTagInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const seededFor = useRef<string | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const kbInset = useKeyboardInset();
  useScrollFocusedIntoView(scrollRef, kbInset > 120);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!note || seededFor.current === note.id) return;
    seededFor.current = note.id;
    const next: Draft = {
      title: note.title,
      body: note.body,
      tags: note.tags,
      notebook: note.notebook,
      pinned: note.pinned,
      archived: note.archived,
    };
    draftRef.current = next;
    setDraft(next);
  }, [note]);

  useEffect(() => {
    const field = titleRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [draft?.title]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("skillsync:note-editor-mode");
      if (saved === "write" || saved === "split" || saved === "preview") {
        setMode(saved);
      } else if (window.matchMedia("(min-width: 1100px)").matches) {
        setMode("split");
      }
    } catch {
      // The editor works normally when private browsing blocks localStorage.
    }
  }, []);

  const setEditorMode = (next: EditorMode) => {
    setMode(next);
    try {
      localStorage.setItem("skillsync:note-editor-mode", next);
    } catch {
      // Mode persistence is optional; note persistence remains unaffected.
    }
  };

  const flush = useCallback(
    (announce = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const current = draftRef.current;
      if (!dirtyRef.current || !current) return;
      try {
        updateNote(noteId, {
          title: current.title,
          body: current.body,
          tags: current.tags,
          notebook: normalizeNotebook(current.notebook),
          pinned: current.pinned,
          archived: current.archived,
        });
        dirtyRef.current = false;
        if (announce && mountedRef.current) {
          const now = Date.now();
          setSavedAt(now);
          setStatus("saved");
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setStatus("idle");
          }, 1800);
        }
      } catch {
        if (announce && mountedRef.current) setStatus("error");
      }
    },
    [noteId, updateNote],
  );

  const patch = useCallback(
    (next: Partial<Draft>) => {
      const previous = draftRef.current;
      if (!previous) return;
      const updated = { ...previous, ...next };
      draftRef.current = updated;
      setDraft(updated);
      dirtyRef.current = true;
      setStatus("saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flush(true), AUTOSAVE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(false);
    };
    const onPageHide = () => flush(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "s") {
        event.preventDefault();
        flush(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("keydown", onKeyDown);
      flush(false);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [flush]);

  const headings = useMemo(() => extractHeadings(draft?.body ?? ""), [draft?.body]);
  const notebooks = useMemo(() => collectNotebooks(notes), [notes]);
  const words = noteWordCount(draft?.body ?? "");
  const readingMinutes = noteReadingMinutes(draft?.body ?? "");

  const format = (kind: MarkdownFormat) => {
    const textarea = textareaRef.current;
    const current = draftRef.current;
    if (!textarea || !current) return;
    const edit = applyMarkdownFormat(
      current.body,
      textarea.selectionStart,
      textarea.selectionEnd,
      kind,
    );
    patch({ body: edit.value });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  };

  const onEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLocaleLowerCase();
    const shortcut: Partial<Record<string, MarkdownFormat>> = {
      b: "bold",
      i: "italic",
      k: "link",
    };
    const formatKind = shortcut[key];
    if (formatKind) {
      event.preventDefault();
      format(formatKind);
    }
  };

  const addTags = (raw: string) => {
    if (!draft) return;
    const incoming = raw.split(/[,\n]/);
    const next = normalizeTags([...draft.tags, ...incoming]);
    if (next.length !== draft.tags.length) patch({ tags: next });
    setTagInput("");
  };

  const leaveEditor = () => {
    flush(true);
    navigate({ to: "/notes/$noteId", params: { noteId } });
  };

  if (!note || !draft) {
    return (
      <AppShell>
        {hydrated && !note ? (
          <EmptyState
            icon={StickyNote}
            title="Note not found"
            hint="It may have been deleted or replaced by a restored backup."
            action={
              <Button onClick={() => navigate({ to: "/notes" })}>
                <ArrowLeft className="h-4 w-4" /> Back to notes
              </Button>
            }
          />
        ) : null}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="note-editor-shell">
        <header className="note-editor-topbar">
          <button
            type="button"
            onClick={leaveEditor}
            className="focus-ring note-editor-back"
            aria-label="Back to note"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="note-save-status" role="status" aria-live="polite" aria-atomic="true">
            {status === "saving" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving locally…
              </>
            ) : status === "error" ? (
              <>Save interrupted — keep this page open</>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                {status === "saved" && savedAt
                  ? `Saved ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(savedAt)}`
                  : "Saved locally"}
              </>
            )}
          </div>

          <div className="note-editor-modes" role="group" aria-label="Editor view">
            <ModeButton
              active={mode === "write"}
              icon={PanelLeft}
              label="Write"
              onClick={() => setEditorMode("write")}
            />
            <ModeButton
              active={mode === "split"}
              icon={Files}
              label="Split"
              onClick={() => setEditorMode("split")}
            />
            <ModeButton
              active={mode === "preview"}
              icon={Eye}
              label="Preview"
              onClick={() => setEditorMode("preview")}
            />
          </div>

          <button
            type="button"
            className="focus-ring note-editor-details-toggle"
            aria-expanded={detailsOpen}
            aria-controls="note-editor-details"
            onClick={() => setDetailsOpen((open) => !open)}
          >
            Details
          </button>
        </header>

        {draft.archived && (
          <div className="note-archive-banner" role="status">
            <Archive className="h-4 w-4" />
            This note is archived.
            <button type="button" onClick={() => patch({ archived: false })}>
              Restore
            </button>
          </div>
        )}

        <div
          ref={scrollRef}
          className="note-editor-scroll"
          style={{ paddingBottom: kbInset > 120 ? kbInset + 24 : undefined }}
        >
          <div className="note-editor-heading">
            <label htmlFor="note-title" className="sr-only">
              Note title
            </label>
            <textarea
              ref={titleRef}
              id="note-title"
              rows={1}
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value.replace(/\n/g, "") })}
              onBlur={() => flush(true)}
              className="note-title-input"
              placeholder="Untitled note"
              aria-describedby="note-editor-context"
            />
            <p id="note-editor-context" className="section-kicker">
              {normalizeNotebook(draft.notebook).toLocaleUpperCase()} / MARKDOWN NOTE
            </p>
          </div>

          <div className={cn("note-editor-workspace", `is-${mode}`)}>
            {mode !== "preview" && (
              <section className="note-writing-panel" aria-label="Markdown editor">
                <MarkdownToolbar onFormat={format} />
                <label htmlFor="note-body" className="sr-only">
                  Note content in Markdown
                </label>
                <textarea
                  ref={textareaRef}
                  id="note-body"
                  value={draft.body}
                  onChange={(event) => patch({ body: event.target.value })}
                  onKeyDown={onEditorKeyDown}
                  onBlur={() => flush(true)}
                  className="note-body-editor"
                  placeholder="Write in Markdown…\n\nUse ## for sections, - [ ] for tasks, and [[Note title]] to connect ideas."
                  spellCheck
                  autoCapitalize="sentences"
                  aria-keyshortcuts="Control+B Meta+B Control+I Meta+I Control+K Meta+K Control+S Meta+S"
                />
              </section>
            )}

            {mode !== "write" && (
              <section
                className="note-preview-panel"
                aria-label="Note preview"
                aria-live={mode === "preview" ? "polite" : "off"}
              >
                <div className="note-preview-label">
                  <span>PREVIEW</span>
                  <span>
                    {words} {words === 1 ? "word" : "words"} · {readingMinutes || 1} min
                  </span>
                </div>
                <MarkdownNote
                  body={draft.body}
                  notes={notes}
                  emptyMessage="Your formatted preview will appear here as you write."
                />
              </section>
            )}
          </div>

          <aside
            id="note-editor-details"
            className={cn("note-editor-details", detailsOpen && "is-open")}
            aria-label="Note details"
          >
            <div className="note-detail-field">
              <label htmlFor="note-notebook">Notebook</label>
              <Input
                id="note-notebook"
                list="editor-note-notebooks"
                value={draft.notebook}
                onChange={(event) => patch({ notebook: event.target.value })}
                onBlur={() => {
                  patch({ notebook: normalizeNotebook(draft.notebook) });
                  flush(true);
                }}
                placeholder={DEFAULT_NOTEBOOK}
                autoComplete="off"
              />
              <datalist id="editor-note-notebooks">
                {notebooks.map((item) => (
                  <option key={item.name} value={item.name} />
                ))}
              </datalist>
            </div>

            <div className="note-detail-field">
              <label htmlFor="note-tag-input">Tags</label>
              {draft.tags.length > 0 && (
                <div className="note-editor-tags" aria-label="Current tags">
                  {draft.tags.map((tag) => (
                    <span key={tag}>
                      #{tag}
                      <button
                        type="button"
                        className="focus-ring"
                        aria-label={`Remove ${tag} tag`}
                        onClick={() => patch({ tags: draft.tags.filter((value) => value !== tag) })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Input
                id="note-tag-input"
                value={tagInput}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.includes(",")) addTags(value);
                  else setTagInput(value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && tagInput.trim()) {
                    event.preventDefault();
                    addTags(tagInput);
                  } else if (event.key === "Backspace" && !tagInput && draft.tags.length > 0) {
                    patch({ tags: draft.tags.slice(0, -1) });
                  }
                }}
                onBlur={() => {
                  if (tagInput.trim()) addTags(tagInput);
                  flush(true);
                }}
                placeholder="Add a tag, then press Enter"
                autoComplete="off"
              />
            </div>

            <div className="note-details-stats" aria-label="Writing statistics">
              <span>
                <strong>{words}</strong> words
              </span>
              <span>
                <strong>{draft.body.length}</strong> characters
              </span>
              <span>
                <strong>{headings.length}</strong> sections
              </span>
              <span>
                <strong>{readingMinutes || 1}</strong> min read
              </span>
            </div>

            {headings.length > 0 && (
              <nav className="note-editor-outline" aria-label="Document outline">
                <p className="section-kicker">OUTLINE</p>
                <ol>
                  {headings.map((heading) => (
                    <li key={heading.id} style={{ paddingLeft: `${(heading.level - 1) * 0.6}rem` }}>
                      <button
                        type="button"
                        onClick={() => {
                          const line = draft.body
                            .split("\n")
                            .findIndex((value) =>
                              value.replace(/^#{1,6}\s+/, "").startsWith(heading.text),
                            );
                          if (line < 0) return;
                          const start = draft.body
                            .split("\n")
                            .slice(0, line)
                            .reduce((total, value) => total + value.length + 1, 0);
                          if (mode === "preview") setEditorMode("write");
                          requestAnimationFrame(() => {
                            textareaRef.current?.focus();
                            textareaRef.current?.setSelectionRange(start, start);
                          });
                        }}
                      >
                        {heading.text}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <div className="note-editor-secondary-actions">
              <button
                type="button"
                className="focus-ring"
                onClick={() => patch({ pinned: !draft.pinned })}
              >
                {draft.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {draft.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                type="button"
                className="focus-ring"
                onClick={() => patch({ archived: !draft.archived })}
              >
                {draft.archived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {draft.archived ? "Restore" : "Archive"}
              </button>
              <button
                type="button"
                className="focus-ring"
                onClick={() => {
                  flush(true);
                  const current = useAppStore.getState().notes.find((item) => item.id === note.id);
                  if (current) downloadNoteMarkdown(current);
                }}
              >
                <Download className="h-4 w-4" /> Export
              </button>
              <button
                type="button"
                className="focus-ring"
                onClick={() => {
                  flush(true);
                  const copy = duplicateNote(note.id);
                  if (copy) navigate({ to: "/notes/$noteId/edit", params: { noteId: copy.id } });
                }}
              >
                <Files className="h-4 w-4" /> Duplicate
              </button>
              <button
                type="button"
                className="focus-ring is-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </aside>
        </div>
      </div>

      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this note?"
        description="This action removes the note from local storage."
        footer={
          <div className="flex gap-2 pb-[max(env(safe-area-inset-bottom),12px)]">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Keep note
            </Button>
            <Button
              className="flex-1 bg-[var(--danger)]"
              onClick={() => {
                dirtyRef.current = false;
                if (timerRef.current) clearTimeout(timerRef.current);
                deleteNote(noteId);
                navigate({ to: "/notes" });
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        }
      >
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Export a Markdown copy first if you may want this writing later.
        </p>
      </BottomSheet>
    </AppShell>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-pressed={active} className="focus-ring" onClick={onClick}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
