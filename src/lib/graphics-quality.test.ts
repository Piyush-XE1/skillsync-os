import { describe, expect, it } from "vitest";
import { shouldUseBatterySaver } from "@/lib/graphics-quality";

describe("graphics quality mode", () => {
  it("automatically chooses matte mode on low-core or reduced-motion devices", () => {
    expect(shouldUseBatterySaver("automatic", 4, false)).toBe(true);
    expect(shouldUseBatterySaver("automatic", 8, true)).toBe(true);
    expect(shouldUseBatterySaver("automatic", 8, false)).toBe(false);
  });

  it("honors explicit quality except that reduced motion always wins", () => {
    expect(shouldUseBatterySaver("battery-saver", 8, false)).toBe(true);
    expect(shouldUseBatterySaver("high-fidelity", 2, false)).toBe(false);
    expect(shouldUseBatterySaver("high-fidelity", 8, true)).toBe(true);
  });
});
