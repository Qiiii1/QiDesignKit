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
    clip: () => calls.push("clip"),
    stroke: () => calls.push("contour"),
    arc: () => calls.push("node"),
    fill: () => calls.push("region-fill"),
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
    expect(calls).toContain("clip");
    expect(calls.indexOf("clip")).toBeLessThan(calls.indexOf("text"));
    expect(calls.indexOf("text")).toBeLessThan(calls.indexOf("contour"));
    expect(calls).toContain("node");
  });

  it("ignores a legacy document-level contour switch", () => {
    const calls: string[] = [];
    const context = createRecordingContext(calls);
    const region = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 200 },
    ]);
    const legacyDocument = {
      ...createDefaultDocument(),
      regions: [region],
      showContours: false,
    };

    renderDocument(
      context,
      legacyDocument,
      { scale: 1, editorMode: false },
    );

    expect(calls).toContain("contour");
  });

  it("omits a contour when its region switch is off", () => {
    const calls: string[] = [];
    const context = createRecordingContext(calls);
    const region = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 200 },
    ], { showContour: false });

    renderDocument(
      context,
      { ...createDefaultDocument(), regions: [region] },
      { scale: 1, editorMode: false },
    );

    expect(calls).not.toContain("contour");
  });

  it("keeps contours visible for older saved regions without a local switch", () => {
    const calls: string[] = [];
    const context = createRecordingContext(calls);
    const region = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 200 },
    ]) as Partial<ReturnType<typeof createDefaultRegion>>;
    delete region.showContour;

    renderDocument(
      context,
      { ...createDefaultDocument(), regions: [region as ReturnType<typeof createDefaultRegion>] },
      { scale: 1, editorMode: false },
    );

    expect(calls).toContain("contour");
  });

  it("draws an optional region fill before clipped text", () => {
    const calls: string[] = [];
    const context = createRecordingContext(calls);
    const region = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 240, y: 0 },
      { x: 240, y: 240 },
      { x: 0, y: 240 },
    ], { fillColor: "#f3dfd3", padding: 0, fontSize: 20 });

    renderDocument(
      context,
      { ...createDefaultDocument(), regions: [region] },
      { scale: 1, editorMode: false },
    );

    expect(calls).toContain("region-fill");
    expect(calls.indexOf("region-fill")).toBeLessThan(calls.indexOf("clip"));
    expect(calls.indexOf("clip")).toBeLessThan(calls.indexOf("text"));
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
