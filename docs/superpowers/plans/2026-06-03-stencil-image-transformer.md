# Stencil Image Transformer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-effect entry page and a browser-local stencil image transformer with PNG and MP4 export.

**Architecture:** Keep the existing text editor reducer and storage intact by moving it behind a `TextWorkspace` component. Add a new stencil feature with pure domain helpers for settings, pixel rendering, dimensions, and frame timing, then thin React components for upload, preview, controls, and export. PNG and MP4 export live in adapter modules so the visual algorithm has no dependency on the encoder.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, Testing Library, Canvas 2D, WebCodecs via Mediabunny `CanvasSource`, `Mp4OutputFormat`, and `BufferTarget`.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add `mediabunny` runtime dependency.
- Modify `src/App.tsx`: own `home | text | stencil` workspace selection and compose workspaces.
- Modify `src/App.test.tsx`: assert entry navigation and preserve existing text editor coverage.
- Create `src/components/EffectSelection.tsx`: two entry cards.
- Create `src/components/TextWorkspace.tsx`: move the current text-editor app body here.
- Create `src/stencil/types.ts`: stencil settings, source image, export status, and dependency types.
- Create `src/stencil/defaults.ts`: default visual and animation settings.
- Create `src/stencil/dimensions.ts`: export dimension and frame-count helpers.
- Create `src/stencil/renderStencil.ts`: deterministic Canvas/ImageData transform.
- Create `src/stencil/image.ts`: browser image-file decoding and source extraction.
- Create `src/stencil/exportPng.ts`: current-frame PNG render and download.
- Create `src/stencil/exportMp4.ts`: Mediabunny capability detection and MP4 render/export.
- Create `src/stencil/StylizedImageWorkspace.tsx`: top bar, upload, preview, controls, and export orchestration.
- Create `src/stencil/StylizedImageWorkspace.test.tsx`: upload, controls, export disabled state, and MP4 unsupported branch.
- Create `src/stencil/*.test.ts`: domain and adapter unit tests.
- Modify `src/test/setup.ts`: add canvas image-data stubs used by stencil tests.
- Modify `src/styles.css`: entry page and stencil workspace styles.
- Modify `README.md`: document the two workflows and browser-local MP4 caveat.

---

### Task 1: Add Mediabunny Dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the runtime dependency**

Run:

```bash
npm install mediabunny
```

Expected: `package.json` gains `"mediabunny": "^1.x"` or the current npm version, and `package-lock.json` is updated.

- [ ] **Step 2: Verify dependency metadata**

Run:

```bash
npm ls mediabunny
```

Expected: npm prints the installed `mediabunny` version under `verseform@0.1.0`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add mediabunny for mp4 export"
```

---

### Task 2: Add Effect Selection Navigation

**Files:**
- Create: `src/components/EffectSelection.tsx`
- Create: `src/components/TextWorkspace.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing navigation tests**

Add these tests near the top of `src/App.test.tsx`:

```tsx
it("opens on an effect selection page and enters the text workspace", async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(screen.getByRole("heading", { name: "选择视觉效果" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: /文字区域填充/ }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: /镂空图像转换/ }))
    .toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /文字区域填充/ }));

  expect(screen.getByLabelText("视觉文字效果编辑器")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "返回效果选择" }));
  expect(screen.getByRole("heading", { name: "选择视觉效果" }))
    .toBeInTheDocument();
});

it("enters the stencil workspace from the selection page", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: /镂空图像转换/ }));

  expect(screen.getByRole("heading", { name: "镂空图像转换" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "返回效果选择" }))
    .toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- src/App.test.tsx
```

Expected: FAIL because the app still opens directly in the text editor.

- [ ] **Step 3: Create `EffectSelection`**

Create `src/components/EffectSelection.tsx`:

```tsx
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
```

- [ ] **Step 4: Move current editor into `TextWorkspace`**

Create `src/components/TextWorkspace.tsx` by moving the current body of `App`
into this component. Add `onBack` and render a back button through `TopBar`.

