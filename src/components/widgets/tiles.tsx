import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity,
  Braces,
  Briefcase,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Timer,
  Trophy,
  Wallet,
} from "lucide-react";
import { Chip, ProgressBar } from "@/components/ui/primitives";
import { Sparkline, getAxisLabel } from "@/components/common/Charts";
import { StatValue, WidgetFrame, type WidgetProps } from "./WidgetFrame";
import { useAppStore, useHydrated } from "@/store/useAppStore";
import { focusTotals } from "@/lib/focus";
import { effortByDay, focusDaily } from "@/lib/trends";
import { codingStats } from "@/lib/coding";
import { careerStats } from "@/lib/career";
import { cumulativeGpa, semesterGpa } from "@/lib/cgpa";
import { dateISO, todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { AppData } from "@/lib/schema";

/**
 * Compact "tile" widgets — one number, one glance.
 *
 * Every tile owns its store selectors, so the dashboard grid stays a thin
 * layout shell and a hidden widget costs nothing to render.
 */

function money(n: number) {
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `₹${abs}`;
}

/* -------------------------------- focus today ---------------------------- */

export function FocusTodayWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const sessions = useAppStore((s) => s.focus.sessions);
  const totals = useMemo(() => focusTotals(sessions), [sessions]);
  return (
    <WidgetFrame
      size={size}
      title="Focus today"
      icon={<Timer className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/focus"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <StatValue
        value={hydrated ? totals.todayMinutes : "—"}
        unit="min"
        footnote={
          hydrated ? (
            <Chip tone="primary">
              <Timer className="h-3 w-3" /> {totals.sessionsToday} sessions
            </Chip>
          ) : (
            "Loading…"
          )
        }
      />
      {size !== "tile" && hydrated ? (
        <div className="mt-3 text-[11.5px] text-muted-foreground">
          {totals.totalMinutes} minutes of deep work logged all-time.
        </div>
      ) : null}
    </WidgetFrame>
  );
}

/* ------------------------------- habits today ---------------------------- */

export function HabitsTodayWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const habits = useAppStore((s) => s.habits);
  const logs = useAppStore((s) => s.habitLogs);
  const today = todayISO();
  const done = useMemo(
    () => new Set(logs.filter((l) => l.date === today).map((l) => l.habitId)).size,
    [logs, today],
  );
  const pct = habits.length > 0 ? (done / habits.length) * 100 : 0;
  return (
    <WidgetFrame
      size={size}
      title="Habits today"
      icon={<CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/habits"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <StatValue value={hydrated ? `${done}/${habits.length}` : "—"} unit="done" />
      <div className="mt-3">
        <ProgressBar value={hydrated ? pct : 0} tone="gradient" />
      </div>
      {size !== "tile" && hydrated ? (
        <div className="mt-2.5 text-[11px] text-muted-foreground">
          {done === habits.length && habits.length > 0
            ? "Clean sweep — every habit logged."
            : `${habits.length - done} left to go today.`}
        </div>
      ) : null}
    </WidgetFrame>
  );
}

/* -------------------------------- momentum ------------------------------- */

export function MomentumWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const habitLogs = useAppStore((s) => s.habitLogs);
  const planner = useAppStore((s) => s.planner);
  const focusSessions = useAppStore((s) => s.focus.sessions);
  const codingProblems = useAppStore((s) => s.coding.problems);
  const roadmaps = useAppStore((s) => s.roadmaps);
  const week = useMemo(() => {
    const data = useAppStore.getState() as unknown as AppData;
    return effortByDay(data, 7).map((d) => ({ label: getAxisLabel(d.label), value: d.value }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitLogs, planner, focusSessions, codingProblems, roadmaps]);
  const total = week.reduce((sum, d) => sum + d.value, 0);
  return (
    <WidgetFrame
      size={size}
      title="Momentum"
      icon={<Activity className="h-3.5 w-3.5" strokeWidth={2} />}
      {...chrome}
    >
      <div className="flex items-center justify-between gap-2">
        <StatValue value={hydrated ? total : "—"} unit="pts" />
      </div>
      <div className={cn("mt-2", size === "tile" ? "h-9" : "h-14")}>
        <Sparkline data={week} color="var(--primary-glow)" />
      </div>
      <div className="mt-1.5 text-[10.5px] text-muted-foreground">effort · last 7 days</div>
    </WidgetFrame>
  );
}

/* -------------------------------- deep work ------------------------------ */

export function DeepWorkWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const sessions = useAppStore((s) => s.focus.sessions);
  const week = useMemo(() => {
    const data = useAppStore.getState() as unknown as AppData;
    return focusDaily(data, 7).map((d) => ({ label: getAxisLabel(d.label), value: d.value }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);
  const total = week.reduce((sum, d) => sum + d.value, 0);
  return (
    <WidgetFrame
      size={size}
      title="Deep work"
      icon={<Timer className="h-3.5 w-3.5" strokeWidth={2} />}
      {...chrome}
    >
      <StatValue value={hydrated ? total : "—"} unit="min" />
      <div className={cn("mt-2", size === "tile" ? "h-9" : "h-14")}>
        <Sparkline data={week} color="var(--secondary)" />
      </div>
      <div className="mt-1.5 text-[10.5px] text-muted-foreground">focus minutes · 7 days</div>
    </WidgetFrame>
  );
}

/* ------------------------------- dsa this week ---------------------------- */

export function SolvedWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const problems = useAppStore((s) => s.coding.problems);
  const week = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const p of problems) {
      const day = dateISO(new Date(p.solvedAt));
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const today = todayISO();
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      const iso = dateISO(date);
      return { label: getAxisLabel(iso), value: perDay.get(iso) ?? 0 };
    });
  }, [problems]);
  const total = week.reduce((sum, d) => sum + d.value, 0);
  return (
    <WidgetFrame
      size={size}
      title="DSA this week"
      icon={<Braces className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/coding"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <StatValue value={hydrated ? total : "—"} unit="solved" />
      <div className={cn("mt-2", size === "tile" ? "h-9" : "h-14")}>
        <Sparkline data={week} color="var(--warning)" />
      </div>
      <div className="mt-1.5 text-[10.5px] text-muted-foreground">problems per day</div>
    </WidgetFrame>
  );
}

