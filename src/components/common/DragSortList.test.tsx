// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import { DragSortList, DragHandle } from "./DragSortList";

/**
 * jsdom has no layout engine, so every measurement is faked from the element's
 * `data-sort-row` index: 60px tall rows, no gap. That is enough for the pure
 * geometry in `@/lib/drag-sort` to drive a real drag.
 */
const ROW = 60;

function installFakeLayout() {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const id = this.getAttribute?.("data-sort-row");
    const index = id ? (ROW_INDEX.get(id) ?? -1) : -1;
    if (index < 0) {
      return {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON() {},
      } as DOMRect;
    }
    const top = index * ROW;
    return {
      top,
      left: 0,
      width: 300,
      height: ROW,
      right: 300,
      bottom: top + ROW,
      x: 0,
      y: top,
      toJSON() {},
    } as DOMRect;
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

const ROW_INDEX = new Map<string, number>();

type Item = { id: string; title: string };
const ITEMS: Item[] = [
  { id: "a", title: "Alpha" },
  { id: "b", title: "Beta" },
  { id: "c", title: "Gamma" },
];
const ITEMS_ALL = ITEMS;
ITEMS.forEach((item, index) => ROW_INDEX.set(item.id, index));

function List({
  items = ITEMS,
  onReorder,
  disabled = false,
}: {
  items?: Item[];
  onReorder?: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <DragSortList
      items={items}
      disabled={disabled}
      onReorder={onReorder ?? (() => {})}
      itemLabel={(item) => item.title}
      renderItem={({ item, index, dragging, setNodeRef, rowProps, handleProps }) => (
        <div ref={setNodeRef} {...rowProps} data-testid={`row-${item.id}`}>
          <span>
            {index + 1}. {item.title}
          </span>
          <DragHandle {...handleProps} active={dragging} data-testid={`handle-${item.id}`} />
        </div>
      )}
    />
  );
}

/** Ids currently in the DOM, top to bottom. */
function rowIds(): (string | null)[] {
  return Array.from(container0.querySelectorAll("[data-sort-row]")).map((r) =>
    r.getAttribute("data-sort-row"),
  );
}

// Set in beforeEach; keeps the helper above terse.
let container0: HTMLElement;

async function key(el: Element | null, k: string) {
  if (!el) throw new Error("no element");
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}

function pointerEvent(type: string, clientY: number, extra: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    buttons: 1,
    clientX: 20,
    clientY,
    ...extra,
  });
}