```tsx
import { useEffect, useReducer, useState } from "react";
import { exportDocumentPng } from "../canvas/exportPng";
import { EditorCanvas } from "./EditorCanvas";
import { Inspector } from "./Inspector";
import { Notice } from "./Notice";
import { ToolRail } from "./ToolRail";
import { TopBar } from "./TopBar";
import {
  createDefaultDocument,
  createDefaultRegion,
} from "../domain/defaults";
import type { Point, TextRegion } from "../domain/types";
import { createEditorState, editorReducer } from "../editor/reducer";
import { loadProject, saveProject } from "../storage/projectStore";

const AUTOSAVE_DELAY = 300;

interface TextWorkspaceProps {
  onBack: () => void;
}

export function TextWorkspace({ onBack }: TextWorkspaceProps) {
  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    () => createEditorState(createDefaultDocument()),
  );
  const [initialized, setInitialized] = useState(false);
  const selectedRegion = state.document.regions.find(
    ({ id }) => id === state.selectedRegionId,
  );

  useEffect(() => {
    let active = true;
    loadProject()
      .then((project) => {
        if (active && project !== undefined) {
          dispatch({ type: "project/hydrate", ...project });
        }
      })
      .catch(() => {
        if (active) {
          dispatch({
            type: "notice/set",
            notice: "自动保存不可用，本次编辑仍可继续。",
          });
        }
      })
      .finally(() => {
        if (active) {
          setInitialized(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const timeout = window.setTimeout(() => {
      saveProject({
        document: state.document,
        history: state.history,
      }).catch(() => dispatch({
        type: "notice/set",
        notice: "自动保存不可用，本次编辑仍可继续。",
      }));
    }, AUTOSAVE_DELAY);

    return () => window.clearTimeout(timeout);
  }, [initialized, state.document, state.history]);

  const patchSettings = (
    patch: Partial<Omit<TextRegion, "id" | "points">>,
  ) => {
    dispatch(selectedRegion === undefined
      ? { type: "defaults/update", patch }
      : { type: "region/update", patch });
  };

  const addRegion = (points: Point[]) => {
    dispatch({
      type: "region/add",
      region: createDefaultRegion(points, state.nextRegionDefaults),
    });
  };

  const exportPng = () => {
    exportDocumentPng(state.document).catch(() => dispatch({
      type: "notice/set",
      notice: "导出失败，请重试。",
    }));
  };

  return (
    <main className="app-shell">
      <TopBar
        background={state.document.background}
        canUndo={state.history.length > 0}
        onBack={onBack}
        onBackgroundChange={(background) => dispatch({
          type: "background/set",
          background,
        })}
        onExport={exportPng}
        onUndo={() => dispatch({ type: "history/undo" })}
      />
      <section className="editor-frame" aria-label="视觉文字效果编辑器">
        <ToolRail
          onToolChange={(tool) => dispatch({ type: "tool/set", tool })}
          tool={state.tool}
        />
        <EditorCanvas
          document={state.document}
          onAddRegion={addRegion}
          onMoveNode={(regionId, nodeIndex, point) => {
            dispatch({ type: "selection/set", regionId });
            dispatch({ type: "region/move-node", nodeIndex, point });
          }}
          onSelectRegion={(regionId) => dispatch({
            type: "selection/set",
            regionId,
          })}
          selectedRegionId={state.selectedRegionId}
          tool={state.tool}
        />
        <Inspector
          nextRegionDefaults={state.nextRegionDefaults}
          onDeleteRegion={() => dispatch({ type: "region/delete-selected" })}
          onPatch={patchSettings}
          onSelectRegion={(regionId) => dispatch({
            type: "selection/set",
            regionId,
          })}
          regions={state.document.regions}
          selectedRegionId={state.selectedRegionId}
          selectedRegion={selectedRegion}
        />
      </section>
      <Notice message={state.notice} />
    </main>
  );
}
```

- [ ] **Step 5: Update `TopBar` for optional back action**

Modify `src/components/TopBar.tsx`:

```tsx
interface TopBarProps {
  background: CanvasBackground;
  canUndo: boolean;
  onBack?: () => void;
  onBackgroundChange: (background: CanvasBackground) => void;
  onExport: () => void;
  onUndo: () => void;
}
```

Render this inside `<header className="top-bar">` before canvas settings:

```tsx
{onBack === undefined ? null : (
  <button className="back-button" onClick={onBack} type="button">
    返回效果选择
  </button>
)}
```

- [ ] **Step 6: Make `App` route between workspaces**

Replace `src/App.tsx` with:

```tsx
import { useState } from "react";
import { EffectSelection } from "./components/EffectSelection";
import { TextWorkspace } from "./components/TextWorkspace";
import { StylizedImageWorkspace } from "./stencil/StylizedImageWorkspace";

type Workspace = "home" | "text" | "stencil";

export function App() {
  const [workspace, setWorkspace] = useState<Workspace>("home");

  if (workspace === "text") {
    return <TextWorkspace onBack={() => setWorkspace("home")} />;
  }

  if (workspace === "stencil") {
    return <StylizedImageWorkspace onBack={() => setWorkspace("home")} />;
  }

  return (
    <EffectSelection
      onSelect={(selectedWorkspace) => setWorkspace(selectedWorkspace)}
    />
  );
}
```

Temporarily create a minimal `src/stencil/StylizedImageWorkspace.tsx`:

```tsx
interface StylizedImageWorkspaceProps {
  onBack: () => void;
}

export function StylizedImageWorkspace({ onBack }: StylizedImageWorkspaceProps) {
  return (
    <main className="stencil-shell">
      <header className="stencil-top-bar">
        <button className="back-button" onClick={onBack} type="button">
          返回效果选择
        </button>
        <h1>镂空图像转换</h1>
      </header>
    </main>
  );
}
```

- [ ] **Step 7: Add selection styles**

Append to `src/styles.css`:

```css
.selection-shell {
  align-items: center;
  background: var(--paper);
  display: flex;
  min-height: 100vh;
  padding: 44px;
}
.selection-panel {
  margin: 0 auto;
  max-width: 980px;
  width: 100%;
}
.selection-heading h1 {
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 46px;
  font-weight: 500;
  margin: 8px 0 12px;
}
.selection-heading p {
  color: var(--muted);
  font-size: 15px;
}
.effect-card-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 34px;
}
.effect-card {
  background: var(--panel-bright);
  border: 1px solid var(--line);
  border-radius: 22px;
  color: var(--ink);
  display: grid;
  gap: 14px;
  min-height: 240px;
  padding: 28px;
  text-align: left;
}
.effect-card:hover {
  border-color: var(--terracotta);
  box-shadow: var(--canvas-shadow);
  transform: translateY(-2px);
}
.effect-card__index {
  color: var(--terracotta-dark);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.effect-card__title {
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 30px;
}
.effect-card__description {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
  max-width: 320px;
}
.back-button {
  background: transparent;
  border: 1px solid rgba(247, 243, 236, 0.22);
  border-radius: 7px;
  color: inherit;
  font-size: 12px;
  padding: 9px 12px;
}
.back-button:hover {
  background: rgba(255, 255, 255, 0.08);
}
```

