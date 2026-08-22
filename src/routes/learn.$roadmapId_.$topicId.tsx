import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Chip, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common/EmptyState";
import { BottomSheet, ConfirmDialog } from "@/components/edit/Sheet";
import { TextField, TextArea, NO_AUTOFILL_PROPS } from "@/components/edit/Fields";
import { ActionButton, IconButton } from "@/components/edit/Buttons";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { topicPct, subtopicPct } from "@/lib/progress";
import { newId } from "@/lib/id";
import { haptics } from "@/lib/haptics";
import { isSafeUrl, safeHref } from "@/lib/url";
import type { Subtopic, ChecklistItem } from "@/lib/schema";

const searchSchema = z.object({
  phaseId: z.string(),
});

export const Route = createFileRoute("/learn/$roadmapId_/$topicId")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Topic — SkillSync" },
      { name: "description", content: "Topic notes, checklist and resources." },
      { property: "og:title", content: "Topic — SkillSync" },
      { property: "og:description", content: "Topic notes, checklist and resources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TopicDetail,
});

function TopicDetail() {
  const { roadmapId, topicId } = Route.useParams();
  const { phaseId } = Route.useSearch();
  const navigate = useNavigate();
  const hydrated = useHydrated();

  const roadmap = useAppStore((s) => s.roadmaps.find((r) => r.id === roadmapId));
  const phase = roadmap?.phases.find((p) => p.id === phaseId);
  const topic = phase?.topics.find((t) => t.id === topicId);

  const updateTopic = useAppStore((s) => s.updateTopic);
  const deleteTopic = useAppStore((s) => s.deleteTopic);
  const addSubtopic = useAppStore((s) => s.addSubtopic);
  const updateSubtopic = useAppStore((s) => s.updateSubtopic);
  const deleteSubtopic = useAppStore((s) => s.deleteSubtopic);
  const addChecklistItem = useAppStore((s) => s.addChecklistItem);
  const updateChecklistItem = useAppStore((s) => s.updateChecklistItem);
  const deleteChecklistItem = useAppStore((s) => s.deleteChecklistItem);

  const [newCheck, setNewCheck] = useState("");
  const [newSub, setNewSub] = useState("");
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});
  const [resOpen, setResOpen] = useState(false);
  const [resLabel, setResLabel] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lastEditedTick, setLastEditedTick] = useState(0);

  const pct = useMemo(() => (topic ? topicPct(topic) : 0), [topic]);

  const touch = () => setLastEditedTick(Date.now());

  if (!hydrated) {
    return (
      <AppShell>
        <div className="px-5 lg:px-2 pt-4 text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  if (!roadmap || !phase || !topic) {
    return (
      <AppShell>
        <div className="px-5 lg:px-2 pt-4">
          <Link to="/learn" className="text-muted-foreground">
            ← Back
          </Link>
          <div className="mt-6">
            <EmptyState title="Topic not found" hint="It may have been deleted or moved." />
          </div>
        </div>
      </AppShell>
    );
  }

  const lastEdited =
    lastEditedTick ||
    Math.max(
      topic.createdAt,
      ...topic.checklist.map((c) => c.createdAt),
      ...topic.subtopics.map((s) => s.createdAt),
    );

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between px-5 lg:px-2">
        <Link
          to="/learn/$roadmapId"
          params={{ roadmapId }}
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-[17px] w-[17px] text-muted-foreground" strokeWidth={1.75} />
        </Link>
        <IconButton
          aria-label="Delete topic"
          variant="danger"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </header>

      <div className="mb-6 px-5 lg:px-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {roadmap.title} · {phase.title}
        </div>
        <input
          {...NO_AUTOFILL_PROPS}
          value={topic.title}
          onChange={(e) => {
            updateTopic(roadmapId, phaseId, topicId, { title: e.target.value });
            touch();
          }}
          className="mt-2 w-full bg-transparent text-[24px] font-semibold leading-tight tracking-[-0.02em] outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone="primary">{pct}%</Chip>
          <Chip>
            {topic.checklist.filter((c) => c.done).length}/{topic.checklist.length} tasks
          </Chip>
          <Chip>{topic.subtopics.length} subtopics</Chip>
          <span className="text-[11px] text-muted-foreground">
            Last edited{" "}
            {new Date(lastEdited).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="mt-4">
          <ProgressBar value={pct} tone="gradient" />
        </div>
      </div>

      {/* Notes */}
      <section className="space-y-3 px-5 lg:px-2">
        <SectionHeader title="Notes" />
        <Card className="p-3">
          <TextArea
            rows={6}
            placeholder="Write your notes — they save automatically."
            value={topic.notes}
            onChange={(e) => {
              updateTopic(roadmapId, phaseId, topicId, { notes: e.target.value });
              touch();
            }}
          />
        </Card>
      </section>

      {/* Resources */}
      <section className="mt-6 space-y-3 px-5 lg:px-2">
        <SectionHeader
          title="Resources"
          action={
            <button
              onClick={() => {
                setResLabel("");
                setResUrl("");
                setResOpen(true);
              }}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          }
        />
        {topic.resources.length === 0 ? (
          <EmptyState
            icon={LinkIcon}
            title="No resources yet"
            hint="Attach docs, videos or articles."
          />
        ) : (
          <Card className="p-2">
            <div className="divide-y divide-white/[0.05]">
              {topic.resources.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-2 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <a
                    href={safeHref(r.url)}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!isSafeUrl(r.url)}
                    className="min-w-0 flex-1"
                  >
                    <div className="truncate text-[13.5px] font-medium">{r.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{r.url}</div>
                  </a>
                  <a
                    href={safeHref(r.url)}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!isSafeUrl(r.url)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] text-muted-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <IconButton
                    size="sm"
                    variant="danger"
                    aria-label="Remove resource"
                    onClick={() => {
                      updateTopic(roadmapId, phaseId, topicId, {
                        resources: topic.resources.filter((x) => x.id !== r.id),
                      });
                      touch();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Checklist */}
      <section className="mt-6 space-y-3 px-5 lg:px-2">
        <SectionHeader
          title="Checklist"
          action={
            <span>
              {topic.checklist.filter((c) => c.done).length} / {topic.checklist.length}
            </span>
          }
        />
        <Card className="p-3">
          <div className="space-y-1.5">
            {topic.checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    updateChecklistItem({ roadmapId, phaseId, topicId }, c.id, { done: !c.done });
                    touch();
                  }}
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
                  className={
                    "flex-1 bg-transparent text-[13.5px] outline-none " +
                    (c.done ? "text-muted-foreground line-through" : "")
                  }
                  value={c.title}
                  onChange={(e) => {
                    updateChecklistItem({ roadmapId, phaseId, topicId }, c.id, {
                      title: e.target.value,
                    });
                    touch();
                  }}
                />
                <IconButton
                  size="sm"
                  variant="danger"
                  aria-label="Remove"
                  onClick={() => {
                    deleteChecklistItem({ roadmapId, phaseId, topicId }, c.id);
                    touch();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <TextField
              value={newCheck}
              onChange={(e) => setNewCheck(e.target.value)}
              placeholder="New checklist item"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCheck.trim()) {
                  addChecklistItem({ roadmapId, phaseId, topicId }, newCheck.trim());
                  setNewCheck("");
                  touch();
                }
              }}
            />
            <IconButton
              variant="primary"
              size="lg"
              aria-label="Add"
              onClick={() => {
                if (!newCheck.trim()) return;
                addChecklistItem({ roadmapId, phaseId, topicId }, newCheck.trim());
                setNewCheck("");
                touch();
              }}
            >
              <Plus className="h-4 w-4" />
            </IconButton>
          </div>
        </Card>
      </section>

      {/* Subtopics */}
      <section className="mt-6 space-y-3 px-5 lg:px-2">
        <SectionHeader title="Subtopics" />
        <div className="space-y-2">
          {topic.subtopics.map((sub) => (
            <SubtopicBlock
              key={sub.id}
              sub={sub}
              open={!!openSubs[sub.id]}
              onToggleOpen={() => setOpenSubs((o) => ({ ...o, [sub.id]: !o[sub.id] }))}
              onChange={(patch) => {
                updateSubtopic(roadmapId, phaseId, topicId, sub.id, patch);
                touch();
              }}
              onDelete={() => {
                deleteSubtopic(roadmapId, phaseId, topicId, sub.id);
                touch();
              }}
              addCheck={(title) => {
                addChecklistItem({ roadmapId, phaseId, topicId, subtopicId: sub.id }, title);
                touch();
              }}
              updateCheck={(id, patch) => {
                updateChecklistItem({ roadmapId, phaseId, topicId, subtopicId: sub.id }, id, patch);
                touch();
              }}
              deleteCheck={(id) => {
                deleteChecklistItem({ roadmapId, phaseId, topicId, subtopicId: sub.id }, id);
                touch();
              }}
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
                addSubtopic(roadmapId, phaseId, topicId, newSub.trim());
                setNewSub("");
                touch();
              }
            }}
          />
          <IconButton
            variant="primary"
            size="lg"
            aria-label="Add subtopic"
            onClick={() => {
              if (!newSub.trim()) return;
              addSubtopic(roadmapId, phaseId, topicId, newSub.trim());
              setNewSub("");
              touch();
            }}
          >
            <Plus className="h-4 w-4" />
          </IconButton>
        </div>
      </section>

      {/* Add resource sheet */}
      <BottomSheet open={resOpen} onClose={() => setResOpen(false)} title="Add resource">
        <div className="space-y-3">
          <TextField
            autoFocus
            value={resLabel}
            onChange={(e) => setResLabel(e.target.value)}
            placeholder="Label (e.g. Official docs)"
          />
          <TextField
            value={resUrl}
            onChange={(e) => setResUrl(e.target.value)}
            placeholder="https://…"
          />
          <ActionButton
            className="w-full"
            onClick={() => {
              const url = resUrl.trim();
              const label = resLabel.trim() || url;
              if (!url) return;
              if (!isSafeUrl(url)) {
                haptics.error();
                toast.error("Enter a valid http(s) link.");
                return;
              }
              updateTopic(roadmapId, phaseId, topicId, {
                resources: [...topic.resources, { id: newId(), label, url }],
              });
              setResOpen(false);
              touch();
            }}
          >
            Add resource
          </ActionButton>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete topic?"
        description="This removes the topic and all its subtopics and checklists."
        onConfirm={() => {
          deleteTopic(roadmapId, phaseId, topicId);
          navigate({ to: "/learn/$roadmapId", params: { roadmapId } });
        }}
      />
    </AppShell>
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
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
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
          className="flex-1 bg-transparent text-[13.5px] font-medium outline-none"
        />
        <Chip>{pct}%</Chip>
        <IconButton size="sm" variant="danger" aria-label="Delete subtopic" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      {open ? (
        <div className="mt-3 space-y-2 pl-8">
          <TextArea
            rows={3}
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
                    <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                  )}
                </button>
                <input
                  {...NO_AUTOFILL_PROPS}
                  className={
                    "flex-1 bg-transparent text-[13px] outline-none " +
                    (c.done ? "text-muted-foreground line-through" : "")
                  }
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
