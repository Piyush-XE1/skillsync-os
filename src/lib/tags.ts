/**
 * Shared tag hygiene for the local-first workspace.
 *
 * Tags are plain strings on the owning record — there is no tag table and no
 * second database. This module only normalises what the user types and merges
 * tag lists without case-insensitive duplicates, so the same helpers serve
 * expenses, the people journal and any future tag surface.
 */

export const TAG_MAX_LENGTH = 32;

/** Trims, collapses internal whitespace and strips a leading `#`. */
export function normalizeTag(value: string): string {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, TAG_MAX_LENGTH).trim();
}

export function sameTag(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/** Merges tag lists in order, keeping the first spelling of each tag. */
export function mergeTags(...lists: Array<readonly string[] | undefined | null>): string[] {
  const out: string[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const tag = normalizeTag(raw);
      if (!tag || out.some((existing) => sameTag(existing, tag))) continue;
      out.push(tag);
    }
  }
  return out;
}

/** Toggles one tag, preserving the stored spelling when it already exists. */
export function toggleTag(tags: readonly string[], raw: string): string[] {
  const tag = normalizeTag(raw);
  if (!tag) return [...tags];
  const existing = tags.find((item) => sameTag(item, tag));
  return existing ? tags.filter((item) => !sameTag(item, tag)) : [...tags, tag];
}
