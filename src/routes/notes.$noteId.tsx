import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Copy,
  Download,
  Edit3,
  FileText,
  Files,
  Link2,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { BottomSheet } from "@/components/edit/Sheet";
import { MarkdownNote } from "@/components/notes/MarkdownNote";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/primitives";
import {
  downloadNoteMarkdown,
  extractHeadings,
  extractWikiLinks,
  noteMarkdownFile,
  noteReadingMinutes,
  noteWordCount,
  relatedNotes,
  toggleMarkdownTask,
} from "@/lib/notes";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/notes/$noteId")({ component: NoteDetail });

function NoteDetail() {
  const { noteId } = Route.useParams();
  const note = useAppStore((state) => state.notes.find((item) => item.id === noteId));
  const notes = useAppStore((state) => state.notes);
  const updateNote = useAppStore((state) => state.updateNote);
  const duplicateNote = useAppStore((state) => state.duplicateNote);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const headings = useMemo(() => extractHeadings(note?.body ?? ""), [note?.body]);
  const connected = useMemo(() => (note ? relatedNotes(note, notes) : []), [note, notes]);
  const backlinks = useMemo(() => {
    if (!note) return [];
    const title = note.title.trim().toLocaleLowerCase();
    return notes.filter(
      (candidate) =>
        candidate.id !== note.id &&
        extractWikiLinks(candidate.body).some((link) => link.toLocaleLowerCase() === title),
    );
  }, [note, notes]);

  const toggleTask = useCallback(
    (taskIndex: number, done: boolean) => {
      const current = useAppStore.getState().notes.find((item) => item.id === noteId);
      if (!current) return;
      updateNote(noteId, { body: toggleMarkdownTask(current.body, taskIndex, done) });
    },
    [noteId, updateNote],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (!editing && !event.metaKey && !event.ctrlKey && event.key.toLocaleLowerCase() === "e") {
        event.preventDefault();
        navigate({ to: "/notes/$noteId/edit", params: { noteId } });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, noteId]);

  if (!note) {
    return (
      <AppShell>
        <PageHeader title="Note" />
        <EmptyState
          icon={FileText}
          title="Note not found"
          hint="It may have been deleted or restored from an earlier workspace backup."
          action={
            <Button onClick={() => navigate({ to: "/notes" })}>
              <ArrowLeft className="h-4 w-4" />
              Back to notes
            </Button>
          }
        />
      </AppShell>
    );
  }

  const words = noteWordCount(note.body);
  const readingMinutes = noteReadingMinutes(note.body);

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(noteMarkdownFile(note).text);
      toast.success("Note copied as Markdown");
    } catch {
      toast.error("Clipboard access is unavailable in this browser.");
    }
  };

  const makeCopy = () => {
    const copy = duplicateNote(note.id);
    if (copy) navigate({ to: "/notes/$noteId/edit", params: { noteId: copy.id } });
  };

  return (
    <AppShell>
      <header className="note-reader-routebar">
        <button
          type="button"
          className="focus-ring inline-flex min-h-11 items-center gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate({ to: "/notes" })}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Notes</span>
        </button>
        <span className="note-reader-route-context" aria-hidden="true">
          {note.notebook} / Reading
        </span>
        <Link
          to="/notes/$noteId/edit"
          params={{ noteId: note.id }}
          className="focus-ring gradient-primary ml-auto inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border border-primary px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-foreground"
        >
          <Edit3 className="h-4 w-4" />
          Edit
          <kbd className="hidden border-l border-white/20 pl-2 text-[9px] opacity-70 sm:inline">
            E
          </kbd>
        </Link>
      </header>

      {note.archived && (
        <div className="note-archive-banner" role="status">
          <Archive className="h-4 w-4" />
          This note is archived. It remains searchable and fully editable.
          <button type="button" onClick={() => updateNote(note.id, { archived: false })}>
            Restore
          </button>
        </div>
      )}

      <div className="note-reader-shell">
        <header className="note-reader-title-block">
          <div className="flex flex-wrap items-center gap-2">
            <span className="section-kicker">{note.notebook.toLocaleUpperCase()}</span>
            {note.pinned && (
              <span className="note-reader-state">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
          </div>
          <h1>{note.title || "Untitled note"}</h1>
          <div className="note-reader-meta" aria-label="Note information">
            <span title={new Date(note.updatedAt).toLocaleString()}>
              <Clock3 className="h-3.5 w-3.5" /> Edited {formatLongDate(note.updatedAt)}
            </span>
            <span>
              <FileText className="h-3.5 w-3.5" /> {words} {words === 1 ? "word" : "words"}
            </span>
            <span>
              <Clock3 className="h-3.5 w-3.5" /> {readingMinutes || 1} min read
            </span>
            <span title={new Date(note.createdAt).toLocaleString()}>
              <CalendarDays className="h-3.5 w-3.5" /> Created {formatLongDate(note.createdAt)}
            </span>
          </div>
          {note.tags.length > 0 && (
            <div className="note-reader-tags" aria-label="Note tags">
              {note.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </header>

        <div
          className="note-reader-actions"
          role="toolbar"
          aria-label="Note actions"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
            ];
            const current = buttons.indexOf(event.target as HTMLButtonElement);
            if (current < 0 || buttons.length === 0) return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
                    buttons.length;
            buttons[next]?.focus();
          }}
        >
          <ActionButton
            icon={note.pinned ? PinOff : Pin}
            label={note.pinned ? "Unpin" : "Pin"}
            onClick={() => updateNote(note.id, { pinned: !note.pinned })}
          />
          <ActionButton
            icon={note.archived ? ArchiveRestore : Archive}
            label={note.archived ? "Restore" : "Archive"}
            onClick={() => updateNote(note.id, { archived: !note.archived })}
          />
          <ActionButton icon={Copy} label="Copy" onClick={() => void copyNote()} />
          <ActionButton
            icon={Download}
            label="Export .md"
            onClick={() => downloadNoteMarkdown(note)}
          />
          <ActionButton icon={Files} label="Duplicate" onClick={makeCopy} />
          <ActionButton
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => setConfirmDelete(true)}
          />
        </div>

        <div className="note-reader-layout">
          <div className="note-reader-document">
            <MarkdownNote body={note.body} notes={notes} onToggleTask={toggleTask} />
          </div>

          <aside className="note-reader-aside" aria-label="Note navigation and connections">
            {headings.length > 0 && (
              <nav className="note-outline" aria-label="On this page">
                <p className="section-kicker">ON THIS PAGE</p>
                <ol>
                  {headings.map((heading) => (
                    <li
                      key={heading.id}
                      style={{ paddingLeft: `${(heading.level - 1) * 0.65}rem` }}
                    >
                      <a href={`#${heading.id}`}>{heading.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {(connected.length > 0 || backlinks.length > 0) && (
              <section className="note-connections" aria-labelledby="connected-notes-heading">
                <p id="connected-notes-heading" className="section-kicker">
                  CONNECTED NOTES
                </p>
                <div>
                  {[
                    ...new Map(
                      [...backlinks, ...connected].map((item) => [item.id, item]),
                    ).values(),
                  ].map((item) => (
                    <Link key={item.id} to="/notes/$noteId" params={{ noteId: item.id }}>
                      <Link2 className="h-3.5 w-3.5" />
                      <span>{item.title || "Untitled note"}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this note?"
        description="This removes the note from local storage. Export it first if you may need it later."
        footer={
          <div className="flex gap-2 pb-[max(env(safe-area-inset-bottom),12px)]">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Keep note
            </Button>
            <Button
              className="flex-1 bg-[var(--danger)]"
              onClick={() => {
                deleteNote(note.id);
                navigate({ to: "/notes" });
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          “{note.title || "Untitled note"}” and its Markdown content will be removed.
        </p>
      </BottomSheet>
    </AppShell>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Pin;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={danger ? "focus-ring is-danger" : "focus-ring"}
      onClick={onClick}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function formatLongDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(timestamp);
}
