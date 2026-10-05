import type { Transaction } from "@/lib/schema";

export type MonthlySpendingPace = {
  spent: number;
  budget: number;
  remaining: number;
  daysRemaining: number;
  perDay: number;
};

/** Budget pacing uses local calendar dates and counts today as a remaining day. */
export function monthlySpendingPace(
  transactions: Transaction[],
  budget: number,
  now = new Date(),
): MonthlySpendingPace | null {
  if (!Number.isFinite(budget) || budget <= 0) return null;

  const year = now.getFullYear();
  const month = now.getMonth();
  const spent = transactions.reduce((sum, transaction) => {
    const at = new Date(transaction.at);
    return transaction.type === "debit" && at.getFullYear() === year && at.getMonth() === month
      ? sum + transaction.amount
      : sum;
  }, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
  const remaining = budget - spent;

  return {
    spent,
    budget,
    remaining,
    daysRemaining,
    perDay: Math.max(0, remaining) / daysRemaining,
  };
}

export function formatRupees(amount: number, decimals = 0): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
