# Verseform Image Editor Design

## Product Summary

Verseform is a desktop-first, browser-local image editor for creating poetic text compositions. A user uploads an image or creates a solid-color canvas, draws one or more freeform regions with the mouse, and fills each closed region with Chinese or English poetry. The result can be exported as a PNG without requiring an account or server.

The first version is a single-page web application. Project state remains on the user's device and is restored after a refresh.

## Scope

### Included

- Upload an image and preserve its original dimensions.
- Create a solid-color canvas with user-defined width, height, and color.
- Draw freeform paths with the mouse and automatically close them when the mouse is released.
- Create multiple text regions.
- Select a region, delete it, and adjust its contour by dragging sampled nodes.
- Configure each region independently.
- Fill regions with an included Chinese and English poetry library or custom text.
- Switch each region between horizontal and vertical text layout.
- Undo recent editing actions.
- Persist the current project in browser storage and restore it after refresh.
- Export a PNG at the canvas's original dimensions.
- Display contours by default and provide a global button to hide or show all contours.

### Excluded

- Accounts, cloud storage, collaboration, and server APIs.
- Mobile and touch-first interactions.
- Canvas pan and zoom controls.
- Advanced layer management.
- Vector export formats.

## User Experience

### Visual Direction

The interface uses an editorial, poetic visual language:

- Warm gray paper-like application background.
- Ink-colored toolbar and interface chrome.
- Terracotta accent for selected and primary actions.
- Restrained borders and spacing so the artwork remains the visual focus.

### Layout

The desktop editor uses a compact-tool-rail layout:

- A top bar contains canvas setup, undo, contour visibility, and PNG export actions.
- A narrow left rail contains the selection and drawing tools.
- The center workspace contains the canvas.
- A right inspector has two tabs: `Poetry` and `Region`.

The `Poetry` tab lets users choose an included poem or enter custom text. When a region is selected, changes apply to that region. When no region is selected, changes update the defaults used by the next newly drawn region. The `Region` tab edits the selected region's text layout and contour styles.

### Canvas Setup

When an image is uploaded, the editor stores and exports the artwork at the source image's original dimensions. When a solid-color canvas is selected, the user defines width, height, and background color. Solid-color dimensions accept integer values from `64` to `4096` pixels per side. The editor scales the on-screen representation to fit the workspace without changing document coordinates.

### Region Creation And Editing

1. The user selects the drawing tool.
2. The user holds the mouse button and draws a freeform path.
3. On mouse release, the editor closes the path by connecting its last point to its first point.
4. The editor samples the path into a manageable number of contour nodes.
5. If the resulting region is large enough and contains enough points, the editor creates and selects it.
6. The editor fills it using the active poetry text and default style.
7. With the selection tool, the user can select a region, drag contour nodes, or delete the selected region.

The editor ignores paths that are too small or contain too few usable points.

### Region Settings

Each region independently stores:

- Poetry source and text.
- Horizontal or vertical writing mode.
- Font family.
- Font size.
- Font weight.
- Line spacing.
- Letter spacing.
- Inner padding.
- Maximum word count.
- Font color.
- Repeat-fill toggle.
- Contour color.
- Contour width.

The global contour visibility toggle determines whether all contours are drawn. Contours are visible by default in both the editor and exported PNG. Selection handles and editing nodes never appear in exported images.

### Text Counting And Fill Rules

The maximum word count uses reading-oriented tokens:

- Each Chinese character counts as one token.
- Each contiguous English word counts as one token.
- Punctuation does not count toward the maximum.

When repeat fill is enabled, the selected poem repeats until the available region space is filled or the configured maximum token count is reached. When repeat fill is disabled, the poem is laid out once and stops even when unused space remains.

Horizontal text flows left to right and top to bottom. Vertical text flows top to bottom and then proceeds from right to left.

### Undo

Undo restores the previous editor state after:

- Region creation.
- Contour node adjustment.
- Region deletion.
- Background changes.
- Region parameter changes.
- Poetry source or text changes.

The first version provides undo only; redo is out of scope. The editor keeps the most recent `50` undo snapshots to bound browser storage and memory use.

