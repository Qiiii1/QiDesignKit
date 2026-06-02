import { describe, expect, it } from "vitest";
import { createDefaultDocument, createDefaultRegion, validateCanvasDimension } from "./defaults";

describe("domain defaults", () => {
  it("starts with a visible-contour solid canvas", () => {
    expect(createDefaultDocument()).toMatchObject({
      background: { kind: "solid", width: 1200, height: 1200, color: "#ffffff" },
      regions: [],
      showContours: true,
    });
  });

  it.each([
    ["63", false],
    ["64", true],
    ["4096", true],
    ["4097", false],
    ["12.5", false],
  ])("validates solid canvas dimension %s", (value, valid) => {
    expect(validateCanvasDimension(value)).toBe(valid);
  });

  it("creates independent default region data", () => {
    const sourcePoints = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 50 }];
    const region = createDefaultRegion(sourcePoints);
    region.points[0].x = 999;
    expect(sourcePoints[0].x).toBe(0);
    expect(region.writingMode).toBe("horizontal");
    expect(region.fontWeight).toBe(700);
    expect(region.lineSpacing).toBe(-8);
    expect(region.letterSpacing).toBe(-4);
    expect(region.padding).toBe(4);
    expect(region.maxWords).toBe(1200);
    expect(region.fillColor).toBe("transparent");
    expect(region.repeatFill).toBe(true);
    expect(region.showContour).toBe(true);
  });
});
