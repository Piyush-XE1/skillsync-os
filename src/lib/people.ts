/**
 * Pure helpers for the private "People I Met" social-learning journal.
 *
 * No network, no contacts, no inference: records are exactly what the user
 * typed. The same helpers are used by the store, the migrations and the UI so
 * blank-field handling stays consistent everywhere.
 */

import type { Person } from "@/lib/schema";
import { todayISO } from "@/lib/date";
import { mergeTags, normalizeTag } from "@/lib/tags";

export type PersonTextField =
  | "howMet"
  | "liked"
  | "disliked"
  | "learned"
  | "talkedAbout"
  | "locationContext"
  | "followUp";

export const PERSON_TEXT_FIELDS: readonly PersonTextField[] = [
  "howMet",
  "liked",
  "disliked",
  "learned",
  "talkedAbout",
  "locationContext",
  "followUp",
];

export const PERSON_FIELD_LABELS: Record<PersonTextField | "dateMet" | "tags", string> = {
  howMet: "How we met",
  liked: "What I liked",
  disliked: "What I didn't like",
  learned: "What I learned",
  talkedAbout: "What we talked about",
  locationContext: "Where we met",
  followUp: "Follow-up / remember",
  dateMet: "Date met",
  tags: "Tags",
};

export type PersonInput = {
  name: string;
} & Partial<Record<PersonTextField | "dateMet", string>> & {
    tags?: readonly string[];
  };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > 0 ? text : undefined;
}

function cleanDate(value: unknown): string | undefined {
  return typeof value === "string" && ISO_DATE.test(value.trim()) ? value.trim() : undefined;
}

/**
 * Builds a record with no empty strings. Optional fields that were left blank
 * are omitted entirely, which is what makes the blank-field rule structural
 * rather than something every view has to remember to check.
 */
export function cleanPersonInput(
  input: PersonInput,
  options: { id?: string; now?: number } = {},
): Person {
  const now = options.now ?? Date.now();
  const record: Person = {
    id: options.id ?? `person-${now}`,
    name: (input.name ?? "").trim().replace(/\s+/g, " ") || "Unnamed",
    tags: mergeTags(input.tags),
    createdAt: now,
    updatedAt: now,
  };
  for (const key of PERSON_TEXT_FIELDS) {
    const value = cleanText(input[key]);
    if (value) record[key] = value;
  }
  const dateMet = cleanDate(input.dateMet);
  if (dateMet) record.dateMet = dateMet;
  return record;
}

/** Repairs a stored/imported record without ever discarding populated fields. */
export function normalizePersonRecord(value: unknown, now = Date.now()): Person | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = cleanText(raw.name);
  if (!name) return null;
  const input: PersonInput = { name };
  for (const key of PERSON_TEXT_FIELDS) {
    const text = cleanText(raw[key]);
    if (text) input[key] = text;
  }
  const dateMet = cleanDate(raw.dateMet);
  if (dateMet) input.dateMet = dateMet;
  input.tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : now;
  const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : createdAt;
  const normalized = cleanPersonInput(input, {
    id: typeof raw.id === "string" && raw.id ? raw.id : `person-${createdAt}`,
    now: createdAt,
  });
  return { ...normalized, createdAt, updatedAt };
}

export type PersonDetail = { key: string; label: string; value: string };

/**
 * The populated sections of a person, in reading order. Empty fields never
 * appear here at all — cards, details and summaries all render this list.
 */
export function personDetails(person: Person): PersonDetail[] {
  const details: PersonDetail[] = [];
  if (person.dateMet) {
    const date = new Date(`${person.dateMet}T00:00:00`);
    details.push({
      key: "dateMet",
      label: PERSON_FIELD_LABELS.dateMet,
      value: Number.isNaN(date.getTime())
        ? person.dateMet
        : date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
    });
  }
  for (const key of PERSON_TEXT_FIELDS) {
    const value = person[key];
    if (value && value.trim()) {
      details.push({ key, label: PERSON_FIELD_LABELS[key], value: value.trim() });
    }
  }
  if (person.tags.length > 0) {
    details.push({ key: "tags", label: PERSON_FIELD_LABELS.tags, value: person.tags.join(", ") });
  }
  return details;
}

/** Compact meta line for a list card — only data that exists. */
export function personMeta(person: Person): string[] {
  const meta: string[] = [];
  if (person.howMet) meta.push(person.howMet);
  if (person.dateMet) {
    const date = new Date(`${person.dateMet}T00:00:00`);
    meta.push(
      Number.isNaN(date.getTime())
        ? person.dateMet
        : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
    );
  }
  return meta;
}

/** Tag suggestions come from the user's own entries — no second tag database. */
export function personTagPalette(people: readonly Person[]): string[] {
  return mergeTags(...people.map((person) => person.tags));
}

export type PeopleSort = "recent" | "alphabetical" | "added";

export function sortPeople(people: readonly Person[], sort: PeopleSort): Person[] {
  const copy = [...people];
  switch (sort) {
    case "alphabetical":
      return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    case "added":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "recent":
    default:
      // Undated entries stay visible at the end rather than being treated as
      // older than every dated one.
      return copy.sort((a, b) => {
        if (!a.dateMet) return b.dateMet ? 1 : b.createdAt - a.createdAt;
        if (!b.dateMet) return -1;
        return b.dateMet.localeCompare(a.dateMet) || b.createdAt - a.createdAt;
      });
  }
}

export function filterPeople(
  people: readonly Person[],
  query: string,
  tag: string | null,
): Person[] {
  const q = query.trim().toLocaleLowerCase();
  return people.filter((person) => {
    if (tag && !person.tags.some((item) => normalizeTag(item) === normalizeTag(tag))) {
      return false;
    }
    if (!q) return true;
    const hay = [person.name, ...personDetails(person).map((field) => field.value)]
      .join(" ")
      .toLocaleLowerCase();
    return hay.includes(q);
  });
}

export function todayForNewPerson(now = new Date()): string {
  return todayISO(now);
}
