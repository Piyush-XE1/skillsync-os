import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Minus, Pencil } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, ProgressBar } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import type { Subject } from "@/lib/schema";

export const Route = createFileRoute("/attendance/$semester")({
  head: ({ params }) => ({
    meta: [
      { title: `Semester ${params.semester} — SkillSync` },
      { name: "description", content: `Subjects and attendance for semester ${params.semester}.` },
      { property: "og:title", content: `Semester ${params.semester} — SkillSync` },
      { property: "og:description", content: "Per-subject attendance tracker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SemesterPage,
});

function pct(present: number, absent: number): number {
  const total = present + absent;
  if (total <= 0) return 0;
  return Math.round((present / total) * 100);
}

function SemesterPage() {
  const { semester } = Route.useParams();
  const hydrated = useHydrated();
  const semNum = Math.max(1, Math.min(8, Number(semester) || 1));

  const allSubjects = useAppStore((s) => s.attendance.subjects);
  const subjects = useMemo(
    () => allSubjects.filter((x) => x.semester === semNum),
    [allSubjects, semNum],
  );
  const addSubject = useAppStore((s) => s.addSubject);
  const updateSubject = useAppStore((s) => s.updateSubject);
  const deleteSubject = useAppStore((s) => s.deleteSubject);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [minReq, setMinReq] = useState("75");
  const [editing, setEditing] = useState<Subject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const overall = useMemo(() => {
    let p = 0;
    let a = 0;
    for (const s of subjects) {
      p += s.present;
      a += s.absent;
    }
    return { present: p, absent: a, pct: pct(p, a), total: p + a };
  }, [subjects]);

  const resetForm = () => {
    setName("");
    setFaculty("");
    setMinReq("75");
  };

  const submitAdd = () => {
    if (!name.trim()) return;
    addSubject({
      semester: semNum,
      name: name.trim(),
      faculty: faculty.trim(),
      minRequired: Number(minReq) || 75,
    });
    resetForm();
    setAddOpen(false);
    toast.success("Subject added");
  };

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3 px-5 lg:px-2 pt-1">
        <Link
          to="/attendance"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Attendance
          </div>
          <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">
            Semester {semNum}
          </h1>
        </div>
        <IconButton
          variant="primary"
          size="lg"
          aria-label="Add subject"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
        </IconButton>
      </header>

      <div className="space-y-4 px-5 lg:px-2 pb-24">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between text-[12px] text-muted-foreground">
            <span>Semester attendance</span>
            <span className="text-foreground/80">
              {overall.pct}% · {overall.present}/{overall.total}
            </span>
          </div>
          <ProgressBar value={overall.pct} tone="gradient" />
        </Card>

        {hydrated && subjects.length === 0 ? (
          <EmptyState
            title="No subjects for this semester"
            hint="Add subjects to start tracking."
            action={
              <ActionButton onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add subject
              </ActionButton>
            }
          />
        ) : null}

        {subjects.map((sub) => {
          const p = pct(sub.present, sub.absent);
          const below = p < sub.minRequired && sub.present + sub.absent > 0;
          return (
            <Card key={sub.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold tracking-tight">{sub.name}</div>
                  {sub.faculty ? (
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">{sub.faculty}</div>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Chip tone={below ? "danger" : "primary"}>{p}%</Chip>
                    <Chip>
                      {sub.present}/{sub.present + sub.absent} classes
                    </Chip>
                    <Chip>Min {sub.minRequired}%</Chip>
                  </div>
                </div>
                <div className="flex gap-1">
                  <IconButton size="sm" aria-label="Edit" onClick={() => setEditing(sub)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="danger"
                    aria-label="Delete"
                    onClick={() => setConfirmDelete(sub.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-3">
                <ProgressBar value={p} tone="gradient" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSubject(sub.id, { present: sub.present + 1 })}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] py-2 text-[12.5px] font-medium text-emerald-200 active:scale-[0.97]"
                >
                  <Plus className="h-3.5 w-3.5" /> Present
                </button>
                <button
                  onClick={() => updateSubject(sub.id, { absent: sub.absent + 1 })}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/[0.08] py-2 text-[12.5px] font-medium text-[var(--danger)] active:scale-[0.97]"
                >
                  <Plus className="h-3.5 w-3.5" /> Absent
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  disabled={sub.present === 0}
                  onClick={() =>
                    updateSubject(sub.id, {
                      present: Math.max(0, sub.present - 1),
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-[11.5px] text-muted-foreground active:scale-[0.97] disabled:opacity-40"
                >
                  <Minus className="h-3 w-3" /> Undo present
                </button>
                <button
                  disabled={sub.absent === 0}
                  onClick={() =>
                    updateSubject(sub.id, {
                      absent: Math.max(0, sub.absent - 1),
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-[11.5px] text-muted-foreground active:scale-[0.97] disabled:opacity-40"
                >
                  <Minus className="h-3 w-3" /> Undo absent
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add subject">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Name</label>
            <TextField
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Structures"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Faculty</label>
            <TextField
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              placeholder="Prof. name (optional)"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Minimum required %</label>
            <TextField
              type="number"
              inputMode="numeric"
              value={minReq}
              onChange={(e) => setMinReq(e.target.value)}
              placeholder="75"
            />
          </div>
          <ActionButton className="w-full" onClick={submitAdd}>
            Add subject
          </ActionButton>
        </div>
      </BottomSheet>

      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title="Edit subject">
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Name</label>
              <TextField
                value={editing.name}
                onChange={(e) => updateSubject(editing.id, { name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Faculty</label>
              <TextField
                value={editing.faculty}
                onChange={(e) => updateSubject(editing.id, { faculty: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Minimum required %</label>
              <TextField
                type="number"
                inputMode="numeric"
                value={String(editing.minRequired)}
                onChange={(e) =>
                  updateSubject(editing.id, {
                    minRequired: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <ActionButton className="w-full" onClick={() => setEditing(null)}>
              Done
            </ActionButton>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete subject?"
        description="Attendance history for this subject will be lost."
        onConfirm={() => {
          if (confirmDelete) deleteSubject(confirmDelete);
        }}
      />
    </AppShell>
  );
}
