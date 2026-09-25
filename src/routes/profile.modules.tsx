import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  GraduationCap,
  Wallet,
  Timer,
  Award,
  FileText,
  Braces,
  Briefcase,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/primitives";
import { Toggle } from "@/components/common/Toggle";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/profile/modules")({
  head: () => ({
    meta: [
      { title: "Modules — SkillSync" },
      { name: "description", content: "Enable optional modules like Attendance and Expenses." },
      { property: "og:title", content: "Modules — SkillSync" },
      { property: "og:description", content: "Turn optional modules on or off." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModulesPage,
});

function ModuleRow({
  icon: Icon,
  title,
  desc,
  on,
  onChange,
}: {
  icon: typeof GraduationCap;
  title: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04]">
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[14px] font-semibold tracking-tight">{title}</div>
          <Toggle on={on} onChange={onChange} />
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </Card>
  );
}

function ModulesPage() {
  const modules = useAppStore((s) => s.preferences.modules);
  const setModuleEnabled = useAppStore((s) => s.setModuleEnabled);

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
            Preferences
          </div>
          <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">
            Modules
          </h1>
        </div>
      </header>

      <div className="auto-grid px-5 pb-24 lg:px-2">
        <p className="col-span-full px-1 text-[12.5px] text-muted-foreground">
          Optional workspaces. Turn on only what you need.
        </p>
        <ModuleRow
          icon={GraduationCap}
          title="College Attendance"
          desc="Track subjects, attendance percentage, and semester overview."
          on={modules.attendance}
          onChange={(v) => setModuleEnabled("attendance", v)}
        />
        <ModuleRow
          icon={Wallet}
          title="Expense Manager"
          desc="Log daily credits and debits with a monthly summary."
          on={modules.expenses}
          onChange={(v) => setModuleEnabled("expenses", v)}
        />
        <ModuleRow
          icon={Timer}
          title="Focus"
          desc="Pomodoro deep-work timer with session history and a focus streak."
          on={modules.focus}
          onChange={(v) => setModuleEnabled("focus", v)}
        />
        <ModuleRow
          icon={Award}
          title="CGPA Tracker"
          desc="Semester-wise SGPA, cumulative CGPA and a target simulator."
          on={modules.cgpa}
          onChange={(v) => setModuleEnabled("cgpa", v)}
        />
        <ModuleRow
          icon={FileText}
          title="Resume Builder"
          desc="Structured resume editor with a print-ready preview and PDF export."
          on={modules.resume}
          onChange={(v) => setModuleEnabled("resume", v)}
        />
        <ModuleRow
          icon={Braces}
          title="Code · DSA Prep"
          desc="Track problems solved across LeetCode, Codeforces, CodeChef and more — with streaks, difficulty breakdowns and a GitHub-style heatmap."
          on={modules.coding}
          onChange={(v) => setModuleEnabled("coding", v)}
        />
        <ModuleRow
          icon={Briefcase}
          title="Career · Placements"
          desc="Manage job and internship applications, referrals, interview rounds and your entire pipeline until you sign the offer."
          on={modules.career}
          onChange={(v) => setModuleEnabled("career", v)}
        />
      </div>
    </AppShell>
  );
}
