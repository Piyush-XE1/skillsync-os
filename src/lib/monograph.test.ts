import { describe, expect, it } from "vitest";
import {
  STOIC_QUOTES,
  ageInDays,
  dayOfCalendarYear,
  daysInCalendarYear,
  quotePool,
  selectDisplayQuote,
} from "./monograph";
import type { CustomQuote } from "./schema";

const custom: CustomQuote[] = [
  { id: "a", quote: "First private line.", author: "Me", createdAt: 1, updatedAt: 1 },
  { id: "b", quote: "Second private line.", author: "Me", createdAt: 2, updatedAt: 2 },
];

describe("personal monograph logic", () => {
  it("ships attributed curated quotations", () => {
    expect(STOIC_QUOTES.length).toBeGreaterThanOrEqual(8);
    for (const quote of STOIC_QUOTES) {
      expect(quote.quote.length).toBeGreaterThan(5);
      expect(quote.author).toMatch(/·/);
      expect(quote.source).toBe("curated");
    }
  });

  it("selects deterministically and advances without an immediate repeat", () => {
    const input = {
      mode: "mixed" as const,
      customQuotes: custom,
      selectedCustomQuoteId: null,
      dayKey: "2026-10-19",
    };
    const first = selectDisplayQuote({ ...input, cursor: 0 });
    const again = selectDisplayQuote({ ...input, cursor: 0 });
    const next = selectDisplayQuote({ ...input, cursor: 1 });
    expect(first).toEqual(again);
    expect(next?.id).not.toBe(first?.id);
    expect(quotePool("mixed", custom).some((quote) => quote.source === "custom")).toBe(true);
  });

  it("honours the explicitly selected private quotation", () => {
    expect(
      selectDisplayQuote({
        mode: "custom",
        customQuotes: custom,
        selectedCustomQuoteId: "b",
        dayKey: "2026-10-19",
      })?.id,
    ).toBe("custom:b");
    expect(
      selectDisplayQuote({
        mode: "custom",
        customQuotes: [],
        selectedCustomQuoteId: null,
        dayKey: "2026-10-19",
      }),
    ).toBeNull();
  });

  it("handles leap years and local calendar boundaries", () => {
    expect(daysInCalendarYear(2024)).toBe(366);
    expect(daysInCalendarYear(2025)).toBe(365);
    expect(dayOfCalendarYear(new Date(2024, 0, 1, 23, 59))).toBe(1);
    expect(dayOfCalendarYear(new Date(2024, 11, 31, 1, 0))).toBe(366);
    expect(dayOfCalendarYear(new Date(2025, 11, 31, 1, 0))).toBe(365);
  });

  it("calculates age from real local dates and rejects invalid or future dates", () => {
    expect(ageInDays("2000-01-01", new Date(2000, 0, 8, 23, 0))).toBe(7);
    expect(ageInDays("2024-02-29", new Date(2025, 1, 28, 12, 0))).toBe(365);
    expect(ageInDays("not-a-date", new Date(2025, 1, 28))).toBeNull();
    expect(ageInDays("2030-01-01", new Date(2025, 1, 28))).toBeNull();
  });
});