- [ ] **Step 8: Run tests**

Run:

```bash
npm run test:run -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components/EffectSelection.tsx src/components/TextWorkspace.tsx src/components/TopBar.tsx src/stencil/StylizedImageWorkspace.tsx src/styles.css
git commit -m "feat: add visual effect selection"
```

---

### Task 3: Add Stencil Settings and Dimension Helpers

**Files:**
- Create: `src/stencil/types.ts`
- Create: `src/stencil/defaults.ts`
- Create: `src/stencil/dimensions.ts`
- Create: `src/stencil/defaults.test.ts`
- Create: `src/stencil/dimensions.test.ts`

- [ ] **Step 1: Write failing settings tests**

Create `src/stencil/defaults.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";

describe("DEFAULT_STENCIL_SETTINGS", () => {
  it("starts with useful editable visual and animation values", () => {
    expect(DEFAULT_STENCIL_SETTINGS.foregroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(DEFAULT_STENCIL_SETTINGS.backgroundMode).toBe("transparent");
    expect(DEFAULT_STENCIL_SETTINGS.threshold).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.threshold).toBeLessThan(255);
    expect(DEFAULT_STENCIL_SETTINGS.textureType).toBe("mixed");
    expect(DEFAULT_STENCIL_SETTINGS.textureDensity).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.animationDuration).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.frameRate).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.flowEnabled).toBe(true);
    expect(DEFAULT_STENCIL_SETTINGS.breathingEnabled).toBe(true);
  });
});
```

Create `src/stencil/dimensions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  calculateFrameCount,
  calculateMp4Dimensions,
  getFrameTime,
} from "./dimensions";

describe("calculateMp4Dimensions", () => {
  it("caps a landscape image at a 1080px longest side", () => {
    expect(calculateMp4Dimensions(2400, 1200)).toEqual({
      width: 1080,
      height: 540,
    });
  });

  it("caps a portrait image at a 1080px longest side", () => {
    expect(calculateMp4Dimensions(1200, 2400)).toEqual({
      width: 540,
      height: 1080,
    });
  });

  it("does not upscale small images", () => {
    expect(calculateMp4Dimensions(640, 480)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it("keeps dimensions even for AVC compatibility", () => {
    expect(calculateMp4Dimensions(333, 111)).toEqual({
      width: 332,
      height: 110,
    });
  });
});

describe("frame timing", () => {
  it("calculates frame count without duplicating the loop endpoint", () => {
    expect(calculateFrameCount(3, 12)).toBe(36);
    expect(getFrameTime(35, 12)).toBeCloseTo(35 / 12);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- src/stencil/defaults.test.ts src/stencil/dimensions.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement stencil types**

Create `src/stencil/types.ts`:

```ts
export type StencilBackgroundMode = "transparent" | "white" | "custom";
export type StencilTextureType = "holes" | "lines" | "mixed";

export interface StencilSettings {
  foregroundColor: string;
  backgroundMode: StencilBackgroundMode;
  backgroundColor: string;
  threshold: number;
  invert: boolean;
  textureType: StencilTextureType;
  textureDensity: number;
  textureScale: number;
  edgeEmphasis: number;
  flowEnabled: boolean;
  breathingEnabled: boolean;
  animationDuration: number;
  frameRate: number;
  flowSpeed: number;
  breathingAmplitude: number;
}

export interface StencilSource {
  image: CanvasImageSource;
  width: number;
  height: number;
  name: string;
}

export interface StencilRenderInput {
  source: ImageData;
  settings: StencilSettings;
  time: number;
}

export interface StencilExportDependencies {
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
  download?: (blob: Blob, filename: string) => void;
}
```

- [ ] **Step 4: Implement defaults**

Create `src/stencil/defaults.ts`:

```ts
import type { StencilSettings } from "./types";

export const DEFAULT_STENCIL_SETTINGS: StencilSettings = {
  foregroundColor: "#111111",
  backgroundMode: "transparent",
  backgroundColor: "#ffffff",
  threshold: 138,
  invert: false,
  textureType: "mixed",
  textureDensity: 0.42,
  textureScale: 34,
  edgeEmphasis: 0.55,
  flowEnabled: true,
  breathingEnabled: true,
  animationDuration: 4,
  frameRate: 24,
  flowSpeed: 0.65,
  breathingAmplitude: 22,
};
```

- [ ] **Step 5: Implement dimension helpers**

Create `src/stencil/dimensions.ts`:

```ts
const MP4_MAX_SIDE = 1080;

function even(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2);
}

export function calculateMp4Dimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const longestSide = Math.max(safeWidth, safeHeight);
  const scale = longestSide > MP4_MAX_SIDE ? MP4_MAX_SIDE / longestSide : 1;

  return {
    width: even(safeWidth * scale),
    height: even(safeHeight * scale),
  };
}

export function calculateFrameCount(duration: number, frameRate: number): number {
  return Math.max(1, Math.floor(duration * frameRate));
}

