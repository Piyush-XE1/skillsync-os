import { create } from "zustand";

type UiState = {
  /** Replay the first-launch sound/animation after the profile demo resets it. */
  launchReplayToken: number;
  requestLaunchReplay: () => void;
};

/**
 * Ephemeral UI state only — workspace data remains in the local-first app
 * store. Quick Capture was intentionally removed; there is no hidden capture
 * surface left behind.
 */
export const useUiStore = create<UiState>((set) => ({
  launchReplayToken: 0,
  requestLaunchReplay: () => set((state) => ({ launchReplayToken: state.launchReplayToken + 1 })),
}));
