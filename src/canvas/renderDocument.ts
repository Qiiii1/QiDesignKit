import type { EditorDocument, Point, TextRegion } from "../domain/types";
import { layoutTextInPolygon } from "../text/layout";
import { prepareTextUnits } from "../text/tokenize";

export interface RenderOptions {
  scale: number;
  editorMode: boolean;
  selectedRegionId?: string;
}

function tracePolygon(
  context: CanvasRenderingContext2D,
  points: Point[],
): boolean {
  const [firstPoint, ...remainingPoints] = points;
  if (firstPoint === undefined) {
    return false;
  }

  context.beginPath();
  context.moveTo(firstPoint.x, firstPoint.y);
  for (const point of remainingPoints) {
    context.lineTo(point.x, point.y);
  }
  context.closePath();
  return true;
}

function renderRegionText(
  context: CanvasRenderingContext2D,
  region: TextRegion,
): void {
  context.save();
  context.fillStyle = region.color;
  context.font = `${region.fontWeight} ${region.fontSize}px ${region.fontFamily}`;
  context.textBaseline = "alphabetic";
  if (tracePolygon(context, region.points)) {
    context.clip();
  }

  const units = prepareTextUnits(
    region.text,
    region.maxWords,
    region.repeatFill,
  ).map(({ text }) => text);
  const placements = layoutTextInPolygon(region.points, units, {
    mode: region.writingMode,
    fontSize: region.fontSize,
    lineSpacing: region.lineSpacing,
    letterSpacing: region.letterSpacing,
    padding: region.padding,
    measure: (text) => context.measureText(text).width,
  });

  for (const placement of placements) {
    context.fillText(placement.text, placement.x, placement.y);
  }
  context.restore();
}

function renderRegionFill(
  context: CanvasRenderingContext2D,
  region: TextRegion,
): void {
  if (!region.fillColor || region.fillColor === "transparent") {
    return;
  }

  context.save();
  context.fillStyle = region.fillColor;
  if (tracePolygon(context, region.points)) {
    context.fill();
  }
  context.restore();
}

function renderContour(
  context: CanvasRenderingContext2D,
  region: TextRegion,
): void {
  context.save();
  context.strokeStyle = region.contourColor;
  context.lineWidth = region.contourWidth;
  if (tracePolygon(context, region.points)) {
    context.stroke();
  }
  context.restore();
}

function renderNodes(
  context: CanvasRenderingContext2D,
  region: TextRegion,
): void {
  context.save();
  context.fillStyle = "#ffffff";
  context.strokeStyle = region.contourColor;
  context.lineWidth = 1.5;

  for (const point of region.points) {
    context.beginPath();
    context.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.restore();
}

export function renderDocument(
  context: CanvasRenderingContext2D,
  document: EditorDocument,
  options: RenderOptions,
): void {
  const scale = Number.isFinite(options.scale) && options.scale > 0
    ? options.scale
    : 1;

  context.save();
  context.scale(scale, scale);
  context.fillStyle = document.background.color;
  context.fillRect(
    0,
    0,
    document.background.width,
    document.background.height,
  );

  for (const region of document.regions) {
    renderRegionFill(context, region);
    renderRegionText(context, region);
    if (document.showContours && region.showContour !== false) {
      renderContour(context, region);
    }
    if (options.editorMode && options.selectedRegionId === region.id) {
      renderNodes(context, region);
    }
  }

  context.restore();
}