export function getFrameTime(frameIndex: number, frameRate: number): number {
  return frameIndex / frameRate;
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm run test:run -- src/stencil/defaults.test.ts src/stencil/dimensions.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/stencil/types.ts src/stencil/defaults.ts src/stencil/dimensions.ts src/stencil/defaults.test.ts src/stencil/dimensions.test.ts
git commit -m "feat: add stencil settings helpers"
```

---

### Task 4: Implement Deterministic Stencil Pixel Rendering

**Files:**
- Create: `src/stencil/renderStencil.ts`
- Create: `src/stencil/renderStencil.test.ts`

- [ ] **Step 1: Write failing pixel tests**

Create `src/stencil/renderStencil.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";
import { renderStencilImageData } from "./renderStencil";

function makeImageData(values: number[]): ImageData {
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach((value, index) => {
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  });
  return new ImageData(data, values.length, 1);
}

function countOpaque(imageData: ImageData): number {
  let count = 0;
  for (let index = 3; index < imageData.data.length; index += 4) {
    if (imageData.data[index] > 0) {
      count += 1;
    }
  }
  return count;
}

describe("renderStencilImageData", () => {
  it("applies threshold and transparent background", () => {
    const output = renderStencilImageData({
      source: makeImageData([20, 120, 220]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        threshold: 140,
        textureDensity: 0,
        foregroundColor: "#ff0000",
        backgroundMode: "transparent",
      },
      time: 0,
    });

    expect(output.data[0]).toBe(255);
    expect(output.data[1]).toBe(0);
    expect(output.data[2]).toBe(0);
    expect(output.data[3]).toBe(255);
    expect(output.data[11]).toBe(0);
  });

  it("supports inverted foreground selection", () => {
    const normal = renderStencilImageData({
      source: makeImageData([20, 220]),
      settings: { ...DEFAULT_STENCIL_SETTINGS, textureDensity: 0 },
      time: 0,
    });
    const inverted = renderStencilImageData({
      source: makeImageData([20, 220]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        invert: true,
        textureDensity: 0,
      },
      time: 0,
    });

    expect(normal.data[3]).toBe(255);
    expect(normal.data[7]).toBe(0);
    expect(inverted.data[3]).toBe(0);
    expect(inverted.data[7]).toBe(255);
  });

  it("renders white and custom backgrounds", () => {
    const white = renderStencilImageData({
      source: makeImageData([240]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        textureDensity: 0,
        backgroundMode: "white",
      },
      time: 0,
    });
    const custom = renderStencilImageData({
      source: makeImageData([240]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        textureDensity: 0,
        backgroundMode: "custom",
        backgroundColor: "#123456",
      },
      time: 0,
    });

    expect(Array.from(white.data.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(custom.data.slice(0, 4))).toEqual([18, 52, 86, 255]);
  });

  it("changes output when texture settings and time change", () => {
    const source = makeImageData(Array.from({ length: 64 }, () => 30));
    const first = renderStencilImageData({
      source,
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        textureType: "mixed",
        textureDensity: 0.9,
        textureScale: 8,
      },
      time: 0,
    });
    const second = renderStencilImageData({
      source,
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        textureType: "mixed",
        textureDensity: 0.9,
        textureScale: 8,
      },
      time: 1.2,
    });

    expect(countOpaque(first)).not.toBe(countOpaque(second));
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- src/stencil/renderStencil.test.ts
```

Expected: FAIL because `renderStencil.ts` does not exist.

- [ ] **Step 3: Implement renderer**

Create `src/stencil/renderStencil.ts`:

```ts
import type { StencilRenderInput, StencilSettings } from "./types";

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseHexColor(value: string): Rgba {
  const normalized = value.replace("#", "");
  const hex = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized.padEnd(6, "0").slice(0, 6);

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: 255,
  };
}

function getBackgroundColor(settings: StencilSettings): Rgba {
  if (settings.backgroundMode === "transparent") {
    return { r: 255, g: 255, b: 255, a: 0 };
  }
  if (settings.backgroundMode === "white") {
    return { r: 255, g: 255, b: 255, a: 255 };
  }
  return parseHexColor(settings.backgroundColor);
}

function luminance(data: Uint8ClampedArray, index: number): number {
  return data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
}

function sampleLuminance(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const clampedX = Math.min(width - 1, Math.max(0, x));
  const clampedY = Math.min(height - 1, Math.max(0, y));
  return luminance(data, (clampedY * width + clampedX) * 4);
}

function edgeStrength(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const center = sampleLuminance(data, width, height, x, y);
  const right = sampleLuminance(data, width, height, x + 1, y);
  const down = sampleLuminance(data, width, height, x, y + 1);
  return clamp01((Math.abs(center - right) + Math.abs(center - down)) / 180);
}

function waveNoise(x: number, y: number, time: number, scale: number): number {
  const safeScale = Math.max(2, scale);
  const nx = x / safeScale;
  const ny = y / safeScale;
  const a = Math.sin(nx * 2.7 + time * 2.2);
  const b = Math.cos(ny * 3.1 - time * 1.7);
  const c = Math.sin((nx + ny) * 4.4 + time * 0.9);
  return (a + b + c + 3) / 6;
}

function lineField(x: number, y: number, time: number, scale: number): number {
  const safeScale = Math.max(2, scale);
  const phase = (x * 0.72 + y * 1.18) / safeScale + time;
  const wave = Math.abs(Math.sin(phase * Math.PI * 2));
  return 1 - wave;
}

function shouldRemoveForTexture(
  x: number,
  y: number,
  time: number,
  edge: number,
  settings: StencilSettings,
): boolean {
  const density = clamp01(settings.textureDensity);
  if (density <= 0) {
    return false;
  }

  const textureTime = settings.flowEnabled ? time * settings.flowSpeed : 0;
  const holes = waveNoise(x, y, textureTime, settings.textureScale);
  const lines = lineField(x, y, textureTime, settings.textureScale);
  const mixed = settings.textureType === "holes"
    ? holes
    : settings.textureType === "lines"
      ? lines
      : holes * 0.58 + lines * 0.42;

  const edgeAllowance = edge * clamp01(settings.edgeEmphasis) * 0.24;
  return mixed > 1 - density * 0.72 - edgeAllowance;
}

function writePixel(
  data: Uint8ClampedArray,
  index: number,
  color: Rgba,
): void {
  data[index] = color.r;
  data[index + 1] = color.g;
  data[index + 2] = color.b;
  data[index + 3] = color.a;
}

export function renderStencilImageData({
  source,
  settings,
  time,
}: StencilRenderInput): ImageData {
  const output = new ImageData(source.width, source.height);
  const foreground = parseHexColor(settings.foregroundColor);
  const background = getBackgroundColor(settings);
  const breathing = settings.breathingEnabled
    ? Math.sin((time / settings.animationDuration) * Math.PI * 2)
      * settings.breathingAmplitude
    : 0;
  const threshold = clamp(settings.threshold + breathing);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const lightness = luminance(source.data, index);
      const selected = settings.invert
        ? lightness >= threshold
        : lightness <= threshold;
      const edge = edgeStrength(source.data, source.width, source.height, x, y);
      const removed = selected
        ? shouldRemoveForTexture(x, y, time, edge, settings)
        : true;

      writePixel(output.data, index, selected && !removed ? foreground : background);
    }
  }

  return output;
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:run -- src/stencil/renderStencil.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stencil/renderStencil.ts src/stencil/renderStencil.test.ts
git commit -m "feat: render stencil image data"
```

---

### Task 5: Add Browser Image and PNG Export Adapters

**Files:**
- Create: `src/stencil/image.ts`
- Create: `src/stencil/exportPng.ts`
- Create: `src/stencil/exportPng.test.ts`
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Extend canvas test setup**

Modify `src/test/setup.ts` so `getContext()` includes image-data methods:

```ts
putImageData: vi.fn(),
drawImage: vi.fn(),
getImageData: vi.fn(() => new ImageData(new Uint8ClampedArray([
  0, 0, 0, 255,
]), 1, 1)),
```

Add a `toBlob` stub:

```ts
Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
  value: vi.fn(function toBlob(callback: BlobCallback) {
    callback(new Blob(["png"], { type: "image/png" }));
  }),
});
```

- [ ] **Step 2: Write failing PNG tests**

Create `src/stencil/exportPng.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";
import { exportStencilPng } from "./exportPng";

