import type { Stopwatch } from "./schema";

export function elapsedStopwatchMs(timer: Stopwatch, now: number = Date.now()): number {
  const active =
    timer.status === "running" && timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0;
  return Math.max(0, timer.accumulatedMs + active);
}

export type StopwatchParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function stopwatchParts(milliseconds: number): StopwatchParts {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function formatStopwatchDuration(milliseconds: number): string {
  const value = stopwatchParts(milliseconds);
  const days = String(value.days).padStart(2, "0");
  const hours = String(value.hours).padStart(2, "0");
  const minutes = String(value.minutes).padStart(2, "0");
  const seconds = String(value.seconds).padStart(2, "0");
  return `${days} : ${hours} : ${minutes} : ${seconds}`;
}

export function formatCompactDuration(milliseconds: number): string {
  const value = stopwatchParts(milliseconds);
  if (value.days > 0) return `${value.days}d ${value.hours}h ${value.minutes}m`;
  if (value.hours > 0) return `${value.hours}h ${value.minutes}m ${value.seconds}s`;
  if (value.minutes > 0) return `${value.minutes}m ${value.seconds}s`;
  return `${value.seconds}s`;
}
