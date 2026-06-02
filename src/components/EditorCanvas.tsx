import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { renderDocument } from "../canvas/renderDocument";
import type {
  EditorDocument,
  EditorTool,
  Point,
} from "../domain/types";
import {
  findNodeAt,
  isUsablePolygon,
  pointInPolygon,
  samplePath,
} from "../geometry/polygon";

const NODE_HIT_RADIUS = 10;

interface NodeDrag {
  regionId: string;
  nodeIndex: number;
  point: Point;
}

interface EditorCanvasProps {
  document: EditorDocument;
  tool: EditorTool;
  selectedRegionId?: string;
  onAddRegion: (points: Point[]) => void;
  onSelectRegion?: (regionId?: string) => void;
  onMoveNode?: (regionId: string, nodeIndex: number, point: Point) => void;
}

function withDraggedNode(
  document: EditorDocument,
  dragging?: NodeDrag,
): EditorDocument {
  if (dragging === undefined) {
    return document;
  }

  return {
    ...document,
    regions: document.regions.map((region) => (
      region.id === dragging.regionId
        ? {
            ...region,
            points: region.points.map((point, index) => (
              index === dragging.nodeIndex ? dragging.point : point
            )),
          }
        : region
    )),
  };
}

export function EditorCanvas({
  document,
  tool,
  selectedRegionId,
  onAddRegion,
  onSelectRegion,
  onMoveNode,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<Point[] | undefined>(undefined);
  const draggingRef = useRef<NodeDrag | undefined>(undefined);
  const [drawingPath, setDrawingPath] = useState<Point[]>([]);
  const [dragging, setDragging] = useState<NodeDrag>();
  const [stageSize, setStageSize] = useState({
    width: document.background.width,
    height: document.background.height,
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null) {
      return;
    }

    const updateStageSize = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        setStageSize({ width, height });
      }
    };
    const rectangle = stage.getBoundingClientRect();
    updateStageSize(rectangle.width, rectangle.height);

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (entry === undefined) {
        return;
      }
      updateStageSize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(stage);
    return () => resizeObserver.disconnect();
  }, []);

  const scale = Math.min(
    stageSize.width / document.background.width,
    stageSize.height / document.background.height,
    1,
  );
  const previewDocument = useMemo(
    () => withDraggedNode(document, dragging),
    [document, dragging],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas === null || canvas === undefined || context === null || context === undefined) {
      return;
    }

    canvas.width = Math.max(1, Math.round(document.background.width * scale));
    canvas.height = Math.max(1, Math.round(document.background.height * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    renderDocument(context, previewDocument, {
      scale,
      editorMode: true,
      selectedRegionId,
    });

    if (drawingPath.length > 1) {
      context.save();
      context.scale(scale, scale);
      context.beginPath();
      context.moveTo(drawingPath[0].x, drawingPath[0].y);
      for (const point of drawingPath.slice(1)) {
        context.lineTo(point.x, point.y);
      }
      context.strokeStyle = "#bd7354";
      context.lineWidth = Math.max(1, 2 / scale);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
      context.restore();
    }
  }, [document.background.height, document.background.width, drawingPath, previewDocument, scale, selectedRegionId]);

  const getDocumentPoint = (
    event: ReactMouseEvent<HTMLCanvasElement>,
  ): Point => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rectangle.left) / rectangle.width)
        * document.background.width,
      y: ((event.clientY - rectangle.top) / rectangle.height)
        * document.background.height,
    };
  };

  const finishInteraction = () => {
    if (drawingRef.current !== undefined) {
      const points = samplePath(drawingRef.current);
      if (isUsablePolygon(points)) {
        onAddRegion(points);
      }
      drawingRef.current = undefined;
      setDrawingPath([]);
    }

    if (draggingRef.current !== undefined) {
      const completedDrag = draggingRef.current;
      onMoveNode?.(
        completedDrag.regionId,
        completedDrag.nodeIndex,
        completedDrag.point,
      );
      draggingRef.current = undefined;
      setDragging(undefined);
    }
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const point = getDocumentPoint(event);

    if (tool === "draw") {
      drawingRef.current = [point];
      setDrawingPath([point]);
      return;
    }

    const selectedRegion = document.regions.find(
      ({ id }) => id === selectedRegionId,
    );
    const nodeIndex = selectedRegion === undefined
      ? undefined
      : findNodeAt(point, selectedRegion.points, NODE_HIT_RADIUS / scale);
    if (selectedRegion !== undefined && nodeIndex !== undefined) {
      const nextDrag = { regionId: selectedRegion.id, nodeIndex, point };
      draggingRef.current = nextDrag;
      setDragging(nextDrag);
      return;
    }

    const region = [...document.regions]
      .reverse()
      .find(({ points }) => pointInPolygon(point, points));
    onSelectRegion?.(region?.id);
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLCanvasElement>) => {
    const point = getDocumentPoint(event);

    if (drawingRef.current !== undefined) {
      drawingRef.current = [...drawingRef.current, point];
      setDrawingPath(drawingRef.current);
    }
    if (draggingRef.current !== undefined) {
      draggingRef.current = { ...draggingRef.current, point };
      setDragging(draggingRef.current);
    }
  };

  return (
    <div className="canvas-stage" ref={stageRef}>
      <div
        className="canvas-size"
        style={{
          width: document.background.width * scale,
          height: document.background.height * scale,
        }}
      >
        <canvas
          aria-label="创作画布"
          className={`editor-canvas editor-canvas--${tool}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={finishInteraction}
          onMouseMove={handleMouseMove}
          onMouseUp={finishInteraction}
          ref={canvasRef}
        />
      </div>
    </div>
  );
}
