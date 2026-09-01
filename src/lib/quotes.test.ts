import { describe, it, expect } from "vitest";
import { QUOTES, dailyQuote } from "@/lib/quotes";

describe("quotes", () => {
  it("has a curated library", () => {
    expect(QUOTES.length).toBeGreaterThan(10);
    for (const q of QUOTES) {
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.author.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a given date", () => {
    expect(dailyQuote("2026-09-01")).toEqual(dailyQuote("2026-09-01"));
  });

  it("rotates across dates", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 30; d++) {
      seen.add(dailyQuote(`2026-08-${String(d).padStart(2, "0")}`).text);
    }
    expect(seen.size).toBeGreaterThan(3);
  });
});
