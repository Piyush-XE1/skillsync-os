import { describe, it, expect } from "vitest";
import {
  applyOrder,
  autoScrollStep,
  clamp,
  hasDuplicatePositions,
  normalizePositions,
  reorder,
  resolveGridIndex,
  resolveListIndex,
  scopedPositions,
  slotCenter,
  slotShifts,
  type Slot,
} from "./drag-sort";

/** A uniform 60px-tall list, 12px gap. */
function uniformSlots(ids: string[], height = 60, gap = 12): Slot[] {
  return ids.map((id, i) => ({
    id,
    top: i * (height + gap),
    left: 0,
    width: 300,
    height,
  }));
}

describe("clamp", () => {
  it("bounds a value", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
    expect(clamp(Number.NaN, 2, 10)).toBe(2);
  });
});

describe("reorder", () => {
  it("moves an item and clamps out-of-range targets", () => {
    expect(reorder(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(reorder(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(reorder(["a", "b", "c"], 0, 99)).toEqual(["b", "c", "a"]);
    expect(reorder(["a", "b", "c"], 1, -9)).toEqual(["b", "a", "c"]);
  });

  it("is a no-op for the same index and never mutates", () => {
    const input = ["a", "b"];
    const out = reorder(input, 1, 1);
    expect(out).toEqual(input);
    expect(out).not.toBe(input);
  });
});

describe("slotCenter", () => {
  it("returns the middle of a slot", () => {
    expect(slotCenter({ id: "a", top: 10, left: 20, width: 100, height: 40 })).toEqual({
      x: 70,
      y: 30,
    });
  });
});

describe("resolveListIndex", () => {
  it("keeps the index while the pointer stays inside its own slot", () => {
    const slots = uniformSlots(["a", "b", "c", "d"]);
    expect(resolveListIndex(slots, "b", 0)).toBe(1);
    expect(resolveListIndex(slots, "b", 20)).toBe(1);
    expect(resolveListIndex(slots, "b", -20)).toBe(1);
  });

  it("advances one slot per row height (72px pitch here)", () => {
    const slots = uniformSlots(["a", "b", "c", "d"]);
    expect(resolveListIndex(slots, "a", 72)).toBe(1);
    expect(resolveListIndex(slots, "a", 144)).toBe(2);
    expect(resolveListIndex(slots, "a", 900)).toBe(3);
    expect(resolveListIndex(slots, "d", -72)).toBe(2);
    expect(resolveListIndex(slots, "d", -900)).toBe(0);
  });

  it("handles variable row heights without drifting", () => {
    // Rows: 40, 120, 40 — the middle row is a tall card.
    const slots: Slot[] = [
      { id: "a", top: 0, left: 0, width: 300, height: 40 },
      { id: "b", top: 52, left: 0, width: 300, height: 120 },
      { id: "c", top: 184, left: 0, width: 300, height: 40 },
    ];
    // Dragging "a" down past b's centre (112) requires 92px, not one row.
    expect(resolveListIndex(slots, "a", 90)).toBe(0);
    expect(resolveListIndex(slots, "a", 95)).toBe(1);
    // Dragging "c" up past b's centre needs -(184+20-112) = -92.
    expect(resolveListIndex(slots, "c", -90)).toBe(2);
    expect(resolveListIndex(slots, "c", -95)).toBe(1);
  });

  it("ignores unknown ids and single-item lists", () => {
    expect(resolveListIndex(uniformSlots(["a", "b"]), "zzz", 50)).toBe(-1);
    expect(resolveListIndex(uniformSlots(["a"]), "a", 500)).toBe(0);
  });
});

describe("resolveGridIndex", () => {
  const grid: Slot[] = [
    { id: "a", top: 0, left: 0, width: 100, height: 80 },
    { id: "b", top: 0, left: 112, width: 100, height: 80 },
    { id: "c", top: 92, left: 0, width: 100, height: 80 },
    { id: "d", top: 92, left: 112, width: 100, height: 80 },
  ];

  it("follows the pointer horizontally and vertically", () => {
    expect(resolveGridIndex(grid, "a", 0, 0)).toBe(0);
    expect(resolveGridIndex(grid, "a", 112, 0)).toBe(1);
    expect(resolveGridIndex(grid, "a", 0, 92)).toBe(2);
    expect(resolveGridIndex(grid, "a", 112, 92)).toBe(3);
  });

  it("picks the nearest centre, not the first overlap", () => {
    expect(resolveGridIndex(grid, "a", 60, 0)).toBe(1);
    expect(resolveGridIndex(grid, "a", 50, 0)).toBe(0);
  });
});

describe("slotShifts", () => {
  it("shifts the items between the two indices by one slot", () => {
    const slots = uniformSlots(["a", "b", "c", "d"]);
    const shifts = slotShifts(slots, 0, 2);
    expect(shifts.get("a")).toBeUndefined();
    expect(shifts.get("b")).toEqual({ x: 0, y: -72 });
    expect(shifts.get("c")).toEqual({ x: 0, y: -72 });
    expect(shifts.get("d")).toBeUndefined();
  });

  it("mirrors the shift when dragging upwards", () => {
    const slots = uniformSlots(["a", "b", "c", "d"]);
    const shifts = slotShifts(slots, 3, 1);
    expect(shifts.get("b")).toEqual({ x: 0, y: 72 });
    expect(shifts.get("c")).toEqual({ x: 0, y: 72 });
    expect(shifts.get("a")).toBeUndefined();
  });

  it("returns empty offsets for a no-op drag and for grids uses both axes", () => {
    const slots = uniformSlots(["a", "b"]);
    expect(slotShifts(slots, 1, 1).size).toBe(0);
    const grid: Slot[] = [
      { id: "a", top: 0, left: 0, width: 100, height: 80 },
      { id: "b", top: 0, left: 112, width: 100, height: 80 },
    ];
    expect(slotShifts(grid, 0, 1).get("b")).toEqual({ x: -112, y: 0 });
  });
});

describe("autoScrollStep", () => {
  it("is zero away from the edges", () => {
    expect(autoScrollStep(400, 0, 800)).toBe(0);
  });

  it("ramps faster the deeper into the edge zone the pointer goes", () => {
    const gentle = Math.abs(autoScrollStep(760, 0, 800, 88, 22));
    const deep = Math.abs(autoScrollStep(795, 0, 800, 88, 22));
    expect(gentle).toBeGreaterThan(0);
    expect(deep).toBeGreaterThan(gentle);
    expect(deep).toBeLessThanOrEqual(22);
  });

  it("scrolls up above the top edge and down below the bottom edge", () => {
    expect(autoScrollStep(20, 0, 800)).toBeLessThan(0);
    expect(autoScrollStep(780, 0, 800)).toBeGreaterThan(0);
  });

  it("disables itself with a zero edge", () => {
    expect(autoScrollStep(5, 0, 800, 0)).toBe(0);
  });
});

describe("position bookkeeping", () => {
  type Row = { id: string; position?: number; at?: number };
  const rows = (positions: number[]): Row[] =>
    positions.map((position, i) => ({ id: `t${i}`, position, at: 1000 - i }));

  it("detects duplicate positions", () => {
    expect(hasDuplicatePositions(rows([0, 1, 2]))).toBe(false);
    expect(hasDuplicatePositions(rows([0, 0, 2]))).toBe(true);
    expect(hasDuplicatePositions(rows([1, undefined as unknown as number, 1]))).toBe(true);
  });

  it("normalises duplicates while keeping the visual order", () => {
    const legacy: Row[] = [
      { id: "a", position: 5, at: 10 },
      { id: "b", position: 5, at: 30 },
      { id: "c", position: 1, at: 20 },
    ];
    const out = normalizePositions(legacy);
    // position 1 first, then the position-5 pair ordered newest-first.
    expect(out.map((r) => r.position)).toEqual([2, 1, 0]);
    expect(out.find((r) => r.id === "b")?.position).toBe(1);
    expect(out.find((r) => r.id === "a")?.position).toBe(2);
    expect(out.find((r) => r.id === "c")?.position).toBe(0);
  });

  it("reuses only the positions the dragged ids already owned", () => {
    const all: Row[] = rows([10, 20, 30, 40]);
    const out = scopedPositions(all, ["t2", "t0", "t1", "t3"]);
    expect(out.map((r) => `${r.id}:${r.position}`)).toEqual(["t0:20", "t1:30", "t2:10", "t3:40"]);
  });

  it("leaves records outside the dragged scope untouched", () => {
    const all: Row[] = rows([10, 20, 30, 40, 50]);
    // Only the filtered subset (t1, t3) is reordered; t0/t2/t4 keep their slots.
    const out = scopedPositions(all, ["t3", "t1"]);
    expect(out.map((r) => r.position)).toEqual([10, 40, 30, 20, 50]);
  });

  it("ignores a scope of fewer than two ids", () => {
    const all = rows([10, 20]);
    expect(scopedPositions(all, ["t0"])).toBe(all);
    expect(scopedPositions(all, [])).toBe(all);
  });

  it("applyOrder repairs duplicate legacy positions first", () => {
    const legacy: Row[] = [
      { id: "a", position: 0, at: 3 },
      { id: "b", position: 0, at: 2 },
      { id: "c", position: 0, at: 1 },
    ];
    const out = applyOrder(legacy, ["c", "b", "a"]);
    const byId = new Map(out.map((r) => [r.id, r.position as number]));
    expect(byId.get("c")).toBeLessThan(byId.get("b") as number);
    expect(byId.get("b")).toBeLessThan(byId.get("a") as number);
  });

  it("applyOrder is stable when nothing moved", () => {
    const all = rows([10, 20, 30]);
    const out = applyOrder(all, ["t0", "t1", "t2"]);
    expect(out).toEqual(all);
  });
});
