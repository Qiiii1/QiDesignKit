import type { EditorTool } from "../domain/types";

interface ToolRailProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
}

export function ToolRail({ tool, onToolChange }: ToolRailProps) {
  return (
    <aside className="tool-rail" aria-label="画布工具">
      <div className="rail-title">工具</div>
      <button
        aria-pressed={tool === "select"}
        onClick={() => onToolChange("select")}
        type="button"
      >
        <span className="tool-glyph tool-glyph--select" />
        <span>选择</span>
      </button>
      <button
        aria-pressed={tool === "draw"}
        onClick={() => onToolChange("draw")}
        type="button"
      >
        <span className="tool-glyph tool-glyph--draw" />
        <span>绘制区域</span>
      </button>
      <p>按住鼠标画出轮廓，松开后自动围合。</p>
    </aside>
  );
}
