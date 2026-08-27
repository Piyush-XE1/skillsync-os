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
  LocateFixed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, ProgressBar, CircularProgress } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { phasePct, roadmapPct, topicPct, subtopicPct } from "@/lib/progress";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { PhaseNode, RouteStart, RouteFinish } from "@/components/roadmap/RouteRail";

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

  const totals = useMemo(() => {
    if (!roadmap) return { topics: 0, done: 0 };
    let topics = 0;
    let done = 0;
    let subtopics = 0;
    for (const p of roadmap.phases) {
      for (const t of p.topics) {
        topics++;
        if (topicPct(t) === 100) done++;
        subtopics += t.subtopics.length;
      }
    }
    return { topics, done, subtopics };
  }, [roadmap]);

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

  const accent = roadmap.color;

  return (
    <AppShell>
      <header className="mb-4 px-5 lg:px-2">
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

        <div className="mt-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
            Learning journey
          </div>
          <h1
            className="mt-2 bg-clip-text text-[30px] font-semibold leading-tight tracking-[-0.02em] text-transparent"
            style={{
              backgroundImage: `linear-gradient(120deg, var(--foreground) 30%, ${accent} 90%)`,
            }}
          >
            {roadmap.title}
          </h1>
          {roadmap.subtitle ? (
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              {roadmap.subtitle}
            </p>
          ) : null}
        </div>

        {/* Hero: course overview */}
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-40 blur-3xl"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
          />
          <div className="relative flex items-center justify-between gap-4">
            <CircularProgress
              value={pct}
              size={68}
              stroke={7}
              label={`${pct}%`}
              sublabel="complete"
            />
            <div className="flex-1">
              <div className="text-[13px] font-semibold tracking-tight">Journey progress</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                <span>
                  {roadmap.phases.length} phase{roadmap.phases.length === 1 ? "" : "s"}
                </span>
                <span>
                  {totals.topics} topic{totals.topics === 1 ? "" : "s"}
                </span>
                <span>
                  {totals.subtopics} subtopic{totals.subtopics === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <LocateFixed className="h-3.5 w-3.5" style={{ color: accent }} strokeWidth={2} />
                <span className="text-[11.5px] text-muted-foreground">
                  {totals.done} of {totals.topics} topics mastered
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 lg:px-2">
        {roadmap.phases.length === 0 ? (
          <EmptyState
            title="Chart your course"
            hint="Start by adding a phase like ‘Foundations’ or ‘Fundamentals’. Each phase becomes a waypoint on your journey."
            action={
              <ActionButton onClick={() => setNewPhase(true)}>
                <Plus className="h-4 w-4" /> Add first phase
              </ActionButton>
            }
          />
        ) : (
          <div className="relative pb-2">
            {/* Continuous journey track */}
            <div
              className="absolute left-[18.5px] top-[74px] bottom-[74px] w-[3px] rounded-full bg-white/[0.08]"
              aria-hidden
            />

            <RouteStart color={accent} />

            <ol className="relative mt-5 space-y-3">
              {roadmap.phases.map((phase, phaseIdx) => {
                const isCollapsed = collapsed[phase.id];
                const pPct = phasePct(phase);
                const done = pPct === 100;
                return (
                  <li key={phase.id} className="relative">
                    {/* Travelled track segment — lights up when this phase is complete */}
                    <span
                      className="absolute -bottom-3 left-[18.5px] top-0 w-[3px] rounded-full"
                      style={{
                        backgroundImage: done
                          ? `linear-gradient(to bottom, ${accent}, var(--secondary))`
                          : undefined,
                        backgroundColor: done ? undefined : "rgba(255,255,255,0.08)",
                      }}
                      aria-hidden
                    />

                    <div className="flex items-start gap-3">
                      {/* Waypoint + connector */}
                      <div className="relative flex w-10 shrink-0 flex-col items-center pt-0.5">
                        <span
                          className="absolute left-[20px] top-[22px] h-[3px] w-[32px] rounded-full"
                          style={{
                            backgroundColor: done ? accent : "rgba(255,255,255,0.1)",
                          }}
                          aria-hidden
                        />
                        <PhaseNode pct={pPct} position={phaseIdx + 1} color={accent} />
                      </div>

                      <Card className="min-w-0 flex-1 space-y-3 overflow-hidden p-4">
                        {/* Phase header */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhaseComplete(roadmap.id, phase.id, pPct !== 100);
                            }}
                            aria-label={done ? "Mark phase incomplete" : "Mark phase complete"}
                            className="flex h-6 w-6 shrink-0 items-center justify-center"
                          >
                            {done ? (
                              <CheckCircle2 className="h-5 w-5" style={{ color: accent }} />
                            ) : (
                              <Circle
                                className="h-5 w-5 text-muted-foreground/60"
                                strokeWidth={1.5}
                              />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              setCollapsed((c) => ({ ...c, [phase.id]: !c[phase.id] }))
                            }
                            className="flex flex-1 items-center gap-2 text-left"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-[14px] font-semibold tracking-tight">
                              {phase.title}
                            </span>
                            <Chip tone={done ? "success" : "default"}>{pPct}%</Chip>
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5">
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
                        </div>

                        <ProgressBar value={pPct} tone="gradient" />

                        {!isCollapsed ? (
                          <div className="pt-1">
                            {phase.topics.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-white/[0.06] px-3 py-4 text-center text-[12.5px] text-muted-foreground">
                                No stops on this leg yet
                              </div>
                            ) : (
                              <ul className="relative space-y-2">
                                {/* Branch trunk connecting topic stops */}
                                <span
                                  className="absolute bottom-3 left-[7px] top-3 w-[2px] rounded-full bg-white/[0.08]"
                                  aria-hidden
                                />
                                {phase.topics.map((topic, topicIdx) => {
                                  const tPct = topicPct(topic);
                                  const tDone = tPct === 100;
                                  return (
                                    <li key={topic.id} className="relative pl-4">
                                      {/* spur + node */}
                                      <span
                                        className="absolute left-[6px] top-[14px] h-[2px] w-[14px] rounded-full bg-white/[0.12]"
                                        aria-hidden
                                      />
                                      <span
                                        className="absolute left-0 top-[8px] z-10 flex h-[15px] w-[15px] items-center justify-center rounded-full"
                                        style={
                                          tDone
                                            ? {
                                                background: `linear-gradient(135deg, ${accent}, var(--secondary))`,
                                              }
                                            : undefined
                                        }
                                      >
                                        {tDone ? (
                                          <CheckCircle2
                                            className="h-[13px] w-[13px] text-white"
                                            strokeWidth={3}
                                          />
                                        ) : (
                                          <span className="h-[9px] w-[9px] rounded-full border border-white/[0.28] bg-white/[0.06]" />
                                        )}
                                      </span>

                                      <div
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
                                          if (e.target !== e.currentTarget) return;
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            navigate({
                                              to: "/learn/$roadmapId/$topicId",
                                              params: { roadmapId: roadmap.id, topicId: topic.id },
                                              search: { phaseId: phase.id },
                                            });
                                          }
                                        }}
                                        className="cursor-pointer rounded-xl border border-white/[0.05] bg-white/[0.015] p-3 transition-colors hover:bg-white/[0.025]"
                                      >
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (tPct === 100) haptics.selection();
                                              else haptics.success();
                                              setTopicComplete(
                                                roadmap.id,
                                                phase.id,
                                                topic.id,
                                                tPct !== 100,
                                              );
                                            }}
                                            aria-label="Toggle topic"
                                            className="flex h-5 w-5 items-center justify-center"
                                          >
                                            {tPct === 100 ? (
                                              <CheckCircle2
                                                className="h-5 w-5"
                                                style={{ color: accent }}
                                              />
                                            ) : (
                                              <Circle
                                                className="h-5 w-5 text-muted-foreground/60"
                                                strokeWidth={1.5}
                                              />
                                            )}
                                          </button>
                                          <div className="flex-1 text-left">
                                            <div
                                              className={cn(
                                                "text-[13.5px] font-medium",
                                                tDone && "text-muted-foreground",
                                              )}
                                            >
                                              {topic.title}
                                            </div>
                                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                              <span>{tPct}%</span>
                                              {topic.subtopics.length > 0 ? (
                                                <span>· {topic.subtopics.length} subtopics</span>
                                              ) : null}
                                              {topic.checklist.length > 0 ? (
                                                <span>· {topic.checklist.length} checks</span>
                                              ) : null}
                                              {topic.notes ? (
                                                <StickyNote className="h-3 w-3" />
                                              ) : null}
                                            </div>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-0.5">
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
                                        </div>

                                        {topic.subtopics.length > 0 ? (
                                          <ul className="relative mt-2 space-y-1 pl-5">
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
                                                          <CheckCircle2
                                                            className="h-4 w-4"
                                                            style={{ color: accent }}
                                                          />
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
                                                          className={cn(
                                                            "flex-1 truncate text-[12.5px]",
                                                            complete
                                                              ? "text-muted-foreground line-through"
                                                              : "text-foreground/85",
                                                          )}
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
                                                                <CheckCircle2
                                                                  className="h-3.5 w-3.5 shrink-0"
                                                                  style={{ color: accent }}
                                                                />
                                                              ) : (
                                                                <Circle
                                                                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                                                                  strokeWidth={1.5}
                                                                />
                                                              )}
                                                              <span
                                                                className={cn(
                                                                  "flex-1 truncate text-[11.5px]",
                                                                  c.done
                                                                    ? "text-muted-foreground line-through"
                                                                    : "text-foreground/75",
                                                                )}
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
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            <button
                              onClick={() => {
                                setAddTopicToPhase(phase.id);
                                setTopicTitle("");
                              }}
                              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.08] py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add stop to this leg
                            </button>
                          </div>
                        ) : null}
                      </Card>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="relative mt-5">
              <RouteFinish color={accent} done={pct === 100} label="Roadmap complete" />
            </div>
          </div>
        )}

        {roadmap.phases.length > 0 ? (
          <button
            onClick={() => setNewPhase(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/[0.08] py-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add a phase to the journey
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
