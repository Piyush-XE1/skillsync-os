import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarRange,
  CheckCircle2,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  Search as SearchIcon,
  Flame,
  Timer,
  Award,
  Wallet,
  Braces,
  Briefcase,
  Circle,
} from "lucide-react";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { searchAll, type SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — SkillSync" },
      { name: "description", content: "Command palette for the entire workspace." },
    ],
  }),
  component: SearchPage,
});

const KIND_META: Record<SearchResult["kind"], { label: string; icon: typeof LayoutDashboard }> = {
  roadmap: { label: "Roadmap", icon: BookOpen },
  topic: { label: "Topic", icon: GraduationCap },
  project: { label: "Project", icon: FolderKanban },
  note: { label: "Note", icon: FileText },
  planner: { label: "Task", icon: ListTodo },
  habit: { label: "Habit", icon: Flame },
  subject: { label: "Subject", icon: GraduationCap },
  coding: { label: "Problem", icon: Braces },
  job: { label: "Application", icon: Briefcase },
  page: { label: "Page", icon: LayoutDashboard },
};

function resultHref(r: SearchResult): {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
} {
  switch (r.kind) {
    case "roadmap":
      return { to: "/learn/$roadmapId", params: { roadmapId: r.id } };
    case "topic":
      return {
        to: "/learn/$roadmapId/$topicId",
        params: { roadmapId: r.roadmapId, topicId: r.topicId },
        search: { phaseId: r.phaseId },
      };
    case "project":
      return { to: "/projects", params: { projectId: r.id } };
    case "note":
      return { to: "/notes/$noteId", params: { noteId: r.id } };
    case "planner":
      return { to: "/planner" };
    case "habit":
      return { to: "/habits/$habitId", params: { habitId: r.id } };
    case "subject":
      return { to: "/attendance" };
    case "coding":
      return { to: "/coding" };
    case "job":
      return { to: "/career" };
    case "page":
      return { to: r.to };
  }
}

function SearchPage() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const data = useAppStore((s) => s);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchAll(data as never, query), [data, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const open = (index: number) => {
    const result = results[index];
    if (!result) return;
    haptics.selection();
    const href = resultHref(result);
    void navigate({
      to: href.to as never,
      params: href.params as never,
      search: href.search as never,
    });
  };

  return (
    <div className="relative min-h-[100dvh] w-full">
      <div className="mx-auto w-full max-w-screen-sm px-5 pt-[max(env(safe-area-inset-top),24px)] lg:max-w-screen-md lg:pt-16">
        {/* Input */}
        <div className="glass flex items-center gap-3 rounded-[18px] px-4 py-3.5 shadow-[var(--shadow-float)]">
          <SearchIcon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && results.length > 0) {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === "ArrowUp" && results.length > 0) {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                open(active);
              } else if (e.key === "Escape") {
                if (window.history.length > 1) {
                  void navigate({ to: "/" });
                }
              }
            }}
            placeholder="Search roadmaps, topics, notes, projects, habits…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <span className="hidden shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="mt-4 space-y-1 pb-24">
          {hydrated && results.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="text-[14px] font-medium">No results for “{query}”</div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Try a topic, project, note title — or press / from anywhere.
              </p>
            </div>
          ) : (
            results.map((result, i) => {
              const meta = KIND_META[result.kind];
              const Icon = meta.icon;
              const done =
                (result.kind === "topic" && result.done) ||
                (result.kind === "planner" && result.done);
              return (
                <Link
                  key={`${result.kind}-${i}`}
                  to={resultHref(result).to as never}
                  params={resultHref(result).params as never}
                  search={resultHref(result).search as never}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 transition-colors",
                    active === i ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.04]">
                    <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "truncate text-[13.5px] font-medium",
                        done && "text-muted-foreground line-through",
                      )}
                    >
                      {result.title}
                    </div>
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      {meta.label}
                      {result.kind !== "page" ? ` · ${result.subtitle}` : ""}
                    </div>
                  </div>
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" strokeWidth={2} />
                  ) : result.kind === "roadmap" ? (
                    <span className="shrink-0 text-[11.5px] text-muted-foreground">
                      {result.pct}%
                    </span>
                  ) : (
                    <Circle className="h-3 w-3 shrink-0 text-muted-foreground/40" strokeWidth={2} />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Hint footer */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 hidden items-center justify-center gap-4 text-[11px] text-muted-foreground lg:flex">
        <span>
          <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5">↑↓</kbd>{" "}
          navigate
        </span>
        <span>
          <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5">↵</kbd>{" "}
          open
        </span>
        <span>
          <kbd className="rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5">/</kbd>{" "}
          from anywhere
        </span>
      </div>

      {/* Quick launch grid when empty */}
      {query.trim() === "" && hydrated ? (
        <div className="mx-auto mt-8 w-full max-w-screen-sm px-5 lg:max-w-screen-md">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Go to
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {[
              { icon: Timer, label: "Focus", to: "/focus" },
              { icon: Award, label: "CGPA", to: "/cgpa" },
              { icon: FileText, label: "Resume", to: "/resume" },
              { icon: Wallet, label: "Expenses", to: "/expenses" },
              { icon: CalendarRange, label: "Planner", to: "/planner" },
              { icon: BookOpen, label: "Learn", to: "/learn" },
              { icon: Flame, label: "Habits", to: "/habits" },
              { icon: LayoutDashboard, label: "Dashboard", to: "/" },
            ].map(({ icon: Icon, label, to }) => (
              <Link
                key={label}
                to={to as never}
                className="card-surface flex flex-col items-center gap-2 p-3 transition-all active:scale-[0.96]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04]">
                  <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
