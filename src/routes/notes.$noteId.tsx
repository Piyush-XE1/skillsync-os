import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Pin, StickyNote } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { useAppStore, useHydrated } from "@/store/useAppStore";

export const Route = createFileRoute("/notes/$noteId")({
  head: () => ({
    meta: [
      { title: "Note — SkillSync" },
      { name: "description", content: "Read a saved note." },
      { property: "og:title", content: "Note — SkillSync" },
      { property: "og:description", content: "Read a saved note." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NoteDetail,
});

function NoteDetail() {
  const { noteId } = Route.useParams();
  const hydrated = useHydrated();
  const note = useAppStore((s) => s.notes.find((n) => n.id === noteId));

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/notes"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back to notes"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        {note ? (
          <Link
            to="/notes/$noteId/edit"
            params={{ noteId }}
            className="glass flex h-11 w-11 items-center justify-center rounded-[14px] active:scale-95"
            aria-label="Edit note"
          >
            <Pencil className="h-[17px] w-[17px] text-foreground" strokeWidth={1.75} />
          </Link>
        ) : null}
      </header>

      {!note ? (
        hydrated ? (
          <div className="px-5 lg:px-2">
            <EmptyState icon={StickyNote} title="Note not found" hint="It may have been deleted." />
          </div>
        ) : null
      ) : (
        <div className="px-5 lg:px-2">
          <div className="mb-4">
            <div className="flex items-start gap-2">
              {note.pinned ? (
                <Pin className="mt-2 h-4 w-4 shrink-0 text-[var(--primary-glow)]" />
              ) : null}
              <h1 className="text-balance text-[26px] font-semibold leading-tight tracking-[-0.02em]">
                {note.title || "Untitled"}
              </h1>
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Updated{" "}
              {new Date(note.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <Card className="p-4">
            {note.body ? (
              <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
                {note.body}
              </div>
            ) : (
              <div className="text-[13.5px] text-muted-foreground">
                This note is empty. Tap the pencil to start writing.
              </div>
            )}
          </Card>

          {note.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {note.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
