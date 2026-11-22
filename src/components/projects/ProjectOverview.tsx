import { Check, ExternalLink, Pencil } from "lucide-react";
import { Card, Chip, ProgressBar } from "@/components/ui/primitives";
import { IconButton } from "@/components/edit/Buttons";
import { isSafeUrl, safeHref } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/schema";

/**
 * Read-first project view. Everything the user actually entered is visible
 * without opening Edit; fields that hold no data are never rendered at all.
 *
 * Primary: name, status, progress, deadline.
 * Secondary: description, tech stack.
 * Supporting: tasks, notes and links in quiet disclosure groups.
 */
export function ProjectOverview({
  project,
  onEdit,
}: {
  project: Project;
  onEdit: (project: Project) => void;
}) {
  const description = project.description.trim();
  const notes = project.notes.trim();
  const tech = project.techStack.filter((item) => item.trim());
  const tasks = project.tasks;
  const completed = tasks.filter((task) => task.done).length;
  const link = project.githubUrl.trim();
  const safeLink = link.length > 0 && isSafeUrl(link);

  return (
    <Card className="h-full p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              tone={
                project.status === "active"
                  ? "primary"
                  : project.status === "done"
                    ? "success"
                    : "default"
              }
            >
              {project.status === "active"
                ? "In progress"
                : project.status === "done"
                  ? "Done"
                  : "Planning"}
            </Chip>
            {project.deadline ? <Chip>Due {project.deadline}</Chip> : null}
          </div>
          <h3 className="font-editorial mt-2 text-[22px] font-normal leading-tight tracking-[-0.03em] text-foreground">
            {project.title}
          </h3>
          {description ? (
            <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <IconButton
          size="sm"
          aria-label={`Edit ${project.title}`}
          onClick={() => onEdit(project)}
          title="Edit project"
        >
          <Pencil className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>Progress</span>
          <span className="font-numerical tabular-nums text-foreground/80">
            {project.progress}%
          </span>
        </div>
        <ProgressBar value={project.progress} tone="gradient" />
      </div>

      {tech.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tech.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {tasks.length > 0 ? (
        <details className="group mt-4 border-t border-border pt-3">
          <summary className="font-numerical flex cursor-pointer list-none items-center justify-between text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            <span>
              Tasks · {completed} of {tasks.length} done
            </span>
            <span className="transition-transform group-open:rotate-90">›</span>
          </summary>
          <ul className="mt-2.5 space-y-1.5">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-[12px]">
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
                    task.done
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-border text-transparent",
                  )}
                  aria-hidden
                >
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
                <span className={cn("min-w-0", task.done && "text-muted-foreground line-through")}>
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {notes ? (
        <details className="group mt-3 border-t border-border pt-3">
          <summary className="font-numerical flex cursor-pointer list-none items-center justify-between text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            <span>Notes</span>
            <span className="transition-transform group-open:rotate-90">›</span>
          </summary>
          <p className="mt-2.5 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/80">
            {notes}
          </p>
        </details>
      ) : null}

      {link ? (
        <div className="mt-3 border-t border-border pt-3">
          {safeLink ? (
            <a
              href={safeHref(link)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11.5px] text-primary-glow hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="truncate">{link}</span>
            </a>
          ) : (
            <span className="text-[11.5px] text-muted-foreground">{link}</span>
          )}
        </div>
      ) : null}
    </Card>
  );
}
