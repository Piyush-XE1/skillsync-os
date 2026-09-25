import type { AppData } from "@/lib/schema";
import { todayISO } from "@/lib/date";
import {
  CATEGORY_META,
  type CategoryKey,
  type NotificationItem,
  type NotificationSettings,
} from "./types";

/* ------------------------------- time utils ------------------------------- */

export function parseTime(hhmm: string): number {
  const [h, m] = (hhmm ?? "").split(":").map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isQuietHours(settings: NotificationSettings, now: Date): boolean {
  const q = settings.quietHours;
  if (!q?.enabled) return false;
  const from = parseTime(q.from);
  const to = parseTime(q.to);
  const cur = minutesOfDay(now);
  // Overnight window (e.g. 22:30 → 07:30).
  if (from > to) return cur >= from || cur < to;
  return cur >= from && cur < to;
}

/* ------------------------------ rule engine ------------------------------ */

export type Candidate = Omit<
  NotificationItem,
  "id" | "createdAt" | "read" | "delivered" | "origin"
> & { sourceId: string };

function categoryActive(key: CategoryKey, settings: NotificationSettings, data: AppData): boolean {
  const meta = CATEGORY_META[key];
  if (meta.module && !data.preferences?.modules?.[meta.module]) return false;
  return settings.categories?.[key]?.enabled !== false;
}

/** True when the category's daily reminder time has already passed today. */
function timeReached(key: CategoryKey, settings: NotificationSettings, now: Date): boolean {
  const meta = CATEGORY_META[key];
  if (!meta.timed) return true;
  const time = settings.categories?.[key]?.time ?? meta.defaultTime ?? "09:00";
  return minutesOfDay(now) >= parseTime(time);
}

/**
 * Pure rule evaluation: given the app data and the current time, return the
 * notifications that should exist today. `sourceId` makes every rule
 * idempotent, so running this repeatedly never duplicates anything.
 */
export function buildDueCandidates(
  data: AppData,
  settings: NotificationSettings,
  now: Date = new Date(),
  lastBackupAt: number | null = null,
): Candidate[] {
  const out: Candidate[] = [];
  const today = todayISO(now);
  const eligible = (key: CategoryKey) =>
    categoryActive(key, settings, data) && timeReached(key, settings, now);

  // Habits — pending check-ins.
  if (eligible("habits")) {
    const logged = new Set(
      (data.habitLogs ?? []).filter((l) => l.date === today).map((l) => l.habitId),
    );
    const pending = (data.habits ?? []).filter((h) => !logged.has(h.id));
    if (pending.length > 0) {
      out.push({
        category: "habits",
        title:
          pending.length === 1
            ? `${pending[0].title} still pending`
            : `${pending.length} habits pending`,
        body:
          pending.length === 1
            ? "One check-in away from keeping the streak alive."
            : `Not checked in yet: ${pending
                .slice(0, 3)
                .map((h) => h.title)
                .join(", ")}${pending.length > 3 ? "…" : ""}`,
        priority: "high",
        action: { kind: "route", to: "/habits" },
        sourceId: `habits:pending:${today}`,
      });
    }
  }

  // Planner — tasks due today.
  if (eligible("planner")) {
    const due = (data.planner ?? []).filter((t) => t.date === today && !t.done);
    if (due.length > 0) {
      out.push({
        category: "planner",
        title: `${due.length} task${due.length === 1 ? "" : "s"} on today's plan`,
        body: due
          .slice(0, 3)
          .map((t) => t.title)
          .join(" · "),
        priority: "normal",
        action: { kind: "route", to: "/planner" },
        sourceId: `planner:due:${today}`,
      });
    }
  }

  // Projects — deadlines today or overdue.
  if (eligible("projects")) {
    const late = (data.projects ?? []).filter(
      (p) => p.status !== "done" && p.deadline && p.deadline <= today,
    );
    if (late.length > 0) {
      out.push({
        category: "projects",
        title: `${late.length} project deadline${late.length === 1 ? "" : "s"} need attention`,
        body: late
          .slice(0, 3)
          .map((p) => p.title)
          .join(" · "),
        priority: "high",
        action: { kind: "route", to: "/projects" },
        sourceId: `projects:deadline:${today}`,
      });
    }
  }

  // Learn — nothing completed today.
  if (eligible("learn")) {
    const hasRoadmaps = (data.roadmaps ?? []).length > 0;
    if (hasRoadmaps) {
      out.push({
        category: "learn",
        title: "Move one topic forward",
        body: "A single topic a day compounds fast. Open your roadmap and close one out.",
        priority: "low",
        action: { kind: "route", to: "/learn" },
        sourceId: `learn:nudge:${today}`,
      });
    }
  }

  // Attendance — subjects below the required minimum.
  if (eligible("attendance")) {
    const risky = (data.attendance?.subjects ?? []).filter((s) => {
      const total = s.present + s.absent;
      if (total === 0) return false;
      return (s.present / total) * 100 < s.minRequired;
    });
    if (risky.length > 0) {
      out.push({
        category: "attendance",
        title: `${risky.length} subject${risky.length === 1 ? "" : "s"} below minimum`,
        body: risky
          .slice(0, 3)
          .map((s) => s.name)
          .join(" · "),
        priority: "high",
        action: { kind: "route", to: "/attendance" },
        sourceId: `attendance:risk:${today}`,
      });
    }
  }

  // Expenses — nothing logged today.
  if (eligible("expenses")) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const loggedToday = (data.expenses?.transactions ?? []).some((t) => t.at >= start.getTime());
    if (!loggedToday) {
      out.push({
        category: "expenses",
        title: "No spending logged today",
        body: "Add today's transactions while they're still fresh.",
        priority: "low",
        action: { kind: "route", to: "/expenses" },
        sourceId: `expenses:log:${today}`,
      });
    }
  }

  // Backup — last snapshot older than a week.
  if (categoryActive("backup", settings, data)) {
    const week = 7 * 24 * 60 * 60 * 1000;
    if (!lastBackupAt || now.getTime() - lastBackupAt > week) {
      out.push({
        category: "backup",
        title: lastBackupAt ? "Your backup is getting old" : "You have no backup yet",
        body: "Create a snapshot so your data survives a cleared browser or a new device.",
        priority: "normal",
        action: { kind: "route", to: "/profile/backup" },
        sourceId: `backup:stale:${today.slice(0, 7)}-w${Math.floor(now.getDate() / 7)}`,
      });
    }
  }

  // Weekly summary.
  const ws = settings.weeklySummary;
  if (
    categoryActive("weeklySummary", settings, data) &&
    ws?.enabled &&
    now.getDay() === (ws.weekday ?? 0) &&
    minutesOfDay(now) >= parseTime(ws.time)
  ) {
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const checkIns = (data.habitLogs ?? []).filter(
      (l) => new Date(`${l.date}T00:00:00`).getTime() >= weekAgo,
    ).length;
    const donePlanner = (data.planner ?? []).filter((t) => t.done).length;
    out.push({
      category: "weeklySummary",
      title: "Your week in SkillSync",
      body: `${checkIns} habit check-in${checkIns === 1 ? "" : "s"} · ${donePlanner} planner task${donePlanner === 1 ? "" : "s"} done`,
      priority: "normal",
      action: { kind: "route", to: "/analytics" },
      sourceId: `weekly:${todayISO(now)}`,
    });
  }

  return out;
}
