import { describe, expect, it } from "vitest";
import type { LayoutOptions } from "./layout";
import { layoutTextInPolygon } from "./layout";

describe("polygon text layout", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 120, y: 0 },
    { x: 120, y: 120 },
    { x: 0, y: 120 },
  ];

  const createOptions = (
    overrides: Partial<LayoutOptions> = {},
  ): LayoutOptions => ({
    mode: "horizontal",
    fontSize: 10,
    lineSpacing: 0,
    letterSpacing: 0,
    padding: 0,
    measure: (text) => text.length * 10,
    ...overrides,
  });

  it("places horizontal text from left to right", () => {
    expect(
      layoutTextInPolygon(square, ["明", "月", "光"], createOptions()),
    ).toEqual([
      { text: "明", x: 0, y: 10 },
      { text: "月", x: 10, y: 10 },
      { text: "光", x: 20, y: 10 },
    ]);
  });

  it("places vertical text top to bottom before advancing leftward", () => {
    const placed = layoutTextInPolygon(
      square,
      Array.from({ length: 13 }, () => "明"),
      createOptions({ mode: "vertical" }),
    );

    expect(placed[0]).toEqual({ text: "明", x: 110, y: 10 });
    expect(placed[1]).toEqual({ text: "明", x: 110, y: 20 });
    expect(placed.at(-1)?.x).toBeLessThan(placed[0].x);
  });

  it("uses negative letter spacing for denser horizontal sculpture", () => {
    const loose = layoutTextInPolygon(
      square,
      ["明", "月"],
      createOptions({ letterSpacing: 4 }),
    );
    const dense = layoutTextInPolygon(
      square,
      ["明", "月"],
      createOptions({ letterSpacing: -8 }),
    );

    expect(dense[1].x - dense[0].x).toBeLessThan(loose[1].x - loose[0].x);
  });

  it("keeps placements within padded polygon segments", () => {
    const placed = layoutTextInPolygon(
      square,
      Array.from({ length: 30 }, () => "明"),
      createOptions({ padding: 10 }),
    );

    expect(placed.length).toBeGreaterThan(0);
    expect(placed.every(({ x, y }) => x >= 10 && x + 10 <= 110 && y <= 110))
      .toBe(true);
    expect(placed[0].y).toBe(20);
  });

  it("terminates with extreme negative spacing", () => {
    const units = Array.from({ length: 500 }, () => "明");
    const placed = layoutTextInPolygon(
      square,
      units,
      createOptions({ lineSpacing: -1000, letterSpacing: -1000 }),
    );

    expect(placed.length).toBeLessThanOrEqual(units.length);
    expect(
      placed.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
    ).toBe(true);
  });

  it("rejects an invalid font size and polygons without bounds", () => {
    expect(layoutTextInPolygon(square, ["明"], createOptions({ fontSize: 0 })))
      .toEqual([]);
    expect(layoutTextInPolygon([], ["明"], createOptions())).toEqual([]);
  });

  it("skips units with non-finite horizontal measurements", () => {
    expect(
      layoutTextInPolygon(
        square,
        ["bad", "明"],
        createOptions({
          measure: (text) => text === "bad" ? Number.NaN : 10,
        }),
      ),
    ).toEqual([{ text: "明", x: 0, y: 10 }]);
  });

  it("skips units with non-positive horizontal measurements", () => {
    expect(
      layoutTextInPolygon(
        square,
        ["zero", "negative", "明"],
        createOptions({
          measure: (text) => {
            if (text === "zero") {
              return 0;
            }
            return text === "negative" ? -10 : 10;
          },
        }),
      ),
    ).toEqual([{ text: "明", x: 0, y: 10 }]);
  });

  it("uses clipped later scanlines to fill narrowing polygons", () => {
    const wideningTriangle = [
      { x: 10, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ];

    expect(
      layoutTextInPolygon(wideningTriangle, ["明"], createOptions()),
    ).toEqual([{ text: "明", x: 2.5, y: 20 }]);
  });

  it("fills tapered shoulders when the glyph centerline fits", () => {
    const triangle = [
      { x: 15, y: 0 },
      { x: 30, y: 20 },
      { x: 0, y: 20 },
    ];

    expect(
      layoutTextInPolygon(
        triangle,
        ["明"],
        createOptions({ measure: () => 5 }),
      ),
    ).toEqual([{ text: "明", x: 11.25, y: 10 }]);
  });

  it("moves wide vertical words left until their glyph box fits", () => {
    expect(
      layoutTextInPolygon(
        square,
        ["hello"],
        createOptions({
          mode: "vertical",
          measure: (text) => text === "hello" ? 50 : 10,
        }),
      ),
    ).toEqual([{ text: "hello", x: 70, y: 10 }]);
  });

  it("stops scanning when huge coordinates prevent forward progress", () => {
    const origin = 1e20;
    const hugeSquare = [
      { x: origin, y: origin },
      { x: origin + 1e10, y: origin },
      { x: origin + 1e10, y: origin + 1e10 },
      { x: origin, y: origin + 1e10 },
    ];
    let measurements = 0;

    expect(
      layoutTextInPolygon(
        hugeSquare,
        ["too-wide"],
        createOptions({
          measure: () => {
            measurements += 1;
            if (measurements > 10_000) {
              throw new Error("scanline iteration guard exceeded");
            }
            return Number.MAX_VALUE;
          },
        }),
      ),
    ).toEqual([]);
    expect(measurements).toBeLessThanOrEqual(10_000);
  });
});
