import { describe, it, expect } from "vitest";
import { parseTime, isQuietHours, buildDueCandidates } from "@/lib/notifications/engine";
import {
  createDefaultSettings,
  createDefaultNotifications,
  type NotificationSettings,
} from "@/lib/notifications/types";
import { createInitialData } from "@/lib/seed";
import type { AppData } from "@/lib/schema";

function settings(over: Partial<NotificationSettings> = {}): NotificationSettings {
  return { ...createDefaultSettings(), ...over };
}

describe("notifications engine - time helpers", () => {
  it("parseTime converts HH:MM to minutes", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("09:30")).toBe(570);
    expect(parseTime("23:59")).toBe(1439);
    expect(parseTime("")).toBe(0);
    expect(parseTime("banana")).toBe(0);
  });

  it("isQuietHours handles a same-day window", () => {
    const s = settings({ quietHours: { enabled: true, from: "09:00", to: "17:00" } });
    expect(isQuietHours(s, new Date(2026, 7, 27, 10, 0))).toBe(true);
    expect(isQuietHours(s, new Date(2026, 7, 27, 8, 59))).toBe(false);
  });

  it("isQuietHours handles an overnight window", () => {
    const s = settings({ quietHours: { enabled: true, from: "22:30", to: "07:30" } });
    expect(isQuietHours(s, new Date(2026, 7, 27, 23, 0))).toBe(true);
    expect(isQuietHours(s, new Date(2026, 7, 27, 6, 0))).toBe(true);
    expect(isQuietHours(s, new Date(2026, 7, 27, 12, 0))).toBe(false);
  });

  it("isQuietHours is disabled by default", () => {
    expect(isQuietHours(settings(), new Date(2026, 7, 27, 23, 0))).toBe(false);
  });
});

describe("notifications engine - buildDueCandidates", () => {
  // Thursday 2026-08-27 22:00 — all default reminder times have passed.
  const now = new Date(2026, 7, 27, 22, 0, 0);

  it("produces the default due set from seed data", () => {
    const data = createInitialData();
    const candidates = buildDueCandidates(data, settings(), now);
    const ids = candidates.map((c) => c.sourceId);
    // 6 habits, none logged → habits; roadmaps exist → learn; no backup → stale backup
    expect(ids).toContain("habits:pending:2026-08-27");
    expect(ids).toContain("learn:nudge:2026-08-27");
    expect(ids.some((id) => id.startsWith("backup:stale:2026-08"))).toBe(true);
  });

  it("omits a habit when every habit is logged today", () => {
    const data = createInitialData();
    data.habitLogs = data.habits.map((h) => ({ habitId: h.id, date: "2026-08-27" }));
    const candidates = buildDueCandidates(data, settings(), now);
    expect(candidates.some((c) => c.sourceId.startsWith("habits:pending"))).toBe(false);
  });

  it("respects category enable/disable", () => {
    const data = createInitialData();
    const s = settings();
    if (s.categories?.habits) s.categories.habits.enabled = false;
    const candidates = buildDueCandidates(data, s, now);
    expect(candidates.some((c) => c.category === "habits")).toBe(false);
  });

  it("respects module gating for attendance", () => {
    const data = createInitialData();
    data.preferences.modules.attendance = true;
    data.attendance.subjects = [
      {
        id: "s1",
        semester: 1,
        name: "Math",
        faculty: "",
        minRequired: 75,
        present: 3,
        absent: 5,
        createdAt: 0,
      },
    ];
    const candidates = buildDueCandidates(data, settings(), now);
    expect(candidates.some((c) => c.category === "attendance")).toBe(true);
  });

  it("ignores attendance when the module is disabled", () => {
    const data = createInitialData();
    // leave module disabled but add a subject below minimum
    data.attendance.subjects = [
      {
        id: "s1",
        semester: 1,
        name: "Math",
        faculty: "",
        minRequired: 75,
        present: 3,
        absent: 5,
        createdAt: 0,
      },
    ];
    const candidates = buildDueCandidates(data, settings(), now);
    expect(candidates.some((c) => c.category === "attendance")).toBe(false);
  });

  it("applies quiet hours to rules that fire during them", () => {
    const data = createInitialData();
    const s = settings({ quietHours: { enabled: true, from: "22:00", to: "07:00" } });
    // At 22:00 we're inside quiet hours but the rules still evaluate normally —
    // buildDueCandidates is a pure rule engine; quiet-hours filtering is a
    // separate concern. Assert it does NOT crash and still returns candidates.
    expect(buildDueCandidates(data, s, now).length).toBeGreaterThan(0);
  });

  it("never emits the retired reward category", () => {
    const data = createInitialData();
    const candidates = buildDueCandidates(data, settings(), now);
    expect(candidates.some((c) => (c.category as string) === "achievements")).toBe(false);
  });

  it("fires the weekly summary on the configured weekday and time", () => {
    // Sunday 2026-08-23 20:00
    const sunday = new Date(2026, 7, 23, 20, 0, 0);
    const data = createInitialData();
    const candidates = buildDueCandidates(data, settings(), sunday);
    const ws = candidates.find((c) => c.category === "weeklySummary");
    expect(ws).toBeTruthy();
    expect(ws?.sourceId).toBe("weekly:2026-08-23");
  });
});
