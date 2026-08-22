import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  StickyNote,
  Circle,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, ProgressBar } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { phasePct, roadmapPct, topicPct, subtopicPct } from "@/lib/progress";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea, NO_AUTOFILL_PROPS } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import type { Topic, Subtopic, ChecklistItem } from "@/lib/schema";
import { haptics } from "@/lib/haptics";

export const Route = createFileRoute("/learn/$roadmapId")({
  head: ({ params }) => ({
    meta: [
      { title: `Roadmap — SkillSync` },
      { name: "description", content: `Roadmap ${params.roadmapId} on SkillSync.` },
      { property: "og:title", content: "Roadmap — SkillSync" },
      { property: "og:description", content: "Edit phases, topics, subtopics and checklists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoadmapDetail,
});

type EditingTopic = {
  phaseId: string;
  topic: Topic;
  subtopicId?: string;
} | null;

function RoadmapDetail() {
  const { roadmapId } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useHydrated();

  const roadmap = useAppStore((s) => s.roadmaps.find((r) => r.id === roadmapId));

  const addPhase = useAppStore((s) => s.addPhase);
  const renamePhase = useAppStore((s) => s.renamePhase);
  const deletePhase = useAppStore((s) => s.deletePhase);
  const movePhase = useAppStore((s) => s.movePhase);
  const addTopic = useAppStore((s) => s.addTopic);
  const updateTopic = useAppStore((s) => s.updateTopic);
  const updateSubtopic = useAppStore((s) => s.updateSubtopic);
  const setPhaseComplete = useAppStore((s) => s.setPhaseComplete);
  const setTopicComplete = useAppStore((s) => s.setTopicComplete);
  const setSubtopicComplete = useAppStore((s) => s.setSubtopicComplete);
  const updateChecklistItem = useAppStore((s) => s.updateChecklistItem);
  const deleteTopic = useAppStore((s) => s.deleteTopic);
  const moveTopic = useAppStore((s) => s.moveTopic);
  const renameRoadmap = useAppStore((s) => s.renameRoadmap);
  const deleteRoadmap = useAppStore((s) => s.deleteRoadmap);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [subOpen, setSubOpen] = useState<Record<string, boolean>>({});
  const [newPhase, setNewPhase] = useState(false);
  const [phaseTitle, setPhaseTitle] = useState("");
  const [addTopicToPhase, setAddTopicToPhase] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [editing, setEditing] = useState<EditingTopic>(null);
  const [renamingPhase, setRenamingPhase] = useState<{ id: string; title: string } | null>(null);
  const [renamingRoadmap, setRenamingRoadmap] = useState(false);
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [confirm, setConfirm] = useState<
    | { kind: "phase"; id: string }
    | { kind: "topic"; phaseId: string; topicId: string }
    | { kind: "roadmap" }
    | null
  >(null);

  const pct = useMemo(() => (roadmap ? roadmapPct(roadmap) : 0), [roadmap]);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="px-5 lg:px-2 pt-4 text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  if (!roadmap) {
    return (
      <AppShell>
        <div className="px-5 lg:px-2 pt-4">
          <Link to="/learn" className="text-muted-foreground">
            ← Back
          </Link>
          <div className="mt-6">
            <EmptyState title="Roadmap not found" hint="It may have been deleted." />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-5 px-5 lg:px-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/learn" })}
            className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-2">
            <IconButton
              aria-label="Rename"
              onClick={() => {
                setRoadmapTitle(roadmap.title);
                setRenamingRoadmap(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              aria-label="Delete roadmap"
              variant="danger"
              onClick={() => setConfirm({ kind: "roadmap" })}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
        <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          {roadmap.title}
        </h1>
        {roadmap.subtitle ? (
          <p className="mt-1 text-[13.5px] text-muted-foreground">{roadmap.subtitle}</p>
        ) : null}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>Overall progress</span>
            <span className="text-foreground/80">{pct}%</span>
          </div>
          <ProgressBar value={pct} tone="gradient" />
        </div>
      </header>

      <div className="space-y-4 px-5 lg:px-2">
        {roadmap.phases.length === 0 ? (
          <EmptyState
            title="No phases yet"
            hint="Start by adding a phase like ‘Foundations’ or ‘Fundamentals’."
            action={
              <ActionButton onClick={() => setNewPhase(true)}>
                <Plus className="h-4 w-4" /> Add phase
              </ActionButton>
            }
          />
        ) : null}

        {roadmap.phases.map((phase, phaseIdx) => {
          const isCollapsed = collapsed[phase.id];
          const pPct = phasePct(phase);
          return (
            <Card key={phase.id} className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhaseComplete(roadmap.id, phase.id, pPct !== 100);
                  }}
                  aria-label={pPct === 100 ? "Mark phase incomplete" : "Mark phase complete"}
                  className="flex h-6 w-6 shrink-0 items-center justify-center"
                >
                  {pPct === 100 ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/60" strokeWidth={1.5} />
                  )}
                </button>
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [phase.id]: !c[phase.id] }))}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-[14px] font-semibold tracking-tight">{phase.title}</span>
                  <Chip>{pPct}%</Chip>
                </button>
                <IconButton
                  aria-label="Move up"
                  size="sm"
                  disabled={phaseIdx === 0}
                  onClick={() => movePhase(roadmap.id, phase.id, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  aria-label="Move down"
                  size="sm"
                  disabled={phaseIdx === roadmap.phases.length - 1}
                  onClick={() => movePhase(roadmap.id, phase.id, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  aria-label="Rename phase"
                  size="sm"
                  onClick={() => setRenamingPhase({ id: phase.id, title: phase.title })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  aria-label="Delete phase"
                  size="sm"
                  variant="danger"
                  onClick={() => setConfirm({ kind: "phase", id: phase.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>

              <ProgressBar value={pPct} tone="gradient" />

              {!isCollapsed ? (
                <div className="space-y-2 pt-2">
                  {phase.topics.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/[0.06] px-3 py-4 text-center text-[12.5px] text-muted-foreground">
                      No topics yet
                    </div>
                  ) : (
                    phase.topics.map((topic, topicIdx) => {
                      const tPct = topicPct(topic);
                      return (
                        <div
                          key={topic.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open ${topic.title} topic`}
                          onClick={() =>
                            navigate({
                              to: "/learn/$roadmapId/$topicId",
                              params: { roadmapId: roadmap.id, topicId: topic.id },
                              search: { phaseId: phase.id },
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate({
                                to: "/learn/$roadmapId/$topicId",
                                params: { roadmapId: roadmap.id, topicId: topic.id },
                                search: { phaseId: phase.id },
                              });
                            }
                          }}
                          className="cursor-pointer rounded-2xl border border-white/[0.05] bg-white/[0.015] p-3 transition-colors hover:bg-white/[0.025]"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (tPct === 100) haptics.selection();
                                else haptics.success();
                                setTopicComplete(roadmap.id, phase.id, topic.id, tPct !== 100);
                              }}
                              aria-label="Toggle topic"
                              className="flex h-5 w-5 items-center justify-center"
                            >
                              {tPct === 100 ? (
                                <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
                              ) : (
                                <Circle
                                  className="h-5 w-5 text-muted-foreground/60"
                                  strokeWidth={1.5}
                                />
                              )}
                            </button>
                            <div className="flex-1 text-left">
                              <div className="text-[13.5px] font-medium">{topic.title}</div>
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>{tPct}%</span>
                                {topic.subtopics.length > 0 ? (
                                  <span>· {topic.subtopics.length} subtopics</span>
                                ) : null}
                                {topic.checklist.length > 0 ? (
                                  <span>· {topic.checklist.length} checks</span>
                                ) : null}
                                {topic.notes ? <StickyNote className="h-3 w-3" /> : null}
                              </div>
                            </div>
                            <IconButton
                              size="sm"
                              aria-label="Up"
                              disabled={topicIdx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTopic(roadmap.id, phase.id, topic.id, -1);
                              }}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </IconButton>
                            <IconButton
                              size="sm"
                              aria-label="Down"
                              disabled={topicIdx === phase.topics.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTopic(roadmap.id, phase.id, topic.id, 1);
                              }}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </IconButton>
                            <IconButton
                              size="sm"
                              aria-label="Delete topic"
                              variant="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirm({
                                  kind: "topic",
                                  phaseId: phase.id,
                                  topicId: topic.id,
                                });
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                          {topic.subtopics.length > 0 ? (
                            <ul className="mt-2 space-y-1 pl-7">
                              {topic.subtopics.map((sub) => {
                                const sPct = subtopicPct(sub);
                                const complete = sPct === 100;
                                const expanded = !!subOpen[sub.id];
                                const hasChecklist = sub.checklist.length > 0;
                                return (
                                  <li key={sub.id}>
                                    <div className="rounded-lg transition-colors hover:bg-white/[0.02]">
                                      <div className="flex w-full items-center gap-1 py-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            haptics.selection();
                                            setSubtopicComplete(
                                              roadmap.id,
                                              phase.id,
                                              topic.id,
                                              sub.id,
                                              !complete,
                                            );
                                          }}
                                          aria-label={
                                            complete
                                              ? "Mark subtopic incomplete"
                                              : "Mark subtopic complete"
                                          }
                                          className="flex h-6 w-6 shrink-0 items-center justify-center"
                                        >
                                          {complete ? (
                                            <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
                                          ) : (
                                            <Circle
                                              className="h-4 w-4 text-muted-foreground/60"
                                              strokeWidth={1.5}
                                            />
                                          )}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (hasChecklist) {
                                              setSubOpen((o) => ({
                                                ...o,
                                                [sub.id]: !o[sub.id],
                                              }));
                                            }
                                          }}
                                          className="flex flex-1 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left"
                                        >
                                          {hasChecklist ? (
                                            expanded ? (
                                              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground transition-transform" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform" />
                                            )
                                          ) : (
                                            <span className="h-3 w-3 shrink-0" />
                                          )}
                                          <span
                                            className={`flex-1 truncate text-[12.5px] ${complete ? "text-muted-foreground line-through" : "text-foreground/85"}`}
                                          >
                                            {sub.title}
                                          </span>
                                          {hasChecklist ? (
                                            <span className="text-[10.5px] text-muted-foreground">
                                              {sPct}%
                                            </span>
                                          ) : null}
                                        </button>
                                      </div>
                                      {expanded && hasChecklist ? (
                                        <ul className="ml-6 space-y-0.5 pb-1.5 pl-1">
                                          {sub.checklist.map((c) => (
                                            <li key={c.id}>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  updateChecklistItem(
                                                    {
                                                      roadmapId: roadmap.id,
                                                      phaseId: phase.id,
                                                      topicId: topic.id,
                                                      subtopicId: sub.id,
                                                    },
                                                    c.id,
                                                    { done: !c.done },
                                                  );
                                                }}
                                                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/[0.03]"
                                              >
                                                {c.done ? (
                                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                                                ) : (
                                                  <Circle
                                                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                                                    strokeWidth={1.5}
                                                  />
                                                )}
                                                <span
                                                  className={`flex-1 truncate text-[11.5px] ${c.done ? "text-muted-foreground line-through" : "text-foreground/75"}`}
                                                >
                                                  {c.title}
                                                </span>
                                              </button>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : null}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })
                  )}

                  <button
                    onClick={() => {
                      setAddTopicToPhase(phase.id);
                      setTopicTitle("");
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add topic
                  </button>
                </div>
              ) : null}
            </Card>
          );
        })}

        {roadmap.phases.length > 0 ? (
          <button
            onClick={() => setNewPhase(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/[0.08] py-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add phase
          </button>
        ) : null}
      </div>

      {/* New phase sheet */}
      <BottomSheet open={newPhase} onClose={() => setNewPhase(false)} title="New phase">
        <div className="space-y-3">
          <TextField
            autoFocus
            value={phaseTitle}
            onChange={(e) => setPhaseTitle(e.target.value)}
            placeholder="e.g. Foundations"
          />
          <ActionButton
            className="w-full"
            onClick={() => {
              if (!phaseTitle.trim()) return;
              addPhase(roadmap.id, phaseTitle.trim());
              setPhaseTitle("");
              setNewPhase(false);
            }}
          >
            Add phase
          </ActionButton>
        </div>
      </BottomSheet>

      {/* Rename phase sheet */}
      <BottomSheet
        open={!!renamingPhase}
        onClose={() => setRenamingPhase(null)}
        title="Rename phase"
      >
        {renamingPhase ? (
          <div className="space-y-3">
            <TextField
              autoFocus
              value={renamingPhase.title}
              onChange={(e) => setRenamingPhase({ ...renamingPhase, title: e.target.value })}
            />
            <ActionButton
              className="w-full"
              onClick={() => {
                if (!renamingPhase.title.trim()) return;
                renamePhase(roadmap.id, renamingPhase.id, renamingPhase.title.trim());
                setRenamingPhase(null);
              }}
            >
              Save
            </ActionButton>
          </div>
        ) : null}
      </BottomSheet>

      {/* Rename roadmap */}
      <BottomSheet
        open={renamingRoadmap}
        onClose={() => setRenamingRoadmap(false)}
        title="Rename roadmap"
      >
        <div className="space-y-3">
          <TextField
            autoFocus
            value={roadmapTitle}
            onChange={(e) => setRoadmapTitle(e.target.value)}
          />
          <ActionButton
            className="w-full"
            onClick={() => {
              if (!roadmapTitle.trim()) return;
              renameRoadmap(roadmap.id, roadmapTitle.trim());
              setRenamingRoadmap(false);
            }}
          >
            Save
          </ActionButton>
        </div>
      </BottomSheet>

      {/* Add topic sheet */}
      <BottomSheet
        open={!!addTopicToPhase}
        onClose={() => setAddTopicToPhase(null)}
        title="New topic"
      >
        <div className="space-y-3">
          <TextField
            autoFocus
            value={topicTitle}
            onChange={(e) => setTopicTitle(e.target.value)}
            placeholder="e.g. Variables & types"
          />
          <ActionButton
            className="w-full"
            onClick={() => {
              if (!topicTitle.trim() || !addTopicToPhase) return;
              addTopic(roadmap.id, addTopicToPhase, topicTitle.trim());
              setTopicTitle("");
              setAddTopicToPhase(null);
            }}
          >
            Add topic
          </ActionButton>
        </div>
      </BottomSheet>

      {/* Topic editor */}
      {editing ? (
        <TopicEditorSheet
          roadmapId={roadmap.id}
          phaseId={editing.phaseId}
          topic={
            roadmap.phases
              .find((p) => p.id === editing.phaseId)
              ?.topics.find((t) => t.id === editing.topic.id) ?? editing.topic
          }
          onClose={() => setEditing(null)}
        />
      ) : null}

      {/* Confirm */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete?"
        description="This cannot be undone."
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "phase") deletePhase(roadmap.id, confirm.id);
          if (confirm.kind === "topic") deleteTopic(roadmap.id, confirm.phaseId, confirm.topicId);
          if (confirm.kind === "roadmap") {
            deleteRoadmap(roadmap.id);
            navigate({ to: "/learn" });
          }
        }}
      />
    </AppShell>
  );
}

function TopicEditorSheet({
  roadmapId,
  phaseId,
  topic,
  onClose,
}: {
  roadmapId: string;
  phaseId: string;
  topic: Topic;
  onClose: () => void;
}) {
  const updateTopic = useAppStore((s) => s.updateTopic);
  const addSubtopic = useAppStore((s) => s.addSubtopic);
  const updateSubtopic = useAppStore((s) => s.updateSubtopic);
  const deleteSubtopic = useAppStore((s) => s.deleteSubtopic);
  const addChecklistItem = useAppStore((s) => s.addChecklistItem);
  const updateChecklistItem = useAppStore((s) => s.updateChecklistItem);
  const deleteChecklistItem = useAppStore((s) => s.deleteChecklistItem);

  const [newCheck, setNewCheck] = useState("");
  const [newSub, setNewSub] = useState("");
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  return (
    <BottomSheet open onClose={onClose} title="Edit topic" className="max-h-[95dvh]">
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Title
          </label>
          <TextField
            value={topic.title}
            onChange={(e) => updateTopic(roadmapId, phaseId, topic.id, { title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Notes
          </label>
          <TextArea
            rows={5}
            placeholder="Write anything…"
            value={topic.notes}
            onChange={(e) => updateTopic(roadmapId, phaseId, topic.id, { notes: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Checklist
            </label>
            <Chip>
              {topic.checklist.filter((c) => c.done).length} / {topic.checklist.length}
            </Chip>
          </div>
          <div className="space-y-1.5">
            {topic.checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateChecklistItem({ roadmapId, phaseId, topicId: topic.id }, c.id, {
                      done: !c.done,
                    })
                  }
                  className="flex h-5 w-5 items-center justify-center"
                >
                  {c.done ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/60" strokeWidth={1.5} />
                  )}
                </button>
                <input
                  {...NO_AUTOFILL_PROPS}
                  className="flex-1 bg-transparent text-[13.5px] outline-none"
                  value={c.title}
                  onChange={(e) =>
                    updateChecklistItem({ roadmapId, phaseId, topicId: topic.id }, c.id, {
                      title: e.target.value,
                    })
                  }
                />
                <IconButton
                  size="sm"
                  variant="danger"
                  aria-label="Remove"
                  onClick={() =>
                    deleteChecklistItem({ roadmapId, phaseId, topicId: topic.id }, c.id)
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <TextField
              value={newCheck}
              onChange={(e) => setNewCheck(e.target.value)}
              placeholder="New checklist item"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCheck.trim()) {
                  addChecklistItem({ roadmapId, phaseId, topicId: topic.id }, newCheck.trim());
                  setNewCheck("");
                }
              }}
            />
            <IconButton
              variant="primary"
              size="lg"
              aria-label="Add check"
              onClick={() => {
                if (!newCheck.trim()) return;
                addChecklistItem({ roadmapId, phaseId, topicId: topic.id }, newCheck.trim());
                setNewCheck("");
              }}
            >
              <Plus className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Subtopics
          </label>
          <div className="space-y-2">
            {topic.subtopics.map((sub) => (
              <SubtopicBlock
                key={sub.id}
                sub={sub}
                open={!!openSubs[sub.id]}
                onToggleOpen={() => setOpenSubs((o) => ({ ...o, [sub.id]: !o[sub.id] }))}
                onChange={(patch) => updateSubtopic(roadmapId, phaseId, topic.id, sub.id, patch)}
                onDelete={() => deleteSubtopic(roadmapId, phaseId, topic.id, sub.id)}
                addCheck={(title) =>
                  addChecklistItem(
                    { roadmapId, phaseId, topicId: topic.id, subtopicId: sub.id },
                    title,
                  )
                }
                updateCheck={(id, patch) =>
                  updateChecklistItem(
                    { roadmapId, phaseId, topicId: topic.id, subtopicId: sub.id },
                    id,
                    patch,
                  )
                }
                deleteCheck={(id) =>
                  deleteChecklistItem(
                    { roadmapId, phaseId, topicId: topic.id, subtopicId: sub.id },
                    id,
                  )
                }
              />
            ))}
          </div>
          <div className="flex gap-2">
            <TextField
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="New subtopic"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSub.trim()) {
                  addSubtopic(roadmapId, phaseId, topic.id, newSub.trim());
                  setNewSub("");
                }
              }}
            />
            <IconButton
              variant="primary"
              size="lg"
              aria-label="Add subtopic"
              onClick={() => {
                if (!newSub.trim()) return;
                addSubtopic(roadmapId, phaseId, topic.id, newSub.trim());
                setNewSub("");
              }}
            >
              <Plus className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}

function SubtopicBlock({
  sub,
  open,
  onToggleOpen,
  onChange,
  onDelete,
  addCheck,
  updateCheck,
  deleteCheck,
}: {
  sub: Subtopic;
  open: boolean;
  onToggleOpen: () => void;
  onChange: (patch: Partial<Subtopic>) => void;
  onDelete: () => void;
  addCheck: (title: string) => void;
  updateCheck: (id: string, patch: Partial<ChecklistItem>) => void;
  deleteCheck: (id: string) => void;
}) {
  const [newCheck, setNewCheck] = useState("");
  const pct = subtopicPct(sub);
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
      <div className="flex items-center gap-2">
        <button onClick={onToggleOpen} className="flex h-6 w-6 items-center justify-center">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <input
          {...NO_AUTOFILL_PROPS}
          value={sub.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="flex-1 bg-transparent text-[13px] font-medium outline-none"
        />
        <Chip>{pct}%</Chip>
        <IconButton size="sm" variant="danger" aria-label="Delete subtopic" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      {open ? (
        <div className="mt-3 space-y-2 pl-8">
          <TextArea
            rows={2}
            value={sub.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Notes…"
          />
          <div className="space-y-1.5">
            {sub.checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <button
                  onClick={() => updateCheck(c.id, { done: !c.done })}
                  className="flex h-5 w-5 items-center justify-center"
                >
                  {c.done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-[var(--primary)]" />
                  ) : (
                    <Circle className="h-4.5 w-4.5 text-muted-foreground/60" strokeWidth={1.5} />
                  )}
                </button>
                <input
                  {...NO_AUTOFILL_PROPS}
                  className="flex-1 bg-transparent text-[13px] outline-none"
                  value={c.title}
                  onChange={(e) => updateCheck(c.id, { title: e.target.value })}
                />
                <IconButton
                  size="sm"
                  variant="danger"
                  aria-label="Remove"
                  onClick={() => deleteCheck(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <TextField
              value={newCheck}
              onChange={(e) => setNewCheck(e.target.value)}
              placeholder="Check item"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCheck.trim()) {
                  addCheck(newCheck.trim());
                  setNewCheck("");
                }
              }}
            />
            <IconButton
              variant="primary"
              size="lg"
              aria-label="Add check"
              onClick={() => {
                if (!newCheck.trim()) return;
                addCheck(newCheck.trim());
                setNewCheck("");
              }}
            >
              <Plus className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
