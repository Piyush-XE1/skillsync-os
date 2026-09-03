import { describe, it, expect, beforeEach } from "vitest";
import {
  SOUND_CUES,
  SOUND_CUE_ORDER,
  clampVolume,
  configureSound,
  createGate,
  playCue,
  previewSound,
  sound,
  soundEnabled,
  soundSupported,
  soundVolume,
  DEFAULT_SOUND_VOLUME,
  type SoundCue,
} from "./sound";

describe("sound cue table", () => {
  it("defines every cue the semantic API exposes", () => {
    const apiCues = Object.keys(sound) as SoundCue[];
    for (const cue of apiCues) {
      expect(SOUND_CUES[cue], `missing cue definition for ${cue}`).toBeTruthy();
    }
    // And nothing in the table is unreachable from the API.
    expect(apiCues.length).toBeGreaterThanOrEqual(SOUND_CUE_ORDER.length - 1);
  });

  it("keeps every cue short, quiet and in an audible band", () => {
    for (const [name, spec] of Object.entries(SOUND_CUES)) {
      expect(spec.tones.length, `${name} has no tones`).toBeGreaterThan(0);
      expect(spec.cooldown, `${name} cooldown`).toBeGreaterThan(0);
      expect(typeof spec.label).toBe("string");
      for (const tone of spec.tones) {
        expect(tone.freq, `${name} frequency`).toBeGreaterThanOrEqual(80);
        expect(tone.freq, `${name} frequency`).toBeLessThanOrEqual(2400);
        expect(tone.dur ?? 0.12, `${name} duration`).toBeLessThanOrEqual(0.6);
        expect(tone.gain ?? 0.05, `${name} gain`).toBeLessThanOrEqual(0.12);
        if (tone.to) expect(tone.to).toBeGreaterThanOrEqual(20);
      }
      if (spec.noise) {
        expect(spec.noise.dur ?? 0.12).toBeLessThanOrEqual(0.4);
        expect(spec.noise.gain ?? 0.02).toBeLessThanOrEqual(0.06);
      }
    }
  });

  it("orders celebration cues with longer cooldowns than micro cues", () => {
    expect(SOUND_CUES.levelUp.cooldown).toBeGreaterThan(SOUND_CUES.tap.cooldown);
    expect(SOUND_CUES.achievement.cooldown).toBeGreaterThan(SOUND_CUES.move.cooldown);
  });
});

describe("clampVolume", () => {
  it("clamps into 0..1", () => {
    expect(clampVolume(-3)).toBe(0);
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(0.4)).toBeCloseTo(0.4);
    expect(clampVolume(1)).toBe(1);
    expect(clampVolume(9)).toBe(1);
  });

  it("falls back to the default for non-finite values", () => {
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_SOUND_VOLUME);
    expect(clampVolume(Number.POSITIVE_INFINITY)).toBe(DEFAULT_SOUND_VOLUME);
  });
});

describe("configureSound", () => {
  beforeEach(() => {
    configureSound({ enabled: true, volume: DEFAULT_SOUND_VOLUME });
  });

  it("mirrors enabled + volume preferences", () => {
    configureSound({ enabled: false });
    expect(soundEnabled()).toBe(false);
    configureSound({ enabled: true, volume: 0.25 });
    expect(soundEnabled()).toBe(true);
    expect(soundVolume()).toBeCloseTo(0.25);
  });

  it("clamps a corrupted persisted volume", () => {
    configureSound({ volume: 42 });
    expect(soundVolume()).toBe(1);
    configureSound({ volume: Number.NaN });
    expect(soundVolume()).toBe(DEFAULT_SOUND_VOLUME);
  });

  it("ignores partial updates", () => {
    configureSound({ volume: 0.5 });
    expect(soundEnabled()).toBe(true);
    configureSound({});
    expect(soundVolume()).toBeCloseTo(0.5);
  });
});

describe("createGate", () => {
  it("blocks a repeat inside the cooldown window", () => {
    let now = 1000;
    const g = createGate(() => now);
    expect(g.allow("tap", 50)).toBe(true);
    now += 10;
    expect(g.allow("tap", 50)).toBe(false);
    now += 60;
    expect(g.allow("tap", 50)).toBe(true);
  });

  it("tracks each key separately but keeps a global floor", () => {
    let now = 5000;
    const g = createGate(() => now);
    expect(g.allow("tap", 50)).toBe(true);
    now += 5;
    // Different key, but inside the global floor → suppressed (no machine-gunning).
    expect(g.allow("drop", 50, 18)).toBe(false);
    now += 20;
    expect(g.allow("drop", 50)).toBe(true);
  });

  it("resets cleanly", () => {
    let now = 1000;
    const g = createGate(() => now);
    expect(g.allow("tap", 100)).toBe(true);
    expect(g.allow("tap", 100)).toBe(false);
    g.reset();
    now += 100;
    expect(g.allow("tap", 100)).toBe(true);
  });
});

describe("playCue in a non-audio environment", () => {
  beforeEach(() => {
    configureSound({ enabled: true, volume: 0.7 });
  });

  it("never throws when AudioContext is unavailable", () => {
    expect(() => playCue("tap")).not.toThrow();
    expect(() => playCue("levelUp")).not.toThrow();
    expect(() => playCue("not-a-cue" as SoundCue)).not.toThrow();
    expect(() => sound.complete()).not.toThrow();
    expect(() => previewSound("achievement")).not.toThrow();
  });

  it("reports unsupported when there is no AudioContext", () => {
    expect(soundSupported()).toBe(false);
  });

  it("stays silent while disabled", () => {
    configureSound({ enabled: false });
    expect(soundEnabled()).toBe(false);
    expect(() => playCue("success")).not.toThrow();
    // Every semantic entry point is safe while muted.
    for (const cue of Object.values(sound)) expect(() => cue()).not.toThrow();
    configureSound({ enabled: true });
  });
});
