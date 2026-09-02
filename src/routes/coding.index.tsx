import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Code2,
  Flame,
  Trophy,
  Braces,
  CalendarClock,
  Pencil,
  Plus,
  Trash2,
  Zap,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card, Chip, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { Heatmap, type HeatCell } from "@/components/common/Heatmap";
import { Reveal } from "@/components/common/Reveal";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea } from "@/components/edit/Fields";
import { ActionButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { codingStats, problemsByDay } from "@/lib/coding";
import { todayISO, formatFriendly, dateISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { CodingProblem, CodingPlatform, CodingDifficulty } from "@/lib/schema";

export const Route = createFileRoute("/coding/")({
  head: () => ({
    meta: [
      { title: "Code — SkillSync" },
      {
        name: "description",
        content: "Track DSA problems solved across LeetCode, Codeforces and more.",
      },
      { property: "og:title", content: "Code — SkillSync" },
      { property: "og:description", content: "Your DSA problem-solving streak and stats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CodingPage,
});

const PLATFORM_META: Record<CodingPlatform, { label: string; color: string }> = {
  leetcode: { label: "LeetCode", color: "#ffa116" },
  codeforces: { label: "Codeforces", color: "#318ce7" },
  codechef: { label: "CodeChef", color: "#d96456" },
  gfg: { label: "GeeksforGeeks", color: "#2f8d46" },
  hackerrank: { label: "HackerRank", color: "#00ea64" },
  other: { label: "Other", color: "#a78bfa" },
};

const DIFFICULTY_META: Record<CodingDifficulty, { label: string; tone: string; bar: string }> = {
  easy: { label: "Easy", tone: "success", bar: "bg-success" },
  medium: { label: "Medium", tone: "warning", bar: "bg-warning" },
  hard: { label: "Hard", tone: "danger", bar: "bg-danger" },
};

const PRESET_TAGS = [
  "Array",
  "String",
  "Hash Table",
  "Dynamic Programming",
  "Math",
  "Greedy",
  "Sorting",
  "Binary Search",
  "Tree",
  "Graph",
  "Linked List",
  "Stack",
  "Queue",
  "Recursion",
  "Backtracking",
  "Two Pointers",
  "Sliding Window",
];

function CodingPage() {
  const hydrated = useHydrated();
  const enabled = useAppStore((s) => s.preferences.modules.coding);
  const problems = useAppStore((s) => s.coding.problems);
  const addCodingProblem = useAppStore((s) => s.addCodingProblem);
  const updateCodingProblem = useAppStore((s) => s.updateCodingProblem);
  const deleteCodingProblem = useAppStore((s) => s.deleteCodingProblem);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CodingProblem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Add-form state
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<CodingPlatform>("leetcode");
  const [difficulty, setDifficulty] = useState<CodingDifficulty>("easy");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [timeComplexity, setTimeComplexity] = useState("");

  // Edit-form state
  const [form, setForm] = useState<Partial<CodingProblem>>({});
  const [editTags, setEditTags] = useState<string[]>([]);

  const stats = useMemo(() => codingStats(problems), [problems]);
  const sorted = useMemo(() => [...problems].sort((a, b) => b.solvedAt - a.solvedAt), [problems]);
  const heatCells = useMemo<HeatCell[]>(() => {
    return problemsByDay(problems, 98).map((d) => {
      const level = d.count === 0 ? 0 : d.count === 1 ? 1 : d.count <= 2 ? 2 : d.count <= 3 ? 3 : 4;
      return { date: d.date, level };
    });
  }, [problems]);

  if (hydrated && !enabled) {
    return <Navigate to="/profile/modules" />;
  }

  function submitNew() {
    if (!title.trim()) {
      toast.error("Give the problem a title first.");
      return;
    }
    addCodingProblem({
      title: title.trim(),
      platform,
      difficulty,
      url: url.trim(),
      tags,
      notes: notes.trim(),
      timeComplexity: timeComplexity.trim(),
      solvedAt: Date.now(),
    });
    toast.success("Problem logged. +8 XP 🎉");
    setTitle("");
    setUrl("");
    setNotes("");
    setTimeComplexity("");
    setTags([]);
    setPlatform("leetcode");
    setDifficulty("easy");
    setAddOpen(false);
  }

  function saveEdit() {
    if (!editing || !form.title?.trim()) return;
    updateCodingProblem(editing.id, {
      ...form,
      title: form.title.trim(),
      tags: editTags,
    });
    toast.success("Updated.");
    setEditing(null);
  }

  function toggleTag(tag: string, current: string[], set: (t: string[]) => void) {
    set(current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
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
            DSA Prep
          </div>
          <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">
            Code.
          </h1>
        </div>
        <PrimaryAction label="Log Problem" onClick={() => setAddOpen(true)} />
      </header>

      <div className="space-y-5 px-5 pb-24 lg:auto-grid-wide lg:space-y-0 lg:px-2 lg:items-start">
        {/* Stat row */}
        <Reveal>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Code2 className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Solved</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? stats.total : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">problems</span>
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground">
                {stats.today} today · {stats.thisWeek} this week
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Flame className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Streak</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? stats.currentStreak : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">days</span>
              </div>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const on = hydrated && i < Math.min(stats.currentStreak, 7);
                  return (
                    <div
                      key={i}
                      className={
                        "h-1.5 flex-1 rounded-full " + (on ? "gradient-primary" : "bg-white/[0.06]")
                      }
                    />
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Best streak</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? stats.bestStreak : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">days</span>
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground">Never miss a day</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Braces className="h-3.5 w-3.5" strokeWidth={2} />
                <span>This month</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-[30px] font-semibold tracking-tight">
                  {hydrated ? stats.thisMonth : "—"}
                </span>
                <span className="text-[13px] text-muted-foreground">solved</span>
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground">
                {stats.totalComplexity} with complexity notes
              </div>
            </Card>
          </section>
        </Reveal>

        {/* Activity heatmap */}
        <Reveal delay={60}>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader title="Activity" />
              <Chip tone="info">{stats.thisWeek} this week</Chip>
            </div>
            <Heatmap cells={heatCells} weeks={14} />
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[10.5px] text-muted-foreground">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} data-level={l} className="heat-cell h-2.5 w-2.5" />
              ))}
              <span>More</span>
            </div>
          </Card>
        </Reveal>

        {/* Difficulty + platforms */}
        <Reveal delay={90}>
          <div className="grid gap-3 lg:grid-cols-2 lg:auto-grid-wide">
            <Card>
              <SectionHeader title="Difficulty" />
              <div className="mt-4 space-y-3">
                {(["easy", "medium", "hard"] as CodingDifficulty[]).map((d) => {
                  const count = stats.byDifficulty[d];
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={d} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium">{DIFFICULTY_META[d].label}</span>
                        <span className="text-[12px] text-muted-foreground">
                          {count} · {pct}%
                        </span>
                      </div>
                      <ProgressBar value={pct} tone={DIFFICULTY_META[d].tone as never} />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <SectionHeader title="Platforms" />
              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(PLATFORM_META) as CodingPlatform[]).map((p) => {
                  const count = stats.byPlatform[p];
                  if (count === 0) return null;
                  const meta = PLATFORM_META[p];
                  return (
                    <div
                      key={p}
                      className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px]"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="font-medium">{meta.label}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
              {stats.tags.length > 0 ? (
                <div className="mt-5">
                  <SectionHeader title="Top tags" />
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {stats.tags.slice(0, 8).map((t) => (
                      <Chip key={t.tag}>
                        {t.tag} · {t.count}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        </Reveal>

        {/* Recent problems */}
        <Reveal delay={120}>
          <section className="space-y-3">
            <SectionHeader title="Recent solves" />
            {!hydrated || sorted.length === 0 ? (
              <EmptyState
                icon={Code2}
                title="No problems logged yet"
                hint="Log your first DSA solve to build your streak."
                action={
                  <ActionButton onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" /> Log a problem
                  </ActionButton>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {sorted.slice(0, 12).map((p) => {
                  const pm = PLATFORM_META[p.platform];
                  return (
                    <Card key={p.id} className="flex items-center gap-3 p-4">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${pm.color}1f`, color: pm.color }}
                      >
                        <Code2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold tracking-tight">
                          {p.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {formatFriendly(dateISO(new Date(p.solvedAt)))}
                          </span>
                          <Chip tone={DIFFICULTY_META[p.difficulty].tone as never}>
                            {DIFFICULTY_META[p.difficulty].label}
                          </Chip>
                          {p.tags.slice(0, 2).map((t) => (
                            <Chip key={t}>{t}</Chip>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:text-foreground"
                            aria-label="Open problem"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </a>
                        ) : null}
                        <button
                          onClick={() => {
                            setForm(p);
                            setEditTags(p.tags);
                            setEditing(p);
                          }}
                          className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </Reveal>
      </div>

      {/* Add problem sheet */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Log a solved problem">
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Problem title</label>
            <TextField
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Two Sum"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLATFORM_META) as CodingPlatform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-[12px] font-medium transition-colors",
                    platform === p
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground",
                  )}
                >
                  {PLATFORM_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as CodingDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-[12px] font-medium capitalize transition-colors",
                    difficulty === d
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground",
                  )}
                >
                  {DIFFICULTY_META[d].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Problem link (optional)</label>
            <TextField
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://leetcode.com/problems/..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Tags</label>
            <TagPicker value={tags} onChange={setTags} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Big-O complexity (optional)</label>
            <TextField
              value={timeComplexity}
              onChange={(e) => setTimeComplexity(e.target.value)}
              placeholder="e.g. O(n) time, O(1) space"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Approach notes (optional)</label>
            <TextArea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="The trick was…"
            />
          </div>

          <ActionButton className="w-full" onClick={submitNew}>
            <Zap className="h-4 w-4" /> Log it (+8 XP)
          </ActionButton>
        </div>
      </BottomSheet>

      {/* Edit sheet */}
      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit problem"
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
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Title</label>
            <TextField
              value={form.title ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Tags</label>
            <TagPicker value={editTags} onChange={setEditTags} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Big-O complexity</label>
            <TextField
              value={form.timeComplexity ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, timeComplexity: e.target.value }))}
              placeholder="e.g. O(n)"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Notes</label>
            <TextArea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-danger/25 py-3 text-[13px] font-medium text-danger"
          >
            <Trash2 className="h-4 w-4" /> Delete problem
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) deleteCodingProblem(editing.id);
          setEditing(null);
        }}
        title="Delete this problem?"
        description="This removes the problem from your solve log."
      />
    </AppShell>
  );
}

function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [custom, setCustom] = useState("");
  const all = [...new Set([...PRESET_TAGS, ...value])];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {all.map((tag) => {
          const on = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(on ? value.filter((t) => t !== tag) : [...value, tag])}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                on
                  ? "border-primary/40 bg-primary/15 text-foreground"
                  : "border-white/[0.07] bg-white/[0.02] text-muted-foreground",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <TextField
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Custom tag"
          className="h-10"
        />
        <ActionButton
          variant="ghost"
          size="sm"
          disabled={!custom.trim()}
          onClick={() => {
            const t = custom.trim();
            if (!t || value.includes(t)) return;
            onChange([...value, t]);
            setCustom("");
          }}
        >
          <Plus className="h-4 w-4" />
        </ActionButton>
      </div>
    </div>
  );
}
