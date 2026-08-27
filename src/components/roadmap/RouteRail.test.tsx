import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PhaseNode, RouteStart, RouteFinish, RoutePathPreview } from "./RouteRail";

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("Roadmap route visual primitives", () => {
  it("renders a done phase node with a gradient + check", () => {
    const html = renderToStaticMarkup(<PhaseNode pct={100} position={1} color="#7c3aed" />);
    expect(html).toContain("rounded-full");
    // Only renderable once the component renders; assert it contains the check glyph
    expect(html).toContain("lucide-check");
    expect(html.length).toBeGreaterThan(0);
  });

  it("renders an in-flight phase node with its position number", () => {
    const html = renderToStaticMarkup(<PhaseNode pct={50} position={2} color="#2563eb" />);
    expect(html).toContain("2");
  });

  it("renders an upcoming (not started) phase node", () => {
    const html = renderToStaticMarkup(<PhaseNode pct={0} position={3} color="#2563eb" />);
    expect(html).toContain("3");
  });

  it("renders the start marker rocket and finish flag", () => {
    const start = renderToStaticMarkup(<RouteStart color="#7c3aed" />);
    const finish = renderToStaticMarkup(<RouteFinish color="#7c3aed" done={false} />);
    expect(start).toContain("lucide-rocket");
    expect(start).toContain("Start");
    expect(finish).toContain("lucide-flag");
    expect(finish).toContain("Destination");
  });

  it("labels the finish as roadmap complete when done", () => {
    const html = renderToStaticMarkup(
      <RouteFinish color="#7c3aed" done={true} label="Roadmap complete" />,
    );
    expect(html).toContain("Roadmap complete");
  });

  it("renders one dot per phase in the compact course map", () => {
    const phases = [
      { id: "a", done: true },
      { id: "b", done: false, pct: 30 },
      { id: "c", done: false, pct: 0 },
    ];
    const html = renderToStaticMarkup(<RoutePathPreview phases={phases} color="#7c3aed" />);
    // exactly three check-able nodes; done one shows a check
    expect(html).toContain("lucide-check");
    expect(count(html, "h-3.5")).toBe(3);
  });

  it("caps the course map and shows a remainder marker", () => {
    const phases = Array.from({ length: 9 }, (_, i) => ({ id: String(i), done: false, pct: 0 }));
    const html = renderToStaticMarkup(<RoutePathPreview phases={phases} color="#7c3aed" max={6} />);
    expect(count(html, "h-3.5")).toBe(6);
    expect(html).toContain("3"); // hidden count
  });

  it("renders a 'not started' placeholder for a charted journey with no phases", () => {
    const html = renderToStaticMarkup(<RoutePathPreview phases={[]} color="#7c3aed" />);
    expect(html).toContain("Not started");
  });
});
