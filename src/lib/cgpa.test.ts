import { describe, it, expect } from "vitest";
import {
  GRADE_POINTS,
  semesterGpa,
  cumulativeGpa,
  requiredNextGpa,
  gradeBreakdown,
} from "@/lib/cgpa";
import type { CgpaSemester, CgpaSubject } from "@/lib/schema";

function subject(name: string, credits: number, grade: CgpaSubject["grade"]) {
  return { id: `${name}-id`, name, code: "", credits, grade };
}

function semester(number: number, subjects: ReturnType<typeof subject>[]): CgpaSemester {
  return { id: `sem-${number}`, number, subjects };
}

describe("cgpa", () => {
  it("maps the 10-point grade scale", () => {
    expect(GRADE_POINTS["O"]).toBe(10);
    expect(GRADE_POINTS["A+"]).toBe(9);
    expect(GRADE_POINTS["B"]).toBe(6);
    expect(GRADE_POINTS["F"]).toBe(0);
  });

  it("computes SGPA as weighted grade points", () => {
    const sem = semester(1, [subject("Math", 4, "O"), subject("Physics", 3, "A")]);
    const { gpa, credits } = semesterGpa(sem);
    // (4*10 + 3*8) / 7 = 64/7 ≈ 9.14
    expect(credits).toBe(7);
    expect(gpa).toBeCloseTo(9.14, 2);
  });

  it("returns null SGPA for an empty semester", () => {
    expect(semesterGpa(semester(1, [])).gpa).toBeNull();
  });

  it("computes cumulative CGPA across semesters", () => {
    const sems = [
      semester(1, [subject("Math", 4, "O"), subject("Physics", 4, "A+")]),
      semester(2, [subject("DBMS", 4, "B+"), subject("OS", 4, "O")]),
    ];
    const { cgpa, credits } = cumulativeGpa(sems);
    // (40 + 36 + 28 + 40) / 16 = 9.0
    expect(credits).toBe(16);
    expect(cgpa).toBe(9);
  });

  it("computes the SGPA required to hit a target CGPA", () => {
    // Current: 8.0 over 60 credits. Target 8.6 with 20 more credits.
    // (8.6 * 80 - 8.0 * 60) / 20 = (688 - 480) / 20 = 10.4 → impossible
    expect(requiredNextGpa(8.0, 60, 8.6, 20)).toBeNull();
    // Target 8.2: (656 - 480) / 20 = 8.8
    expect(requiredNextGpa(8.0, 60, 8.2, 20)).toBe(8.8);
    // Exactly 10.0 is achievable (all O grades).
    expect(requiredNextGpa(8.0, 60, 8.5, 20)).toBe(10);
  });

  it("aggregates grade counts", () => {
    const sems = [semester(1, [subject("A", 3, "O"), subject("B", 3, "O"), subject("C", 3, "B")])];
    const breakdown = gradeBreakdown(sems);
    expect(breakdown.counts["O"]).toBe(2);
    expect(breakdown.counts["B"]).toBe(1);
    expect(breakdown.credits).toBe(9);
    expect(breakdown.subjects).toBe(3);
  });
});
