import { create } from "zustand";

export type QuickCaptureAction = "expense" | "habit" | "note";

type UiState = {
  quickCaptureOpen: boolean;
  quickCaptureAction: QuickCaptureAction | null;
  launchReplayToken: number;
  openQuickCapture: (action?: QuickCaptureAction) => void;
  closeQuickCapture: () => void;
  requestLaunchReplay: () => void;
};

/** Ephemeral UI state only — workspace data remains in the local-first app store. */
export const useUiStore = create<UiState>((set) => ({
  quickCaptureOpen: false,
  quickCaptureAction: null,
  launchReplayToken: 0,
  openQuickCapture: (action) => set({ quickCaptureOpen: true, quickCaptureAction: action ?? null }),
  closeQuickCapture: () => set({ quickCaptureOpen: false, quickCaptureAction: null }),
  requestLaunchReplay: () => set((state) => ({ launchReplayToken: state.launchReplayToken + 1 })),
}));
