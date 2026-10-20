// @vitest-environment jsdom
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppLaunchScreen } from "./AppLaunchScreen";
import { createInitialData } from "@/lib/seed";
import { useAppStore } from "@/store/useAppStore";
import { useUiStore } from "@/store/useUiStore";

describe("AppLaunchScreen", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const data = createInitialData();
    data.preferences.hasCompletedFirstLaunch = false;
    data.preferences.graphicsQuality = "battery-saver";
    useAppStore.setState({ ...data, _hydrated: true });
    useUiStore.setState({ launchReplayToken: 0 });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("dismisses after first light even when Strict Mode remounts its effect", async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <AppLaunchScreen />
        </StrictMode>,
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(container.textContent).toContain("Less visual noise. More meaning.");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
    expect(container.textContent).toBe("");
    expect(useAppStore.getState().preferences.hasCompletedFirstLaunch).toBe(true);
  });
});
