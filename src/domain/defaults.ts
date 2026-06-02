import { POEMS } from "./poems";
import type { EditorDocument, Point, TextRegion } from "./types";

export const DEFAULT_REGION_STYLE: Omit<TextRegion, "id" | "points"> = {
  poetrySource: "library",
  poemId: POEMS[0].id,
  text: POEMS[0].text,
  writingMode: "horizontal",
  fontFamily: '"Arial", "Noto Sans SC", sans-serif',
  fontSize: 28,
  fontWeight: 700,
  lineSpacing: -4,
  letterSpacing: -2,
  padding: 12,
  maxWords: 300,
  color: "#111111",
  repeatFill: true,
  contourColor: "#111111",
  contourWidth: 1.5,
};

export function validateCanvasDimension(value: string): boolean {
  const dimension = Number(value);
  return Number.isInteger(dimension) && dimension >= 64 && dimension <= 4096;
}

export function createDefaultDocument(): EditorDocument {
  return {
    background: { kind: "solid", width: 1200, height: 1200, color: "#ffffff" },
    regions: [],
    showContours: true,
  };
}

export function createDefaultRegion(
  points: Point[],
  overrides: Partial<Omit<TextRegion, "id" | "points">> = {},
): TextRegion {
  return { id: crypto.randomUUID(), points: points.map((point) => ({ ...point })), ...DEFAULT_REGION_STYLE, ...overrides };
}
