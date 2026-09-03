import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { configureSound, sound, unlockAudioOnGesture } from "@/lib/sound";

/**
 * Mirrors the persisted sound preferences into the audio engine and unlocks the
 * AudioContext on the first user gesture (browsers refuse to start audio
 * without one).
 *
 * Mounted once by the app shell — components never configure sound themselves,
 * exactly like `useHapticPreferences`.
 */
export function useSoundPreferences() {
  const enabled = useAppStore((s) => s.preferences.sound ?? true);
  const volume = useAppStore((s) => s.preferences.soundVolume ?? 0.7);

  useEffect(() => {
    configureSound({ enabled, volume });
  }, [enabled, volume]);

  useEffect(() => unlockAudioOnGesture(), []);
}

/**
 * Plays the sheet/dialog whoosh on open and close. Mounted by the overlay
 * components so every modal surface in the app sounds the same.
 */
export function useOverlaySound(open: boolean) {
  const previous = useRef(false);
  useEffect(() => {
    if (open && !previous.current) sound.open();
    else if (!open && previous.current) sound.close();
    previous.current = open;
  }, [open]);
}
