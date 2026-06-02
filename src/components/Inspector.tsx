import { useState } from "react";
import { POEMS } from "../domain/poems";
import type { TextRegion } from "../domain/types";

type RegionSettings = Omit<TextRegion, "id" | "points">;
type NumericStyleKey =
  | "fontSize"
  | "fontWeight"
  | "lineSpacing"
  | "letterSpacing"
  | "padding"
  | "maxWords"
  | "contourWidth";

interface InspectorProps {
  nextRegionDefaults: RegionSettings;
  selectedRegion?: TextRegion;
  onDeleteRegion: () => void;
  onPatch: (patch: Partial<RegionSettings>) => void;
}

interface NumberFieldProps {
  disabled?: boolean;
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}

function NumberField({
  disabled,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: NumberFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => {
          if (Number.isFinite(event.target.valueAsNumber)) {
            onChange(event.target.valueAsNumber);
          }
        }}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

export function Inspector({
  nextRegionDefaults,
  selectedRegion,
  onDeleteRegion,
  onPatch,
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<"poetry" | "region">("poetry");
  const settings = selectedRegion ?? nextRegionDefaults;
  const disabled = selectedRegion === undefined;
  const updateNumber = (key: NumericStyleKey) => (value: number) => {
    onPatch({ [key]: value });
  };
  const selectPoem = (poemId: string) => {
    const poem = POEMS.find(({ id }) => id === poemId);
    if (poem !== undefined) {
      onPatch({
        poemId: poem.id,
        poetrySource: "library",
        text: poem.text,
      });
    }
  };

  return (
    <aside className="inspector" aria-label="属性检查器">
      <div className="inspector-heading">
        <span className="eyebrow">设置</span>
        <h2>{selectedRegion === undefined ? "下一片区域" : "当前区域"}</h2>
        <p>
          {selectedRegion === undefined
            ? "先选择诗歌，再在画布上自由勾勒。"
            : "调整文字密度，让轮廓逐渐长成你的形状。"}
        </p>
      </div>

      <div className="inspector-tabs" role="tablist" aria-label="属性分类">
        <button
          aria-selected={activeTab === "poetry"}
          onClick={() => setActiveTab("poetry")}
          role="tab"
          type="button"
        >
          诗歌
        </button>
        <button
          aria-selected={activeTab === "region"}
          onClick={() => setActiveTab("region")}
          role="tab"
          type="button"
        >
          区域
        </button>
      </div>

      {activeTab === "poetry" ? (
        <section className="inspector-panel" role="tabpanel">
          <div className="segmented-control">
            <button
              aria-pressed={settings.poetrySource === "library"}
              onClick={() => selectPoem(settings.poemId ?? POEMS[0].id)}
              type="button"
            >
              内置诗歌
            </button>
            <button
              aria-pressed={settings.poetrySource === "custom"}
              onClick={() => onPatch({
                poemId: undefined,
                poetrySource: "custom",
              })}
              type="button"
            >
              自定义文本
            </button>
          </div>
          <label className="field">
            <span>诗歌选集</span>
            <select
              onChange={(event) => selectPoem(event.target.value)}
              value={settings.poemId ?? POEMS[0].id}
            >
              {POEMS.map((poem) => (
                <option key={poem.id} value={poem.id}>
                  {poem.title} · {poem.author}
                </option>
              ))}
            </select>
          </label>
          {settings.poetrySource === "custom" ? (
            <label className="field">
              <span>诗歌文本</span>
              <textarea
                aria-label="诗歌文本"
                onChange={(event) => onPatch({ text: event.target.value })}
                rows={10}
                value={settings.text}
              />
            </label>
          ) : (
            <blockquote>{settings.text}</blockquote>
          )}
          <div className="inspector-note">
            中英文可以混合使用。英文按单词排布，中文按字排布。
          </div>
        </section>
      ) : (
        <section className="inspector-panel" role="tabpanel">
          {disabled ? (
            <div className="empty-selection">选择一个区域后即可调整排版细节。</div>
          ) : null}
          <label className="field">
            <span>排布方向</span>
            <select
              disabled={disabled}
              onChange={(event) => onPatch({
                writingMode: event.target.value as RegionSettings["writingMode"],
              })}
              value={settings.writingMode}
            >
              <option value="horizontal">横向</option>
              <option value="vertical">纵向</option>
            </select>
          </label>
          <label className="field">
            <span>字体</span>
            <select
              disabled={disabled}
              onChange={(event) => onPatch({ fontFamily: event.target.value })}
              value={settings.fontFamily}
            >
              <option value={'"Arial", "Noto Sans SC", sans-serif'}>现代黑体</option>
              <option value={'"Georgia", "Noto Serif SC", serif'}>经典衬线</option>
              <option value={'"Courier New", "Noto Sans SC", monospace'}>等宽字体</option>
            </select>
          </label>
          <div className="field-grid">
            <NumberField disabled={disabled} label="字号" min={6} onChange={updateNumber("fontSize")} value={settings.fontSize} />
            <NumberField disabled={disabled} label="字重" max={900} min={100} onChange={updateNumber("fontWeight")} step={100} value={settings.fontWeight} />
            <NumberField disabled={disabled} label="行距" min={-100} onChange={updateNumber("lineSpacing")} value={settings.lineSpacing} />
            <NumberField disabled={disabled} label="字距" min={-100} onChange={updateNumber("letterSpacing")} value={settings.letterSpacing} />
            <NumberField disabled={disabled} label="内边距" min={0} onChange={updateNumber("padding")} value={settings.padding} />
            <NumberField disabled={disabled} label="最大字数" min={1} onChange={updateNumber("maxWords")} value={settings.maxWords} />
          </div>
          <div className="color-grid">
            <label className="color-field">
              <span>字体颜色</span>
              <input disabled={disabled} onChange={(event) => onPatch({ color: event.target.value })} type="color" value={settings.color} />
            </label>
            <label className="color-field">
              <span>轮廓颜色</span>
              <input disabled={disabled} onChange={(event) => onPatch({ contourColor: event.target.value })} type="color" value={settings.contourColor} />
            </label>
          </div>
          <NumberField disabled={disabled} label="轮廓粗细" min={0.5} onChange={updateNumber("contourWidth")} step={0.5} value={settings.contourWidth} />
          <label className="check-field">
            <input
              checked={settings.repeatFill}
              disabled={disabled}
              onChange={(event) => onPatch({ repeatFill: event.target.checked })}
              type="checkbox"
            />
            <span>允许重复填充</span>
          </label>
          <button className="button-danger" disabled={disabled} onClick={onDeleteRegion} type="button">
            删除当前区域
          </button>
        </section>
      )}
    </aside>
  );
}