describe("exportStencilPng", () => {
  it("renders original dimensions and downloads a PNG", async () => {
    const putImageData = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => new ImageData(new Uint8ClampedArray([
          20, 20, 20, 255,
          240, 240, 240, 255,
        ]), 2, 1),
        putImageData,
      }),
      toBlob: (callback: BlobCallback) => callback(new Blob(["png"], {
        type: "image/png",
      })),
    } as unknown as HTMLCanvasElement;
    const download = vi.fn();

    await exportStencilPng(
      {
        image: {} as CanvasImageSource,
        width: 2,
        height: 1,
        name: "sample.jpg",
      },
      DEFAULT_STENCIL_SETTINGS,
      0,
      {
        createCanvas: () => canvas,
        download,
      },
    );

    expect(canvas.width).toBe(2);
    expect(canvas.height).toBe(1);
    expect(putImageData).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledWith(
      expect.any(Blob),
      "stencil-sample.png",
    );
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm run test:run -- src/stencil/exportPng.test.ts
```

Expected: FAIL because `exportPng.ts` does not exist.

- [ ] **Step 4: Implement image decode helper**

Create `src/stencil/image.ts`:

```ts
import type { StencilSource } from "./types";

export async function decodeStencilImage(file: File): Promise<StencilSource> {
  const bitmap = await createImageBitmap(file);
  return {
    image: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    name: file.name,
  };
}

export function getBaseName(filename: string): string {
  const withoutPath = filename.split(/[\\/]/).pop() ?? "image";
  return withoutPath.replace(/\.[^.]+$/, "") || "image";
}

export function readSourceImageData(
  source: StencilSource,
  canvas: HTMLCanvasElement,
): ImageData {
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("无法初始化图像处理画布");
  }
  context.drawImage(source.image, 0, 0, source.width, source.height);
  return context.getImageData(0, 0, source.width, source.height);
}
```

- [ ] **Step 5: Implement PNG export**

Create `src/stencil/exportPng.ts`:

```ts
import { getBaseName, readSourceImageData } from "./image";
import { renderStencilImageData } from "./renderStencil";
import type {
  StencilExportDependencies,
  StencilSettings,
  StencilSource,
} from "./types";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("无法创建 PNG"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function exportStencilPng(
  source: StencilSource,
  settings: StencilSettings,
  time: number,
  dependencies: StencilExportDependencies = {},
): Promise<void> {
  const canvas = dependencies.createCanvas?.(source.width, source.height)
    ?? document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("无法初始化 PNG 画布");
  }

  const sourceImageData = readSourceImageData(source, canvas);
  const output = renderStencilImageData({
    source: sourceImageData,
    settings,
    time,
  });
  context.putImageData(output, 0, 0);

  const blob = await createPngBlob(canvas);
  const filename = `stencil-${getBaseName(source.name)}.png`;
  (dependencies.download ?? downloadBlob)(blob, filename);
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm run test:run -- src/stencil/exportPng.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/test/setup.ts src/stencil/image.ts src/stencil/exportPng.ts src/stencil/exportPng.test.ts
git commit -m "feat: export stencil png"
```

---

### Task 6: Add MP4 Export Adapter

**Files:**
- Create: `src/stencil/exportMp4.ts`
- Create: `src/stencil/exportMp4.test.ts`

- [ ] **Step 1: Write failing MP4 adapter tests**

Create `src/stencil/exportMp4.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";
import {
  StencilMp4UnsupportedError,
  exportStencilMp4,
  isStencilMp4Supported,
} from "./exportMp4";

const source = {
  image: {} as CanvasImageSource,
  width: 2,
  height: 2,
  name: "motion.png",
};

describe("isStencilMp4Supported", () => {
  it("returns false when mediabunny cannot encode AVC for the dimensions", async () => {
    const supported = await isStencilMp4Supported(640, 480, {
      getFirstEncodableVideoCodec: vi.fn().mockResolvedValue(null),
    });

    expect(supported).toBe(false);
  });
});

describe("exportStencilMp4", () => {
  it("throws a compatibility error before rendering unsupported exports", async () => {
    await expect(exportStencilMp4(source, DEFAULT_STENCIL_SETTINGS, {
      getFirstEncodableVideoCodec: vi.fn().mockResolvedValue(null),
      createCanvas: vi.fn(),
    })).rejects.toBeInstanceOf(StencilMp4UnsupportedError);
  });

  it("reports progress while adding frames for supported exports", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const output = {
      addVideoTrack: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      finalize: vi.fn().mockResolvedValue(undefined),
      target: { buffer: new ArrayBuffer(4) },
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => new ImageData(new Uint8ClampedArray(16), 2, 2),
        putImageData: vi.fn(),
      }),
    } as unknown as HTMLCanvasElement;
    const progress = vi.fn();
    const download = vi.fn();

    await exportStencilMp4(
      source,
      {
        ...DEFAULT_STENCIL_SETTINGS,
        animationDuration: 1,
        frameRate: 2,
      },
      {
        getFirstEncodableVideoCodec: vi.fn().mockResolvedValue("avc"),
        createCanvas: () => canvas,
        createOutput: vi.fn(() => output),
        createCanvasSource: vi.fn(() => ({ add })),
        download,
        onProgress: progress,
      },
    );

    expect(add).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenLastCalledWith(1);
    expect(download).toHaveBeenCalledWith(
      expect.any(Blob),
      "stencil-motion.mp4",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- src/stencil/exportMp4.test.ts
```

Expected: FAIL because `exportMp4.ts` does not exist.

- [ ] **Step 3: Implement MP4 adapter**

Create `src/stencil/exportMp4.ts`:

```ts
import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  getFirstEncodableVideoCodec,
  type VideoCodec,
} from "mediabunny";
import {
  calculateFrameCount,
  calculateMp4Dimensions,
  getFrameTime,
} from "./dimensions";
import { getBaseName, readSourceImageData } from "./image";
import { renderStencilImageData } from "./renderStencil";
import type { StencilSettings, StencilSource } from "./types";

export class StencilMp4UnsupportedError extends Error {
  constructor() {
    super("当前浏览器不支持本地 MP4 编码。请继续导出 PNG，或换用支持 WebCodecs AVC/H.264 编码的浏览器。");
  }
}

interface OutputLike {
  addVideoTrack: (source: unknown) => unknown;
  start: () => Promise<void>;
  finalize: () => Promise<void>;
  target: { buffer: ArrayBuffer };
}

interface CanvasSourceLike {
  add: (timestamp: number, duration: number, options?: { keyFrame?: boolean }) => Promise<void>;
}

interface Mp4Dependencies {
  getFirstEncodableVideoCodec?: typeof getFirstEncodableVideoCodec;
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
  createOutput?: () => OutputLike;
  createCanvasSource?: (
    canvas: HTMLCanvasElement,
    options: { codec: VideoCodec; bitrate: typeof QUALITY_HIGH },
  ) => CanvasSourceLike;
  download?: (blob: Blob, filename: string) => void;
  onProgress?: (progress: number) => void;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createDefaultOutput(): OutputLike {
  return new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  }) as OutputLike;
}

function createDefaultCanvasSource(
  canvas: HTMLCanvasElement,
  options: { codec: VideoCodec; bitrate: typeof QUALITY_HIGH },
): CanvasSourceLike {
  return new CanvasSource(canvas, options);
}

export async function isStencilMp4Supported(
  width: number,
  height: number,
  dependencies: Pick<Mp4Dependencies, "getFirstEncodableVideoCodec"> = {},
): Promise<boolean> {
  const dimensions = calculateMp4Dimensions(width, height);
  const checker = dependencies.getFirstEncodableVideoCodec
    ?? getFirstEncodableVideoCodec;
  const codec = await checker(["avc"], {
    width: dimensions.width,
    height: dimensions.height,
  });
  return codec === "avc";
}

export async function exportStencilMp4(
  source: StencilSource,
  settings: StencilSettings,
  dependencies: Mp4Dependencies = {},
): Promise<void> {
  const dimensions = calculateMp4Dimensions(source.width, source.height);
  const checker = dependencies.getFirstEncodableVideoCodec
    ?? getFirstEncodableVideoCodec;
  const codec = await checker(["avc"], {
    width: dimensions.width,
    height: dimensions.height,
  });
  if (codec !== "avc") {
    throw new StencilMp4UnsupportedError();
  }

  const canvas = dependencies.createCanvas?.(dimensions.width, dimensions.height)
    ?? document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("无法初始化 MP4 画布");
  }

  const output = dependencies.createOutput?.() ?? createDefaultOutput();
  const videoSource = dependencies.createCanvasSource?.(canvas, {
    codec,
    bitrate: QUALITY_HIGH,
  }) ?? createDefaultCanvasSource(canvas, {
    codec,
    bitrate: QUALITY_HIGH,
  });
  output.addVideoTrack(videoSource);
  await output.start();

  const sourceCanvas = dependencies.createCanvas?.(dimensions.width, dimensions.height)
    ?? document.createElement("canvas");
  sourceCanvas.width = dimensions.width;
  sourceCanvas.height = dimensions.height;
  const scaledSource = {
    ...source,
    width: dimensions.width,
    height: dimensions.height,
  };
  const frameCount = calculateFrameCount(
    settings.animationDuration,
    settings.frameRate,
  );

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = getFrameTime(frame, settings.frameRate);
    const imageData = readSourceImageData(scaledSource, sourceCanvas);
    const rendered = renderStencilImageData({
      source: imageData,
      settings,
      time,
    });
    context.putImageData(rendered, 0, 0);
    await videoSource.add(time, 1 / settings.frameRate, {
      keyFrame: frame % Math.max(1, settings.frameRate) === 0,
    });
    dependencies.onProgress?.((frame + 1) / frameCount);
  }

  await output.finalize();
  const blob = new Blob([output.target.buffer], { type: "video/mp4" });
  const filename = `stencil-${getBaseName(source.name)}.mp4`;
  (dependencies.download ?? downloadBlob)(blob, filename);
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:run -- src/stencil/exportMp4.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stencil/exportMp4.ts src/stencil/exportMp4.test.ts
git commit -m "feat: export stencil mp4"
```

---

### Task 7: Build the Stencil Workspace UI

**Files:**
- Modify: `src/stencil/StylizedImageWorkspace.tsx`
- Create: `src/stencil/StylizedImageWorkspace.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing workspace tests**

