import type { CustomQuote, QuoteFilterPreference } from "./schema";

export type DisplayQuote = {
  id: string;
  quote: string;
  author: string;
  source: "curated" | "custom";
};

/**
 * A compact public-domain collection. Classical translations identify their
 * translator and year so the app never presents a modern paraphrase as an
 * ancient author's exact words.
 */
export const STOIC_QUOTES: readonly DisplayQuote[] = [
  {
    id: "epictetus-control",
    quote: "Some things are in our control and others not.",
    author: "Epictetus · Enchiridion, trans. Elizabeth Carter (1758)",
    source: "curated",
  },
  {
    id: "epictetus-notions",
    quote:
      "Men are disturbed, not by things, but by the principles and notions which they form concerning things.",
    author: "Epictetus · Enchiridion, trans. Elizabeth Carter (1758)",
    source: "curated",
  },
  {
    id: "aurelius-revenge",
    quote: "The best way of avenging thyself is not to become like the wrong doer.",
    author: "Marcus Aurelius · Meditations, trans. George Long (1862)",
    source: "curated",
  },
  {
    id: "aurelius-last-act",
    quote: "Do every act of thy life as if it were the last.",
    author: "Marcus Aurelius · Meditations, trans. George Long (1862)",
    source: "curated",
  },
  {
    id: "seneca-postponing",
    quote: "While we are postponing, life speeds by.",
    author: "Seneca · Moral Letters, trans. Richard M. Gummere (1917)",
    source: "curated",
  },
  {
    id: "seneca-chance",
    quote: "No man was ever wise by chance.",
    author: "Seneca · Moral Letters, trans. Richard M. Gummere (1917)",
    source: "curated",
  },
  {
    id: "douglass-struggle",
    quote: "If there is no struggle, there is no progress.",
    author: "Frederick Douglass · West India Emancipation speech (1857)",
    source: "curated",
  },
  {
    id: "roosevelt-work",
    quote:
      "Far and away the best prize that life offers is the chance to work hard at work worth doing.",
    author: "Theodore Roosevelt · Labor Day address (1903)",
    source: "curated",
  },
  {
    id: "emerson-peace",
    quote: "Nothing can bring you peace but yourself.",
    author: "Ralph Waldo Emerson · Self-Reliance (1841)",
    source: "curated",
  },
  {
    id: "franklin-time",
    quote: "Lost time is never found again.",
    author: "Benjamin Franklin · Poor Richard's Almanack (1747)",
    source: "curated",
  },
] as const;

export function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function customDisplay(quotes: CustomQuote[]): DisplayQuote[] {
  return quotes.map((item) => ({
    id: `custom:${item.id}`,
    quote: item.quote,
    author: item.author || "Me",
    source: "custom",
  }));
}

/** The eligible pool for a mode. Mixed alternates sources before it cycles. */
export function quotePool(
  mode: QuoteFilterPreference,
  customQuotes: CustomQuote[],
): DisplayQuote[] {
  const custom = customDisplay(customQuotes);
  if (mode === "custom") return custom;
  if (mode === "stoic" || custom.length === 0) return [...STOIC_QUOTES];

  const mixed: DisplayQuote[] = [];
  const length = Math.max(STOIC_QUOTES.length, custom.length);
  for (let index = 0; index < length; index += 1) {
    if (STOIC_QUOTES[index]) mixed.push(STOIC_QUOTES[index]);
    if (custom[index]) mixed.push(custom[index]);
  }
  return mixed;
}

/**
 * Deterministic quote selection. The day anchors the initial item and `cursor`
 * advances through every eligible item exactly once before repeating.
 */
export function selectDisplayQuote({
  mode,
  customQuotes,
  selectedCustomQuoteId,
  dayKey,
  cursor = 0,
}: {
  mode: QuoteFilterPreference;
  customQuotes: CustomQuote[];
  selectedCustomQuoteId?: string | null;
  dayKey: string;
  cursor?: number;
}): DisplayQuote | null {
  const pool = quotePool(mode, customQuotes);
  if (pool.length === 0) return null;

  if (mode === "custom" && cursor === 0 && selectedCustomQuoteId) {
    const selected = pool.find((item) => item.id === `custom:${selectedCustomQuoteId}`);
    if (selected) return selected;
  }

  const initial = hashText(`${mode}:${dayKey}`) % pool.length;
  return pool[(initial + Math.max(0, cursor)) % pool.length] ?? pool[0];
}

function localCalendarDate(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function daysInCalendarYear(year: number): number {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

/** One-based local day of year: January 1 is day 1. */
export function dayOfCalendarYear(value: Date): number {
  const year = value.getFullYear();
  const ordinal = Date.UTC(year, value.getMonth(), value.getDate());
  const start = Date.UTC(year, 0, 1);
  return Math.floor((ordinal - start) / 86_400_000) + 1;
}

/** Parses an ISO date as a local calendar day, never as UTC. */
export function parseLocalDate(dateISO: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(year, month - 1, day);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) {
    return null;
  }
  return value;
}

export function ageInDays(birthDateISO: string, now: Date = new Date()): number | null {
  const birthDate = parseLocalDate(birthDateISO);
  if (!birthDate) return null;
  const today = localCalendarDate(now);
  const birthOrdinal = Date.UTC(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const todayOrdinal = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (birthOrdinal > todayOrdinal) return null;
  return Math.floor((todayOrdinal - birthOrdinal) / 86_400_000);
}

export function localDateISO(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
