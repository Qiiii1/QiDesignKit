# Diffusion Line Mode Implementation Plan

## Goal

Add a new `扩散线稿` visual mode to the existing `镂空图像转换` workflow. The new mode should transform an uploaded image into a single-color, high-contrast reaction-diffusion-like line and dot graphic, matching the user's green flower reference more closely, while keeping the existing `镂空模板` mode available.

## Constraints

- Keep all image processing in the browser.
- Reuse the current PNG and MP4 export path by routing both modes through `renderStencilImageData`.
- Preserve the existing stencil texture behavior when `visualMode` is `stencil`.
- Avoid external image-processing dependencies.
- Keep controls editable and simple enough for exploratory visual work.

## Data Model

Update `src/stencil/types.ts`:

- Add `StencilVisualMode = "diffusion" | "stencil"`.
- Add `visualMode` to `StencilSettings`.
- Add diffusion-specific numeric settings:
  - `diffusionStrength`
  - `diffusionLineSpacing`
  - `diffusionLineWidth`
  - `diffusionDotDensity`
  - `diffusionGrowth`

Update `src/stencil/defaults.ts`:

- Default `visualMode` to `diffusion`.
- Use a green foreground and white background so first use is close to the reference.
- Keep existing stencil fields populated so switching to `镂空模板` works immediately.

## Rendering

Update `src/stencil/renderStencil.ts`:

- Keep `renderStencilImageData` as the only public render entry.
- Move current behavior into an internal stencil renderer.
- Add an internal diffusion renderer that:
  - Uses threshold/invert to isolate the subject or high-contrast regions.
  - Uses luminance gradients to orient contour-like bands.
  - Uses deterministic wave noise for organic line drift.
  - Uses deterministic cell hashing for dots and small hole-like marks.
  - Uses `diffusionGrowth` plus render `time` to reveal texture gradually in MP4 frames.
  - Uses the shared foreground/background settings.

## UI

Update `src/stencil/StylizedImageWorkspace.tsx`:

- Add a `视觉模式` selector with:
  - `扩散线稿`
  - `镂空模板`
- Update inspector copy so it describes a general visual transform tool.
- Show stencil-only controls only in `镂空模板` mode:
  - `纹理类型`
  - `纹理密度`
  - `纹理尺度`
  - `边缘强调`
- Show diffusion-only controls only in `扩散线稿` mode:
  - `扩散强度`
  - `线条间距`
  - `线宽`
  - `点阵密度`
  - `生长进度`
- Keep animation controls shared.

## Tests

Use test-first implementation:

1. Add/update defaults tests for new default mode and diffusion controls.
2. Add renderer tests:
   - Stencil mode still applies threshold, invert, backgrounds, and animated texture changes.
   - Diffusion mode produces foreground marks for selected pixels.
   - Diffusion line, dot, growth, and time settings change output.
3. Add workspace tests:
   - Default inspector shows `扩散线稿` controls.
   - Switching to `镂空模板` reveals stencil controls and hides diffusion controls.
   - Export calls receive the selected settings mode.

## Verification

Run:

- `npm run test:run`
- `npm run build`
- Browser smoke test at the local Vite preview/dev URL:
  - Open the app.
  - Enter `镂空图像转换`.
  - Confirm `扩散线稿` is the default.
  - Upload the flower image if browser automation can attach files.
  - Confirm controls are visible and no runtime error appears.

## Deployment

After implementation and verification:

- Commit the implementation.
- Push to GitHub.
- Confirm GitHub Pages build succeeds.
