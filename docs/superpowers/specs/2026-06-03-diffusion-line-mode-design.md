# Diffusion Line Mode Design

## Goal

Add a second visual mode to the existing `镂空图像转换` workflow. The new
mode should transform an uploaded image into a single-color reaction-diffusion
line drawing similar to the provided flower reference: a white or transparent
background, a clean colored contour, interior flowing contour bands, and dot
clusters that feel like the image texture is spreading outward.

This is not a replacement for the current stencil mode. It extends the image
tool with a mode switch:

- `镂空模板`
- `扩散线稿`

The same uploaded image, preview canvas, PNG export, and MP4 export surface are
used for both modes.

## Reference Interpretation

The reference effect is a flat graphic abstraction rather than a photographic
filter. The important traits are:

- Single vivid foreground color on a bright background.
- The original subject silhouette remains readable.
- Petal and stem contours become smooth, organic bands.
- Interior texture becomes repeated curved stripes and dotted fields.
- Animation should feel like lines and dots are gradually spreading, revealing,
  or growing from the source image structure.

## Visual Parameters

The existing `前景色`, `背景模式`, `背景色`, `阈值`, `反转`, and animation
settings remain shared.

Add these diffusion-specific controls when `视觉模式` is `扩散线稿`:

- `扩散强度`: how far line fields can spread from detected image structure.
- `线条间距`: distance between repeated contour bands.
- `线宽`: thickness of rendered bands.
- `点阵密度`: amount of dotted texture inside selected regions.
- `生长进度`: static frame progress from sparse to complete.

The current stencil-specific controls remain visible when `视觉模式` is
`镂空模板`:

- `纹理类型`
- `纹理密度`
- `纹理尺度`
- `边缘强调`

## Rendering Pipeline

### Shared Preprocessing

For each frame, read the uploaded image into `ImageData` and compute:

1. Luminance per pixel.
2. A selected subject mask from threshold and inversion.
3. Local edge strength from neighboring luminance differences.
4. Local gradient direction from luminance differences.

### Stencil Mode

Keep the existing stencil renderer behavior.

### Diffusion Line Mode

For every output pixel:

1. Ignore pixels outside the selected mask unless the pixel is close enough to a
   mask edge to receive diffusion spread.
2. Compute an organic coordinate field from pixel position, gradient direction,
   edge strength, diffusion strength, and animation time.
3. Render foreground color where the field crosses a contour-band threshold.
4. Render foreground color where the deterministic dot field crosses a
   density threshold.
5. Fade line and dot availability by `生长进度` plus animation time so MP4
   exports show the drawing growing instead of appearing fully formed.
6. Render all other pixels as transparent, white, or the chosen custom
   background color.

The result should look line-based and graphic, not like a noisy halftone. Dots
should appear in clusters where the source image has softer texture or broad
selected regions. Lines should favor edges, veins, stems, and high-contrast
shape changes.

## Animation Behavior

When `扩散线稿` mode is active:

- `启用纹理流动` moves the organic coordinate field over time, making bands
  gently drift and spread.
- `启用阈值呼吸` affects the selected mask and line availability, creating a
  subtle reveal/retreat pulse.
- MP4 export renders the growth from early sparse lines to the full configured
  effect across the selected duration.

PNG export uses the current preview time and `生长进度`.

## UI Behavior

Add a `视觉模式` select near the top of the visual parameter panel.

When `镂空模板` is selected, the panel behaves as it does now.

When `扩散线稿` is selected:

- Change helper text to explain that the image becomes diffusion-style lines
  and dots.
- Show diffusion controls.
- Hide stencil-only texture controls.
- Keep color, background, threshold, inversion, and animation controls.

The default uploaded-image experience should still produce a useful image
immediately. For the supplied flower reference, the default diffusion mode
should make the silhouette readable and generate green line/dot structures with
minimal tuning.

## Export Behavior

PNG and MP4 export use the selected visual mode. The export adapters should not
know the algorithm details; they call a shared frame-rendering function with
source image data, settings, and time.

MP4 compatibility behavior remains unchanged: unsupported browser encoding
shows the local MP4 compatibility notice and keeps PNG export available.

## Code Boundaries

- Extend `StencilSettings` with `visualMode` and diffusion-specific numeric
  settings.
- Keep `renderStencilImageData` as the public render entry point, but split
  internals into mode-specific helpers.
- Add tests for diffusion settings, pixel output, time-based growth, and UI
  mode switching.
- Keep existing stencil tests passing.

## Testing

Automated tests cover:

- Default settings include a valid `visualMode` and diffusion defaults.
- `镂空模板` mode preserves existing stencil output behavior.
- `扩散线稿` mode produces foreground line pixels for a simple high-contrast
  source image.
- Diffusion line spacing, line width, dot density, diffusion strength, and time
  change deterministic pixel output.
- UI switches between stencil-only and diffusion-only controls.
- PNG and MP4 export continue to call the same render entry point for the
  selected visual mode.

Manual browser verification covers:

- Upload the supplied flower image.
- Select `扩散线稿`.
- Set foreground color to green and background to white.
- Adjust threshold, diffusion strength, line spacing, line width, and dot
  density until the flower resembles the reference thumbnail.
- Play animation and confirm the drawing grows/drifts.
- Export PNG.
- Export MP4 or confirm the browser compatibility notice.

## Success Criteria

- The image tool supports both `镂空模板` and `扩散线稿`.
- The flower image can be transformed into a readable single-color line/dot
  graphic similar to the provided reference.
- Diffusion parameters visibly alter the line field and dots.
- Animation produces a growth/spread effect rather than only threshold
  breathing.
- Existing stencil mode, PNG export, MP4 export, tests, and GitHub Pages
  deployment continue to work.
