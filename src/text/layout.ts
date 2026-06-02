import type { Point, WritingMode } from "../domain/types";
import {
  getHorizontalSegments,
  getVerticalSegments,
} from "../geometry/polygon";

export interface LayoutOptions {
  mode: WritingMode;
  fontSize: number;
  lineSpacing: number;
  letterSpacing: number;
  padding: number;
  measure: (text: string) => number;
}

export interface PlacedText {
  text: string;
  x: number;
  y: number;
}

interface PolygonBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function getPolygonBounds(polygon: Point[]): PolygonBounds | undefined {
  if (
    polygon.length === 0
    || !polygon.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))
  ) {
    return undefined;
  }

  const xCoordinates = polygon.map(({ x }) => x);
  const yCoordinates = polygon.map(({ y }) => y);

  return {
    minX: Math.min(...xCoordinates),
    minY: Math.min(...yCoordinates),
    maxX: Math.max(...xCoordinates),
    maxY: Math.max(...yCoordinates),
  };
}

function hasUsableOptions(options: LayoutOptions): boolean {
  return (
    (options.mode === "horizontal" || options.mode === "vertical")
    && Number.isFinite(options.fontSize)
    && options.fontSize > 0
    && Number.isFinite(options.lineSpacing)
    && Number.isFinite(options.letterSpacing)
    && Number.isFinite(options.padding)
    && options.padding >= 0
    && typeof options.measure === "function"
  );
}

function getMeasuredWidth(
  measure: LayoutOptions["measure"],
  text: string,
): number | undefined {
  const width = measure(text);
  return Number.isFinite(width) ? Math.max(1, width) : undefined;
}

function layoutHorizontalText(
  polygon: Point[],
  units: string[],
  options: LayoutOptions,
  bounds: PolygonBounds,
): PlacedText[] {
  const placements: PlacedText[] = [];
  const lineStep = Math.max(1, options.fontSize + options.lineSpacing);
  let unitIndex = 0;

  for (
    let y = bounds.minY + options.padding + options.fontSize;
    y <= bounds.maxY - options.padding && unitIndex < units.length;
    y += lineStep
  ) {
    for (const segment of getHorizontalSegments(polygon, y)) {
      let x = segment.start + options.padding;
      const end = segment.end - options.padding;

      while (unitIndex < units.length) {
        const text = units[unitIndex];
        const width = getMeasuredWidth(options.measure, text);

        if (width === undefined) {
          unitIndex += 1;
          continue;
        }

        if (x + width > end) {
          break;
        }

        placements.push({ text, x, y });
        unitIndex += 1;
        x += Math.max(1, width + options.letterSpacing);
      }

      if (unitIndex >= units.length) {
        return placements;
      }
    }
  }

  return placements;
}

function layoutVerticalText(
  polygon: Point[],
  units: string[],
  options: LayoutOptions,
  bounds: PolygonBounds,
): PlacedText[] {
  const placements: PlacedText[] = [];
  const columnStep = Math.max(1, options.fontSize + options.lineSpacing);
  const letterStep = Math.max(1, options.fontSize + options.letterSpacing);
  let unitIndex = 0;

  for (
    let x = bounds.maxX - options.padding - options.fontSize;
    x >= bounds.minX + options.padding && unitIndex < units.length;
    x -= columnStep
  ) {
    for (const segment of getVerticalSegments(polygon, x)) {
      const end = segment.end - options.padding;

      for (
        let y = segment.start + options.padding + options.fontSize;
        y <= end && unitIndex < units.length;
        y += letterStep
      ) {
        placements.push({ text: units[unitIndex], x, y });
        unitIndex += 1;
      }

      if (unitIndex >= units.length) {
        return placements;
      }
    }
  }

  return placements;
}

export function layoutTextInPolygon(
  polygon: Point[],
  units: string[],
  options: LayoutOptions,
): PlacedText[] {
  const bounds = getPolygonBounds(polygon);
  if (units.length === 0 || !hasUsableOptions(options) || bounds === undefined) {
    return [];
  }

  return options.mode === "horizontal"
    ? layoutHorizontalText(polygon, units, options, bounds)
    : layoutVerticalText(polygon, units, options, bounds);
}
