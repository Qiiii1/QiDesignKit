import { describe, expect, it } from "vitest";
import {
  closePath,
  findNodeAt,
  getHorizontalSegments,
  getVerticalSegments,
  isUsablePolygon,
  pointInPolygon,
  polygonArea,
  samplePath,
} from "./polygon";

describe("polygon geometry", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it("closes an open square exactly once and leaves an empty path empty", () => {
    expect(closePath(square)).toEqual([...square, square[0]]);
    expect(closePath([...square, square[0]])).toEqual([...square, square[0]]);
    expect(closePath([])).toEqual([]);
  });

  it("samples a mouse path within the limit while preserving its endpoints", () => {
    const mousePath = Array.from({ length: 101 }, (_, x) => ({ x, y: x * 2 }));

    const sampled = samplePath(mousePath, 20);

    expect(sampled.length).toBeLessThanOrEqual(20);
    expect(sampled[0]).toEqual(mousePath[0]);
    expect(sampled.at(-1)).toEqual(mousePath.at(-1));
  });

  it("uses a safe fallback when sampling with a non-finite limit", () => {
    const mousePath = Array.from({ length: 101 }, (_, x) => ({ x, y: x * 2 }));

    const sampled = samplePath(mousePath, Number.NaN);

    expect(sampled.length).toBeGreaterThan(0);
    expect(sampled.length).toBeLessThanOrEqual(48);
    expect(sampled[0]).toEqual(mousePath[0]);
    expect(sampled.at(-1)).toEqual(mousePath.at(-1));
  });

  it("detects points inside a square and finds nearby nodes", () => {
    expect(pointInPolygon({ x: 50, y: 50 }, square)).toBe(true);
    expect(pointInPolygon({ x: 150, y: 50 }, square)).toBe(false);
    expect(findNodeAt({ x: 2, y: 2 }, square, 5)).toBe(0);
    expect(findNodeAt({ x: 150, y: 150 }, square, 5)).toBeUndefined();
  });

  it("requires at least three distinct points and a minimum polygon area", () => {
    expect(isUsablePolygon([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ])).toBe(false);
    expect(isUsablePolygon([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 0 },
    ])).toBe(false);
    expect(isUsablePolygon(square)).toBe(true);
  });

  it("rejects a triangle with a non-finite coordinate", () => {
    expect(isUsablePolygon([
      { x: 0, y: -100 },
      { x: Number.POSITIVE_INFINITY, y: 0 },
      { x: 0, y: 100 },
      { x: -100, y: 0 },
    ])).toBe(false);
  });

  it("calculates square area for an open polygon", () => {
    expect(polygonArea(square)).toBe(10_000);
  });

  it("returns horizontal and vertical square scanline segments", () => {
    expect(getHorizontalSegments(square, 50)).toEqual([{ start: 0, end: 100 }]);
    expect(getVerticalSegments(square, 50)).toEqual([{ start: 0, end: 100 }]);
  });

  it("returns two scanline segments through a concave U-shape", () => {
    const uShape = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 70, y: 100 },
      { x: 70, y: 30 },
      { x: 30, y: 30 },
      { x: 30, y: 100 },
      { x: 0, y: 100 },
    ];

    expect(getHorizontalSegments(uShape, 50)).toEqual([
      { start: 0, end: 30 },
      { start: 70, end: 100 },
    ]);
  });
});
