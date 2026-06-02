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
    const first = createDefaultRegion([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 50 }]);
    const second = createDefaultRegion([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 40 }]);
    first.points[0].x = 999;
    expect(second.points[0].x).toBe(0);
    expect(first.writingMode).toBe("horizontal");
    expect(first.fontWeight).toBe(700);
    expect(first.lineSpacing).toBe(-4);
    expect(first.letterSpacing).toBe(-2);
    expect(first.repeatFill).toBe(true);
  });
});