/* --------------------------- money this month ---------------------------- */

export function ExpensesWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const transactions = useAppStore((s) => s.expenses.transactions);
  const month = useMemo(() => {
    const key = todayISO().slice(0, 7);
    let credit = 0;
    let debit = 0;
    let count = 0;
    for (const t of transactions) {
      if (dateISO(new Date(t.at)).slice(0, 7) !== key) continue;
      count += 1;
      if (t.type === "credit") credit += t.amount;
      else debit += t.amount;
    }
    return { credit, debit, count, balance: credit - debit };
  }, [transactions]);
  const total = month.credit + month.debit;
  const creditShare = total > 0 ? (month.credit / total) * 100 : 50;
  return (
    <WidgetFrame
      size={size}
      title="Money this month"
      icon={<Wallet className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/expenses"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <StatValue
        value={hydrated ? money(month.balance) : "—"}
        footnote={
          hydrated ? (
            <span className={month.balance >= 0 ? "text-emerald-300" : "text-[var(--danger)]"}>
              {month.balance >= 0 ? "Net positive" : "Net negative"} · {month.count} entries
            </span>
          ) : (
            "Loading…"
          )
        }
      />
      {hydrated && total > 0 ? (
        <div className="mt-3">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-l-full bg-emerald-400/80 transition-[width] duration-700 ease-[var(--ease-out-soft)]"
              style={{ width: `${creditShare}%` }}
            />
            <div
              className="h-full rounded-r-full bg-[var(--danger)]/70 transition-[width] duration-700 ease-[var(--ease-out-soft)]"
              style={{ width: `${100 - creditShare}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-muted-foreground">
            <span className="text-emerald-300">+{money(month.credit)}</span>
            <span className="text-[var(--danger)]">−{money(month.debit)}</span>
          </div>
        </div>
      ) : null}
    </WidgetFrame>
  );
}

/* ---------------------------------- cgpa --------------------------------- */

export function CgpaWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const semesters = useAppStore((s) => s.cgpa.semesters);
  const { cgpa, credits } = useMemo(() => cumulativeGpa(semesters), [semesters]);
  const latest = useMemo(() => {
    if (semesters.length === 0) return null;
    const last = [...semesters].sort((a, b) => b.number - a.number)[0];
    return { number: last.number, gpa: semesterGpa(last).gpa };
  }, [semesters]);
  return (
    <WidgetFrame
      size={size}
      title="CGPA"
      icon={<GraduationCap className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/cgpa"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <StatValue
        value={hydrated ? (cgpa === null ? "—" : cgpa.toFixed(2)) : "—"}
        footnote={
          hydrated ? (
            cgpa === null ? (
              "Add subjects to calculate"
            ) : (
              <span>
                {credits} credits
                {latest?.gpa !== null && latest
                  ? ` · Sem ${latest.number} SGPA ${latest.gpa?.toFixed(2)}`
                  : ""}
              </span>
            )
          ) : (
            "Loading…"
          )
        }
      />
      {hydrated && cgpa !== null ? (
        <div className="mt-3">
          <ProgressBar value={(cgpa / 10) * 100} tone="gradient" />
        </div>
      ) : null}
    </WidgetFrame>
  );
}

/* --------------------------------- career -------------------------------- */

export function CareerWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const applications = useAppStore((s) => s.career.applications);
  const stats = useMemo(() => careerStats(applications), [applications]);
  return (
    <WidgetFrame
      size={size}
      title="Pipeline"
      icon={<Briefcase className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/career"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <StatValue
        value={hydrated ? stats.active : "—"}
        unit="active"
        footnote={
          hydrated ? (
            <span>
              {stats.total} applied · {stats.interviewStages} rounds cleared
            </span>
          ) : (
            "Loading…"
          )
        }
      />
      {size !== "tile" && hydrated ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip tone="success">{stats.offers} offers</Chip>
          <Chip tone="primary">{stats.referrals} referrals</Chip>
          <Chip>{stats.responseRate}% response</Chip>
        </div>
      ) : null}
    </WidgetFrame>
  );
}

/* ------------------------------- attendance ------------------------------ */

export function AttendanceWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const subjects = useAppStore((s) => s.attendance.subjects);
  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    for (const s of subjects) {
      present += s.present;
      absent += s.absent;
    }
    const total = present + absent;
    return {
      present,
      total,
      pct: total > 0 ? Math.round((present / total) * 100) : 0,
      atRisk: subjects.filter((s) => {
        const t = s.present + s.absent;
        return t > 0 && (s.present / t) * 100 < s.minRequired;
      }).length,
    };
  }, [subjects]);
  const tone = summary.pct >= 75 ? "success" : summary.pct >= 65 ? "warning" : "danger";
  return (
    <WidgetFrame
      size={size}
      title="Attendance"
      icon={<CalendarCheck2 className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/attendance"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <StatValue
        value={hydrated && summary.total > 0 ? `${summary.pct}%` : "—"}
        footnote={
          hydrated ? (
            summary.total > 0 ? (
              <span>
                {summary.present}/{summary.total} classes
                {summary.atRisk > 0 ? ` · ${summary.atRisk} at risk` : ""}
              </span>
            ) : (
              "Add subjects to track"
            )
          ) : (
            "Loading…"
          )
        }
      />
      {hydrated && summary.total > 0 ? (
        <div className="mt-3">
          <ProgressBar value={summary.pct} tone={tone === "success" ? "success" : tone} />
        </div>
      ) : null}
    </WidgetFrame>
  );
}

/* ------------------------------ contest rating --------------------------- */

export function RatingWidget({ size, ...chrome }: WidgetProps) {
  const hydrated = useHydrated();
  const problems = useAppStore((s) => s.coding.problems);
  const rating = useAppStore((s) => s.coding.rating);
  const maxRating = useAppStore((s) => s.coding.maxRating);
  const stats = useMemo(() => codingStats(problems), [problems]);
  return (
    <WidgetFrame
      size={size}
      title="Contest rating"
      icon={<Trophy className="h-3.5 w-3.5" strokeWidth={2} />}
      action={
        <Link
          to="/coding"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      }
      {...chrome}
    >
      <StatValue
        value={hydrated ? (rating > 0 ? rating : "—") : "—"}
        footnote={
          hydrated ? (
            <span>
              {maxRating > 0 ? `Peak ${maxRating}` : "No rating yet"} · {stats.currentStreak}-day
              solve streak
            </span>
          ) : (
            "Loading…"
          )
        }
      />
      {hydrated && maxRating > 0 ? (
        <div className="mt-3">
          <ProgressBar value={(rating / maxRating) * 100} tone="gradient" />
        </div>
      ) : null}
    </WidgetFrame>
  );
}
