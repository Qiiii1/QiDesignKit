import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";
import { exportStencilMp4, StencilMp4UnsupportedError } from "./exportMp4";
import { exportStencilPng } from "./exportPng";
import { decodeStencilImage, readSourceImageData } from "./image";
import { renderStencilImageData } from "./renderStencil";
import type { StencilSettings, StencilSource } from "./types";

interface StylizedImageWorkspaceProps {
  onBack: () => void;
}

type NumericSetting = Extract<{
  [Key in keyof StencilSettings]: StencilSettings[Key] extends number ? Key : never
}[keyof StencilSettings], string>;

interface NumberRangeProps {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}

function NumberRange({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: NumberRangeProps) {
  return (
    <label className="field range-field">
      <span>{label}</span>
      <input
        aria-label={label}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
      <output>{value}</output>
    </label>
  );
}

export function StylizedImageWorkspace({ onBack }: StylizedImageWorkspaceProps) {
  const [settings, setSettings] = useState(DEFAULT_STENCIL_SETTINGS);
  const [source, setSource] = useState<StencilSource>();
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [mp4Progress, setMp4Progress] = useState<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = (patchSettings: Partial<StencilSettings>) => {
    setSettings((current) => ({ ...current, ...patchSettings }));
  };
  const patchNumber = (key: NumericSetting) => (value: number) => {
    patch({ [key]: value } as Partial<StencilSettings>);
  };

  useEffect(() => {
    if (!playing) {
      return;
    }

    let frame = 0;
    let active = true;
    const start = performance.now() - time * 1000;
    const tick = (now: number) => {
      if (!active) {
        return;
      }
      setTime(((now - start) / 1000) % settings.animationDuration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [playing, settings.animationDuration, time]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || source === undefined) {
      return;
    }
    const context = canvas.getContext("2d");
    if (context === null) {
      return;
    }

    const maxPreviewSide = 980;
    const scale = Math.min(
      maxPreviewSide / source.width,
      maxPreviewSide / source.height,
      1,
    );
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));

    const previewSource = {
      ...source,
      width: canvas.width,
      height: canvas.height,
    };
    const imageData = readSourceImageData(previewSource, canvas);
    const output = renderStencilImageData({
      source: imageData,
      settings,
      time,
    });
    context.putImageData(output, 0, 0);
  }, [settings, source, time]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? []);
    if (file === undefined) {
      return;
    }

    try {
      setSource(await decodeStencilImage(file));
      setNotice("");
      setTime(0);
      setPlaying(false);
    } catch {
      setNotice("无法读取这张图片，请换一张浏览器可解码的图片。");
    }
  };

  const exportPng = () => {
    if (source === undefined) {
      return;
    }

    exportStencilPng(source, settings, time)
      .catch(() => setNotice("PNG 导出失败，请重试。"));
  };

  const exportMp4 = () => {
    if (source === undefined || mp4Progress !== undefined) {
      return;
    }

    setMp4Progress(0);
    exportStencilMp4(source, settings, {
      onProgress: setMp4Progress,
    })
      .then(() => setNotice("MP4 已导出。"))
      .catch((error) => {
        setNotice(error instanceof StencilMp4UnsupportedError
          ? error.message
          : "MP4 导出失败，请重试。");
      })
      .finally(() => setMp4Progress(undefined));
  };

  return (
    <main className="stencil-shell">
      <header className="stencil-top-bar">
        <button className="back-button" onClick={onBack} type="button">
          返回效果选择
        </button>
        <h1>镂空图像转换</h1>
        <div className="top-actions">
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            上传图片
          </button>
          <button disabled={source === undefined} onClick={exportPng} type="button">
            导出 PNG
          </button>
          <button
            className="button-primary"
            disabled={source === undefined || mp4Progress !== undefined}
            onClick={exportMp4}
            type="button"
          >
            导出 MP4
          </button>
        </div>
        <input
          accept="image/*"
          aria-label="选择图片文件"
          className="visually-hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
      </header>

      <section className="stencil-frame">
        <div className="stencil-preview">
          {source === undefined ? (
            <button
              className="stencil-empty-state"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <span>上传一张图片开始转换</span>
              <small>图片只会保留在本机浏览器中。</small>
            </button>
          ) : (
            <canvas aria-label="镂空图像预览" ref={canvasRef} />
          )}
          <div className="stencil-playbar">
            <button
              disabled={source === undefined}
              onClick={() => setPlaying((current) => !current)}
              type="button"
            >
              {playing ? "暂停" : "播放"}
            </button>
            <span>{time.toFixed(2)}s</span>
            {mp4Progress === undefined ? null : (
              <span>MP4 生成中 {Math.round(mp4Progress * 100)}%</span>
            )}
          </div>
        </div>

        <aside className="inspector stencil-inspector" aria-label="镂空图像参数">
          <div className="inspector-heading">
            <span className="eyebrow">Stencil</span>
            <h2>视觉参数</h2>
            <p>用阈值、纹理与负空间把图片压成单色图形。</p>
          </div>
          <section className="inspector-panel">
            <label className="color-field">
              <span>前景色</span>
              <input
                aria-label="前景色"
                onChange={(event) => patch({ foregroundColor: event.target.value })}
                type="color"
                value={settings.foregroundColor}
              />
            </label>
            <label className="field">
              <span>背景模式</span>
              <select
                aria-label="背景模式"
                onChange={(event) => patch({
                  backgroundMode: event.target.value as StencilSettings["backgroundMode"],
                })}
                value={settings.backgroundMode}
              >
                <option value="transparent">透明</option>
                <option value="white">白色</option>
                <option value="custom">自定义</option>
              </select>
            </label>
            <label className="color-field">
              <span>背景色</span>
              <input
                aria-label="背景色"
                disabled={settings.backgroundMode !== "custom"}
                onChange={(event) => patch({ backgroundColor: event.target.value })}
                type="color"
                value={settings.backgroundColor}
              />
            </label>
            <NumberRange
              label="阈值"
              max={255}
              min={0}
              onChange={patchNumber("threshold")}
              value={settings.threshold}
            />
            <label className="check-field">
              <input
                checked={settings.invert}
                onChange={(event) => patch({ invert: event.target.checked })}
                type="checkbox"
              />
              反转明暗选择
            </label>
            <label className="field">
              <span>纹理类型</span>
              <select
                aria-label="纹理类型"
                onChange={(event) => patch({
                  textureType: event.target.value as StencilSettings["textureType"],
                })}
                value={settings.textureType}
              >
                <option value="holes">孔洞</option>
                <option value="lines">流线</option>
                <option value="mixed">混合</option>
              </select>
            </label>
            <NumberRange
              label="纹理密度"
              max={1}
              min={0}
              onChange={patchNumber("textureDensity")}
              step={0.01}
              value={settings.textureDensity}
            />
            <NumberRange
              label="纹理尺度"
              max={120}
              min={4}
              onChange={patchNumber("textureScale")}
              value={settings.textureScale}
            />
            <NumberRange
              label="边缘强调"
              max={1}
              min={0}
              onChange={patchNumber("edgeEmphasis")}
              step={0.01}
              value={settings.edgeEmphasis}
            />
          </section>

          <div className="inspector-heading inspector-heading--sub">
            <h2>动画参数</h2>
          </div>
          <section className="inspector-panel">
            <label className="check-field">
              <input
                checked={settings.flowEnabled}
                onChange={(event) => patch({ flowEnabled: event.target.checked })}
                type="checkbox"
              />
              启用纹理流动
            </label>
            <label className="check-field">
              <input
                checked={settings.breathingEnabled}
                onChange={(event) => patch({ breathingEnabled: event.target.checked })}
                type="checkbox"
              />
              启用阈值呼吸
            </label>
            <NumberRange
              label="动画时长"
              max={12}
              min={1}
              onChange={patchNumber("animationDuration")}
              value={settings.animationDuration}
            />
            <NumberRange
              label="帧率"
              max={30}
              min={8}
              onChange={patchNumber("frameRate")}
              value={settings.frameRate}
            />
            <NumberRange
              label="流动速度"
              max={2}
              min={0}
              onChange={patchNumber("flowSpeed")}
              step={0.05}
              value={settings.flowSpeed}
            />
            <NumberRange
              label="呼吸幅度"
              max={80}
              min={0}
              onChange={patchNumber("breathingAmplitude")}
              value={settings.breathingAmplitude}
            />
          </section>
        </aside>
      </section>

      <div className={`notice${notice ? " notice--visible" : ""}`}>
        {notice}
      </div>
    </main>
  );
}
