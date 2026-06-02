import { useEffect, useState } from "react";
import { validateCanvasDimension } from "../domain/defaults";
import type { CanvasBackground } from "../domain/types";

interface TopBarProps {
  background: CanvasBackground;
  canUndo: boolean;
  onBackgroundChange: (background: CanvasBackground) => void;
  onExport: () => void;
  onUndo: () => void;
}

export function TopBar({
  background,
  canUndo,
  onBackgroundChange,
  onExport,
  onUndo,
}: TopBarProps) {
  const [width, setWidth] = useState(String(background.width));
  const [height, setHeight] = useState(String(background.height));

  useEffect(() => setWidth(String(background.width)), [background.width]);
  useEffect(() => setHeight(String(background.height)), [background.height]);

  const updateDimension = (
    dimension: "width" | "height",
    value: string,
  ) => {
    if (dimension === "width") {
      setWidth(value);
    } else {
      setHeight(value);
    }

    if (validateCanvasDimension(value)) {
      onBackgroundChange({ ...background, [dimension]: Number(value) });
    }
  };

  return (
    <header className="top-bar">
      <div className="canvas-settings" aria-label="画布设置">
        <span className="eyebrow">画布</span>
        <label>
          <span>宽</span>
          <input
            aria-label="画布宽度"
            inputMode="numeric"
            onChange={(event) => updateDimension("width", event.target.value)}
            value={width}
          />
        </label>
        <span className="dimension-divider">×</span>
        <label>
          <span>高</span>
          <input
            aria-label="画布高度"
            inputMode="numeric"
            onChange={(event) => updateDimension("height", event.target.value)}
            value={height}
          />
        </label>
        <label className="color-field color-field--dark">
          <span>底色</span>
          <input
            aria-label="画布颜色"
            onChange={(event) => onBackgroundChange({
              ...background,
              color: event.target.value,
            })}
            type="color"
            value={background.color}
          />
        </label>
        <output>{background.width} × {background.height} px</output>
      </div>

      <div className="top-actions">
        <button disabled={!canUndo} onClick={onUndo} type="button">撤销</button>
        <button className="button-primary" onClick={onExport} type="button">
          导出 PNG
        </button>
      </div>
    </header>
  );
}
