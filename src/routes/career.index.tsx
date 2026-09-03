import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Pencil,
  Plus,
  Rss,
  Trash2,
  Users,
  Mic,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card, Chip, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { Reveal } from "@/components/common/Reveal";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { careerStats, JOB_STATUS_META } from "@/lib/career";
import { cn } from "@/lib/utils";
import { sound } from "@/lib/sound";
import type { JobApplication, JobStatus, InterviewRound } from "@/lib/schema";

export const Route = createFileRoute("/career/")({
  head: () => ({
    meta: [
      { title: "Career — SkillSync" },
      {
        name: "description",
        content: "Track job and internship applications, referrals and interview stages.",
      },
      { property: "og:title", content: "Career — SkillSync" },
      { property: "og:description", content: "Your placement pipeline, all in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CareerPage,
});

const STATUS_ORDER: JobStatus[] = [
  "saved",
  "applied",
  "referral",
  "oa",
  "interview",
  "offer",
  "rejected",
];

const ROUND_TYPES = ["phone", "virtual", "onsite", "takehome", "assignment"] as const;
const ROUND_OUTCOMES = ["pending", "cleared", "rejected"] as const;

function CareerPage() {
  const hydrated = useHydrated();
  const enabled = useAppStore((s) => s.preferences.modules.career);
  const applications = useAppStore((s) => s.career.applications);
  const addJobApplication = useAppStore((s) => s.addJobApplication);
  const updateJobApplication = useAppStore((s) => s.updateJobApplication);
  const deleteJobApplication = useAppStore((s) => s.deleteJobApplication);
  const addInterviewRound = useAppStore((s) => s.addInterviewRound);
  const updateInterviewRound = useAppStore((s) => s.updateInterviewRound);
  const deleteInterviewRound = useAppStore((s) => s.deleteInterviewRound);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<JobStatus | "all">("all");

  // Add-form state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<JobStatus>("applied");
  const [referral, setReferral] = useState("");
  const [link, setLink] = useState("");
  const [salary, setSalary] = useState("");

  // Edit-form state
  const [form, setForm] = useState<Partial<JobApplication>>({});

  const stats = useMemo(() => careerStats(applications), [applications]);

  const filtered = useMemo(
    () => (filter === "all" ? applications : applications.filter((a) => a.status === filter)),
    [applications, filter],
  );
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.appliedAt - a.appliedAt), [filtered]);

  if (hydrated && !enabled) {
    return <Navigate to="/profile/modules" />;
  }

  function submitNew() {
    if (!company.trim()) {
      sound.error();
      toast.error("Enter the company name first.");
      return;
    }
    addJobApplication({
      company: company.trim(),
      role: role.trim(),
      location: location.trim(),
      status,
      referral: referral.trim(),
      link: link.trim(),
      salary: salary.trim(),
    });
    sound.success();
    toast.success(`Added ${company.trim()}.`);
    setCompany("");
    setRole("");
    setLocation("");
    setStatus("applied");
    setReferral("");
    setLink("");
    setSalary("");
    setAddOpen(false);
  }

  function saveEdit() {
    if (!editing || !form.company?.trim()) return;
    updateJobApplication(editing.id, {
      ...form,
      company: form.company.trim(),
    });
    sound.success();
    toast.success("Updated.");
    setEditing(null);
  }

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3 px-5 lg:px-2 pt-1">
        <Link
          to="/profile"
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Placements
          </div>
          <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">
            Career.
          </h1>
        </div>
        <PrimaryAction label="Add Application" onClick={() => setAddOpen(true)} />
      </header>

      <div className="space-y-5 px-5 pb-24 lg:auto-grid-wide lg:space-y-0 lg:px-2 lg:items-start">
        {/* Stat row */}
        <Reveal>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Applications</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? stats.total : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">total</span>
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground">
                {stats.active} active in pipeline
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Offers</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? stats.offers : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">won</span>
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground">
                {stats.rejected} rejected
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Users className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Referrals</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? stats.referrals : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">used</span>
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground">
                {stats.interviewStages} rounds cleared
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Rss className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Response rate</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? `${stats.responseRate}%` : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">responded</span>
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground">
                avg {stats.avgRounds} rounds per app
              </div>
            </Card>
          </section>
        </Reveal>

        {/* Pipeline */}
        <Reveal delay={60}>
          <Card>
            <SectionHeader title="Pipeline" />
            <div className="mt-4 space-y-3">
              {STATUS_ORDER.map((s) => {
                const count = stats.byStatus[s];
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                if (count === 0 && s !== "applied") return null;
                const meta = JOB_STATUS_META[s];
                return (
                  <div key={s} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium">{meta.label}</span>
                      <span className="text-[12px] text-muted-foreground">{count}</span>
                    </div>
                    <ProgressBar value={pct} tone={meta.tone as never} className="h-1" />
                  </div>
                );
              })}
            </div>
          </Card>
        </Reveal>

        {/* Filter tabs */}
        <Reveal delay={90}>
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(["all", ...STATUS_ORDER] as const).map((s) => {
              const isAll = s === "all";
              const label = isAll ? "All" : JOB_STATUS_META[s].label;
              const count = isAll ? appsCount(applications) : stats.byStatus[s];
              return (
                <button
                  key={s}
                  onClick={() => {
                    sound.select();
                    setFilter(s);
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
                    filter === s
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-white/[0.07] bg-white/[0.02] text-muted-foreground",
                  )}
                >
                  {label}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Applications */}
        <Reveal delay={120}>
          <section className="space-y-3">
            {!hydrated || sorted.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={applications.length === 0 ? "No applications yet" : "No matches here"}
                hint={
                  applications.length === 0
                    ? "Start tracking your placement pipeline."
                    : "Try a different status filter."
                }
                action={
                  applications.length === 0 ? (
                    <ActionButton onClick={() => setAddOpen(true)}>
                      <Plus className="h-4 w-4" /> Add application
                    </ActionButton>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-2.5">
                {sorted.map((app) => (
                  <Card key={app.id} className="flex items-center gap-3 p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-primary">
                      <Building2 className="h-5 w-5 text-white" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold tracking-tight">
                        {app.company}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        {app.role ? <span>{app.role}</span> : null}
                        {app.location ? <span>· {app.location}</span> : null}
                        <span>· {daysAgo(app.appliedAt)}</span>
                      </div>
                      {app.rounds.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {app.rounds.map((r) => (
                            <Chip key={r.id} tone={roundTone(r.outcome)} className="text-[10.5px]">
                              {r.name}
                            </Chip>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Chip tone={JOB_STATUS_META[app.status].tone as never}>
                        {JOB_STATUS_META[app.status].label}
                      </Chip>
                      <IconButton
                        size="sm"
                        aria-label={`Edit ${app.company}`}
                        onClick={() => {
                          sound.tap();
                          setForm(app);
                          setEditing(app);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </Reveal>
      </div>

      {/* Add sheet */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add application">
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Company</label>
            <TextField
              autoFocus
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Role</label>
              <TextField
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="SDE Intern"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Location</label>
              <TextField
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Remote / Bengaluru"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Status</label>
            <StatusPicker value={status} onChange={setStatus} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Referral</label>
            <TextField
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              placeholder="Friend / senior / none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Link</label>
              <TextField
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="careers.google.com…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Salary (optional)</label>
              <TextField
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="₹LPA"
              />
            </div>
          </div>
          <ActionButton className="w-full" onClick={submitNew}>
            <Plus className="h-4 w-4" /> Save application
          </ActionButton>
        </div>
      </BottomSheet>

      {/* Edit sheet with rounds */}
      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`${form.company ?? "Edit"} · ${form.role ?? "Application"}`}
        footer={
          <div className="flex gap-2">
            <ActionButton variant="outline" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </ActionButton>
            <ActionButton className="flex-1" onClick={saveEdit}>
              Save
            </ActionButton>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Company</label>
              <TextField
                value={form.company ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Role</label>
              <TextField
                value={form.role ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Status</label>
            <StatusPicker
              value={(form.status as JobStatus) ?? "applied"}
              onChange={(s) => setForm((f) => ({ ...f, status: s }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Referral</label>
              <TextField
                value={form.referral ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, referral: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Salary</label>
              <TextField
                value={form.salary ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              />
            </div>
          </div>

          {editing ? (
            <RoundsEditor
              rounds={editing.rounds}
              onAdd={(round) => addInterviewRound(editing.id, round)}
              onUpdate={(roundId, patch) => updateInterviewRound(editing.id, roundId, patch)}
              onDelete={(roundId) => deleteInterviewRound(editing.id, roundId)}
            />
          ) : null}

          <button
            onClick={() => {
              sound.error();
              setConfirmDelete(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-danger/25 py-3 text-[13px] font-medium text-danger"
          >
            <Trash2 className="h-4 w-4" /> Delete application
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) deleteJobApplication(editing.id);
          sound.trash();
          setEditing(null);
        }}
        title="Delete this application?"
        description="This removes the application and all of its interview rounds."
      />
    </AppShell>
  );
}

function appsCount(apps: JobApplication[]) {
  return apps.length;
}

function daysAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function roundTone(
  outcome: InterviewRound["outcome"],
): "default" | "success" | "danger" | "warning" {
  if (outcome === "cleared") return "success";
  if (outcome === "rejected") return "danger";
  return "warning";
}

function StatusPicker({ value, onChange }: { value: JobStatus; onChange: (s: JobStatus) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STATUS_ORDER.map((s) => {
        const meta = JOB_STATUS_META[s];
        return (
          <button
            key={s}
            type="button"
            onClick={() => {
              sound.select();
              onChange(s);
            }}
            className={cn(
              "rounded-xl border px-2 py-2 text-[12px] font-medium transition-colors",
              value === s
                ? "border-primary/40 bg-primary/15 text-foreground"
                : "border-white/[0.06] bg-white/[0.02] text-muted-foreground",
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function RoundsEditor({
  rounds,
  onAdd,
  onUpdate,
  onDelete,
}: {
  rounds: InterviewRound[];
  onAdd: (round: Partial<InterviewRound>) => void;
  onUpdate: (id: string, patch: Partial<InterviewRound>) => void;
  onDelete: (id: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof ROUND_TYPES)[number]>("virtual");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="Interview rounds" />
        <button
          onClick={() => {
            sound.tap();
            setAddOpen(true);
          }}
          className="flex items-center gap-1 text-[12px] font-medium text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {rounds.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">No rounds added yet.</p>
        ) : (
          rounds.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <Mic className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.type} · {r.outcome}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={r.outcome}
                  onChange={(e) => {
                    sound.select();
                    onUpdate(r.id, { outcome: e.target.value as InterviewRound["outcome"] });
                  }}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-muted-foreground outline-none"
                >
                  {ROUND_OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <IconButton
                  size="sm"
                  onClick={() => {
                    sound.trash();
                    onDelete(r.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add round">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Round name</label>
            <TextField
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DSA Round / System Design"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ROUND_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    sound.select();
                    setType(t);
                  }}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-[12px] font-medium capitalize transition-colors",
                    type === t
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ActionButton
            className="w-full"
            onClick={() => {
              if (!name.trim()) {
                sound.error();
                toast.error("Name the round first.");
                return;
              }
              onAdd({ name: name.trim(), type });
              sound.success();
              setName("");
              setAddOpen(false);
            }}
          >
            <Plus className="h-4 w-4" /> Add round
          </ActionButton>
        </div>
      </BottomSheet>
    </div>
  );
}
