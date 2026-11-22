import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Search, Users, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TagPicker } from "@/components/edit/TagPicker";
import { TextField, TextArea } from "@/components/edit/Fields";
import { ActionButton } from "@/components/edit/Buttons";
import { PersonCard } from "@/components/people/PersonCard";
import { useAppStore } from "@/store/useAppStore";
import {
  PERSON_FIELD_LABELS,
  filterPeople,
  personTagPalette,
  sortPeople,
  todayForNewPerson,
  type PeopleSort,
  type PersonTextField,
} from "@/lib/people";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/schema";

export const Route = createFileRoute("/people")({
  head: () => ({
    meta: [
      { title: "People I Met — SkillSync" },
      {
        name: "description",
        content: "A private journal for what you learned from the people you met.",
      },
      { property: "og:title", content: "People I Met — SkillSync" },
      {
        property: "og:description",
        content: "Remember who you met and what the encounter taught you. Private and local.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PeoplePage,
});

type PersonForm = {
  name: string;
  howMet: string;
  liked: string;
  disliked: string;
  learned: string;
  talkedAbout: string;
  locationContext: string;
  dateMet: string;
  followUp: string;
  tags: string[];
};

const TEXT_FIELDS: Array<{ key: PersonTextField; rows?: number; placeholder?: string }> = [
  { key: "howMet", placeholder: "College, event, friend introduction, online…" },
  { key: "liked", rows: 3, placeholder: "Good listener, communicated clearly…" },
  { key: "disliked", rows: 3, placeholder: "What you would rather not repeat — stated neutrally" },
  { key: "learned", rows: 3, placeholder: "The one thing worth remembering from this person" },
  { key: "talkedAbout", rows: 2, placeholder: "Topics you discussed" },
  { key: "locationContext", placeholder: "College canteen, tech event…" },
  { key: "followUp", rows: 2, placeholder: "Ask about the startup, send the book…" },
];

/** Suggestions only; no separate tag store is created for people. */
const STARTER_TAGS = ["College", "Mentor", "Friend", "Networking", "Interesting", "Learning"];

function emptyForm(): PersonForm {
  return {
    name: "",
    howMet: "",
    liked: "",
    disliked: "",
    learned: "",
    talkedAbout: "",
    locationContext: "",
    dateMet: todayForNewPerson(),
    followUp: "",
    tags: [],
  };
}

function formFromPerson(person: Person): PersonForm {
  return {
    name: person.name,
    howMet: person.howMet ?? "",
    liked: person.liked ?? "",
    disliked: person.disliked ?? "",
    learned: person.learned ?? "",
    talkedAbout: person.talkedAbout ?? "",
    locationContext: person.locationContext ?? "",
    dateMet: person.dateMet ?? "",
    followUp: person.followUp ?? "",
    tags: [...person.tags],
  };
}

function PeoplePage() {
  const people = useAppStore((state) => state.people);
  const addPerson = useAppStore((state) => state.addPerson);
  const updatePerson = useAppStore((state) => state.updatePerson);
  const deletePerson = useAppStore((state) => state.deletePerson);

  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<PeopleSort>("recent");
  const [editing, setEditing] = useState<Person | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<PersonForm>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Person | null>(null);

  const palette = useMemo(() => personTagPalette(people), [people]);
  const suggestions = useMemo(() => Array.from(new Set([...STARTER_TAGS, ...palette])), [palette]);
  const visible = useMemo(() => {
    const filtered = filterPeople(people, query, tagFilter);
    return sortPeople(filtered, sort);
  }, [people, query, tagFilter, sort]);

  const openAdd = () => {
    setForm(emptyForm());
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (person: Person) => {
    setForm(formFromPerson(person));
    setEditing(person);
    setSheetOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      haptics.error();
      sound.error();
      toast.error("Add a name for this person");
      return;
    }
    if (editing) {
      updatePerson(editing.id, form);
      toast.success("Entry updated");
    } else {
      addPerson(form);
      toast.success("Person saved to your private journal");
    }
    haptics.success();
    sound.success();
    setEditing(null);
    setSheetOpen(false);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow={
          <Link to="/profile" className="page-back-link" aria-label="Back to profile">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="truncate">Private journal</span>
          </Link>
        }
        title="People I Met."
        subtitle="A quiet place to remember people and the lessons you took from them. Only you can see these notes."
        right={<PrimaryAction label="Add person" onClick={openAdd} />}
      />

      <div className="space-y-4 px-5 pb-24 lg:px-2">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-primary/30 bg-primary/10 text-primary-glow">
              <Users className="h-4 w-4" strokeWidth={1.7} />
            </span>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              This is a personal learning journal, not a social network. Nothing is shared, scored,
              inferred or sent anywhere. Write only what you want to remember.
            </p>
          </div>
        </Card>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
            strokeWidth={1.75}
          />
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people and lessons"
            aria-label="Search people"
            className="pl-10 pr-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Sort people"
            value={sort}
            onChange={(event) => setSort(event.target.value as PeopleSort)}
            className="font-numerical h-10 rounded-[4px] border border-border bg-background px-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-foreground"
          >
            <option value="recent">Most recently met</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="added">Recently added</option>
          </select>
          <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {[null, ...suggestions].map((tag) => (
              <button
                key={tag ?? "all"}
                type="button"
                onClick={() => setTagFilter(tag)}
                aria-pressed={(tag ?? null) === tagFilter}
                className={cn(
                  "font-numerical min-h-10 shrink-0 rounded-[4px] border px-3 py-2 text-[9px] font-medium uppercase tracking-[0.08em] transition-colors",
                  tagFilter === tag
                    ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] text-primary-glow"
                    : "border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {tag ?? "All"}
              </button>
            ))}
          </div>
        </div>

        <SectionHeader
          title="Journal"
          action={`${visible.length} ${visible.length === 1 ? "entry" : "entries"}`}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={people.length === 0 ? "No entries yet" : "No matches"}
            hint={
              people.length === 0
                ? "Record a name and one thing you learned — that is enough to begin."
                : "Try a different search or tag."
            }
            action={
              people.length === 0 ? (
                <ActionButton onClick={openAdd}>
                  <Plus className="h-4 w-4" /> Add person
                </ActionButton>
              ) : undefined
            }
          />
        ) : (
          <div className="auto-grid">
            {visible.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onEdit={openEdit}
                onDelete={setConfirmDelete}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit person" : "New person"}
        description="Leave anything blank that you do not want to remember. Blank fields are never shown."
        className="max-h-[95dvh]"
        footer={
          <div className="flex gap-2">
            <ActionButton
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSheetOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </ActionButton>
            <ActionButton className="flex-1" onClick={save}>
              Save entry
            </ActionButton>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Name *
            </span>
            <TextField
              autoFocus
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Who did you meet?"
            />
          </label>

          {TEXT_FIELDS.map(({ key, rows, placeholder }) => (
            <label key={key} className="block space-y-1.5">
              <span className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                {PERSON_FIELD_LABELS[key]}
              </span>
              {rows ? (
                <TextArea
                  rows={rows}
                  value={form[key]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [key]: event.target.value }))
                  }
                  placeholder={placeholder}
                />
              ) : (
                <TextField
                  value={form[key]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [key]: event.target.value }))
                  }
                  placeholder={placeholder}
                />
              )}
            </label>
          ))}

          <label className="block space-y-1.5">
            <span className="font-numerical text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {PERSON_FIELD_LABELS.dateMet}
            </span>
            <TextField
              type="date"
              value={form.dateMet}
              onChange={(event) =>
                setForm((current) => ({ ...current, dateMet: event.target.value }))
              }
            />
          </label>

          <div className="space-y-1.5">
            <span className="font-numerical block text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              Tags
            </span>
            <TagPicker
              value={form.tags}
              suggestions={suggestions}
              onChange={(tags) => setForm((current) => ({ ...current, tags }))}
              placeholder="Personal tag e.g. Mentor"
            />
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name ?? "this entry"}?`}
        description="This permanently removes the private note from this device."
        onConfirm={() => {
          if (confirmDelete) {
            deletePerson(confirmDelete.id);
            haptics.impact();
            sound.trash();
            toast.success("Entry deleted");
          }
          setConfirmDelete(null);
        }}
      />
    </AppShell>
  );
}
