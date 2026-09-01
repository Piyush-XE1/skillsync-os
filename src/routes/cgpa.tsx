import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Award,
  Calculator,
  GraduationCap,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, SectionHeader } from "@/components/ui/primitives";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField } from "@/components/edit/Fields";
import { ActionButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { GRADE_KEYS } from "@/lib/schema";
import { cumulativeGpa, semesterGpa, gradeBreakdown, requiredNextGpa } from "@/lib/cgpa";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cgpa")({
  head: () => ({
    meta: [
      { title: "CGPA — SkillSync" },
      { name: "description", content: "Semester-wise SGPA and cumulative CGPA tracker." },
      { property: "og:title", content: "CGPA — SkillSync" },
      { property: "og:description", content: "Grades, decoded." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CgpaPage,
});

function CgpaPage() {
  const hydrated = useHydrated();
  const semesters = useAppStore((s) => s.cgpa.semesters);
  const addCgpaSemester = useAppStore((s) => s.addCgpaSemester);
  const deleteCgpaSemester = useAppStore((s) => s.deleteCgpaSemester);
  const addCgpaSubject = useAppStore((s) => s.addCgpaSubject);
  const updateCgpaSubject = useAppStore((s) => s.updateCgpaSubject);
  const deleteCgpaSubject = useAppStore((s) => s.deleteCgpaSubject);

  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectCredits, setSubjectCredits] = useState("3");
  const [confirmDeleteSem, setConfirmDeleteSem] = useState<string | null>(null);
  const [target, setTarget] = useState("9");

  const { cgpa, credits } = useMemo(() => cumulativeGpa(semesters), [semesters]);
  const breakdown = useMemo(() => gradeBreakdown(semesters), [semesters]);
  const sorted = useMemo(() => [...semesters].sort((a, b) => a.number - b.number), [semesters]);

  const targetNum = parseFloat(target) || 0;
  const required = useMemo(() => {
    if (cgpa === null || targetNum <= cgpa) return null;
    const nextCredits = Math.max(20, Math.round(credits / Math.max(1, semesters.length)));
    return requiredNextGpa(cgpa, credits, targetNum, nextCredits);
  }, [cgpa, credits, targetNum, semesters.length]);

  const addSubject = () => {
    const name = subjectName.trim();
    if (!name || !openSubject) return;
    const creditsNum = Math.min(10, Math.max(1, parseInt(subjectCredits, 10) || 3));
    addCgpaSubject(openSubject, { name, code: subjectCode.trim(), credits: creditsNum });
    haptics.success();
    setSubjectName("");
    setSubjectCode("");
    setSubjectCredits("3");
    setOpenSubject(null);
  };

  const addSemester = () => {
    const used = new Set(semesters.map((s) => s.number));
    const next = Array.from({ length: 8 }, (_, i) => i + 1).find((n) => !used.has(n)) ?? 1;
    addCgpaSemester(next);
    haptics.success();
    toast.success(`Semester ${next} added`);
  };

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <button
          onClick={addSemester}
          className="pressable flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add semester
        </button>
      </header>

      <div className="mb-6 px-5 lg:px-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Academic
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          CGPA Tracker.
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Semester-wise SGPA on the standard 10-point scale.
        </p>
      </div>

      <div className="space-y-6 px-5 lg:px-2 lg:auto-grid-wide lg:items-start lg:space-y-0">
        <section className="space-y-3">
          {/* Hero CGPA */}
          <Card className="relative overflow-hidden p-6">
            <div className="pointer-events-none absolute inset-0 gradient-mesh opacity-60" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} />
                  Cumulative GPA
                </div>
                <div className="mt-2 text-[46px] font-semibold leading-none tracking-tight">
                  {hydrated && cgpa !== null ? cgpa.toFixed(2) : "—"}
                </div>
                <div className="mt-2 text-[12px] text-muted-foreground">
                  {credits} graded credits · {breakdown.subjects} subjects
                </div>
              </div>
              <span className="glass flex h-14 w-14 items-center justify-center rounded-2xl">
                <Award className="h-6 w-6 text-[var(--warning)]" strokeWidth={1.75} />
              </span>
            </div>
            {cgpa !== null ? (
              <div className="relative mt-5 grid grid-cols-4 gap-2">
                {GRADE_KEYS.map((g) => (
                  <div
                    key={g}
                    className="rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-center"
                  >
                    <div className="text-[13px] font-semibold">{breakdown.counts[g] ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground">{g}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Target simulator */}
          <Card className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Target className="h-4 w-4 text-[var(--primary)]" strokeWidth={1.75} />
              Target simulator
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Pick a target CGPA — SkillSync computes the SGPA your remaining semesters need.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-24 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-center text-[15px] font-semibold focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <span className="text-[12.5px] text-muted-foreground">target CGPA</span>
            </div>
            {hydrated && cgpa !== null && targetNum > cgpa ? (
              required !== null ? (
                <div className="rounded-[10px] border border-success/20 bg-success/10 px-3 py-2.5 text-[12.5px] text-success">
                  <TrendingUp className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
                  You need an average of <strong>{required.toFixed(2)}</strong> in your remaining
                  semesters to reach {targetNum.toFixed(1)}.
                </div>
              ) : (
                <div className="rounded-[10px] border border-warning/20 bg-warning/10 px-3 py-2.5 text-[12.5px] text-warning">
                  That target is mathematically out of reach — aim slightly lower and keep grinding.
                </div>
              )
            ) : null}
          </Card>
        </section>

        {/* Semesters */}
        <section className="space-y-3">
          <SectionHeader title="Semesters" />
          {sorted.length === 0 ? (
            <Card className="p-8 text-center">
              <Calculator className="mx-auto h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
              <div className="mt-3 text-[14px] font-medium">No semesters yet</div>
              <p className="mx-auto mt-1 max-w-[240px] text-[12.5px] text-muted-foreground">
                Add a semester, drop in subjects with credits and grades, and watch your CGPA
                compute itself.
              </p>
            </Card>
          ) : (
            sorted.map((sem) => {
              const { gpa, credits: semCredits } = semesterGpa(sem);
              return (
                <Card key={sem.id} className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-[13px] font-semibold">
                        {sem.number}
                      </span>
                      <div>
                        <div className="text-[13.5px] font-semibold">Semester {sem.number}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {sem.subjects.length} subjects · {semCredits} credits
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {gpa !== null ? <Chip tone="primary">SGPA {gpa.toFixed(2)}</Chip> : null}
                      <button
                        onClick={() => setConfirmDeleteSem(sem.id)}
                        aria-label={`Delete semester ${sem.number}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  {sem.subjects.length > 0 ? (
                    <div className="space-y-1.5">
                      {sem.subjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 rounded-[10px] border border-white/[0.05] bg-white/[0.02] px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12.5px] font-medium">{sub.name}</div>
                            <div className="text-[10.5px] text-muted-foreground">
                              {sub.code ? `${sub.code} · ` : ""}
                              {sub.credits} credits
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {GRADE_KEYS.map((g) => (
                              <button
                                key={g}
                                onClick={() => {
                                  updateCgpaSubject(sem.id, sub.id, { grade: g });
                                  haptics.selection();
                                }}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition-colors",
                                  sub.grade === g
                                    ? "gradient-primary text-white"
                                    : "text-muted-foreground hover:bg-white/[0.05]",
                                )}
                              >
                                {g}
                              </button>
                            ))}
                            <button
                              onClick={() => deleteCgpaSubject(sem.id, sub.id)}
                              aria-label={`Remove ${sub.name}`}
                              className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <button
                    onClick={() => setOpenSubject(sem.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-white/[0.1] py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-white/[0.2] hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add subject
                  </button>
                </Card>
              );
            })
          )}
        </section>
      </div>

      {/* Add subject sheet */}
      <BottomSheet
        open={openSubject !== null}
        onClose={() => setOpenSubject(null)}
        title="Add subject"
      >
        <div className="space-y-3">
          <TextField
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Subject name, e.g. Database Systems"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              placeholder="Code, e.g. CS-301"
            />
            <TextField
              type="number"
              min={1}
              max={10}
              value={subjectCredits}
              onChange={(e) => setSubjectCredits(e.target.value)}
              placeholder="Credits (default 3)"
            />
          </div>
          <ActionButton onClick={addSubject} disabled={!subjectName.trim()}>
            <Plus className="h-4 w-4" strokeWidth={2.25} /> Add subject
          </ActionButton>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDeleteSem !== null}
        title="Delete semester?"
        description="This removes the semester and all of its subjects. Your CGPA will be recomputed without it."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirmDeleteSem) deleteCgpaSemester(confirmDeleteSem);
          setConfirmDeleteSem(null);
        }}
        onClose={() => setConfirmDeleteSem(null)}
      />
    </AppShell>
  );
}
