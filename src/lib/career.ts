import type { JobApplication, JobStatus } from "./schema";

export type CareerStats = {
  total: number;
  active: number;
  offers: number;
  rejected: number;
  referrals: number;
  interviewStages: number;
  byStatus: Record<JobStatus, number>;
  responseRate: number;
  avgRounds: number;
};

export const JOB_STATUS_META: Record<JobStatus, { label: string; tone: string }> = {
  saved: { label: "Saved", tone: "default" },
  applied: { label: "Applied", tone: "info" },
  referral: { label: "Referral", tone: "primary" },
  oa: { label: "Online Assessment", tone: "warning" },
  interview: { label: "Interview", tone: "primary" },
  offer: { label: "Offer", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

/** Statuses that count as an application "in play" in the pipeline. */
const ACTIVE_STATUSES: JobStatus[] = ["applied", "referral", "oa", "interview"];

/** Applications that are still in play (actively pursued). */
export function activeApplications(apps: JobApplication[]): JobApplication[] {
  return apps.filter((a) => ACTIVE_STATUSES.includes(a.status));
}

export function careerStats(apps: JobApplication[]): CareerStats {
  const byStatus: Record<JobStatus, number> = {
    saved: 0,
    applied: 0,
    referral: 0,
    oa: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };

  for (const a of apps) byStatus[a.status] += 1;

  const active = apps.filter((a) => ACTIVE_STATUSES.includes(a.status)).length;
  const offers = byStatus.offer;
  const rejected = byStatus.rejected;
  const referrals = apps.filter((a) => a.referral.trim().length > 0).length;
  const interviewStages = apps.reduce(
    (sum, a) => sum + a.rounds.filter((r) => r.outcome === "cleared").length,
    0,
  );

  // Count applied-or-beyond apps as responses so "response rate" is meaningful.
  const responded = apps.filter((a) => !["saved"].includes(a.status)).length;
  const responseRate = apps.length === 0 ? 0 : Math.round((responded / apps.length) * 100);

  const withRounds = apps.filter((a) => a.rounds.length > 0);
  const avgRounds =
    withRounds.length === 0
      ? 0
      : Math.round((withRounds.reduce((s, a) => s + a.rounds.length, 0) / withRounds.length) * 10) /
        10;

  return {
    total: apps.length,
    active,
    offers,
    rejected,
    referrals,
    interviewStages,
    byStatus,
    responseRate,
    avgRounds,
  };
}