### Persistence

The application saves project state locally and restores it after refresh. It uses IndexedDB for both structured project state and uploaded image blobs so image size is not constrained by `localStorage`.

If local persistence fails, editing remains available for the current session and the interface informs the user that automatic saving is unavailable.

### Export

Export creates an offscreen canvas using the document's original dimensions. It draws:

1. The uploaded image or solid-color background.
2. Filled text for each region.
3. Region contours when global contour visibility is enabled.

It omits selection highlights, sampled contour nodes, and editor-only chrome. The browser then downloads the rendered image as a PNG.

## Architecture

The implementation uses React, Vite, TypeScript, and the browser Canvas 2D API.

### `EditorShell`

Owns the application layout and coordinates UI state:

- Top bar.
- Compact left tool rail.
- Central workspace.
- Right inspector.
- Toast or inline error notices.

### `CanvasRenderer`

Renders the document in a deterministic order:

1. Background image or solid color.
2. Region text.
3. Region contours when visible.
4. Selected-region highlight and contour nodes in editor mode only.

Rendering accepts document coordinates and a display scale. Export rendering uses the same renderer with scale `1` and editor decorations disabled.

### `GeometryEngine`

Provides pure, testable helpers for:

- Closing freeform paths.
- Sampling contour nodes.
- Measuring contour bounds and area.
- Detecting whether a point is inside a polygon.
- Testing node proximity for drag handles.
- Calculating horizontal scanline segments and vertical scanline segments inside a polygon.

### `TextLayoutEngine`

Provides pure, testable helpers for:

- Tokenizing Chinese and English poetry.
- Applying maximum word count.
- Repeating text when enabled.
- Laying out horizontal text inside polygon scanlines.
- Laying out vertical text inside polygon scanlines.
- Respecting font size, line spacing, letter spacing, and padding.

### Persistence Layer

An IndexedDB adapter saves and loads one active project. Saves are debounced after state changes. The editor initializes from the saved project when available and otherwise starts with a solid-color canvas.

## State Model

```ts
type WritingMode = "horizontal" | "vertical";
type EditorTool = "select" | "draw";

interface Point {
  x: number;
  y: number;
}

interface CanvasBackground {
  kind: "solid" | "image";
  width: number;
  height: number;
  color: string;
  imageBlobId?: string;
}

interface TextRegion {
  id: string;
  points: Point[];
  poetrySource: "library" | "custom";
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

interface EditorDocument {
  background: CanvasBackground;
  regions: TextRegion[];
  showContours: boolean;
}
```

The selected region, active tool, transient draw path, node drag state, notices, and undo stack remain editor-session state. The persisted project contains the document and its most recent `50` undo snapshots so the restored editing session can still undo recent work.

## Error Handling

- Reject unsupported or unreadable uploaded images with a clear notice.
- Constrain solid-canvas dimensions to integer values from `64` to `4096` pixels per side.
- Ignore paths that cannot create a usable region.
- Allow deleting the current region without a confirmation dialog because undo is immediately available.
- Continue editing when browser storage fails and show an automatic-save warning.
- Preserve the project state and show an export error if PNG generation fails.

## Testing Strategy

### Unit Tests

- Count Chinese characters and English words while excluding punctuation.
- Enforce maximum token counts.
- Repeat or stop poetry text according to `repeatFill`.
- Close and sample drawn paths.
- Reject undersized regions.
- Detect points inside and outside polygons.
- Lay text out horizontally and vertically inside polygon bounds.

### Component Tests

- Upload an image and switch to a solid-color canvas.
- Create and select multiple regions.
- Modify one region without changing another.
- Delete a selected region and undo the deletion.
- Hide and show contours globally.
- Restore a saved project after initialization.

### Browser Acceptance

- Draw several regions and adjust their nodes.
- Assign independent horizontal and vertical styles.
- Toggle contours and confirm the editor preview changes.
- Export PNG with and without contours.
- Confirm exported dimensions match the original image or configured solid canvas.
- Refresh and confirm that the current project returns.

## Delivery

After implementation and verification, create a GitHub repository for the project, commit the finished application, and push the repository to GitHub.
