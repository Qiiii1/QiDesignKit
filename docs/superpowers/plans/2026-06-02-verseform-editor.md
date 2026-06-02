# Verseform Image Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-first, browser-local React image editor where users draw freeform regions, fill them with configurable Chinese or English poetry, undo edits, restore work after refresh, and export an original-size PNG.

**Architecture:** Keep document behavior in pure TypeScript modules and keep Canvas 2D as a deterministic rendering adapter. React owns editor-session state and UI composition, while IndexedDB persists the active project and uploaded image blob. Use one renderer for both the scaled editor preview and scale-`1` PNG export so exported output cannot drift from the editor model.

**Tech Stack:** React 19, Vite, TypeScript, Canvas 2D, IndexedDB, Vitest, Testing Library, `fake-indexeddb`, browser acceptance through the in-app Browser plugin.

---

## File Map

Create these focused files:

```text
index.html                         Vite entry document
package.json                       scripts and dependencies
tsconfig.json                      TypeScript project settings
vite.config.ts                     Vite + Vitest settings
src/main.tsx                       React bootstrap
src/App.tsx                        editor composition and persistence wiring
src/styles.css                     editorial visual system and responsive desktop layout
src/domain/types.ts                document and editor-session types
src/domain/defaults.ts             initial document, default region style, validation
src/domain/poems.ts                included Chinese and English poem excerpts
src/geometry/polygon.ts            path closing, sampling, hit testing, scanline segments
src/text/tokenize.ts               reading-oriented Chinese and English tokenization
src/text/layout.ts                 horizontal and vertical polygon text layout
src/editor/reducer.ts              document mutations and bounded undo stack
src/storage/projectStore.ts        IndexedDB document and blob persistence
src/canvas/renderDocument.ts       preview and export drawing pipeline
src/canvas/exportPng.ts            original-size PNG generation and download
src/components/TopBar.tsx          canvas setup, upload, undo, contour toggle, export
src/components/ToolRail.tsx        select and draw tool controls
src/components/EditorCanvas.tsx    canvas lifecycle and mouse interactions
src/components/Inspector.tsx       poetry and selected-region controls
src/components/Notice.tsx          user-visible warnings and errors
src/test/setup.ts                  Testing Library, IndexedDB, canvas test setup
src/**/*.test.ts(x)                colocated unit and component tests
README.md                          local development and user workflow
```

## Task 1: Scaffold The Tested React Application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Create package and test configuration**

Use these scripts and dependencies:

```json
{
  "name": "verseform",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.5.2",
    "fake-indexeddb": "^6.0.1",
    "jsdom": "^26.1.0",
    "typescript": "~5.8.3",
    "vite": "^6.3.5",
    "vitest": "^3.2.4"
  }
}
```

Configure Vitest in `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verseform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { vi } from "vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: vi.fn(() => ({
    save: vi.fn(), restore: vi.fn(), scale: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(),
    drawImage: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
    stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(), fillText: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 10 }),
  })),
});
Object.defineProperty(HTMLCanvasElement.prototype, "getBoundingClientRect", {
  value: () => ({ left: 0, top: 0, width: 1200, height: 1200, right: 1200, bottom: 1200, x: 0, y: 0, toJSON() {} }),
});
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Write the failing application smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows the Verseform editor shell", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Verseform" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 PNG" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the smoke test and confirm the expected failure**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL because `src/App.tsx` does not exist yet.

- [ ] **Step 5: Add the minimal editor shell**

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1>Verseform</h1>
        <button type="button">导出 PNG</button>
      </header>
      <section className="editor-frame" aria-label="诗歌图片编辑器" />
    </main>
  );
}
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Add the editorial palette to `src/styles.css`:

```css
:root {
  font-family: Inter, "Noto Sans SC", "PingFang SC", sans-serif;
  color: #292720;
  background: #e8e3da;
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 1120px; min-height: 100vh; }
button, input, select, textarea { font: inherit; }
.top-bar { display: flex; align-items: center; justify-content: space-between; }
```

- [ ] **Step 6: Run the smoke test and build**

Run: `npm run test:run -- src/App.test.tsx && npm run build`

Expected: PASS and Vite writes `dist/`.

- [ ] **Step 7: Commit the scaffold**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src
git commit -m "chore: scaffold verseform web app"
```

## Task 2: Define Document Types, Defaults, Poems, And Dimension Validation

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/defaults.ts`
- Create: `src/domain/poems.ts`
- Create: `src/domain/defaults.test.ts`

- [ ] **Step 1: Write failing domain tests**

Create `src/domain/defaults.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultDocument, createDefaultRegion, validateCanvasDimension } from "./defaults";

