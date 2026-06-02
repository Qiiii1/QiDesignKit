import { describe, expect, it, vi } from "vitest";
import {
  createDefaultDocument,
  createDefaultRegion,
} from "../domain/defaults";
import { renderDocument } from "./renderDocument";

function createRecordingContext(calls: string[]) {
  return {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    scale: () => calls.push("scale"),
    fillRect: () => calls.push("background"),
    beginPath: () => calls.push("begin"),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: () => calls.push("contour"),
    arc: () => calls.push("node"),
    fill: vi.fn(),
    fillText: () => calls.push("text"),
    measureText: (text: string) => ({ width: text.length * 10 }),
  } as unknown as CanvasRenderingContext2D;
}

describe("renderDocument", () => {
  it("draws background, text, contour, and editor-only nodes in order", () => {
    const calls: string[] = [];
    const context = createRecordingContext(calls);
    const region = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 240, y: 0 },
      { x: 240, y: 240 },
      { x: 0, y: 240 },
    ], { padding: 0, fontSize: 20 });

    renderDocument(
      context,
      { ...createDefaultDocument(), regions: [region] },
      { scale: 1, editorMode: true, selectedRegionId: region.id },
    );

    expect(calls.indexOf("background")).toBeLessThan(calls.indexOf("text"));
    expect(calls.indexOf("text")).toBeLessThan(calls.indexOf("contour"));
    expect(calls).toContain("node");
  });

  it("omits contours when the global contour switch is off", () => {
    const calls: string[] = [];
    const context = createRecordingContext(calls);
    const region = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 200 },
    ]);

    renderDocument(
      context,
      { ...createDefaultDocument(), regions: [region], showContours: false },
      { scale: 1, editorMode: false },
    );

    expect(calls).not.toContain("contour");
  });

  it("omits selected nodes outside editor mode", () => {
    const calls: string[] = [];
    const context = createRecordingContext(calls);
    const region = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 200 },
    ]);

    renderDocument(
      context,
      { ...createDefaultDocument(), regions: [region] },
      { scale: 1, editorMode: false, selectedRegionId: region.id },
    );

    expect(calls).not.toContain("node");
  });
});
