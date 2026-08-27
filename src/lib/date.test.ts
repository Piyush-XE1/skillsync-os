import { describe, it, expect } from "vitest";
import { todayISO, addDaysISO, fromISO, formatFriendly } from "@/lib/date";

describe("date utils", () => {
  it("todayISO formats a date as YYYY-MM-DD", () => {
    expect(todayISO(new Date(2024, 0, 5))).toBe("2024-01-05");
    expect(todayISO(new Date(2024, 11, 31))).toBe("2024-12-31");
  });

  it("addDaysISO handles month and year boundaries", () => {
    expect(addDaysISO("2024-01-31", 1)).toBe("2024-02-01");
    expect(addDaysISO("2024-02-28", 1)).toBe("2024-02-29"); // leap year
    expect(addDaysISO("2024-12-31", 1)).toBe("2025-01-01");
    expect(addDaysISO("2024-01-01", -1)).toBe("2023-12-31");
  });

  it("fromISO constructs a local date at midnight", () => {
    const d = fromISO("2024-03-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
  });

  it("formatFriendly returns a localized weekday string", () => {
    // Deterministic string regardless of locale
    expect(formatFriendly("2024-01-01")).toContain("Jan");
    expect(formatFriendly("2024-01-01")).toContain("1");
  });
});
