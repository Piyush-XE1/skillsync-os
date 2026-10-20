import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Clock3,
  FileText,
  Grid2X2,
  Hash,
  List,
  Pin,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { BottomSheet } from "@/components/edit/Sheet";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import {
  collectNotebooks,
  DEFAULT_NOTEBOOK,
  normalizeNotebook,
  NOTE_TEMPLATES,
  noteExcerpt,
  noteWordCount,
  stripMarkdown,
  type NoteTemplate,
} from "@/lib/notes";
import type { Note } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/notes/")({ component: NotesIndex });

type NoteScope = "notes" | "pinned" | "archive";
type NoteSort = "updated" | "created" | "title";
type NoteView = "grid" | "list";

function NotesIndex() {
  const notes = useAppStore((state) => state.notes);
  const addNote = useAppStore((state) => state.addNote);
  const updateNote = useAppStore((state) => state.updateNote);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<NoteScope>("notes");
  const [notebook, setNotebook] = useState("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<NoteSort>("updated");
  const [view, setView] = useState<NoteView>("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [template, setTemplate] = useState<NoteTemplate>(NOTE_TEMPLATES[0]);
  const [newNotebook, setNewNotebook] = useState(DEFAULT_NOTEBOOK);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeNotes = notes.filter((note) => !note.archived);
  const archivedNotes = notes.filter((note) => note.archived);
  const notebooks = useMemo(() => collectNotebooks(notes), [notes]);
  const tags = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const note of notes) {
      for (const value of note.tags) {
        const key = value.toLocaleLowerCase();
        const previous = counts.get(key);
        counts.set(key, { label: previous?.label ?? value, count: (previous?.count ?? 0) + 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [notes]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return notes
      .filter((note) => {
        if (scope === "archive" && !note.archived) return false;
        if (scope !== "archive" && note.archived) return false;
        if (scope === "pinned" && !note.pinned) return false;
        if (
          notebook !== "all" &&
          normalizeNotebook(note.notebook).toLocaleLowerCase() !== notebook.toLocaleLowerCase()
        )
          return false;
        if (tag !== "all" && !note.tags.some((value) => value.toLocaleLowerCase() === tag)) {
          return false;
        }
        if (!needle) return true;
        return [note.title, stripMarkdown(note.body), note.notebook, note.tags.join(" ")].some(
          (value) => value.toLocaleLowerCase().includes(needle),
        );
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned && scope !== "archive") return a.pinned ? -1 : 1;
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "created") return b.createdAt - a.createdAt;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, notebook, query, scope, sort, tag]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "n") {
        event.preventDefault();
        setCreateOpen(true);
        return;
      }
      if (!editing && event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current && query) {
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query]);

  const createFromTemplate = () => {
    const note = addNote({
      title: template.title,
      body: template.body,
      tags: template.tags,
      notebook: normalizeNotebook(newNotebook),
    });
    setCreateOpen(false);
    setTemplate(NOTE_TEMPLATES[0]);
    navigate({ to: "/notes/$noteId/edit", params: { noteId: note.id } });
  };

  const chooseScope = (next: NoteScope) => {
    setScope(next);
    setNotebook("all");
    setTag("all");
  };

  return (
    <AppShell>
      <PageHeader
        title="Notes"
        subtitle={`${activeNotes.length} active · ${archivedNotes.length} archived · Markdown, locally saved`}
        right={<PrimaryAction label="New note" onClick={() => setCreateOpen(true)} />}
      />

      <div className="note-library-layout">
        <aside className="note-library-sidebar" aria-label="Note collections">
          <div className="note-collection-row" role="group" aria-label="Note status">
            <CollectionButton
              active={scope === "notes"}
              icon={StickyNote}
              label="All notes"
              count={activeNotes.length}
              onClick={() => chooseScope("notes")}
            />
            <CollectionButton
              active={scope === "pinned"}
              icon={Pin}
              label="Pinned"
              count={activeNotes.filter((note) => note.pinned).length}
              onClick={() => chooseScope("pinned")}
            />
            <CollectionButton
              active={scope === "archive"}
              icon={Archive}
              label="Archive"
              count={archivedNotes.length}
              onClick={() => chooseScope("archive")}
            />
          </div>

          {notebooks.length > 0 && (
            <div className="note-sidebar-section">
              <p className="section-kicker">NOTEBOOKS</p>
              <div className="note-collection-row">
                {notebooks.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className={cn(
                      "focus-ring note-sidebar-filter",
                      notebook === item.name && "is-active",
                    )}
                    aria-pressed={notebook === item.name}
                    onClick={() => setNotebook(notebook === item.name ? "all" : item.name)}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="truncate">{item.name}</span>
                    <span className="font-numerical ml-auto text-[10px]">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="note-sidebar-section">
              <p className="section-kicker">TAGS</p>
              <div className="note-tag-cloud">
                {tags.slice(0, 12).map((item) => {
                  const key = item.label.toLocaleLowerCase();
                  return (
                    <button
                      key={key}
                      type="button"
                      className={cn("focus-ring note-filter-chip", tag === key && "is-active")}
                      aria-pressed={tag === key}
                      onClick={() => setTag(tag === key ? "all" : key)}
                    >
                      <Hash className="h-3 w-3" />
                      {item.label}
                      <span className="font-numerical">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        <main className="min-w-0">
          <div className="note-discovery-bar">
            <label className="note-search-field">
              <span className="sr-only">Search all notes</span>
              <Search className="h-4 w-4" aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, writing, tags…"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="focus-ring flex h-11 w-11 items-center justify-center"
                  aria-label="Clear note search"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd aria-hidden="true">/</kbd>
            </label>

            <label className="note-select-control">
              <span className="sr-only">Sort notes</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as NoteSort)}>
                <option value="updated">Recently edited</option>
                <option value="created">Recently created</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>

            <div className="note-view-switch" role="group" aria-label="Note layout">
              <button
                type="button"
                className="focus-ring"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="focus-ring"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-3 flex min-h-7 flex-wrap items-center gap-2" aria-live="polite">
            <p className="font-numerical text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {visible.length} {visible.length === 1 ? "note" : "notes"}
              {query ? ` matching “${query}”` : ""}
            </p>
            {notebook !== "all" && (
              <FilterToken label={notebook} onClear={() => setNotebook("all")} />
            )}
            {tag !== "all" && <FilterToken label={`#${tag}`} onClear={() => setTag("all")} />}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={notes.length === 0 ? "Your notebook starts here" : "No notes match this view"}
              hint={
                notes.length === 0
                  ? "Capture a thought, build a study guide, or begin from a focused template."
                  : "Clear a filter, try another phrase, or create a new page."
              }
              action={
                <Button className="gradient-primary" onClick={() => setCreateOpen(true)}>
                  New note
                </Button>
              }
            />
          ) : (
            <div className={cn("note-card-grid", view === "list" && "is-list")}>
              {visible.map((note, index) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  query={query}
                  index={index}
                  onPin={() => updateNote(note.id, { pinned: !note.pinned })}
                  onArchive={() => updateNote(note.id, { archived: !note.archived })}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <BottomSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a note"
        description="Choose a useful structure or begin with a blank page. Everything stays editable."
        footer={
          <div className="pb-[max(env(safe-area-inset-bottom),12px)]">
            <Button className="gradient-primary h-11 w-full" onClick={createFromTemplate}>
              Create {template.name.toLocaleLowerCase()}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pb-2">
          <div className="note-template-grid" role="radiogroup" aria-label="Note template">
            {NOTE_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={template.id === item.id}
                className={cn(
                  "focus-ring note-template-option",
                  template.id === item.id && "is-selected",
                )}
                onClick={() => setTemplate(item)}
              >
                <span className="font-display text-[15px]">{item.name}</span>
                <span>{item.description}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-note-notebook" className="text-[12px] font-medium">
              Notebook
            </label>
            <Input
              id="new-note-notebook"
              list="note-notebooks"
              value={newNotebook}
              onChange={(event) => setNewNotebook(event.target.value)}
              placeholder={DEFAULT_NOTEBOOK}
              autoComplete="off"
            />
            <datalist id="note-notebooks">
              {notebooks.map((item) => (
                <option key={item.name} value={item.name} />
              ))}
            </datalist>
          </div>
        </div>
      </BottomSheet>
    </AppShell>
  );
}

function CollectionButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: typeof StickyNote;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("focus-ring note-sidebar-filter", active && "is-active")}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      <span>{label}</span>
      <span className="font-numerical ml-auto text-[10px]">{count}</span>
    </button>
  );
}

function FilterToken({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" className="focus-ring note-active-filter" onClick={onClear}>
      {label}
      <X className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">Clear filter</span>
    </button>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const expression = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
  return (
    <>
      {text
        .split(expression)
        .map((part, index) =>
          part.toLocaleLowerCase() === needle.toLocaleLowerCase() ? (
            <mark key={`${part}-${index}`}>{part}</mark>
          ) : (
            <Fragment key={`${part}-${index}`}>{part}</Fragment>
          ),
        )}
    </>
  );
}

function NoteCard({
  note,
  query,
  index,
  onPin,
  onArchive,
}: {
  note: Note;
  query: string;
  index: number;
  onPin: () => void;
  onArchive: () => void;
}) {
  const excerpt = noteExcerpt(note.body);
  const words = noteWordCount(note.body);
  return (
    <article
      className={cn("note-card", note.pinned && "is-pinned", note.archived && "is-archived")}
    >
      <Link
        to="/notes/$noteId"
        params={{ noteId: note.id }}
        className="focus-ring note-card-link"
        aria-label={`Open ${note.title || "Untitled note"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-numerical text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            {String(index + 1).padStart(2, "0")} / {note.notebook}
          </span>
          {note.pinned && <Pin className="h-3.5 w-3.5 text-[var(--primary)]" aria-label="Pinned" />}
        </div>
        <h2 className="mt-4 font-display text-[clamp(1.15rem,2vw,1.5rem)] leading-[1.08]">
          <Highlight text={note.title || "Untitled note"} query={query} />
        </h2>
        <p className="note-card-excerpt">
          {excerpt ? (
            <Highlight text={excerpt} query={query} />
          ) : (
            "A clear page, ready for writing."
          )}
        </p>
        {note.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
            {note.tags.slice(0, 4).map((value) => (
              <span key={value} className="note-card-tag">
                {value}
              </span>
            ))}
            {note.tags.length > 4 && <span className="note-card-tag">+{note.tags.length - 4}</span>}
          </div>
        )}
        <div className="note-card-meta">
          <span>
            <Clock3 className="h-3 w-3" />
            {formatNoteDate(note.updatedAt)}
          </span>
          <span>
            <FileText className="h-3 w-3" />
            {words} {words === 1 ? "word" : "words"}
          </span>
        </div>
      </Link>
      <div className="note-card-actions">
        <button
          type="button"
          className="focus-ring"
          onClick={onPin}
          aria-label={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
          title={note.pinned ? "Unpin" : "Pin"}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="focus-ring"
          onClick={onArchive}
          aria-label={
            note.archived ? `Restore ${note.title} from archive` : `Archive ${note.title}`
          }
          title={note.archived ? "Restore from archive" : "Archive"}
        >
          {note.archived ? (
            <ArchiveRestore className="h-3.5 w-3.5" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </article>
  );
}

function formatNoteDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}
