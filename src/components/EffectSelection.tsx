interface EffectSelectionProps {
  onSelect: (workspace: "text" | "stencil") => void;
}

const EFFECTS = [
  {
    id: "text",
    title: "文字区域填充",
    description: "自由勾勒区域，用预设或自定义文本填满形状。",
  },
  {
    id: "stencil",
    title: "镂空图像转换",
    description: "上传图片，生成单色高对比度的镂空视觉效果。",
  },
] as const;

export function EffectSelection({ onSelect }: EffectSelectionProps) {
  return (
    <main className="selection-shell">
      <section className="selection-panel" aria-label="视觉效果入口">
        <div className="selection-heading">
          <span className="eyebrow">Visual Effects</span>
          <h1>选择视觉效果</h1>
          <p>在本机浏览器中探索图像和文字的平面化视觉处理。</p>
        </div>
        <div className="effect-card-grid">
          {EFFECTS.map((effect) => (
            <button
              className="effect-card"
              key={effect.id}
              onClick={() => onSelect(effect.id)}
              type="button"
            >
              <span className="effect-card__index">
                {effect.id === "text" ? "01" : "02"}
              </span>
              <span className="effect-card__title">{effect.title}</span>
              <span className="effect-card__description">
                {effect.description}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
