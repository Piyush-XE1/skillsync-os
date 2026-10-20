// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Toggle } from "./Toggle";

const feedback = vi.hoisted(() => ({
  haptic: vi.fn(),
  sound: vi.fn(),
}));

vi.mock("@/lib/haptics", () => ({ haptics: { toggle: feedback.haptic } }));
vi.mock("@/lib/sound", () => ({ sound: { toggle: feedback.sound } }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  feedback.haptic.mockReset();
  feedback.sound.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function StatefulToggle() {
  const [on, setOn] = useState(false);
  return <Toggle label="Quiet hours" on={on} onChange={setOn} />;
}

describe("Folio Circuit toggle", () => {
  it("exposes native switch semantics and a clear visual readout", () => {
    act(() => root.render(<StatefulToggle />));

    const toggle = container.querySelector<HTMLButtonElement>('[role="switch"]');
    expect(toggle?.getAttribute("aria-label")).toBe("Quiet hours");
    expect(toggle?.getAttribute("aria-checked")).toBe("false");
    expect(toggle?.dataset.state).toBe("off");
    expect(toggle?.textContent).toContain("00");
    expect(toggle?.textContent).toContain("OFF");
  });

  it("closes the circuit with one click and emits feedback once", () => {
    act(() => root.render(<StatefulToggle />));
    const toggle = container.querySelector<HTMLButtonElement>('[role="switch"]')!;

    act(() => toggle.click());

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.dataset.state).toBe("on");
    expect(toggle.textContent).toContain("01");
    expect(toggle.textContent).toContain("ON");
    expect(feedback.haptic).toHaveBeenCalledOnce();
    expect(feedback.haptic).toHaveBeenCalledWith(true);
    expect(feedback.sound).toHaveBeenCalledOnce();
  });

  it("does not change or emit feedback while disabled", () => {
    const onChange = vi.fn();
    act(() => root.render(<Toggle label="Cloud sync" on={false} onChange={onChange} disabled />));
    const toggle = container.querySelector<HTMLButtonElement>('[role="switch"]')!;

    act(() => toggle.click());

    expect(toggle.disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    expect(feedback.haptic).not.toHaveBeenCalled();
    expect(feedback.sound).not.toHaveBeenCalled();
  });
});
