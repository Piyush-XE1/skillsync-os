import { describe, it, expect } from "vitest";
import {
  WIDGET_DEFINITIONS,
  WIDGET_IDS,
  WIDGET_SPAN_CLASS,
  applyWidgetOrder,
  availableWidgets,
  defaultWidgetLayout,
  isWidgetId,
  isWidgetSize,
  moveWidget,
  nextWidgetSize,
  normalizeWidgetLayout,
  resetWidgetLayout,
  setWidgetSize,
  setWidgetVisible,
  visibleWidgets,
  type WidgetPlacement,
} from "./widgets";

const ALL_MODULES = {
  attendance: true,
  expenses: true,
  focus: true,
  cgpa: true,
  resume: true,
  coding: true,
  career: true,
};
const NO_MODULES = {
  attendance: false,
  expenses: false,
  focus: false,
  cgpa: false,
  resume: false,
  coding: false,
  career: false,
};

const ids = (layout: WidgetPlacement[]) => layout.map((entry) => entry.id);

describe("catalogue", () => {
  it("has a unique, self-consistent definition per id", () => {
    expect(new Set(WIDGET_IDS).size).toBe(WIDGET_IDS.length);
    expect(WIDGET_DEFINITIONS.length).toBe(WIDGET_IDS.length);
    for (const def of WIDGET_DEFINITIONS) {
      expect(isWidgetId(def.id)).toBe(true);
      expect(def.title.length).toBeGreaterThan(0);
      expect(def.hint.length).toBeGreaterThan(0);
      expect(def.sizes.length).toBeGreaterThan(0);
      expect(def.sizes).toContain(def.defaultSize);
      expect(isWidgetSize(def.defaultSize)).toBe(true);
    }
  });

  it("gates module widgets behind their module flag", () => {
    expect(availableWidgets(NO_MODULES).some((d) => d.id === "expenses")).toBe(false);
    expect(availableWidgets(ALL_MODULES).some((d) => d.id === "expenses")).toBe(true);
    expect(availableWidgets(NO_MODULES).every((d) => !d.module)).toBe(true);
  });

  it("maps every size to a grid span", () => {
    expect(Object.keys(WIDGET_SPAN_CLASS).sort()).toEqual(["full", "tile", "wide"]);
  });
});

describe("normalizeWidgetLayout", () => {
  it("returns the shipped layout for empty or junk input", () => {
    expect(ids(normalizeWidgetLayout(undefined))).toEqual(ids(defaultWidgetLayout()));
    expect(normalizeWidgetLayout([])).toEqual(defaultWidgetLayout());
    expect(normalizeWidgetLayout("nope")).toEqual(defaultWidgetLayout());
    expect(normalizeWidgetLayout([null, 3, {}])).toEqual(defaultWidgetLayout());
  });

  it("drops unknown and duplicate ids", () => {
    const out = normalizeWidgetLayout([
      { id: "streak", size: "tile", visible: true },
      { id: "streak", size: "wide", visible: false },
      { id: "hacker", size: "tile", visible: true },
    ]);
    expect(out.filter((e) => e.id === "streak")).toHaveLength(1);
    expect(out.some((e) => e.id === ("hacker" as never))).toBe(false);
    expect(ids(out)).toEqual(ids(defaultWidgetLayout()));
  });

  it("keeps a user's order, sizes and visibility", () => {
    const custom: WidgetPlacement[] = [
      { id: "quote", size: "full", visible: true },
      { id: "streak", size: "wide", visible: false },
    ];
    const out = normalizeWidgetLayout(custom);
    expect(out[0]).toEqual({ id: "quote", size: "full", visible: true });
    expect(out[1]).toEqual({ id: "streak", size: "wide", visible: false });
    // …and appends everything the layout had never seen.
    expect(out.length).toBe(WIDGET_IDS.length);
    expect(out.some((e) => e.id === "xp")).toBe(true);
  });

  it("snaps an illegal size back to the widget default", () => {
    // "today" only offers wide/full.
    const out = normalizeWidgetLayout([{ id: "today", size: "tile", visible: true }]);
    expect(out.find((e) => e.id === "today")?.size).toBe("wide");
  });
});

