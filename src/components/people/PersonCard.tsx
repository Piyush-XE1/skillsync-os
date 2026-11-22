import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { IconButton } from "@/components/edit/Buttons";
import { personDetails, personMeta } from "@/lib/people";
import type { Person } from "@/lib/schema";

/**
 * A private learning-journal entry. Only populated fields exist in the record
 * and only those are rendered — there are no empty "What I liked" rows to
 * scroll past. The compact face shows name, context and the takeaway; the rest
 * lives in a quiet disclosure, never behind an Edit button.
 */
export function PersonCard({
  person,
  onEdit,
  onDelete,
}: {
  person: Person;
  onEdit: (person: Person) => void;
  onDelete: (person: Person) => void;
}) {
  const meta = personMeta(person);
  const learned = person.learned?.trim();
  const details = personDetails(person).filter(
    (field) =>
      field.key !== "learned" &&
      field.key !== "howMet" &&
      field.key !== "dateMet" &&
      field.key !== "tags",
  );

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-editorial truncate text-[21px] font-normal leading-tight tracking-[-0.03em] text-foreground">
            {person.name}
          </h3>
          {meta.length > 0 ? (
            <p className="font-numerical mt-1.5 text-[9px] uppercase tracking-[0.09em] text-primary">
              {meta.join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            size="sm"
            aria-label={`Edit ${person.name}`}
            onClick={() => onEdit(person)}
            title="Edit entry"
          >
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            size="sm"
            variant="danger"
            aria-label={`Delete ${person.name}`}
            onClick={() => onDelete(person)}
            title="Delete entry"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {person.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {person.tags.map((tag) => (
            <span
              key={tag}
              className="font-numerical rounded-[4px] border border-primary/30 bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] px-2 py-1 text-[8.5px] uppercase tracking-[0.07em] text-primary-glow"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {learned ? (
        <div className="mt-4 border-l-2 border-primary bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))] px-3 py-2.5">
          <div className="font-numerical text-[8.5px] uppercase tracking-[0.12em] text-muted-foreground">
            What I learned
          </div>
          <p className="font-editorial mt-1 text-[15px] leading-snug text-foreground">{learned}</p>
        </div>
      ) : null}

      {details.length > 0 ? (
        <details className="group mt-4 border-t border-border pt-3">
          <summary className="font-numerical flex cursor-pointer list-none items-center justify-between text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            <span>More from this encounter</span>
            <span className="transition-transform group-open:rotate-90">›</span>
          </summary>
          <dl className="mt-3 space-y-3">
            {details.map((field) => (
              <div key={field.key}>
                <dt className="font-numerical text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/85">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </Card>
  );
}
