import type { CgpaSemester, CgpaSubject } from "./schema";

/** Standard 10-point grade scale (common across Indian universities). */
export const GRADE_POINTS: Record<string, number> = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
  P: 4,
  F: 0,
};

export const GRADE_ORDER = ["O", "A+", "A", "B+", "B", "C", "P", "F"] as const;

export function gradePointsOf(grade: string): number {
  return GRADE_POINTS[grade] ?? 0;
}

export function subjectPoints(subject: Pick<CgpaSubject, "credits" | "grade">): number {
  return subject.credits * gradePointsOf(subject.grade);
}

export function subjectTotal(subject: Pick<CgpaSubject, "credits">): number {
  return subject.credits;
}

/**
 * SGPA of one semester: Σ(credits × grade points) / Σ(credits).
 * Returns null when the semester has no graded credits yet.
 */
export function semesterGpa(semester: Pick<CgpaSemester, "subjects">): {
  gpa: number | null;
  credits: number;
} {
  const subjects = semester.subjects;
  let points = 0;
  let credits = 0;
  for (const s of subjects) {
    points += subjectPoints(s);
    credits += s.credits;
  }
  if (credits === 0) return { gpa: null, credits: 0 };
  return { gpa: round2(points / credits), credits };
}

/** Cumulative CGPA across all semesters. Null when nothing is graded yet. */
export function cumulativeGpa(semesters: CgpaSemester[]): {
  cgpa: number | null;
  credits: number;
} {
  let points = 0;
  let credits = 0;
  for (const sem of semesters) {
    for (const s of sem.subjects) {
      points += subjectPoints(s);
      credits += s.credits;
    }
  }
  if (credits === 0) return { cgpa: null, credits: 0 };
  return { cgpa: round2(points / credits), credits };
}

/**
 * The SGPA required in the next semester (with `nextCredits` credits) to reach
 * `targetCgpa` given the current CGPA over `currentCredits`.
 * Returns null when the math is impossible or undefined.
 */
export function requiredNextGpa(
  currentCgpa: number,
  currentCredits: number,
  targetCgpa: number,
  nextCredits: number,
): number | null {
  if (nextCredits <= 0) return null;
  const totalCredits = currentCredits + nextCredits;
  const needed = (targetCgpa * totalCredits - currentCgpa * currentCredits) / nextCredits;
  if (needed > 10) return null;
  return Math.max(0, round2(needed));
}

/** Aggregates grade tallies and credits for the summary panel. */
export function gradeBreakdown(semesters: CgpaSemester[]) {
  const counts: Record<string, number> = {};
  let credits = 0;
  let subjects = 0;
  for (const sem of semesters) {
    for (const s of sem.subjects) {
      counts[s.grade] = (counts[s.grade] ?? 0) + 1;
      credits += s.credits;
      subjects++;
    }
  }
  return { counts, credits, subjects };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