describe("visibleWidgets", () => {
  it("hides widgets whose module is switched off", () => {
    const layout = defaultWidgetLayout().map((e) => ({ ...e, visible: true }));
    const shown = ids(visibleWidgets(layout, NO_MODULES));
    expect(shown).not.toContain("expenses");
    expect(shown).not.toContain("focusToday");
    expect(shown).not.toContain("solved");
    expect(shown).toContain("streak");
  });

  it("respects per-widget visibility", () => {
    const layout = setWidgetVisible(defaultWidgetLayout(), "streak", false);
    expect(ids(visibleWidgets(layout, ALL_MODULES))).not.toContain("streak");
  });

  it("keeps the user's order", () => {
    const layout = moveWidget(defaultWidgetLayout(), "quote", 0);
    expect(ids(visibleWidgets(layout, ALL_MODULES))[0]).toBe("quote");
  });
});

describe("setWidgetVisible / setWidgetSize", () => {
  it("toggles visibility without reordering", () => {
    const before = ids(defaultWidgetLayout());
    const after = setWidgetVisible(defaultWidgetLayout(), "notes", false);
    expect(ids(after)).toEqual(before);
    expect(after.find((e) => e.id === "notes")?.visible).toBe(false);
    expect(setWidgetVisible(after, "notes", true).find((e) => e.id === "notes")?.visible).toBe(
      true,
    );
  });

  it("resizes within the allowed sizes only", () => {
    const wide = setWidgetSize(defaultWidgetLayout(), "streak", "wide");
    expect(wide.find((e) => e.id === "streak")?.size).toBe("wide");
    const illegal = setWidgetSize(wide, "streak", "full");
    expect(illegal.find((e) => e.id === "streak")?.size).toBe("tile");
  });

  it("cycles sizes", () => {
    expect(nextWidgetSize("streak", "tile")).toBe("wide");
    expect(nextWidgetSize("streak", "wide")).toBe("tile");
    expect(nextWidgetSize("today", "wide")).toBe("full");
    expect(nextWidgetSize("today", "full")).toBe("wide");
  });
});

describe("moveWidget", () => {
  it("moves to an absolute index and clamps", () => {
    const out = moveWidget(defaultWidgetLayout(), "quote", 0);
    expect(ids(out)[0]).toBe("quote");
    expect(moveWidget(defaultWidgetLayout(), "quote", 999).at(-1)?.id).toBe("quote");
    expect(moveWidget(defaultWidgetLayout(), "quote", -5)[0].id).toBe("quote");
  });

  it("ignores unknown ids", () => {
    const layout = defaultWidgetLayout();
    expect(ids(moveWidget(layout, "nope" as never, 0))).toEqual(ids(layout));
  });
});

describe("applyWidgetOrder", () => {
  it("permutes only the dragged subset, in the slots it already owned", () => {
    const layout = normalizeWidgetLayout([
      { id: "streak", size: "tile", visible: true },
      { id: "cgpa", size: "tile", visible: false },
      { id: "xp", size: "tile", visible: true },
      { id: "quote", size: "wide", visible: true },
    ]);
    // streak(0) · cgpa(1, hidden) · xp(2) · quote(3) · …defaults
    const out = applyWidgetOrder(layout, ["quote", "streak", "xp"]);
    expect(ids(out).slice(0, 4)).toEqual(["quote", "cgpa", "streak", "xp"]);
    // Everything outside the dragged subset keeps its slot.
    expect(out.slice(4)).toEqual(layout.slice(4));
    expect(out.length).toBe(layout.length);
  });

  it("is a no-op for a single id or an empty scope", () => {
    const layout = defaultWidgetLayout();
    expect(applyWidgetOrder(layout, ["xp"])).toEqual(layout);
    expect(applyWidgetOrder(layout, [])).toEqual(layout);
  });

  it("ignores ids that are not in the layout", () => {
    const layout = defaultWidgetLayout();
    // "ghost" is dropped, the two real ids still swap cleanly.
    const out = applyWidgetOrder(layout, ["xp", "ghost", "streak"]);
    expect(ids(out).slice(0, 2)).toEqual(["xp", "streak"]);
    expect(out.length).toBe(layout.length);
    expect(new Set(ids(out)).size).toBe(out.length);
  });
});

describe("resetWidgetLayout", () => {
  it("restores the shipped dashboard", () => {
    const messed = setWidgetVisible(moveWidget(defaultWidgetLayout(), "notes", 0), "streak", false);
    expect(resetWidgetLayout()).toEqual(defaultWidgetLayout());
    expect(messed).not.toEqual(defaultWidgetLayout());
  });
});
