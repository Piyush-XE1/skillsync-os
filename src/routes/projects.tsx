import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, FolderKanban, Trash2, ExternalLink } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card, Chip, ProgressBar } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea, NO_AUTOFILL_PROPS } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { isSafeUrl, safeHref } from "@/lib/url";
import type { Project } from "@/lib/schema";
import { haptics } from "@/lib/haptics";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — SkillSync" },
      { name: "description", content: "Ship real work. Track status, deadlines and tech stack." },
      { property: "og:title", content: "Projects — SkillSync" },
      { property: "og:description", content: "Ship real work and track progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsPage,
});

type Filter = "all" | "planning" | "active" | "done";

function ProjectsPage() {
  const hydrated = useHydrated();
  const projects = useAppStore((s) => s.projects);
  const addProject = useAppStore((s) => s.addProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const addProjectTask = useAppStore((s) => s.addProjectTask);
  const updateProjectTask = useAppStore((s) => s.updateProjectTask);
  const deleteProjectTask = useAppStore((s) => s.deleteProjectTask);

  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newTech, setNewTech] = useState("");
  /** Re-entrancy guard: a double tap must never create two projects. */
  const createGuard = useRef(false);

  const createProject = () => {
    if (createGuard.current) return;
    createGuard.current = true;
    const p = addProject({ title: "Untitled project" });
    setEditing(p);
  };

  // The guard spans until the editor sheet opens; while it is open the create
  // buttons sit behind its backdrop and cannot be tapped again anyway.
  useEffect(() => {
    createGuard.current = false;
  }, [editing]);

  const filtered = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => p.status === filter)),
    [projects, filter],
  );

  const current = editing ? (projects.find((p) => p.id === editing.id) ?? editing) : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Workspace"
        title="Projects."
        subtitle={
          projects.length === 0
            ? "Everything you're building, in one place."
            : `${projects.filter((p) => p.status === "active").length} active · ${projects.filter((p) => p.status === "done").length} shipped`
        }
        right={<PrimaryAction label="Add Project" onClick={createProject} />}
      />

      <div className="mb-5 flex gap-2 px-5 lg:px-2">
        {(["all", "planning", "active", "done"] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-full border px-3 py-1.5 text-[12px] font-medium capitalize transition-colors " +
                (active
                  ? "border-white/10 bg-white/[0.06] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground/80")
              }
            >
              {f}
            </button>
          );
        })}
      </div>

      <div className="auto-grid px-5 lg:px-2">
        {hydrated && filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            hint="Every skill compounds when you ship."
            action={
              <ActionButton onClick={createProject}>
                <Plus className="h-4 w-4" /> New project
              </ActionButton>
            }
          />
        ) : null}

        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setEditing(p)}
            className="block h-full w-full text-left"
          >
            <Card className="h-full p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip
                      tone={
                        p.status === "active"
                          ? "primary"
                          : p.status === "done"
                            ? "success"
                            : "default"
                      }
                    >
                      {p.status === "active"
                        ? "In progress"
                        : p.status === "done"
                          ? "Done"
                          : "Planning"}
                    </Chip>
                    {p.deadline ? <Chip>Due {p.deadline}</Chip> : null}
                  </div>
                  <div className="text-[15px] font-semibold tracking-tight">{p.title}</div>
                  {p.description ? (
                    <div className="line-clamp-2 text-[12.5px] text-muted-foreground">
                      {p.description}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span>Progress</span>
                  <span className="text-foreground/80">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} tone="gradient" />
              </div>

              {p.techStack.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.techStack.map((t, j) => (
                    <span
                      key={j}
                      className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>
          </button>
        ))}
      </div>

      <BottomSheet
        open={!!current}
        onClose={() => setEditing(null)}
        title="Edit project"
        className="max-h-[95dvh]"
      >
        {current ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Title
              </label>
              <TextField
                value={current.title}
                onChange={(e) => updateProject(current.id, { title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Description
              </label>
              <TextArea
                rows={3}
                value={current.description}
                onChange={(e) => updateProject(current.id, { description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Status
                </label>
                <select
                  value={current.status}
                  onChange={(e) =>
                    updateProject(current.id, {
                      status: e.target.value as Project["status"],
                    })
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-[13.5px] outline-none"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Deadline
                </label>
                <TextField
                  type="date"
                  value={current.deadline ?? ""}
                  onChange={(e) =>
                    updateProject(current.id, {
                      deadline: e.target.value || null,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Progress
                </label>
                <span className="text-[12px] text-muted-foreground">{current.progress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={current.progress}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  // Only pulse when crossing a 10% milestone — never per pixel.
                  if (Math.floor(next / 10) !== Math.floor(current.progress / 10)) {
                    haptics.selection();
                  }
                  updateProject(current.id, { progress: next });
                }}
                className="w-full accent-[var(--primary)]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Tech stack
              </label>
              <div className="flex flex-wrap gap-1.5">
                {current.techStack.map((t, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      updateProject(current.id, {
                        techStack: current.techStack.filter((_, j) => j !== i),
                      })
                    }
                    className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10.5px] font-medium text-muted-foreground"
                  >
                    {t} ×
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <TextField
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  placeholder="Add tech (e.g. React)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTech.trim()) {
                      updateProject(current.id, {
                        techStack: [...current.techStack, newTech.trim()],
                      });
                      setNewTech("");
                    }
                  }}
                />
                <IconButton
                  variant="primary"
                  size="lg"
                  aria-label="Add tech"
                  onClick={() => {
                    if (!newTech.trim()) return;
                    updateProject(current.id, {
                      techStack: [...current.techStack, newTech.trim()],
                    });
                    setNewTech("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                GitHub URL
              </label>
              <div className="flex gap-2">
                <TextField
                  value={current.githubUrl}
                  onChange={(e) => updateProject(current.id, { githubUrl: e.target.value })}
                  placeholder="https://github.com/..."
                />
                {current.githubUrl ? (
                  <a
                    href={safeHref(current.githubUrl)}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!isSafeUrl(current.githubUrl)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-muted-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Tasks
              </label>
              <div className="space-y-1.5">
                {current.tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) =>
                        updateProjectTask(current.id, t.id, {
                          done: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    <input
                      {...NO_AUTOFILL_PROPS}
                      value={t.title}
                      onChange={(e) =>
                        updateProjectTask(current.id, t.id, {
                          title: e.target.value,
                        })
                      }
                      className="flex-1 bg-transparent text-[13px] outline-none"
                    />
                    <IconButton
                      size="sm"
                      variant="danger"
                      aria-label="Remove"
                      onClick={() => deleteProjectTask(current.id, t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <TextField
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Add task"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTask.trim()) {
                      addProjectTask(current.id, newTask.trim());
                      setNewTask("");
                    }
                  }}
                />
                <IconButton
                  variant="primary"
                  size="lg"
                  aria-label="Add"
                  onClick={() => {
                    if (!newTask.trim()) return;
                    addProjectTask(current.id, newTask.trim());
                    setNewTask("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Notes
              </label>
              <TextArea
                rows={4}
                value={current.notes}
                onChange={(e) => updateProject(current.id, { notes: e.target.value })}
              />
            </div>

            <ActionButton
              variant="danger"
              className="w-full"
              onClick={() => setConfirmDelete(current.id)}
            >
              <Trash2 className="h-4 w-4" /> Delete project
            </ActionButton>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete project?"
        onConfirm={() => {
          if (confirmDelete) {
            deleteProject(confirmDelete);
            setEditing(null);
          }
        }}
      />
    </AppShell>
  );
}
