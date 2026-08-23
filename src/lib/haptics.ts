/**
 * Central haptic feedback service.
 *
 * The rest of the app NEVER touches `navigator.vibrate` or Capacitor directly —
 * it calls the semantic methods below (`haptics.tap()`, `haptics.success()`, …).
 *
 * Platform strategy
 * -----------------
 * - Capacitor Android/iOS  → native `@capacitor/haptics` (best feel).
 * - Mobile browser / PWA   → Vibration API patterns.
 * - Desktop / unsupported  → silent no-op (never throws).
 *
 * Event map (keep in sync with call sites)
 * ----------------------------------------
 * Navigation change     → selection
 * Button tap            → tap (light)
 * Important confirm     → impact (medium)
 * Toggle / switch       → toggle
 * Selection / tab       → selection
 * Slider milestone      → selection
 * Checkbox              → selection
 * Task created          → success
 * Task completed        → success
 * Task uncompleted      → tap
 * Item deleted          → impact (medium)
 * Destructive confirm   → warning
 * Important failure     → error
 * Long-press activated  → longPress
 * Drag started          → tap
 * Drag reorder step     → selection
 * Major milestone       → milestone (rich success)
 */

import { nativeBridge } from "@/lib/native/bridge";

export type HapticIntensity = "light" | "standard" | "strong";

type Level =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning"
  | "error"
  | "milestone";

/* ------------------------------- settings ------------------------------- */

let enabled = true;
let intensity: HapticIntensity = "standard";

/** Called once from the app shell whenever user preferences change. */
export function configureHaptics(next: { enabled?: boolean; intensity?: HapticIntensity }) {
  if (typeof next.enabled === "boolean") enabled = next.enabled;
  if (next.intensity) intensity = next.intensity;
}

/* ----------------------------- capabilities ----------------------------- */

type NativeHaptics = {
  impact: (o: { style: string }) => Promise<void>;
  notification: (o: { type: string }) => Promise<void>;
  selectionStart: () => Promise<void>;
  selectionChanged: () => Promise<void>;
  selectionEnd: () => Promise<void>;
};

let nativeReady: boolean | null = null;
let native: NativeHaptics | null = null;
let nativeEnums: {
  ImpactStyle: Record<string, string>;
  NotificationType: Record<string, string>;
} | null = null;

function isNative() {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** Lazily resolves the native plugin. Resolves to false on web. */
async function loadNative(): Promise<boolean> {
  if (nativeReady !== null) return nativeReady;
  if (!isNative()) {
    nativeReady = false;
    return false;
  }
  try {
    const mod = await import("@capacitor/haptics");
    native = mod.Haptics as unknown as NativeHaptics;
    nativeEnums = {
      ImpactStyle: mod.ImpactStyle as unknown as Record<string, string>,
      NotificationType: mod.NotificationType as unknown as Record<string, string>,
    };
    nativeReady = true;
  } catch {
    nativeReady = false;
  }
  return nativeReady;
}

function canVibrate() {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { vibrate?: unknown }).vibrate === "function"
  );
}

/** True when *some* tactile channel exists (used by settings UI copy). */
export function hapticsSupported() {
  return nativeBridge() !== null || isNative() || canVibrate();
}

/* -------------------------------- patterns ------------------------------- */

/** Web Vibration API patterns, in ms. Scaled by the intensity preference. */
const WEB_PATTERNS: Record<Level, number | number[]> = {
  light: 10,
  medium: 18,
  heavy: 32,
  selection: 6,
  success: [12, 40, 20],
  warning: [20, 60, 20],
  error: [26, 50, 26, 50, 26],
  milestone: [14, 40, 18, 40, 30],
};

const SCALE: Record<HapticIntensity, number> = {
  light: 0.6,
  standard: 1,
  strong: 1.6,
};

function scaled(pattern: number | number[]) {
  const k = SCALE[intensity] ?? 1;
  if (k === 1) return pattern;
  return Array.isArray(pattern)
    ? pattern.map((n, i) => (i % 2 === 0 ? Math.max(4, Math.round(n * k)) : n))
    : Math.max(4, Math.round(pattern * k));
}