describe("DragSortList", () => {
  let root: Root;
  let container: HTMLDivElement;
  let restore: () => void;

  beforeEach(() => {
    restore = installFakeLayout();
    container = document.createElement("div");
    container0 = container;
    document.body.appendChild(container);
    root = createRoot(container);
    // jsdom lacks the pointer-capture API; the component degrades gracefully
    // but the stub keeps the console quiet.
    (Element.prototype as unknown as { setPointerCapture?: unknown }).setPointerCapture ??=
      function () {};
    (Element.prototype as unknown as { releasePointerCapture?: unknown }).releasePointerCapture ??=
      function () {};
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    restore();
    vi.restoreAllMocks();
  });

  it("renders every item with a keyboard-operable grip", async () => {
    await act(async () => {
      root.render(<List />);
    });
    expect(container.querySelectorAll("[data-sort-row]").length).toBe(3);
    const handle = container.querySelector('[data-testid="handle-b"]');
    expect(handle?.getAttribute("role")).toBe("button");
    expect(handle?.getAttribute("tabindex")).toBe("0");
    expect(handle?.getAttribute("aria-label")).toContain("Reorder Beta");
    expect(handle?.getAttribute("aria-roledescription")).toBe("Draggable item");
  });

  it("reorders with the keyboard: Space lifts, arrows move, Space drops", async () => {
    const onReorder = vi.fn();
    await act(async () => {
      root.render(<List onReorder={onReorder} />);
    });

    const handle = container.querySelector('[data-testid="handle-a"]');
    await key(handle, " ");
    // Lifted: the live region announces the pick-up.
    expect(container.querySelector("[aria-live]")?.textContent).toContain("Alpha picked up");

    await key(handle, "ArrowDown");
    expect(container.querySelector("[aria-live]")?.textContent).toContain("Position 2 of 3");

    await key(handle, " ");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder.mock.calls[0][0]).toEqual(["b", "a", "c"]);
    // The list is controlled: this parent ignores the new order, so the rows
    // fall back to the source of truth — but never with leftover transforms.
    for (const row of Array.from(container.querySelectorAll("[data-sort-row]"))) {
      expect((row as HTMLElement).style.transform).toBe("");
      expect((row as HTMLElement).style.transition).toBe("");
    }
  });

  it("Escape cancels a keyboard lift without committing", async () => {
    const onReorder = vi.fn();
    await act(async () => {
      root.render(<List onReorder={onReorder} />);
    });
    const handle = container.querySelector('[data-testid="handle-a"]');
    await key(handle, " ");
    await key(handle, "ArrowDown");
    await key(handle, "Escape");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(onReorder).not.toHaveBeenCalled();
    expect(container.querySelector("[aria-live]")?.textContent).toContain("cancelled");
  });

  it("Home/End jump to the edges", async () => {
    const onReorder = vi.fn();
    await act(async () => {
      root.render(<List onReorder={onReorder} />);
    });
    const handle = container.querySelector('[data-testid="handle-a"]');
    await key(handle, " ");
    await key(handle, "End");
    await key(handle, " ");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(onReorder.mock.calls[0][0]).toEqual(["b", "c", "a"]);
  });

  it("does not arm the keyboard lift while disabled", async () => {
    const onReorder = vi.fn();
    await act(async () => {
      root.render(<List onReorder={onReorder} disabled />);
    });
    const handle = container.querySelector('[data-testid="handle-a"]');
    expect(handle?.getAttribute("tabindex")).toBe("-1");
    await key(handle, " ");
    await key(handle, "ArrowDown");
    expect(onReorder).not.toHaveBeenCalled();
    expect(container.querySelector("[aria-live]")?.textContent).toBe("");
  });

  it("drags with a pointer: lift, follow, settle and commit", async () => {
    const onReorder = vi.fn();
    await act(async () => {
      root.render(<List onReorder={onReorder} />);
    });

    const handle = container.querySelector('[data-testid="handle-a"]') as HTMLElement;
    const rowA = container.querySelector('[data-testid="row-a"]') as HTMLElement;

    // Press the grip and hold past the mouse delay → lifted.
    await act(async () => {
      handle.dispatchEvent(pointerEvent("pointerdown", 150));
      await new Promise((r) => setTimeout(r, 160));
    });
    expect(container.querySelector("[aria-live]")?.textContent).toContain("Alpha picked up");

    // Drag one row down; the rAF loop resolves the new index.
    await act(async () => {
      window.dispatchEvent(pointerEvent("pointermove", 220));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(rowA.style.transform).toContain("translate3d");
    expect(rowA.style.transform).toContain("70px");
    expect(container.querySelector("[aria-live]")?.textContent).toContain("Position 2 of 3");

    // Release → settle, then the new order is committed.
    await act(async () => {
      window.dispatchEvent(pointerEvent("pointerup", 220));
      await new Promise((r) => setTimeout(r, 260));
    });
    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder.mock.calls[0][0]).toEqual(["b", "a", "c"]);
    expect(rowA.style.transform).toBe("");
  });

  it("treats a finger that slides before the long press as a scroll", async () => {
    const onReorder = vi.fn();
    await act(async () => {
      root.render(<List onReorder={onReorder} />);
    });
    const row = container.querySelector('[data-testid="row-a"]') as HTMLElement;
    await act(async () => {
      row.dispatchEvent(pointerEvent("pointerdown", 150, { pointerType: "touch" }));
      // A touch that travels before the long-press fires must not lift.
      window.dispatchEvent(pointerEvent("pointermove", 260, { pointerType: "touch" }));
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(container.querySelector("[aria-live]")?.textContent).toBe("");
    await act(async () => {
      window.dispatchEvent(pointerEvent("pointerup", 260, { pointerType: "touch" }));
    });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("keeps a brand-new record when the store owns the order", async () => {
    function Harness() {
      const [items, setItems] = useState<Item[]>(ITEMS);
      return (
        <>
          <List
            items={items}
            onReorder={(ids) => {
              const byId = new Map(ITEMS_ALL.map((i) => [i.id, i]));
              setItems(ids.map((id) => byId.get(id)!).filter(Boolean));
            }}
          />
          <button
            data-testid="add"
            onClick={() => setItems((prev) => [...prev, { id: "d", title: "Delta" }])}
          >
            add
          </button>
        </>
      );
    }

    ROW_INDEX.set("d", 3);
    await act(async () => {
      root.render(<Harness />);
    });

    // Reorder a → position 2, then add a record afterwards.
    const handle = container.querySelector('[data-testid="handle-a"]');
    await key(handle, " ");
    await key(handle, "ArrowDown");
    await key(handle, " ");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(rowIds()).toEqual(["b", "a", "c"]);

    await act(async () => {
      (container.querySelector('[data-testid="add"]') as HTMLElement).click();
    });
    // The old bug: a record added after a reorder never appeared, because the
    // in-flight local order didn't know about it.
    expect(rowIds()).toEqual(["b", "a", "c", "d"]);
  });
});
