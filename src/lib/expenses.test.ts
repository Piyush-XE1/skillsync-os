import { describe, expect, it } from "vitest";
import { formatRupees, monthlySpendingPace } from "@/lib/expenses";
import type { Transaction } from "@/lib/schema";

function transaction(at: number, amount: number, type: "credit" | "debit"): Transaction {
  return {
    id: `${at}-${amount}`,
    title: "Test",
    description: "",
    amount,
    type,
    tags: [],
    at,
    position: 0,
    updatedAt: at,
  };
}

describe("monthly spending pace", () => {
  it("counts only current-month debits and includes today in the remaining days", () => {
    const now = new Date(2026, 1, 10, 12);
    const result = monthlySpendingPace(
      [
        transaction(new Date(2026, 1, 2).getTime(), 100, "debit"),
        transaction(new Date(2026, 1, 4).getTime(), 500, "credit"),
        transaction(new Date(2026, 0, 31).getTime(), 300, "debit"),
      ],
      1000,
      now,
    );
    expect(result).toEqual({
      spent: 100,
      budget: 1000,
      remaining: 900,
      daysRemaining: 19,
      perDay: 900 / 19,
    });
  });

  it("returns no pace until a positive budget is set and clamps overspend pace to zero", () => {
    expect(monthlySpendingPace([], 0, new Date(2026, 0, 1))).toBeNull();
    const result = monthlySpendingPace(
      [transaction(new Date(2026, 0, 1).getTime(), 1200, "debit")],
      1000,
      new Date(2026, 0, 1),
    );
    expect(result?.remaining).toBe(-200);
    expect(result?.perDay).toBe(0);
  });

  it("formats rupees with Indian digit grouping", () => {
    expect(formatRupees(12345)).toBe("₹12,345");
  });
});
