import { describe, it, expect } from "vitest";
import { careerStats, activeApplications, JOB_STATUS_META } from "./career";
import type { JobApplication } from "./schema";

function app(overrides: Partial<JobApplication> & { company: string }): JobApplication {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    company: overrides.company,
    role: overrides.role ?? "",
    location: "",
    status: overrides.status ?? "applied",
    appliedAt: overrides.appliedAt ?? Date.now(),
    deadline: null,
    referral: overrides.referral ?? "",
    link: "",
    salary: "",
    notes: "",
    rounds: overrides.rounds ?? [],
  };
}

describe("careerStats", () => {
  it("returns zeros for no applications", () => {
    const s = careerStats([]);
    expect(s.total).toBe(0);
    expect(s.active).toBe(0);
    expect(s.responseRate).toBe(0);
    expect(s.avgRounds).toBe(0);
  });

  it("counts statuses and active pipeline", () => {
    const apps = [
      app({ company: "A", status: "applied" }),
      app({ company: "B", status: "interview" }),
      app({ company: "C", status: "offer" }),
      app({ company: "D", status: "rejected" }),
      app({ company: "E", status: "saved" }),
    ];
    const s = careerStats(apps);
    expect(s.total).toBe(5);
    expect(s.byStatus.applied).toBe(1);
    expect(s.byStatus.offer).toBe(1);
    expect(s.byStatus.rejected).toBe(1);
    expect(s.active).toBe(2); // applied + interview
    expect(s.offers).toBe(1);
  });

  it("counts referrals and cleared interview rounds", () => {
    const apps = [
      app({
        company: "X",
        referral: "friend",
        rounds: [
          { id: "r1", name: "DSA", date: null, type: "virtual", outcome: "cleared", notes: "" },
          { id: "r2", name: "HR", date: null, type: "virtual", outcome: "pending", notes: "" },
        ],
      }),
      app({ company: "Y", referral: "" }),
    ];
    const s = careerStats(apps);
    expect(s.referrals).toBe(1);
    expect(s.interviewStages).toBe(1);
  });
});

describe("activeApplications", () => {
  it("excludes saved, rejected and offer statuses", () => {
    const apps = [
      app({ company: "A", status: "saved" }),
      app({ company: "B", status: "applied" }),
      app({ company: "C", status: "rejected" }),
      app({ company: "D", status: "offer" }),
      app({ company: "E", status: "oa" }),
    ];
    const active = activeApplications(apps);
    expect(active.map((a) => a.company).sort()).toEqual(["B", "E"]);
  });
});

describe("JOB_STATUS_META", () => {
  it("provides display labels for every status", () => {
    expect(JOB_STATUS_META.applied.label).toBe("Applied");
    expect(JOB_STATUS_META.offer.label).toBe("Offer");
    expect(JOB_STATUS_META.rejected.label).toBe("Rejected");
  });
});

describe("careerStats response rate", () => {
  it("counts only applied-or-beyond as responded", () => {
    const apps = [
      app({ company: "A", status: "saved" }),
      app({ company: "B", status: "applied" }),
      app({ company: "C", status: "offer" }),
    ];
    // 2 of 3 are past "saved" (B and C) → 67%.
    expect(careerStats(apps).responseRate).toBe(67);
  });
});
