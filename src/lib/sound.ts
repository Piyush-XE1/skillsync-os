/**
 * Central sound design service.
 *
 * Exactly like `@/lib/haptics`, the rest of the app NEVER touches the Web Audio
 * API directly — it calls the semantic cues below (`sound.tap()`,
 * `sound.success()`, `sound.drop()`, …) and the engine decides whether and how
 * to render them.
 *
 * Design goals
 * ------------
 * - **Zero dependencies, zero assets.** Every cue is synthesised from
 *   oscillators + a tiny procedurally generated noise buffer, so nothing has to
 *   be downloaded and the whole system costs ~4 KB.
 * - **Short and quiet.** UI audio should be felt, not listened to: cues are
 *   40–420 ms and peak well below 0.2 of full scale before the user's volume
 *   preference is applied.
 * - **Autoplay-policy safe.** Browsers only allow audio after a user gesture, so
 *   the context is created lazily and "unlocked" by the first tap/key press.
 *   Every call before that is silently dropped — never queued, never thrown.
 * - **Spam-proof.** Each cue has its own cooldown window (same idea as the
 *   haptic engine) so a bubbling click or a re-render storm can't machine-gun.
 * - **Server/test safe.** No-ops without `window`/`AudioContext`.
 *
 * Cue map (keep in sync with call sites)
 * --------------------------------------
 * Navigation / tab change    → select
 * Ordinary button tap        → tap
 * Toggle or switch flipped   → toggle
 * Sheet / dialog opened      → open
 * Sheet / dialog closed      → close
 * Drag picked up             → lift
 * Drag crossed a slot        → move
 * Drag dropped / committed   → drop
 * Something saved or created → success
 * Task / habit completed     → complete
 * Money logged               → coin
 * Item deleted               → trash
 * An action failed           → error
 * Streak milestone           → streak
 * Focus timer finished       → chime
 * Timer's final seconds      → tick
 */

export type SoundCue =
  | "tap"
  | "select"
  | "toggle"
  | "open"
  | "close"
  | "lift"
  | "move"
  | "drop"
  | "success"
  | "complete"
  | "coin"
  | "trash"
  | "error"
  | "streak"
  | "chime"
  | "tick";

/** One synthesised voice inside a cue. */
export type ToneSpec = {
  /** Frequency in Hz at the start of the note. */
  freq: number;
  /** Optional end frequency for a glide (swooshes, drops, risers). */
  to?: number;
  /** Start offset in seconds, relative to the cue. */
  at?: number;
  /** Note length in seconds. */
  dur?: number;
  /** Oscillator shape — "sine" reads softest, "triangle" a little brighter. */
  type?: OscillatorType;
  /** Per-note peak gain (0..1) before the master volume. */
  gain?: number;
};

/** A filtered noise burst — used for the airy "whoosh" body of some cues. */
export type NoiseSpec = {
  at?: number;
  dur?: number;
  gain?: number;
  /** "lowpass" → thud/soft air, "highpass" → crisp tick. */
  filter?: BiquadFilterType;
  freq?: number;
};

export type CueSpec = {
  tones: ToneSpec[];
  noise?: NoiseSpec;
  /** Minimum ms between two plays of the same cue. */
  cooldown: number;
  /** Human label, used by the settings preview list. */
  label: string;
};

/** Musical shorthand — a small pentatonic-ish palette keeps cues coherent. */
const N = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  A3: 220.0,
  E4: 329.63,
  G4: 392.0,
} as const;

/**
 * Every cue the OS can play. Frequencies sit in a comfortable 200 Hz – 1.6 kHz
 * band (audible on phone speakers, never harsh) and durations stay under half a
 * second except for the celebration cues.
 */
