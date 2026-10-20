import { useState } from "react";
import { SkillSyncLogo } from "@/components/brand/SkillSyncLogo";

import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  GraduationCap,
  FolderKanban,
  CalendarRange,
  Flame,
  Wallet,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Timer,
  Award,
  Search,
  Braces,
  Briefcase,
  Target,
  CalendarHeart,
  Sparkles,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { useAppStore } from "@/store/useAppStore";
import { useUiStore } from "@/store/useUiStore";
import type { ModuleKey } from "@/lib/schema";

type Item = {
  to:
    | "/"
    | "/learn"
    | "/projects"
    | "/planner"
    | "/habits"
    | "/notes"
    | "/expenses"
    | "/focus"
    | "/cgpa"
    | "/coding"
    | "/career"
    | "/goals"
    | "/review"
    | "/search"
    | "/profile"
    | "/showcase";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  /** Module flag that gates this entry. */
  module?: ModuleKey;
  kbd?: string;
};

const items: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/learn", label: "Roadmaps", icon: GraduationCap, module: "roadmaps" },
  { to: "/focus", label: "Focus", icon: Timer, module: "focus", kbd: "F" },
  { to: "/projects", label: "Projects", icon: FolderKanban, module: "projects" },
  { to: "/planner", label: "Planner", icon: CalendarRange, module: "planner" },
  { to: "/cgpa", label: "CGPA", icon: Award, module: "cgpa" },
  { to: "/habits", label: "Habits", icon: Flame, module: "habits" },
  { to: "/notes", label: "Notes", icon: Sparkles, module: "notes" },
  { to: "/expenses", label: "Expenses", icon: Wallet, module: "expenses" },
  { to: "/coding", label: "Code", icon: Braces, module: "coding", kbd: "C" },
  { to: "/career", label: "Career", icon: Briefcase, module: "career" },
  { to: "/goals", label: "Aims", icon: Target, kbd: "G" },
  { to: "/review", label: "Review", icon: CalendarHeart, kbd: "R" },
  { to: "/search", label: "Search", icon: Search, kbd: "⌘K" },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/showcase", label: "Project", icon: Sparkles, kbd: "?" },
];

const STORAGE_KEY = "skillsync.sidebar.collapsed";

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Permanent, collapsible sidebar. Rendered from `lg` up only. */
export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const modules = useAppStore((s) => s.preferences.modules);
  const openQuickCapture = useUiStore((s) => s.openQuickCapture);
  // Lazy initial state: AppShell remounts on every navigation, so reading the
  // persisted value in an effect made the sidebar flash expanded for a frame
  // on every route change. Initializing synchronously keeps it stable.
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const visible = items.filter((item) => !item.module || modules[item.module]);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  return (
    <aside
      aria-label="Primary"
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "sticky top-0 hidden h-[100dvh] shrink-0 flex-col gap-2 border-r border-border bg-background px-3 py-5 transition-[width] duration-300 ease-[var(--ease-out-soft)] lg:flex",
        collapsed ? "w-[76px]" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center gap-2 border-b border-border pb-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {collapsed ? (
          <SkillSyncLogo size={26} />
        ) : (
          <div className="flex min-w-0 items-center gap-2.5 pl-1">
            <SkillSyncLogo size={26} />
            <div className="min-w-0 leading-none">
              <div className="truncate tracking-[-0.035em] text-foreground">
                <span className="text-[14px] font-semibold">Skill</span>
                <span className="font-editorial text-[19px] italic text-primary-glow">Sync</span>
                <span className="font-numerical ml-1 text-[8px] tracking-[0.16em] text-muted-foreground">
                  OS
                </span>
              </div>
              <div className="font-numerical mt-1.5 truncate text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
                Personal practice system
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            haptics.tap();
            sound.tap();
            toggle();
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-surface hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
        {visible.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              onClick={() => {
                if (!active) {
                  haptics.selection();
                  sound.select();
                }
              }}
              className={cn(
                "group relative flex items-center gap-3 rounded-[5px] border px-3 py-2.5 transition-colors duration-200 ease-[var(--ease-out-soft)]",
                collapsed && "justify-center px-0",
                active
                  ? "border-border-strong bg-surface text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-surface/70 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-[17px] w-[17px] shrink-0 transition-colors",
                  active && "text-primary-glow",
                )}
                strokeWidth={active ? 2 : 1.65}
              />
              {collapsed ? null : (
                <>
                  <span className="truncate text-[12.5px] font-medium tracking-[-0.01em]">
                    {item.label}
                  </span>
                  {item.kbd ? (
                    <kbd className="font-numerical ml-auto border border-border bg-background px-1.5 py-0.5 text-[8.5px] text-muted-foreground/80">
                      {item.kbd}
                    </kbd>
                  ) : null}
                </>
              )}
              {active ? <span className="absolute inset-y-2 left-0 w-px bg-primary" /> : null}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        title={collapsed ? "Quick capture" : undefined}
        aria-label="Quick capture"
        onClick={() => {
          haptics.tap();
          sound.open();
          openQuickCapture();
        }}
        className={cn(
          "pressable mt-2 flex items-center gap-3 rounded-[5px] border border-primary bg-primary px-3 py-3 text-primary-foreground transition-colors hover:bg-primary-glow",
          collapsed && "justify-center px-0",
        )}
      >
        <Plus className="h-[17px] w-[17px] shrink-0" strokeWidth={2} />
        {collapsed ? null : (
          <span className="font-numerical text-[9.5px] font-semibold uppercase tracking-[0.1em]">
            Quick capture
          </span>
        )}
      </button>
    </aside>
  );
}