Create `src/stencil/StylizedImageWorkspace.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StylizedImageWorkspace } from "./StylizedImageWorkspace";

describe("StylizedImageWorkspace", () => {
  it("starts with upload empty state and disabled exports", () => {
    render(<StylizedImageWorkspace onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "镂空图像转换" }))
      .toBeInTheDocument();
    expect(screen.getByText("上传一张图片开始转换")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 PNG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "导出 MP4" })).toBeDisabled();
  });

  it("updates visual controls independently", async () => {
    const user = userEvent.setup();
    render(<StylizedImageWorkspace onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("前景色"), {
      target: { value: "#ff0000" },
    });
    await user.selectOptions(screen.getByLabelText("背景模式"), "custom");
    fireEvent.change(screen.getByLabelText("背景色"), {
      target: { value: "#123456" },
    });
    fireEvent.change(screen.getByLabelText("阈值"), {
      target: { value: "180" },
    });
    await user.selectOptions(screen.getByLabelText("纹理类型"), "lines");

    expect(screen.getByLabelText("前景色")).toHaveValue("#ff0000");
    expect(screen.getByLabelText("背景模式")).toHaveValue("custom");
    expect(screen.getByLabelText("背景色")).toHaveValue("#123456");
    expect(screen.getByLabelText("阈值")).toHaveValue("180");
    expect(screen.getByLabelText("纹理类型")).toHaveValue("lines");
  });

  it("returns to the effect selection page", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<StylizedImageWorkspace onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: "返回效果选择" }));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test:run -- src/stencil/StylizedImageWorkspace.test.tsx
```

