import { describe, expect, it } from "vitest";
import {
  elapsedStopwatchMs,
  formatCompactDuration,
  formatStopwatchDuration,
  stopwatchParts,
} from "./stopwatch";
import type { Stopwatch } from "./schema";

function timer(patch: Partial<Stopwatch> = {}): Stopwatch {
  return {
    id: "timer-1",
    title: "Deep Work",
    icon: "Timer",
    createdAt: 1,
    status: "idle",
    startedAt: null,
    accumulatedMs: 0,
    history: [],
    ...patch,
  };
}

describe("universal stopwatch logic", () => {
  it("derives running elapsed time from timestamps rather than tick counts", () => {
    const running = timer({ status: "running", startedAt: 10_000, accumulatedMs: 2_500 });
    expect(elapsedStopwatchMs(running, 18_000)).toBe(10_500);
    expect(elapsedStopwatchMs(running, 9_000)).toBe(2_500);
  });

  it("keeps paused elapsed time fixed", () => {
    expect(
      elapsedStopwatchMs(
        timer({ status: "paused", startedAt: null, accumulatedMs: 61_000 }),
        999_999,
      ),
    ).toBe(61_000);
  });

  it("formats day, hour, minute, and second parts with tabular clock semantics", () => {
    const value = (((2 * 24 + 3) * 60 + 4) * 60 + 5) * 1_000;
    expect(stopwatchParts(value)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
    expect(formatStopwatchDuration(value)).toBe("02 : 03 : 04 : 05");
    expect(formatCompactDuration(value)).toBe("2d 3h 4m");
  });
});