describe("domain defaults", () => {
  it("starts with a visible-contour solid canvas", () => {
    expect(createDefaultDocument()).toMatchObject({
      background: { kind: "solid", width: 1200, height: 1200, color: "#d9c7ae" },
      regions: [],
      showContours: true,
    });
  });

  it.each([
    ["63", false],
    ["64", true],
    ["4096", true],
    ["4097", false],
    ["12.5", false],
  ])("validates solid canvas dimension %s", (value, valid) => {
    expect(validateCanvasDimension(value)).toBe(valid);
  });

  it("creates independent default region data", () => {
    const first = createDefaultRegion([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 50 }]);
    const second = createDefaultRegion([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 40 }]);
    first.points[0].x = 999;
    expect(second.points[0].x).toBe(0);
    expect(first.writingMode).toBe("horizontal");
    expect(first.repeatFill).toBe(true);
  });
});
```

- [ ] **Step 2: Run the domain tests and confirm the expected failure**

Run: `npm run test:run -- src/domain/defaults.test.ts`

Expected: FAIL because `src/domain/defaults.ts` does not exist.

- [ ] **Step 3: Add document types and defaults**

Create `src/domain/types.ts` with:

```ts
export type WritingMode = "horizontal" | "vertical";
export type EditorTool = "select" | "draw";
export type PoetrySource = "library" | "custom";

export interface Point { x: number; y: number; }
export interface SolidBackground { kind: "solid"; width: number; height: number; color: string; }
export interface ImageBackground { kind: "image"; width: number; height: number; color: string; imageBlobId: string; }
export type CanvasBackground = SolidBackground | ImageBackground;

export interface TextRegion {
  id: string;
  points: Point[];
  poetrySource: PoetrySource;
  poemId?: string;
  text: string;
  writingMode: WritingMode;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineSpacing: number;
  letterSpacing: number;
  padding: number;
  maxWords: number;
  color: string;
  repeatFill: boolean;
  contourColor: string;
  contourWidth: number;
}

export interface EditorDocument {
  background: CanvasBackground;
  regions: TextRegion[];
  showContours: boolean;
}
```

Create `src/domain/poems.ts` with two Chinese and two English public-domain excerpts:

```ts
export interface Poem {
  id: string;
  language: "zh" | "en";
  title: string;
  author: string;
  text: string;
}

