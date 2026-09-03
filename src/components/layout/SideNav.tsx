import { useState } from "react";
import { SkillSyncLogo } from "@/components/brand/SkillSyncLogo";

import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  GraduationCap,
  FolderKanban,
  CalendarRange,
  CalendarCheck,
  Flame,
  Wallet,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Timer,
  Award,
  FileText,
  Search,
  Braces,
  Briefcase,
  Trophy,
  CalendarHeart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useAppStore } from "@/store/useAppStore";

type Item = {
  to:
    | "/"
    | "/learn"
    | "/projects"
    | "/planner"
    | "/attendance"
    | "/habits"
    | "/expenses"
    | "/focus"
    | "/cgpa"
    | "/resume"
    | "/coding"
    | "/career"
    | "/achievements"
    | "/review"
    | "/search"
    | "/profile";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  /** Module flag that gates this entry. */
  module?: "attendance" | "expenses" | "focus" | "cgpa" | "resume" | "coding" | "career";
  kbd?: string;
};

const items: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/focus", label: "Focus", icon: Timer, module: "focus", kbd: "F" },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/planner", label: "Planner", icon: CalendarRange },
  { to: "/cgpa", label: "CGPA", icon: Award, module: "cgpa" },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, module: "attendance" },
  { to: "/habits", label: "Habits", icon: Flame },
  { to: "/expenses", label: "Expenses", icon: Wallet, module: "expenses" },
  { to: "/resume", label: "Resume", icon: FileText, module: "resume" },
  { to: "/coding", label: "Code", icon: Braces, module: "coding", kbd: "C" },
  { to: "/career", label: "Career", icon: Briefcase, module: "career" },
  { to: "/achievements", label: "Trophies", icon: Trophy, kbd: "G" },
  { to: "/review", label: "Review", icon: CalendarHeart, kbd: "R" },
  { to: "/search", label: "Search", icon: Search, kbd: "⌘K" },
  { to: "/profile", label: "Profile", icon: User },
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
        "sticky top-0 hidden h-[100dvh] shrink-0 flex-col gap-2 border-r border-border px-3 py-5 transition-[width] duration-300 ease-[var(--ease-out-soft)] lg:flex",
        collapsed ? "w-[76px]" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "mb-4 flex items-center gap-2",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {collapsed ? (
          <SkillSyncLogo size={26} />
        ) : (
          <div className="flex min-w-0 items-center gap-2.5 pl-1">
            <SkillSyncLogo size={26} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight">SkillSync</div>
              <div className="truncate text-[11px] text-muted-foreground">Personal Growth OS</div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            haptics.tap();
            toggle();
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
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
                if (!active) haptics.selection();
              }}
              className={cn(
                "group relative flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-all duration-200 ease-[var(--ease-out-soft)]",
                collapsed && "justify-center px-0",
                active
                  ? "bg-white/[0.07] text-foreground shadow-[inset_0_0_0_1px_oklch(1_0_0_/_0.08)]"
                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110"
                strokeWidth={active ? 2.25 : 1.75}
              />
              {collapsed ? null : (
                <>
                  <span className="truncate text-[13.5px] font-medium tracking-tight">
                    {item.label}
                  </span>
                  {item.kbd ? (
                    <kbd className="ml-auto rounded border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground/70">
                      {item.kbd}
                    </kbd>
                  ) : null}
                </>
              )}
              {active ? (
                <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[var(--primary)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
