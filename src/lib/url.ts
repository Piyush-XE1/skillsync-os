/**
 * URL safety for user-provided links (resources, GitHub URLs).
 *
 * Values can originate from shared backup/restore files, so they must never be
 * rendered as-is into `href` — schemes like `javascript:` or `data:` would
 * execute code in the app's origin.
 */

/** True when `url` is a well-formed absolute http(s) URL. */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * href-safe value for a user-provided URL. Unsafe or malformed values render
 * inert instead of navigating/executing.
 */
export function safeHref(url: string): string {
  return isSafeUrl(url) ? url : "#";
}