export const SOUND_CUES: Record<SoundCue, CueSpec> = {
  tap: { label: "Tap", cooldown: 55, tones: [{ freq: N.G5, dur: 0.05, gain: 0.05, type: "sine" }] },
  select: {
    label: "Select",
    cooldown: 45,
    tones: [{ freq: N.D6, dur: 0.045, gain: 0.045, type: "triangle" }],
  },
  toggle: {
    label: "Toggle",
    cooldown: 70,
    tones: [
      { freq: N.E5, dur: 0.05, gain: 0.05 },
      { freq: N.A5, at: 0.045, dur: 0.06, gain: 0.045 },
    ],
  },
  open: {
    label: "Open",
    cooldown: 140,
    tones: [{ freq: N.E4, to: N.E5, dur: 0.16, gain: 0.05, type: "sine" }],
    noise: { dur: 0.16, gain: 0.02, filter: "lowpass", freq: 900 },
  },
  close: {
    label: "Close",
    cooldown: 140,
    tones: [{ freq: N.E5, to: N.E4, dur: 0.15, gain: 0.045, type: "sine" }],
    noise: { dur: 0.14, gain: 0.016, filter: "lowpass", freq: 700 },
  },
  lift: {
    label: "Pick up",
    cooldown: 120,
    tones: [
      { freq: N.G4, dur: 0.06, gain: 0.05 },
      { freq: N.D5, at: 0.05, dur: 0.08, gain: 0.05 },
    ],
  },
  move: {
    label: "Reorder step",
    cooldown: 40,
    tones: [{ freq: N.A5, dur: 0.035, gain: 0.03, type: "triangle" }],
  },
  drop: {
    label: "Drop",
    cooldown: 120,
    tones: [{ freq: N.D5, to: N.G4, dur: 0.13, gain: 0.06, type: "sine" }],
    noise: { dur: 0.1, gain: 0.025, filter: "lowpass", freq: 600 },
  },
  success: {
    label: "Saved",
    cooldown: 220,
    tones: [
      { freq: N.G5, dur: 0.08, gain: 0.06 },
      { freq: N.C6, at: 0.07, dur: 0.14, gain: 0.055 },
    ],
  },
  complete: {
    label: "Completed",
    cooldown: 200,
    tones: [
      { freq: N.C5, dur: 0.07, gain: 0.06 },
      { freq: N.E5, at: 0.06, dur: 0.07, gain: 0.06 },
      { freq: N.G5, at: 0.12, dur: 0.16, gain: 0.055 },
    ],
  },
  coin: {
    label: "Money logged",
    cooldown: 240,
    tones: [
      { freq: N.E6, dur: 0.06, gain: 0.05, type: "triangle" },
      { freq: N.A5, at: 0.05, dur: 0.14, gain: 0.05, type: "triangle" },
    ],
  },
  trash: {
    label: "Deleted",
    cooldown: 260,
    tones: [{ freq: N.A3, to: 140, dur: 0.2, gain: 0.06, type: "sawtooth" }],
    noise: { dur: 0.16, gain: 0.02, filter: "lowpass", freq: 500 },
  },
  error: {
    label: "Error",
    cooldown: 380,
    tones: [
      { freq: 311.13, dur: 0.1, gain: 0.06, type: "square" },
      { freq: 233.08, at: 0.1, dur: 0.16, gain: 0.055, type: "square" },
    ],
  },
  streak: {
    label: "Streak",
    cooldown: 500,
    tones: [
      { freq: N.G5, dur: 0.08, gain: 0.055 },
      { freq: N.C6, at: 0.07, dur: 0.08, gain: 0.055 },
      { freq: N.E6, at: 0.14, dur: 0.2, gain: 0.05 },
    ],
  },
  chime: {
    label: "Timer done",
    cooldown: 700,
    tones: [
      { freq: N.C5, dur: 0.4, gain: 0.06 },
      { freq: N.E5, at: 0.18, dur: 0.4, gain: 0.055 },
      { freq: N.G5, at: 0.36, dur: 0.55, gain: 0.05 },
    ],
  },
  tick: {
    label: "Countdown tick",
    cooldown: 250,
    tones: [{ freq: N.D6, dur: 0.03, gain: 0.035, type: "square" }],
    noise: { dur: 0.02, gain: 0.012, filter: "highpass", freq: 3000 },
  },
};

/** Every cue, in the order the settings preview lists them. */
export const SOUND_CUE_ORDER = Object.keys(SOUND_CUES) as SoundCue[];

/* ------------------------------- settings ------------------------------- */

export const DEFAULT_SOUND_VOLUME = 0.7;
const MIN_VOLUME = 0;
const MAX_VOLUME = 1;

let enabled = true;
let volume = DEFAULT_SOUND_VOLUME;

/** Clamps a stored/preference volume into the safe 0..1 range. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SOUND_VOLUME;
  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, value));
}

/** Mirrors persisted preferences into the engine (called from the app shell). */
export function configureSound(next: { enabled?: boolean; volume?: number }) {
  if (typeof next.enabled === "boolean") enabled = next.enabled;
  if (typeof next.volume === "number") {
    volume = clampVolume(next.volume);
    if (master && ctx) master.gain.value = volume;
  }
}

export function soundEnabled() {
  return enabled;
}

export function soundVolume() {
  return volume;
}

/** True when *some* audio channel exists (used by settings copy). */
export function soundSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(audioCtor());
}

/* ------------------------------ spam guard ------------------------------ */

/**
 * Cooldown gate. Extracted (and clock-injectable) so it can be unit-tested
 * without touching the audio stack.
 */
export function createGate(now: () => number = () => Date.now()) {
  const last = new Map<string, number>();
  let lastAny = 0;
  return {
    /** True when `key` may fire again, and records the attempt when it does. */
    allow(key: string, cooldown: number, floor = 18) {
      const t = now();
      if (t - lastAny < floor) return false;
      const prev = last.get(key) ?? 0;
      if (t - prev < cooldown) return false;
      last.set(key, t);
      lastAny = t;
      return true;
    },
    reset() {
      last.clear();
      lastAny = 0;
    },
  };
}

const gate = createGate();

/* -------------------------------- engine -------------------------------- */

type WindowWithAudio = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

function audioCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as WindowWithAudio;
  return w.AudioContext ?? w.webkitAudioContext;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let unlockBound = false;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = audioCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = volume;
    // A gentle lowpass keeps the brighter cues from sounding tinny on phones.
    const shelf = ctx.createBiquadFilter();
    shelf.type = "lowpass";
    shelf.frequency.value = 7200;
    master.connect(shelf);
    shelf.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
  return ctx;
}

/** 0.4 s of white noise, generated once and reused by every airy cue. */
function ensureNoise(ac: AudioContext): AudioBuffer | null {
  if (noiseBuffer) return noiseBuffer;
  try {
    const length = Math.floor(ac.sampleRate * 0.4);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      // Fade the tail so looping/burst playback never clicks.
      const envelope = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * envelope * envelope;
    }
    noiseBuffer = buffer;
    return buffer;
  } catch {
    return null;
  }
}

/**
 * Browsers require a user gesture before audio can start. The shell calls this
 * once; it wires one-shot listeners that create + resume the context on the
 * first tap, click or key press.
 */
export function unlockAudioOnGesture() {
  if (typeof window === "undefined" || unlockBound) return () => {};
  unlockBound = true;
  const unlock = () => {
    const ac = ensureContext();
    if (ac && ac.state === "suspended") void ac.resume().catch(() => {});
  };
  const opts = { once: true, passive: true } as const;
  window.addEventListener("pointerdown", unlock, opts);
  window.addEventListener("keydown", unlock, opts);
  window.addEventListener("touchend", unlock, opts);
  return () => {
    unlockBound = false;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchend", unlock);
  };
}

function renderCue(ac: AudioContext, spec: CueSpec, at: number) {
  const dest = master ?? ac.destination;
  for (const tone of spec.tones) {
    const start = at + (tone.at ?? 0);
    const dur = tone.dur ?? 0.12;
    const peak = tone.gain ?? 0.05;
    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.to && tone.to !== tone.freq) {
        // Exponential ramps can't cross zero — clamp to an audible floor.
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, tone.to), start + dur);
      }
      // Percussive envelope: near-silent attack → peak → exponential release.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.02, dur * 0.3));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    } catch {
      /* best-effort */
    }
  }

  if (spec.noise) {
    const buffer = ensureNoise(ac);
    if (!buffer) return;
    const n = spec.noise;
    const start = at + (n.at ?? 0);
    const dur = n.dur ?? 0.12;
    try {
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = n.filter ?? "lowpass";
      filter.frequency.value = n.freq ?? 800;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(n.gain ?? 0.02, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(start);
      src.stop(start + dur + 0.02);
    } catch {
      /* best-effort */
    }
  }
}

/**
 * Plays a cue. Safe to call from anywhere (server, tests, before unlock):
 * everything that can fail is caught and ignored.
 */
export function playCue(cue: SoundCue, options?: { force?: boolean }) {
  if (!enabled || volume <= 0 || typeof window === "undefined") return;
  const spec = SOUND_CUES[cue];
  if (!spec) return;
  if (!options?.force && !gate.allow(cue, spec.cooldown)) return;

  const ac = ensureContext();
  if (!ac) return;
  try {
    if (ac.state === "suspended") {
      // Not unlocked yet (no gesture): drop the cue rather than queue it.
      void ac.resume().catch(() => {});
      if (ac.state === "suspended" && !options?.force) return;
    }
    renderCue(ac, spec, ac.currentTime + 0.001);
  } catch {
    /* sound is always best-effort */
  }
}

/* ------------------------------ public API ------------------------------ */

export const sound = {
  /** Ordinary button / card tap. */
  tap: () => playCue("tap"),
  /** Tab, chip, segment or navigation change. */
  select: () => playCue("select"),
  /** Toggle or switch flipped. */
  toggle: () => playCue("toggle"),
  /** Sheet / dialog opened. */
  open: () => playCue("open"),
  /** Sheet / dialog closed. */
  close: () => playCue("close"),
  /** A row/widget was picked up for dragging. */
  lift: () => playCue("lift"),
  /** The drag crossed into a new slot. */
  move: () => playCue("move"),
  /** The drag was committed. */
  drop: () => playCue("drop"),
  /** Saved / created. */
  success: () => playCue("success"),
  /** Task, habit or session completed. */
  complete: () => playCue("complete"),
  /** Money logged (credit or debit). */
  coin: () => playCue("coin"),
  /** Something was deleted. */
  trash: () => playCue("trash"),
  /** An action failed. */
  error: () => playCue("error"),
  /** Streak milestone reached. */
  streak: () => playCue("streak"),
  /** Focus / break timer finished. */
  chime: () => playCue("chime"),
  /** Final-seconds countdown tick. */
  tick: () => playCue("tick"),
} as const;

/** Plays a cue once, ignoring cooldowns — used by the settings preview list. */
export function previewSound(cue: SoundCue) {
  const previous = enabled;
  enabled = true;
  try {
    playCue(cue, { force: true });
  } finally {
    enabled = previous;
  }
}