/* ------------------------------ spam guard ------------------------------ */

/**
 * Prevents duplicate haptics from event bubbling / repeated effects.
 * The same level cannot fire twice inside its own cooldown window.
 */
const COOLDOWN: Record<Level, number> = {
  light: 45,
  medium: 60,
  heavy: 120,
  selection: 40,
  success: 240,
  warning: 300,
  error: 400,
  milestone: 600,
};

const lastFired = new Map<Level, number>();
/** Global floor: no two haptics of any kind within 24ms. */
let lastAny = 0;

function allowed(level: Level) {
  const now = Date.now();
  if (now - lastAny < 24) return false;
  const prev = lastFired.get(level) ?? 0;
  if (now - prev < COOLDOWN[level]) return false;
  lastFired.set(level, now);
  lastAny = now;
  return true;
}

/* -------------------------------- engine -------------------------------- */

function nativeImpactStyle(level: Level): string | null {
  const s = nativeEnums?.ImpactStyle;
  if (!s) return null;
  if (level === "heavy") return s["Heavy"] ?? "HEAVY";
  if (level === "medium") return s["Medium"] ?? "MEDIUM";
  if (level === "light" || level === "selection") return s["Light"] ?? "LIGHT";
  return null;
}

function nativeNotificationType(level: Level): string | null {
  const t = nativeEnums?.NotificationType;
  if (!t) return null;
  if (level === "success" || level === "milestone") return t["Success"] ?? "SUCCESS";
  if (level === "warning") return t["Warning"] ?? "WARNING";
  if (level === "error") return t["Error"] ?? "ERROR";
  return null;
}

function fire(level: Level) {
  if (!enabled || typeof window === "undefined") return;
  if (!allowed(level)) return;

  // Never block the caller / UI thread.
  void (async () => {
    try {
      // 1. SkillSync's own Android bridge (real Vibrator / VibrationEffect).
      const bridge = nativeBridge();
      if (bridge) {
        try {
          const pattern = scaled(WEB_PATTERNS[level]);
          const result =
            intensity === "standard"
              ? await bridge.haptic({ level })
              : await bridge.vibratePattern({
                  pattern: Array.isArray(pattern) ? pattern : [pattern],
                });
          if (result?.ok) return;
        } catch {
          /* fall through to the Capacitor plugin / web API */
        }
      }
      if (await loadNative()) {
        if (level === "selection") {
          await native!.selectionChanged();
          return;
        }
        const notif = nativeNotificationType(level);
        if (notif) {
          await native!.notification({ type: notif });
          if (level === "milestone") {
            setTimeout(() => {
              void native!
                .impact({ style: nativeImpactStyle("medium") ?? "MEDIUM" })
                .catch(() => {});
            }, 90);
          }
          return;
        }
        const style = nativeImpactStyle(level);
        if (style) {
          await native!.impact({ style });
          return;
        }
      }
      if (canVibrate()) {
        navigator.vibrate(scaled(WEB_PATTERNS[level]));
      }
    } catch {
      /* haptics are always best-effort */
    }
  })();
}

/* ------------------------------ public API ------------------------------ */

export const haptics = {
  /** Ordinary button / card tap. */
  tap: () => fire("light"),
  /** Changing a selection: tab, chip, segment, day, checkbox. */
  selection: () => fire("selection"),
  /** Toggle or switch flipped. */
  toggle: (on?: boolean) => fire(on ? "medium" : "light"),
  /** Important confirmation (save, create, apply, delete performed). */
  impact: () => fire("medium"),
  /** Rare, for critical destructive interactions. */
  heavy: () => fire("heavy"),
  /** Something completed successfully. */
  success: () => fire("success"),
  /** Destructive confirmation surfaced / risky state. */
  warning: () => fire("warning"),
  /** An important action failed. */
  error: () => fire("error"),
  /** Long-press threshold reached (fire exactly once). */
  longPress: () => fire("medium"),
  /** Level up, streak milestone, major goal completed. */
  milestone: () => fire("milestone"),
} as const;
