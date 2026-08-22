import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import {
  Plus,
  ChevronRight,
  Clock,
  CheckCircle2,
  BookOpen,
  Upload,
  FilePlus2,
  FileJson,
  AlertTriangle,
  Layers,
  ListTree,
  Sparkles,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { PrimaryAction } from "@/components/layout/PrimaryAction";
import { Card, Chip, ProgressBar } from "@/components/ui/primitives";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { roadmapCounts, roadmapPct } from "@/lib/progress";
import { BottomSheet } from "@/components/edit/Sheet";
import { TextField } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import {
  parseImportJSON,
  buildRoadmapFromImport,
  countRoadmap,
  type RoadmapImportItem,
} from "@/lib/roadmap-import";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "Learn — SkillSync" },
      {
        name: "description",
        content: "Structured learning roadmaps for Python, AI/ML, DSA and Web.",
      },
      { property: "og:title", content: "Learn — SkillSync" },
      { property: "og:description", content: "Structured learning roadmaps and progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearnPage,
});

const SCHEMA_EXAMPLE = `{
  "version": 1,
  "roadmaps": [
    {
      "title": "Rust",
      "description": "From syntax to systems",
      "phases": [
        {
          "title": "Foundations",
          "topics": [
            {
              "title": "Ownership",
              "subtopics": [
                {
                  "title": "Borrow checker",
                  "checklist": [
                    "Read the chapter",
                    "Try 3 examples"
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

function LearnPage() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const roadmaps = useAppStore((s) => s.roadmaps);
  const addRoadmap = useAppStore((s) => s.addRoadmap);
  const importRoadmap = useAppStore((s) => s.importRoadmap);
  const replaceRoadmap = useAppStore((s) => s.replaceRoadmap);

  const [fabOpen, setFabOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [title, setTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Import flow state
  const [pending, setPending] = useState<RoadmapImportItem[] | null>(null);
  const [pendingIdx, setPendingIdx] = useState(0);
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);

  const currentItem = pending && pending[pendingIdx];

  function resetImport() {
    setPending(null);
    setPendingIdx(0);
    setDuplicate(null);
  }

  function advanceOrFinish() {
    if (!pending) return;
    if (pendingIdx + 1 < pending.length) {
      setPendingIdx(pendingIdx + 1);
      setDuplicate(null);
    } else {
      resetImport();
    }
  }

  function checkDuplicate(item: RoadmapImportItem) {
    const dup = roadmaps.find(
      (r) => r.title.trim().toLowerCase() === item.title.trim().toLowerCase(),
    );
    setDuplicate(dup ? { id: dup.id, title: dup.title } : null);
  }

  function onFilePicked(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const result = parseImportJSON(raw);
      if (!result.ok) {
        haptics.error();
        toast.error("Import failed", { description: result.error });
        return;
      }
      setPending(result.file.roadmaps);
      setPendingIdx(0);
      const first = result.file.roadmaps[0];
      checkDuplicate(first);
    };
    reader.onerror = () => {
      haptics.error();
      toast.error("Could not read file");
    };
    reader.readAsText(file);
  }

  function handleImportAsNew() {
    if (!currentItem) return;
    const built = buildRoadmapFromImport(currentItem);
    importRoadmap(built);
    toast.success(`Imported "${built.title}"`);
    advanceOrFinish();
  }

  function handleReplace() {
    if (!currentItem || !duplicate) return;
    const built = buildRoadmapFromImport(currentItem);
    replaceRoadmap(duplicate.id, built);
    toast.success(`Replaced "${built.title}"`);
    advanceOrFinish();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Roadmaps"
        title="Learn."
        subtitle="Curated paths built for depth, not noise."
        right={<PrimaryAction label="New Roadmap" onClick={() => setFabOpen(true)} />}
      />
      <div className="auto-grid px-5 pb-28 lg:px-2">
        {!hydrated ? <div className="text-muted-foreground">Loading…</div> : null}
        {hydrated &&
          roadmaps.map((r) => {
            const pct = hydrated ? roadmapPct(r) : 0;
            const counts = roadmapCounts(r);
            return (
              <button
                type="button"
                key={r.id}
                onClick={() =>
                  navigate({
                    to: "/learn/$roadmapId",
                    params: { roadmapId: r.id },
                  })
                }
                className="block h-full w-full cursor-pointer text-left"
                aria-label={`Open ${r.title} roadmap`}
              >
                <Card className="relative h-full overflow-hidden border-white/[0.08] p-5">
                  <div
                    className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
                    style={{
                      background: `radial-gradient(circle, ${r.color}, transparent 70%)`,
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: `linear-gradient(135deg, ${r.color}, #2563eb)`,
                            boxShadow: `0 10px 30px -10px ${r.color}80`,
                          }}
                        >
                          <BookOpen className="h-[18px] w-[18px] text-white" strokeWidth={1.75} />
                        </div>
                        <div>
                          <div className="text-[16px] font-semibold tracking-tight">{r.title}</div>
                          <div className="text-[12px] text-muted-foreground">
                            {r.subtitle || `${r.phases.length} phases`}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </div>

                    <div className="mt-5 space-y-2.5">
                      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                        <span>Progress</span>
                        <span className="text-foreground/80">{hydrated ? `${pct}%` : "— %"}</span>
                      </div>
                      <ProgressBar value={pct} tone="gradient" />
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Chip>
                        <CheckCircle2 className="h-3 w-3" />
                        {hydrated ? `${counts.done} / ${counts.topics} topics` : "— / — topics"}
                      </Chip>
                      <Chip>
                        <Clock className="h-3 w-3" /> {r.phases.length} phases
                      </Chip>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFilePicked(f);
          e.target.value = "";
        }}
      />

      {/* FAB menu */}
      <BottomSheet open={fabOpen} onClose={() => setFabOpen(false)} title="New roadmap">
        <div className="space-y-2">
          <FabRow
            icon={<FilePlus2 className="h-5 w-5" />}
            title="Create roadmap"
            desc="Start a blank roadmap from scratch"
            onClick={() => {
              setFabOpen(false);
              setCreateOpen(true);
            }}
          />
          <FabRow
            icon={<Upload className="h-5 w-5" />}
            title="Import roadmap"
            desc="Load a .json file from your device"
            onClick={() => {
              setFabOpen(false);
              fileRef.current?.click();
            }}
          />
          <FabRow
            icon={<FileJson className="h-5 w-5" />}
            title="Import guide"
            desc="See the official SkillSync JSON schema"
            onClick={() => {
              setFabOpen(false);
              setGuideOpen(true);
            }}
          />
        </div>
      </BottomSheet>

      {/* Create roadmap */}
      <BottomSheet open={createOpen} onClose={() => setCreateOpen(false)} title="Create roadmap">
        <div className="space-y-3">
          <label className="block text-[12px] text-muted-foreground">Title</label>
          <TextField
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Systems Design"
          />
          <ActionButton
            className="w-full"
            onClick={() => {
              if (!title.trim()) return;
              addRoadmap(title.trim());
              setTitle("");
              setCreateOpen(false);
            }}
          >
            Create roadmap
          </ActionButton>
        </div>
      </BottomSheet>

      {/* Import preview */}
      <BottomSheet open={!!currentItem && !duplicate} onClose={resetImport} title="Import preview">
        {currentItem ? <ImportPreview item={currentItem} /> : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={resetImport}
            className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium active:scale-[0.97]"
          >
            Cancel
          </button>
          <ActionButton className="flex-1" onClick={handleImportAsNew}>
            Import
          </ActionButton>
        </div>
        {pending && pending.length > 1 ? (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Roadmap {pendingIdx + 1} of {pending.length}
          </p>
        ) : null}
      </BottomSheet>

      {/* Duplicate handling */}
      <BottomSheet
        open={!!currentItem && !!duplicate}
        onClose={resetImport}
        title="Roadmap already exists"
      >
        {currentItem && duplicate ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-[12.5px] leading-relaxed text-amber-100/90">
                A roadmap titled <span className="font-semibold">"{duplicate.title}"</span> already
                exists. Choose how to import.
              </p>
            </div>
            <ImportPreview item={currentItem} />
            <div className="space-y-2">
              <ActionButton variant="danger" className="w-full" onClick={handleReplace}>
                Replace existing roadmap
              </ActionButton>
              <ActionButton variant="primary" className="w-full" onClick={handleImportAsNew}>
                Create duplicate
              </ActionButton>
              <button
                type="button"
                onClick={resetImport}
                className="w-full rounded-xl border border-white/[0.08] py-2.5 text-[13.5px] font-medium active:scale-[0.97]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      {/* Import guide */}
      <BottomSheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Import guide">
        <div className="space-y-5">
          <section className="space-y-2">
            <h4 className="text-[13px] font-semibold tracking-tight">Supported file format</h4>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Only JSON (<code className="text-foreground/80">.json</code>) files are supported.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-[13px] font-semibold tracking-tight">What gets imported</h4>
            <ul className="space-y-1 text-[12.5px] text-muted-foreground">
              <li>✅ Roadmap</li>
              <li>✅ Phases</li>
              <li>✅ Topics</li>
              <li>✅ Subtopics</li>
              <li>✅ Checklist items (optional)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h4 className="text-[13px] font-semibold tracking-tight">
              What SkillSync creates automatically
            </h4>
            <ul className="space-y-1 text-[12.5px] text-muted-foreground">
              <li>• Notes (blank)</li>
              <li>• Resources (blank)</li>
              <li>• Progress &amp; status</li>
              <li>• IDs &amp; internal metadata</li>
            </ul>
            <p className="text-[11.5px] text-muted-foreground/80">
              These are managed by SkillSync and should not be in the import file.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-[13px] font-semibold tracking-tight">
              Official SkillSync JSON schema
            </h4>
            <pre className="max-h-[280px] overflow-auto rounded-xl border border-white/[0.08] bg-black/40 p-3 text-[11px] leading-relaxed text-foreground/80">
              <code>{SCHEMA_EXAMPLE}</code>
            </pre>
            <p className="text-[11.5px] text-muted-foreground/80">
              Unknown fields are ignored. Missing optional fields are fine.
            </p>
          </section>

          <ActionButton
            className="w-full"
            onClick={() => {
              setGuideOpen(false);
              fileRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" /> Choose file
          </ActionButton>
        </div>
      </BottomSheet>
    </AppShell>
  );
}

function FabRow({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-left transition-all active:scale-[0.98]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold tracking-tight">{title}</div>
        <div className="truncate text-[12px] text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
    </button>
  );
}

function ImportPreview({ item }: { item: RoadmapImportItem }) {
  const c = countRoadmap(item);
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[16px] font-semibold tracking-tight">{item.title}</div>
        {item.description ? (
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatTile icon={<Layers className="h-3.5 w-3.5" />} label="Phases" value={c.phases} />
        <StatTile icon={<ListTree className="h-3.5 w-3.5" />} label="Topics" value={c.topics} />
        <StatTile
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Subtopics"
          value={c.subtopics}
        />
      </div>
      {c.checklists > 0 ? (
        <p className="text-[11.5px] text-muted-foreground">
          Includes {c.checklists} checklist item{c.checklists === 1 ? "" : "s"}.
        </p>
      ) : null}
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}