Expected: FAIL because the workspace still renders only the temporary header.

- [ ] **Step 3: Implement workspace UI**

Replace `src/stencil/StylizedImageWorkspace.tsx` with:

```tsx
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";
import { decodeStencilImage, readSourceImageData } from "./image";
import { renderStencilImageData } from "./renderStencil";
import { exportStencilPng } from "./exportPng";
import {
  StencilMp4UnsupportedError,
  exportStencilMp4,
} from "./exportMp4";
import type { StencilSettings, StencilSource } from "./types";

interface StylizedImageWorkspaceProps {
  onBack: () => void;
}

type NumericSetting = Extract<{
  [Key in keyof StencilSettings]: StencilSettings[Key] extends number ? Key : never
}[keyof StencilSettings], string>;

function NumberRange({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
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
    const start = performance.now();
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
  }, [playing, settings.animationDuration]);

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
            <NumberRange label="阈值" max={255} min={0} onChange={patchNumber("threshold")} value={settings.threshold} />
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
            <NumberRange label="纹理密度" max={1} min={0} onChange={patchNumber("textureDensity")} step={0.01} value={settings.textureDensity} />
            <NumberRange label="纹理尺度" max={120} min={4} onChange={patchNumber("textureScale")} value={settings.textureScale} />
            <NumberRange label="边缘强调" max={1} min={0} onChange={patchNumber("edgeEmphasis")} step={0.01} value={settings.edgeEmphasis} />
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
            <NumberRange label="动画时长" max={12} min={1} onChange={patchNumber("animationDuration")} value={settings.animationDuration} />
            <NumberRange label="帧率" max={30} min={8} onChange={patchNumber("frameRate")} value={settings.frameRate} />
            <NumberRange label="流动速度" max={2} min={0} onChange={patchNumber("flowSpeed")} step={0.05} value={settings.flowSpeed} />
            <NumberRange label="呼吸幅度" max={80} min={0} onChange={patchNumber("breathingAmplitude")} value={settings.breathingAmplitude} />
          </section>
        </aside>
      </section>
      <div className={`notice${notice ? " notice--visible" : ""}`}>
        {notice}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Add stencil workspace styles**

Append to `src/styles.css`:

```css
.stencil-shell {
  background: var(--paper);
  min-height: 100vh;
  overflow: hidden;
}
.stencil-top-bar {
  align-items: center;
  background: var(--ink);
  color: #f7f3ec;
  display: flex;
  gap: 18px;
  height: 76px;
  justify-content: space-between;
  padding: 0 22px;
}
.stencil-top-bar h1 {
  flex: 1;
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}
.stencil-frame {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  height: calc(100vh - 76px);
}
.stencil-preview {
  align-items: center;
  background: #ded8cd;
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
  min-width: 0;
  padding: 34px;
}
.stencil-preview canvas {
  background: #fff;
  box-shadow: var(--canvas-shadow);
  max-height: calc(100vh - 170px);
  max-width: 100%;
}
.stencil-empty-state {
  align-items: center;
  background: var(--panel-bright);
  border: 1px dashed #b8afa2;
  border-radius: 22px;
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 360px;
  justify-content: center;
  width: min(620px, 90%);
}
.stencil-empty-state span {
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 28px;
}
.stencil-empty-state small {
  color: var(--muted);
}
.stencil-playbar {
  align-items: center;
  color: var(--muted);
  display: flex;
  font-size: 12px;
  gap: 10px;
}
.stencil-playbar button {
  background: var(--panel-bright);
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--ink);
  padding: 8px 12px;
}
.stencil-inspector {
  height: calc(100vh - 76px);
}
.inspector-heading--sub {
  padding-bottom: 8px;
}
.inspector-heading--sub h2 {
  font-size: 18px;
}
.range-field {
  display: grid;
  grid-template-columns: 1fr auto;
}
.range-field input {
  grid-column: 1 / -1;
}
.range-field output {
  color: var(--terracotta-dark);
  font-size: 11px;
  font-weight: 800;
}
.visually-hidden {
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
```

- [ ] **Step 5: Run workspace tests**

Run:

```bash
npm run test:run -- src/stencil/StylizedImageWorkspace.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/stencil/StylizedImageWorkspace.tsx src/stencil/StylizedImageWorkspace.test.tsx src/styles.css
git commit -m "feat: build stencil workspace"
```

---

### Task 8: Verify, Document, Deploy

**Files:**
- Modify: `README.md`
- Modify as needed: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Update README**

Replace the opening README paragraph with:

```md
# Visual Text Tool

Visual Text Tool is a browser-local visual-effects playground with two
workflows:

- `文字区域填充`: choose a solid canvas, draw freeform regions, densely fill
  each region with preset or custom text, tune typography and colors, and export
  PNG.
- `镂空图像转换`: upload any still image, transform the full image into a
  single-color high-contrast stencil effect, tune threshold, color, texture, and
  animation settings, then export PNG or a browser-local MP4 when supported.

The app does not upload artwork to a server.
```

Add this MP4 note under `## Storage`:

```md
MP4 export uses browser WebCodecs AVC/H.264 support through Mediabunny. If the
current browser cannot encode MP4 locally, the app shows a compatibility notice
and PNG export remains available.
```

- [ ] **Step 2: Run full automated verification**

Run:

```bash
npm run test:run
npm run build
```

Expected: all tests PASS and Vite produces `dist/`.

- [ ] **Step 3: Start local preview**

Run:

```bash
npm run dev -- --port 4174
```

Expected: Vite serves the project at `http://127.0.0.1:4174/verseform/`.

- [ ] **Step 4: Browser verification**

Use the in-app browser at `http://127.0.0.1:4174/verseform/`:

- Confirm the selection page shows both entries.
- Open `文字区域填充`, draw a region, return to selection.
- Open `镂空图像转换`.
- Upload a small PNG or JPEG.
- Change foreground color, background mode, threshold, texture mode, density,
  scale, edge emphasis, duration, frame rate, flow speed, and breathing
  amplitude.
- Press play and pause.
- Export PNG and confirm a download is triggered.
- Export MP4 in a supported browser, or confirm the compatibility notice in an
  unsupported browser.

- [ ] **Step 5: Commit docs and final fixes**

```bash
git add README.md .github/workflows/deploy-pages.yml src package.json package-lock.json
git commit -m "docs: document stencil image transformer"
```

Skip this commit if `README.md` and workflow files have already been included
in earlier commits and there are no remaining changes.

- [ ] **Step 6: Push and confirm GitHub Pages**

Run:

```bash
git push origin main
gh run list --workflow "Deploy GitHub Pages" --limit 1
```

Expected: the latest Pages workflow starts for the pushed commit.

After completion:

```bash
curl -I https://qiiii1.github.io/verseform/
```

Expected: HTTP `200`.

- [ ] **Step 7: Final response**

Report:

- Online URL: `https://qiiii1.github.io/verseform/`
- Tests and build status.
- Whether MP4 was verified by real export or by compatibility branch.
- Latest commit SHA.
- Any remaining browser compatibility caveat.

---

## Self-Review

- Spec coverage: the plan covers the entry page, existing text workspace preservation, full-image stencil processing, visual parameters, animation parameters, PNG export, local MP4 export, unsupported MP4 notice, automated tests, browser verification, README update, and GitHub Pages deployment.
- Red-flag scan: no unfilled steps remain.
- Type consistency: `StencilSettings`, `StencilSource`, `StencilBackgroundMode`, `StencilTextureType`, and export dependency names are introduced before use and reused consistently across tasks.