export const POEMS: Poem[] = [
  { id: "quiet-night", language: "zh", title: "静夜思", author: "李白", text: "床前明月光，疑是地上霜。举头望明月，低头思故乡。" },
  { id: "spring-dawn", language: "zh", title: "春晓", author: "孟浩然", text: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。" },
  { id: "hope", language: "en", title: "Hope", author: "Emily Dickinson", text: "Hope is the thing with feathers that perches in the soul and sings the tune without the words and never stops at all." },
  { id: "dawn", language: "en", title: "A Clear Midnight", author: "Walt Whitman", text: "This is thy hour O Soul thy free flight into the wordless away from books away from art the day erased the lesson done." },
];
```

Implement `src/domain/defaults.ts` with constants, `validateCanvasDimension`, `createDefaultDocument`, and this region factory. Use the first included poem as the initial poetry source and clone every point:

```ts
export const DEFAULT_REGION_STYLE: Omit<TextRegion, "id" | "points"> = {
  poetrySource: "library",
  poemId: POEMS[0].id,
  text: POEMS[0].text,
  writingMode: "horizontal",
  fontFamily: '"Noto Serif SC", "Songti SC", serif',
  fontSize: 28,
  fontWeight: 400,
  lineSpacing: 10,
  letterSpacing: 2,
  padding: 16,
  maxWords: 160,
  color: "#f8f1e7",
  repeatFill: true,
  contourColor: "#fffaf2",
  contourWidth: 2,
};

export function validateCanvasDimension(value: string): boolean {
  const dimension = Number(value);
  return Number.isInteger(dimension) && dimension >= 64 && dimension <= 4096;
}

export function createDefaultDocument(): EditorDocument {
  return {
    background: { kind: "solid", width: 1200, height: 1200, color: "#d9c7ae" },
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
```

- [ ] **Step 4: Run domain tests**

Run: `npm run test:run -- src/domain/defaults.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit domain primitives**

```bash
git add src/domain
git commit -m "feat: define editor document model"
```

## Task 3: Implement Freeform Polygon Geometry

**Files:**
- Create: `src/geometry/polygon.ts`
- Create: `src/geometry/polygon.test.ts`

- [ ] **Step 1: Write failing geometry tests**

Create `src/geometry/polygon.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  closePath,
  findNodeAt,
  getHorizontalSegments,
  getVerticalSegments,
  isUsablePolygon,
  pointInPolygon,
  samplePath,
} from "./polygon";

const square = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];

describe("polygon geometry", () => {
  it("closes an open path exactly once", () => {
    expect(closePath(square)).toEqual([...square, square[0]]);
    expect(closePath([...square, square[0]])).toEqual([...square, square[0]]);
  });

  it("samples a long mouse path while preserving the first and last points", () => {
    const path = Array.from({ length: 101 }, (_, x) => ({ x, y: 0 }));
    const sampled = samplePath(path, 20);
    expect(sampled.length).toBeLessThanOrEqual(20);
    expect(sampled[0]).toEqual(path[0]);
    expect(sampled.at(-1)).toEqual(path.at(-1));
  });

  it("tests polygon interior and contour-node proximity", () => {
    expect(pointInPolygon({ x: 50, y: 50 }, square)).toBe(true);
    expect(pointInPolygon({ x: 150, y: 50 }, square)).toBe(false);
    expect(findNodeAt({ x: 4, y: 3 }, square, 6)).toBe(0);
  });

  it("rejects undersized regions", () => {
    expect(isUsablePolygon([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }])).toBe(false);
    expect(isUsablePolygon(square)).toBe(true);
  });

  it("returns scanline segments inside a polygon", () => {
    expect(getHorizontalSegments(square, 50)).toEqual([{ start: 0, end: 100 }]);
    expect(getVerticalSegments(square, 50)).toEqual([{ start: 0, end: 100 }]);
  });
});
```

- [ ] **Step 2: Run geometry tests and confirm the expected failure**

Run: `npm run test:run -- src/geometry/polygon.test.ts`

Expected: FAIL because `src/geometry/polygon.ts` does not exist.

- [ ] **Step 3: Add pure polygon helpers**

Implement `src/geometry/polygon.ts` with these exports:

```ts
import type { Point } from "../domain/types";

export interface Segment { start: number; end: number; }
export function closePath(points: Point[]): Point[];
export function samplePath(points: Point[], maxPoints?: number): Point[];
export function polygonArea(points: Point[]): number;
export function isUsablePolygon(points: Point[]): boolean;
export function pointInPolygon(point: Point, polygon: Point[]): boolean;
export function findNodeAt(point: Point, nodes: Point[], radius: number): number | undefined;
export function getHorizontalSegments(polygon: Point[], y: number): Segment[];
export function getVerticalSegments(polygon: Point[], x: number): Segment[];
```

Use the shoelace formula for area, require at least `3` sampled points and at least `400` square pixels for a usable region, and implement scanline intersection by sorting paired intersections.

- [ ] **Step 4: Run geometry tests**

Run: `npm run test:run -- src/geometry/polygon.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit geometry helpers**

```bash
git add src/geometry
git commit -m "feat: add freeform polygon geometry"
```

## Task 4: Implement Reading-Oriented Tokens And Polygon Text Layout

**Files:**
- Create: `src/text/tokenize.ts`
- Create: `src/text/tokenize.test.ts`
- Create: `src/text/layout.ts`
- Create: `src/text/layout.test.ts`

- [ ] **Step 1: Write failing tokenizer tests**

Create `src/text/tokenize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prepareTextUnits, tokenizeReadingWords } from "./tokenize";

describe("poetry tokenization", () => {
  it("counts Chinese characters and contiguous English words while excluding punctuation", () => {
    expect(tokenizeReadingWords("明月，hello world! 光。")).toEqual(["明", "月", "hello", "world", "光"]);
  });

  it("shows punctuation without charging it against the maximum count", () => {
    expect(prepareTextUnits("明月，hello!", 3, false).map((unit) => unit.text)).toEqual(["明", "月", "，", "hello", "!"]);
  });

  it("repeats the poem until the maximum count when repeat fill is enabled", () => {
    expect(prepareTextUnits("明月，", 3, true).map((unit) => unit.text)).toEqual(["明", "月", "，", "明"]);
  });
});
```

- [ ] **Step 2: Run tokenizer tests and confirm the expected failure**

Run: `npm run test:run -- src/text/tokenize.test.ts`

Expected: FAIL because `src/text/tokenize.ts` does not exist.

- [ ] **Step 3: Implement tokenizer behavior**

Create `src/text/tokenize.ts`:

```ts
export interface TextUnit { text: string; tokenCost: 0 | 1; }

const READING_TOKEN = /[\p{Script=Han}]|[\p{L}\p{N}]+/gu;
const DISPLAY_UNIT = /[\p{Script=Han}]|[\p{L}\p{N}]+|[^\s]/gu;

export function tokenizeReadingWords(text: string): string[] {
  return text.match(READING_TOKEN) ?? [];
}

export function prepareTextUnits(text: string, maxWords: number, repeatFill: boolean): TextUnit[] {
  const displayUnits = (text.match(DISPLAY_UNIT) ?? []).map((unit) => ({
    text: unit,
    tokenCost: /^[\p{Script=Han}]$|^[\p{L}\p{N}]+$/u.test(unit) ? 1 as const : 0 as const,
  }));
  if (displayUnits.every((unit) => unit.tokenCost === 0) || maxWords <= 0) return [];
  const output: TextUnit[] = [];
  let charged = 0;
  let index = 0;
  while (charged < maxWords && (repeatFill || index < displayUnits.length)) {
    const unit = displayUnits[index % displayUnits.length];
    output.push(unit);
    charged += unit.tokenCost;
    index += 1;
  }
  while (!repeatFill && index < displayUnits.length && displayUnits[index].tokenCost === 0) {
    output.push(displayUnits[index]);
    index += 1;
  }
  return output;
}
```

- [ ] **Step 4: Write failing horizontal and vertical layout tests**

Create `src/text/layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { layoutTextInPolygon } from "./layout";

const square = [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 120 }, { x: 0, y: 120 }];
const measure = (text: string) => text.length * 10;

describe("polygon text layout", () => {
  it("flows horizontal text from left to right and top to bottom", () => {
    const placed = layoutTextInPolygon(square, ["明", "月", "光"], {
      mode: "horizontal", fontSize: 20, lineSpacing: 4, letterSpacing: 2, padding: 10, measure,
    });
    expect(placed.map(({ text }) => text)).toEqual(["明", "月", "光"]);
    expect(placed[0].x).toBeLessThan(placed[1].x);
  });

  it("flows vertical text from top to bottom and then right to left", () => {
    const placed = layoutTextInPolygon(square, ["春", "眠", "不", "觉", "晓", "处", "处", "闻"], {
      mode: "vertical", fontSize: 20, lineSpacing: 4, letterSpacing: 2, padding: 10, measure,
    });
    expect(placed[0].y).toBeLessThan(placed[1].y);
    expect(placed.at(-1)!.x).toBeLessThan(placed[0].x);
  });
});
```

- [ ] **Step 5: Run layout tests and confirm the expected failure**

Run: `npm run test:run -- src/text/layout.test.ts`

Expected: FAIL because `src/text/layout.ts` does not exist.

- [ ] **Step 6: Implement scanline-based text layout**

Create `src/text/layout.ts` with:

```ts
import type { Point, WritingMode } from "../domain/types";

export interface LayoutOptions {
  mode: WritingMode;
  fontSize: number;
  lineSpacing: number;
  letterSpacing: number;
  padding: number;
  measure: (text: string) => number;
}

export interface PlacedText { text: string; x: number; y: number; }

export function layoutTextInPolygon(
  polygon: Point[],
  units: string[],
  options: LayoutOptions,
): PlacedText[];
```

For horizontal layout, walk `y` from top bounds plus padding in `fontSize + lineSpacing` increments, get horizontal polygon segments, trim each end by padding, and place units while their measured width fits. For vertical layout, walk `x` from right bounds minus padding toward the left in `fontSize + lineSpacing` increments, get vertical segments, trim each end by padding, and place units downward in `fontSize + letterSpacing` increments.

- [ ] **Step 7: Run all text tests**

Run: `npm run test:run -- src/text`

Expected: PASS.

- [ ] **Step 8: Commit text behavior**

```bash
git add src/text
git commit -m "feat: lay poetry text inside polygon regions"
```

## Task 5: Add Editor Reducer And Bounded Undo

**Files:**
- Create: `src/editor/reducer.ts`
- Create: `src/editor/reducer.test.ts`

- [ ] **Step 1: Write failing reducer tests**

Create `src/editor/reducer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultDocument, createDefaultRegion } from "../domain/defaults";
import { createEditorState, editorReducer } from "./reducer";

