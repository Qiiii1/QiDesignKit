import type { Point } from "../domain/types";

export interface Segment {
  start: number;
  end: number;
}

function pointsMatch(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function closePath(points: Point[]): Point[] {
  if (points.length === 0) {
    return [];
  }

  const closed = [...points];
  if (!pointsMatch(closed[0], closed[closed.length - 1])) {
    closed.push(closed[0]);
  }
  return closed;
}

export function samplePath(points: Point[], maxPoints = 48): Point[] {
  const limit = Number.isFinite(maxPoints)
    ? Math.max(2, Math.floor(maxPoints))
    : 48;
  if (points.length <= limit) {
    return [...points];
  }

  return Array.from({ length: limit }, (_, index) => {
    const sourceIndex = Math.round((index * (points.length - 1)) / (limit - 1));
    return points[sourceIndex];
  });
}

export function polygonArea(points: Point[]): number {
  if (points.length < 3) {
    return 0;
  }

  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }

  return Math.abs(twiceArea) / 2;
}

export function isUsablePolygon(points: Point[]): boolean {
  if (!points.every(isFinitePoint)) {
    return false;
  }

  const distinctPoints = new Set(points.map((point) => `${point.x},${point.y}`));
  return distinctPoints.size >= 3 && polygonArea(points) >= 400;
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let isInside = false;

  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = polygon[currentIndex];
    const previous = polygon[previousIndex];
    const crossesRay = (current.y > point.y) !== (previous.y > point.y);

    if (
      crossesRay
      && point.x
        < ((previous.x - current.x) * (point.y - current.y))
          / (previous.y - current.y)
          + current.x
    ) {
      isInside = !isInside;
    }
  }

  return isInside;
}

export function findNodeAt(
  point: Point,
  nodes: Point[],
  radius: number,
): number | undefined {
  if (radius < 0) {
    return undefined;
  }

  const radiusSquared = radius * radius;
  let nearestIndex: number | undefined;
  let nearestDistanceSquared = radiusSquared;

  nodes.forEach((node, index) => {
    const xDistance = node.x - point.x;
    const yDistance = node.y - point.y;
    const distanceSquared = xDistance * xDistance + yDistance * yDistance;

    if (distanceSquared <= nearestDistanceSquared) {
      nearestIndex = index;
      nearestDistanceSquared = distanceSquared;
    }
  });

  return nearestIndex;
}

function getScanlineSegments(
  polygon: Point[],
  coordinate: number,
  crossingCoordinate: (point: Point) => number,
  segmentCoordinate: (point: Point) => number,
): Segment[] {
  const intersections: number[] = [];

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const startCrossing = crossingCoordinate(start);
    const endCrossing = crossingCoordinate(end);
    const crossesScanline = (
      (startCrossing <= coordinate && coordinate < endCrossing)
      || (endCrossing <= coordinate && coordinate < startCrossing)
    );

    if (crossesScanline) {
      const progress = (coordinate - startCrossing) / (endCrossing - startCrossing);
      intersections.push(
        segmentCoordinate(start)
          + progress * (segmentCoordinate(end) - segmentCoordinate(start)),
      );
    }
  }

  intersections.sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    segments.push({ start: intersections[index], end: intersections[index + 1] });
  }
  return segments;
}

export function getHorizontalSegments(polygon: Point[], y: number): Segment[] {
  return getScanlineSegments(polygon, y, (point) => point.y, (point) => point.x);
}

export function getVerticalSegments(polygon: Point[], x: number): Segment[] {
  return getScanlineSegments(polygon, x, (point) => point.x, (point) => point.y);
}
