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

const GLYPH_BOX_EPSILON = 1e-6;
const MAX_SCANLINE_ITERATIONS = 10_000;

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
  return Number.isFinite(width) && width > 0 ? Math.max(1, width) : undefined;
}

function glyphBoxFitsInPolygon(
  polygon: Point[],
  x: number,
  baselineY: number,
  width: number,
  fontSize: number,
  padding: number,
): boolean {
  const top = baselineY - fontSize;
  const bottom = baselineY;
  const epsilon = Math.min(GLYPH_BOX_EPSILON, fontSize / 4);
  const minimumSampleY = top + epsilon;
  const maximumSampleY = bottom - epsilon;
  const sampleYs = new Set([
    minimumSampleY,
    (top + bottom) / 2,
    maximumSampleY,
  ]);

  for (const point of polygon) {
    if (point.y > top && point.y < bottom) {
      sampleYs.add(Math.max(minimumSampleY, point.y - epsilon));
      sampleYs.add(Math.min(maximumSampleY, point.y + epsilon));
    }
  }

  return [...sampleYs].every((sampleY) => (
    getHorizontalSegments(polygon, sampleY).some((segment) => (
      x >= segment.start + padding - epsilon
      && x + width <= segment.end - padding + epsilon
    ))
  ));
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
  let y = bounds.minY + options.padding + options.fontSize;

  for (
    let scanlineIndex = 0;
    y <= bounds.maxY - options.padding
      && unitIndex < units.length
      && scanlineIndex < MAX_SCANLINE_ITERATIONS;
    scanlineIndex += 1
  ) {
    const glyphCenterlineY = y - options.fontSize / 2;
    for (const segment of getHorizontalSegments(polygon, glyphCenterlineY)) {
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
        const nextX = x + Math.max(1, width + options.letterSpacing);
        if (nextX === x) {
          break;
        }
        x = nextX;
      }

      if (unitIndex >= units.length) {
        return placements;
      }
    }

    const nextY = y + lineStep;
    if (nextY === y) {
      break;
    }
    y = nextY;
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
  let x = bounds.maxX - options.padding - options.fontSize;

  for (
    let columnIndex = 0;
    x >= bounds.minX + options.padding
      && unitIndex < units.length
      && columnIndex < MAX_SCANLINE_ITERATIONS;
    columnIndex += 1
  ) {
    for (const segment of getVerticalSegments(polygon, x)) {
      const end = segment.end - options.padding;

      let y = segment.start + options.padding + options.fontSize;
      let rowIndex = 0;
      while (
        y <= end
        && unitIndex < units.length
        && rowIndex < MAX_SCANLINE_ITERATIONS
      ) {
        const text = units[unitIndex];
        const width = getMeasuredWidth(options.measure, text);

        if (width === undefined) {
          unitIndex += 1;
          continue;
        }

        if (
          glyphBoxFitsInPolygon(
            polygon,
            x,
            y,
            width,
            options.fontSize,
            options.padding,
          )
        ) {
          placements.push({ text, x, y });
          unitIndex += 1;
        }

        const nextY = y + letterStep;
        if (nextY === y) {
          break;
        }
        y = nextY;
        rowIndex += 1;
      }

      if (unitIndex >= units.length) {
        return placements;
      }
    }

    const nextX = x - columnStep;
    if (nextX === x) {
      break;
    }
    x = nextX;
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