const region = () => createDefaultRegion([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }]);

describe("editor reducer", () => {
  it("adds independent regions and undoes the newest edit", () => {
    let state = createEditorState(createDefaultDocument());
    state = editorReducer(state, { type: "region/add", region: region() });
    state = editorReducer(state, { type: "region/add", region: region() });
    expect(state.document.regions).toHaveLength(2);
    state = editorReducer(state, { type: "history/undo" });
    expect(state.document.regions).toHaveLength(1);
  });

  it("updates only the selected region", () => {
    const first = region();
    const second = region();
    let state = createEditorState({ ...createDefaultDocument(), regions: [first, second] });
    state = editorReducer(state, { type: "selection/set", regionId: first.id });
    state = editorReducer(state, { type: "region/update", patch: { color: "#ff0000" } });
    expect(state.document.regions[0].color).toBe("#ff0000");
    expect(state.document.regions[1].color).not.toBe("#ff0000");
  });

  it("keeps at most fifty undo snapshots", () => {
    let state = createEditorState(createDefaultDocument());
    for (let index = 0; index < 55; index += 1) {
      state = editorReducer(state, { type: "contours/toggle" });
    }
    expect(state.history).toHaveLength(50);
  });

  it("hydrates a restored project without adding a new undo snapshot", () => {
    const restored = { ...createDefaultDocument(), showContours: false };
    const state = editorReducer(createEditorState(createDefaultDocument()), {
      type: "project/hydrate", document: restored, history: [createDefaultDocument()],
    });
    expect(state.document.showContours).toBe(false);
    expect(state.history).toHaveLength(1);
  });

  it("updates next-region defaults without mutating the current document", () => {
    const state = editorReducer(createEditorState(createDefaultDocument()), {
      type: "defaults/update", patch: { writingMode: "vertical" },
    });
    expect(state.nextRegionDefaults.writingMode).toBe("vertical");
    expect(state.document.regions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run reducer tests and confirm the expected failure**

Run: `npm run test:run -- src/editor/reducer.test.ts`

Expected: FAIL because `src/editor/reducer.ts` does not exist.

- [ ] **Step 3: Implement reducer actions**

Create `src/editor/reducer.ts` with an `EditorState` containing `document`, `history`, `selectedRegionId`, `tool`, `draftPath`, `nextRegionDefaults`, and `notice`. Implement:

```ts
export type EditorAction =
  | { type: "project/hydrate"; document: EditorDocument; history: EditorDocument[] }
  | { type: "background/set"; background: CanvasBackground }
  | { type: "contours/toggle" }
  | { type: "history/undo" }
  | { type: "region/add"; region: TextRegion }
  | { type: "region/delete-selected" }
  | { type: "region/update"; patch: Partial<TextRegion> }
  | { type: "region/move-node"; nodeIndex: number; point: Point }
  | { type: "defaults/update"; patch: Partial<Omit<TextRegion, "id" | "points">> }
  | { type: "selection/set"; regionId?: string }
  | { type: "tool/set"; tool: EditorTool }
  | { type: "draft/set"; points: Point[] }
  | { type: "notice/set"; notice?: string };
```

Use a `commitDocument(state, document)` helper that appends the previous document and keeps `history.slice(-50)`. Session-only actions and `project/hydrate` must not append history. Clamp hydrated history to its most recent `50` snapshots. `defaults/update` changes only `nextRegionDefaults` and is used for the next region when no current region exists.

- [ ] **Step 4: Run reducer tests**

Run: `npm run test:run -- src/editor/reducer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit reducer and history**

```bash
git add src/editor
git commit -m "feat: add editor state and bounded undo"
```

## Task 6: Persist Project State And Image Blobs In IndexedDB

**Files:**
- Create: `src/storage/projectStore.ts`
- Create: `src/storage/projectStore.test.ts`

- [ ] **Step 1: Write failing IndexedDB tests**

Create `src/storage/projectStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultDocument } from "../domain/defaults";
import { deleteDatabase, loadProject, loadStoredImage, saveProject, saveStoredImage } from "./projectStore";

describe("project store", () => {
  beforeEach(async () => deleteDatabase());

  it("restores a saved document and undo history", async () => {
    const document = { ...createDefaultDocument(), showContours: false };
    await saveProject({ document, history: [createDefaultDocument()] });
    expect(await loadProject()).toEqual({ document, history: [createDefaultDocument()] });
  });

  it("stores uploaded image blobs separately", async () => {
    const blob = new Blob(["image"], { type: "image/png" });
    await saveStoredImage("source-image", blob);
    expect(await loadStoredImage("source-image")).toEqual(blob);
  });
});
```

- [ ] **Step 2: Run persistence tests and confirm the expected failure**

Run: `npm run test:run -- src/storage/projectStore.test.ts`

Expected: FAIL because `src/storage/projectStore.ts` does not exist.

- [ ] **Step 3: Implement IndexedDB storage**

Create `src/storage/projectStore.ts`. Use database `verseform`, version `1`, object stores `project` and `images`, and active-project key `active`. Export:

```ts
export interface PersistedProject {
  document: EditorDocument;
  history: EditorDocument[];
}

export async function saveProject(project: PersistedProject): Promise<void>;
export async function loadProject(): Promise<PersistedProject | undefined>;
export async function saveStoredImage(id: string, blob: Blob): Promise<void>;
export async function loadStoredImage(id: string): Promise<Blob | undefined>;
export async function deleteDatabase(): Promise<void>;
```

Wrap IDB requests and transactions in promises. Let failures reject so the React layer can display the automatic-save warning while keeping the current session alive.

- [ ] **Step 4: Run persistence tests**

Run: `npm run test:run -- src/storage/projectStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit local persistence**

```bash
git add src/storage
git commit -m "feat: persist local verseform projects"
```

## Task 7: Render Documents And Export Original-Size PNG Files

**Files:**
- Create: `src/canvas/renderDocument.ts`
- Create: `src/canvas/renderDocument.test.ts`
- Create: `src/canvas/exportPng.ts`
- Create: `src/canvas/exportPng.test.ts`

- [ ] **Step 1: Write failing render-order tests**

Create `src/canvas/renderDocument.test.ts` with a lightweight recording canvas context:

```ts
import { describe, expect, it, vi } from "vitest";
import { createDefaultDocument, createDefaultRegion } from "../domain/defaults";
import { renderDocument } from "./renderDocument";

describe("renderDocument", () => {
  it("draws background, text, contour, and editor-only nodes in order", () => {
    const calls: string[] = [];
    const context = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      scale: () => calls.push("scale"),
      fillRect: () => calls.push("background"),
      beginPath: () => calls.push("begin"),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: () => calls.push("contour"),
      arc: () => calls.push("node"),
      fill: vi.fn(),
      fillText: () => calls.push("text"),
      measureText: (text: string) => ({ width: text.length * 10 }),
    } as unknown as CanvasRenderingContext2D;
    const region = createDefaultRegion([{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 }]);
    renderDocument(context, { ...createDefaultDocument(), regions: [region] }, { scale: 1, editorMode: true, selectedRegionId: region.id });
    expect(calls.indexOf("background")).toBeLessThan(calls.indexOf("text"));
    expect(calls.indexOf("text")).toBeLessThan(calls.indexOf("contour"));
    expect(calls).toContain("node");
  });

  it("omits contours when the global contour switch is off", () => {
    const calls: string[] = [];
    const context = {
      save: vi.fn(), restore: vi.fn(), scale: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), stroke: () => calls.push("contour"),
      fillText: vi.fn(), measureText: () => ({ width: 10 }),
    } as unknown as CanvasRenderingContext2D;
    const region = createDefaultRegion([{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 0, y: 200 }]);
    renderDocument(context, { ...createDefaultDocument(), regions: [region], showContours: false }, { scale: 1, editorMode: false });
    expect(calls).not.toContain("contour");
  });
});
```

- [ ] **Step 2: Run renderer tests and confirm the expected failure**

Run: `npm run test:run -- src/canvas/renderDocument.test.ts`

Expected: FAIL because `src/canvas/renderDocument.ts` does not exist.

- [ ] **Step 3: Implement the deterministic renderer**

Create `src/canvas/renderDocument.ts` and export:

```ts
export interface RenderOptions {
  scale: number;
  editorMode: boolean;
  selectedRegionId?: string;
  image?: CanvasImageSource;
}

export function renderDocument(
  context: CanvasRenderingContext2D,
  document: EditorDocument,
  options: RenderOptions,
): void;
```

Scale once at the start. Draw a solid background with `fillRect` or the uploaded source image with `drawImage`. For each region, set `context.font`, create units with `prepareTextUnits`, place them with `layoutTextInPolygon`, and call `fillText`. Draw contours only when `document.showContours` is true. Draw the selected contour nodes only in editor mode.

- [ ] **Step 4: Write failing export-size test**

Create `src/canvas/exportPng.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createDefaultDocument } from "../domain/defaults";
import { exportDocumentPng } from "./exportPng";

describe("exportDocumentPng", () => {
  it("renders using the document's original dimensions", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = (callback) => callback(new Blob(["png"], { type: "image/png" }));
    const createCanvas = vi.fn(() => canvas);
    await exportDocumentPng({ ...createDefaultDocument(), background: { kind: "solid", width: 640, height: 960, color: "#fff" } }, { createCanvas, download: vi.fn() });
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(960);
  });
});
```

- [ ] **Step 5: Run export tests and confirm the expected failure**

Run: `npm run test:run -- src/canvas/exportPng.test.ts`

Expected: FAIL because `src/canvas/exportPng.ts` does not exist.

- [ ] **Step 6: Implement PNG export**

Create `src/canvas/exportPng.ts` with:

```ts
export interface ExportDependencies {
  image?: CanvasImageSource;
  createCanvas?: () => HTMLCanvasElement;
  download?: (blob: Blob, filename: string) => void;
}

export async function exportDocumentPng(
  document: EditorDocument,
  dependencies?: ExportDependencies,
): Promise<void>;
```

Create an offscreen canvas, assign the document width and height, render with `scale: 1` and `editorMode: false`, convert with `toBlob`, and download `verseform.png`. Reject when a 2D context or PNG blob cannot be created.

- [ ] **Step 7: Run canvas tests**

Run: `npm run test:run -- src/canvas`

Expected: PASS.

- [ ] **Step 8: Commit renderer and export**

```bash
git add src/canvas
git commit -m "feat: render and export verseform documents"
```

## Task 8: Build Mouse Drawing, Selection, And Node Dragging

**Files:**
- Create: `src/components/EditorCanvas.tsx`
- Create: `src/components/EditorCanvas.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing EditorCanvas interaction tests**

Create `src/components/EditorCanvas.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultDocument } from "../domain/defaults";
import { EditorCanvas } from "./EditorCanvas";

describe("EditorCanvas", () => {
  it("closes a drawn path and emits a usable region", () => {
    const onAddRegion = vi.fn();
    render(<EditorCanvas document={createDefaultDocument()} tool="draw" onAddRegion={onAddRegion} />);
    const canvas = screen.getByLabelText("创作画布");
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 110, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 110, clientY: 110 });
    fireEvent.mouseMove(canvas, { clientX: 10, clientY: 110 });
    fireEvent.mouseUp(canvas);
    expect(onAddRegion).toHaveBeenCalledTimes(1);
  });

  it("ignores a tiny drawn path", () => {
    const onAddRegion = vi.fn();
    render(<EditorCanvas document={createDefaultDocument()} tool="draw" onAddRegion={onAddRegion} />);
    const canvas = screen.getByLabelText("创作画布");
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 11, clientY: 11 });
    fireEvent.mouseUp(canvas);
    expect(onAddRegion).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run EditorCanvas tests and confirm the expected failure**

Run: `npm run test:run -- src/components/EditorCanvas.test.tsx`

Expected: FAIL because `src/components/EditorCanvas.tsx` does not exist.

- [ ] **Step 3: Implement the interactive canvas**

Create `src/components/EditorCanvas.tsx` with props:

```ts
interface EditorCanvasProps {
  document: EditorDocument;
  tool: EditorTool;
  selectedRegionId?: string;
  image?: CanvasImageSource;
  onAddRegion: (points: Point[]) => void;
  onSelectRegion?: (regionId?: string) => void;
  onMoveNode?: (regionId: string, nodeIndex: number, point: Point) => void;
}
```

Use a canvas ref, `ResizeObserver`, and a computed fit scale. Convert pointer locations from client coordinates to document coordinates. In draw mode, collect points between mouse down and mouse up, use `samplePath`, and call `onAddRegion` only when `isUsablePolygon` returns true. In select mode, search selected-region nodes first with `findNodeAt`, then search regions from topmost to bottommost with `pointInPolygon`. While dragging a node, render a local preview document so the contour and text reflow immediately. Emit `onMoveNode` once on mouse up so a complete node drag creates one undo snapshot rather than one snapshot per mouse move.

- [ ] **Step 4: Run EditorCanvas tests**

Run: `npm run test:run -- src/components/EditorCanvas.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit canvas interactions**

```bash
git add src/components/EditorCanvas.tsx src/components/EditorCanvas.test.tsx src/styles.css
git commit -m "feat: add freeform canvas interactions"
```

## Task 9: Build Editor Chrome, Inspector Controls, Upload, And Persistence Wiring

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/ToolRail.tsx`
- Create: `src/components/Inspector.tsx`
- Create: `src/components/Notice.tsx`
- Create: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the smoke test with failing workflow tests**

Extend `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createDefaultDocument } from "./domain/defaults";
import { deleteDatabase, saveProject } from "./storage/projectStore";

describe("App editor workflow", () => {
  beforeEach(async () => deleteDatabase());

  it("switches tools, toggles contours, and changes solid canvas dimensions", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "绘制区域" }));
    expect(screen.getByRole("button", { name: "绘制区域" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "隐藏轮廓" }));
    expect(screen.getByRole("button", { name: "显示轮廓" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("画布宽度"));
    await user.type(screen.getByLabelText("画布宽度"), "640");
    await user.clear(screen.getByLabelText("画布高度"));
    await user.type(screen.getByLabelText("画布高度"), "960");
    expect(screen.getByText("640 × 960 px")).toBeInTheDocument();
  });

  it("exposes included poems and custom text", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("option", { name: "静夜思 · 李白" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "自定义文本" }));
    expect(screen.getByLabelText("诗歌文本")).toBeInTheDocument();
  });

  it("uses the uploaded image's original dimensions", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 800, height: 600, close: vi.fn() })));
    render(<App />);
    await user.upload(screen.getByLabelText("上传图片"), new File(["image"], "scene.png", { type: "image/png" }));
    expect(await screen.findByText("800 × 600 px")).toBeInTheDocument();
  });

  it("restores the locally saved document after initialization", async () => {
    await saveProject({
      document: { ...createDefaultDocument(), background: { kind: "solid", width: 640, height: 960, color: "#fff" } },
      history: [],
    });
    render(<App />);
    expect(await screen.findByText("640 × 960 px")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run workflow tests and confirm the expected failure**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL because the editor controls are not implemented.

- [ ] **Step 3: Implement editor components**

Create:

```tsx
// ToolRail.tsx
export function ToolRail({ tool, onToolChange }: { tool: EditorTool; onToolChange: (tool: EditorTool) => void }) {
  return (
    <aside className="tool-rail" aria-label="画布工具">
      <button type="button" aria-pressed={tool === "select"} onClick={() => onToolChange("select")}>选择</button>
      <button type="button" aria-pressed={tool === "draw"} onClick={() => onToolChange("draw")}>绘制区域</button>
    </aside>
  );
}
```

Implement `TopBar.tsx` with image upload, solid-color width/height/color inputs, undo, contour visibility, and export controls. Validate dimensions with `validateCanvasDimension`. Accept only files whose MIME type starts with `image/`. Read an uploaded image with `createImageBitmap`, save its blob using `saveStoredImage`, and emit an image background containing original dimensions and the blob ID. Catch unreadable images and emit the notice `无法读取这张图片，请选择有效的图片文件。`

Implement `Inspector.tsx` with `Poetry` and `Region` tabs. The poetry tab lists `POEMS`, supports a custom-text mode, and applies changes to the selected region or next-region defaults. The region tab exposes writing mode, font family, font size, font weight, line spacing, letter spacing, padding, maximum words, font color, repeat fill, contour color, contour width, and delete controls. Disable region controls when no region is selected.

Implement `Notice.tsx` as an `aria-live="polite"` message strip.

- [ ] **Step 4: Wire `App.tsx`**

Use `useReducer(editorReducer, undefined, () => createEditorState(createDefaultDocument()))`. Load a persisted project once on mount and dispatch `project/hydrate` with its document and history. Track an `initialized` flag and do not save until the first load attempt completes, preventing the default document from overwriting restored work. Save `{ document, history }` after a `300ms` debounce. If persistence rejects, dispatch a notice that says `自动保存不可用，本次编辑仍可继续。`

On region creation, call `createDefaultRegion(points, nextRegionDefaults)`, dispatch `region/add`, and select the new region. Load an uploaded image blob from IndexedDB and convert it to an object URL-backed `HTMLImageElement` for preview and export. Revoke old object URLs during cleanup. Catch PNG export rejection and dispatch `导出失败，请重试。` without mutating the active project.

Compose:

```tsx
<main className="app-shell">
  <TopBar />
  <section className="editor-frame">
    <ToolRail />
    <EditorCanvas />
    <Inspector />
  </section>
  <Notice />
</main>
```

- [ ] **Step 5: Run component tests**

Run: `npm run test:run -- src/App.test.tsx src/components/EditorCanvas.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the complete editor UI**

```bash
git add src/App.tsx src/App.test.tsx src/components src/styles.css
git commit -m "feat: build verseform editor interface"
```

## Task 10: Complete The Editorial Visual System And Add User Documentation

**Files:**
- Modify: `src/styles.css`
- Create: `README.md`

- [ ] **Step 1: Finish the accepted visual system**

Expand `src/styles.css` using these locked tokens:

```css
:root {
  --paper: #e8e3da;
  --panel: #f7f3ec;
  --ink: #292720;
  --muted: #746f66;
  --line: #d5cfc4;
  --terracotta: #bd7354;
  --terracotta-dark: #9f5d43;
  --canvas-shadow: 0 18px 48px rgba(51, 46, 37, 0.18);
  --radius-sm: 8px;
  --radius-md: 14px;
}
```

Style the top bar as ink-colored chrome, keep the left tool rail compact, give the center workspace breathing room, use a `320px` inspector, show clear selected and hover states, style controls intentionally, and retain `body { min-width: 1120px; }` because version one is desktop-first.

- [ ] **Step 2: Add README usage and development notes**

Create `README.md` with:

````md
# Verseform

Verseform is a browser-local poetry image editor. Upload an image or choose a solid canvas, draw freeform regions, fill each region with included or custom poetry, adjust the typography and contour, undo recent changes, and export an original-size PNG.

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run test:run
npm run build
```

## Storage

The active project and uploaded image blob are saved in IndexedDB in the current browser. Verseform does not upload artwork to a server.
````

- [ ] **Step 3: Run all automated verification**

Run: `npm run test:run && npm run build`

Expected: all Vitest tests pass and Vite builds `dist/`.

- [ ] **Step 4: Commit visual polish and documentation**

```bash
git add src/styles.css README.md
git commit -m "docs: polish and document verseform"
```

## Task 11: Run Browser Acceptance And Visual QA

**Files:**
- Modify only when browser QA reveals a concrete issue.

- [ ] **Step 1: Start the local application**

Run: `npm run dev -- --port 4173`

Expected: Vite serves `http://127.0.0.1:4173`.

- [ ] **Step 2: Verify the complete editor workflow in the in-app Browser**

Use the Browser plugin to:

1. Open `http://127.0.0.1:4173`.
2. Confirm the top bar, left tool rail, central canvas, and right inspector match the accepted editorial direction.
3. Create a `640 × 960` solid canvas and confirm the size label.
4. Draw two usable regions.
5. Set one region to horizontal Chinese text and the other to vertical English text.
6. Drag a contour node and confirm the contour and text reflow.
7. Delete one region and undo the deletion.
8. Toggle contours off and on.
9. Refresh and confirm the document returns from IndexedDB.
10. Export with contours visible and hidden, then confirm each PNG is `640 × 960`.

- [ ] **Step 3: Capture and inspect the implementation screenshot**

Capture a browser screenshot at a desktop viewport of at least `1440 × 960`. Use `view_image` to inspect:

- accepted warm gray background, ink chrome, and terracotta active states;
- central canvas dominance;
- compact left tool rail;
- readable `320px` inspector;
- typography hierarchy;
- absence of clipped controls, accidental wrapping, or editor-only nodes in PNG output.

- [ ] **Step 4: Repair any concrete QA issues**

For every issue, add or update the narrowest relevant test first, run it to observe failure, patch the responsible module, rerun the focused test, and repeat the browser action that exposed the issue.

- [ ] **Step 5: Run fresh final verification**

Run: `npm run test:run && npm run build && git status --short`

Expected: tests pass, build succeeds, and only intentional uncommitted QA edits are listed. Commit intentional QA edits:

```bash
git add src README.md
git commit -m "fix: address verseform browser qa"
```

## Task 12: Create The GitHub Repository And Upload The Finished App

**Files:**
- No file changes expected.

- [ ] **Step 1: Confirm the local repository is ready**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
gh --version
gh auth status
```

Expected: clean `main` branch, local commits present, GitHub CLI installed, and an authenticated GitHub account.

- [ ] **Step 2: Create a private GitHub repository and push `main`**

Run:

```bash
gh repo create verseform --private --source=. --remote=origin --push
```

Expected: GitHub creates `verseform`, configures `origin`, and uploads `main`. Keep the repository private by default; change visibility only when the user explicitly requests a public repository.

- [ ] **Step 3: Verify the remote upload**

Run:

```bash
git remote -v
git status --short --branch
gh repo view --web=false
```

Expected: `origin` points to the new GitHub repository, `main` tracks `origin/main`, and the GitHub repository metadata is readable.
