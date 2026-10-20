import type { Transaction } from "@/lib/schema";

export type MonthlySpendingPace = {
  spent: number;
  budget: number;
  remaining: number;
  daysRemaining: number;
  perDay: number;
};

/**
 * Convert an expense date chosen in a native date field into a local timestamp.
 * The current clock time is retained so backdated entries remain naturally
 * ordered, while impossible or incomplete dates are rejected.
 */
export function expenseDateTimestamp(value: string, clock = Date.now()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = new Date(clock);
  const result = new Date(
    year,
    month - 1,
    day,
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds(),
  );

  if (
    !Number.isFinite(result.getTime()) ||
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }
  return result.getTime();
}

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
