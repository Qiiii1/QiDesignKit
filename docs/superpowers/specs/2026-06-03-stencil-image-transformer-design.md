# Stencil Image Transformer Design

## Goal

Add a second visual-effects workflow to the existing browser-local project.
Users upload any still image and transform the full image into a flat,
single-color, high-contrast stencil effect. Negative space, holes, flowing
lines, and organic texture abstract the original image's light, shadow, and
edges. The result can be exported as a static PNG or as a locally encoded MP4
animation.

The new workflow is a general visual exploration tool. It must not assume a
specific subject, fixed color palette, or server-side processing.

## Entry Page

Opening the site shows an effect-selection page instead of entering an editor
immediately. The page uses the current paper-toned visual language and presents
two large entry cards:

- `文字区域填充` opens the existing text-region editor.
- `镂空图像转换` opens the new image transformer.

Both workspaces provide a `返回效果选择` action in the upper-left corner. A
refresh returns to the effect-selection page. The app does not persist the last
selected workspace.

The existing text editor retains its current IndexedDB storage, editing
behavior, and PNG export behavior.

## New Workspace Layout

The stencil transformer is a single-screen workspace:

- The top bar contains `返回效果选择`, the workspace name, `上传图片`,
  `导出 PNG`, and `导出 MP4`.
- The center-left area is a large canvas preview.
- The right side is a scrollable parameter inspector.
- Before an image is selected, the canvas shows a clickable upload empty state.
- Selecting another image replaces the current source image and regenerates the
  preview with the current settings.

The interface follows the existing editor's restrained tool aesthetic rather
than introducing a separate marketing page or a decorative product shell.

## Scope

### Included

- Upload any browser-decodable still image.
- Process the entire uploaded image.
- Preview the stencil result locally in a Canvas element.
- Adjust visual and animation parameters.
- Preview animation with play and pause controls.
- Export the current still frame as PNG.
- Export a silent AVC/H.264 MP4 when the browser supports local encoding.
- Display export progress and a clear compatibility message when local MP4
  export is unavailable.

### Excluded

- Subject detection, background removal, or AI segmentation.
- Hand-drawn masks or region-specific processing.
- Video upload or audio tracks.
- Server uploads, server-side rendering, or server-side encoding.
- Account storage or cloud project sync.
- Additional fallback formats such as WebM or GIF in the first version.

## Image Processing Pipeline

The source image remains in browser memory only. Processing occurs in an
offscreen Canvas at preview or export resolution.

For each output pixel:

1. Sample the uploaded image and convert its RGB color to luminance.
2. Calculate local edge strength from nearby luminance differences.
3. Apply the user threshold, optional inversion, and animation breathing offset
   to decide whether the pixel belongs to the foreground shape.
4. Calculate a deterministic organic texture field from image coordinates,
   luminance variation, edge strength, texture settings, and animation time.
5. Remove selected foreground pixels to form negative-space holes, flowing
   lines, or a mixture of both.
6. Render retained foreground pixels with the chosen foreground color.
7. Render removed and background pixels as transparent, white, or the selected
   background color.

The deterministic texture field ensures that changing animation time moves the
same underlying pattern rather than producing unrelated random frames. Static
PNG export uses the currently displayed animation time.

## Visual Parameters

The inspector exposes:

- Foreground color.
- Background mode: `透明`, `白色`, or `自定义`.
- Custom background color, enabled only in `自定义` mode.
- Threshold.
- Invert foreground selection.
- Texture type: `孔洞`, `流线`, or `混合`.
- Texture density.
- Texture scale.
- Edge emphasis.

Initial values should produce a legible stencil effect immediately after an
image is uploaded. Controls must display numeric values where the range is not
self-evident.

## Animation Parameters

Animation is derived from the same visual pipeline used for static rendering.
It must not modify or replace the uploaded source image.

The inspector exposes:

- Enable or disable texture flow.
- Enable or disable threshold breathing.
- Animation duration.
- Frame rate.
- Flow speed.
- Breathing amplitude.

The preview canvas includes play and pause controls. Flow changes the texture
field position over time. Breathing applies a periodic offset to the image
threshold so that retained shapes and negative-space areas expand and contract.
Both effects may be enabled simultaneously.

## Export Behavior

### PNG

PNG export renders the current frame from the same pipeline at the uploaded
image's original pixel dimensions and preserves transparency when transparent
background mode is selected.

### MP4

MP4 export is silent and generated locally:

1. Calculate export dimensions by scaling the original aspect ratio so that the
   longest side is at most `1080px`. Do not upscale images whose longest side
   is already smaller than `1080px`.
2. Render `duration × frame rate` frames. Frame `i` uses time
   `i / frame rate`, where time remains less than the configured duration so
   the loop endpoint is not duplicated.
3. Encode frames as AVC/H.264 using browser WebCodecs support.
4. Mux encoded frames into an MP4 container using Mediabunny.
5. Download the resulting `.mp4` file.

The encoding adapter checks codec availability before rendering frames.
Mediabunny documents AVC/H.264 support, MP4 output, and browser encodability
checks at
[Supported formats & codecs](https://mediabunny.dev/guide/supported-formats-and-codecs).
The AVC WebCodecs registration is specified by W3C at
[AVC (H.264) WebCodecs Registration](https://www.w3.org/TR/webcodecs-avc-codec-registration/).

When AVC/H.264 local encoding is unavailable, the interface explains that MP4
export is unsupported in the current browser. PNG export and animation preview
remain available. The tool does not upload image data or silently substitute a
different video format.

During MP4 generation, the interface displays progress and prevents duplicate
export requests. Export failures result in a readable notice and leave the
workspace usable.

## Code Boundaries

### App Navigation

`App` owns the in-memory workspace selection:

- `home`
- `text`
- `stencil`

The existing text editor moves behind a focused workspace component without
changing its reducer or persistence contract.

### Stencil Domain

A dedicated domain module owns:

- Default stencil settings.
- Visual and animation setting types.
- Dimension calculation for `1080px` MP4 output.
- Pure pixel-processing helpers.
- Animation time calculation.

The pixel-processing functions accept image data, dimensions, settings, and
time. They return transformed image data without depending on React or the DOM.

### Stencil UI

Focused components own:

- Selection-page cards.
- Stencil top bar and export actions.
- Canvas upload empty state and live preview.
- Visual parameter inspector.
- Animation controls and export progress.

### Export Adapters

Separate adapters own:

- PNG rendering and download.
- MP4 capability detection, frame encoding, MP4 muxing, and download.

The visual processing module must not import the MP4 encoder. This keeps static
editing usable even when the browser lacks local video encoding support.

## Error Handling

- Reject unreadable image files with a visible notice.
- Keep the previous image active if replacement decoding fails.
- Disable PNG and MP4 export until an image has loaded.
- Detect local MP4 capability before frame generation.
- Display MP4 progress while exporting.
- Restore controls after an MP4 failure.
- Keep all image data local to the browser.

## Testing

Automated tests cover:

- Entry page renders both effects and opens each workspace.
- Both workspaces return to the selection page.
- Existing text editor behavior continues to pass its current tests.
- Default stencil settings are valid.
- MP4 dimension calculation preserves aspect ratio, caps the longest side at
  `1080px`, and does not upscale smaller images.
- Threshold and inversion change deterministic pixel output.
- Texture density, texture type, and animation time change deterministic pixel
  output.
- Transparent, white, and custom backgrounds produce the expected alpha and
  color values.
- The stencil workspace uploads a browser-decodable image and renders a
  preview.
- Export actions remain disabled before upload.
- PNG export invokes the still-image adapter.
- Unsupported MP4 encoding displays the compatibility notice without invoking
  frame rendering.
- MP4 progress is visible while a supported export is running.

Manual browser verification covers:

- Enter each workflow from the new selection page and return again.
- Upload a photograph and an illustration.
- Tune colors, threshold, inversion, texture modes, density, scale, and edge
  emphasis.
- Play and pause combined flow and breathing animation.
- Export and open a transparent PNG.
- Export and play a local MP4 in a supported browser.
- Confirm the compatibility notice by exercising the unsupported capability
  branch.

## Success Criteria

- The site opens on a two-effect selection page.
- The existing text tool remains usable.
- An arbitrary uploaded still image immediately produces a useful stencil
  preview.
- Parameters visibly affect foreground selection, background, and negative
  space texture.
- Animation preview shows both texture flow and threshold breathing.
- PNG export works with transparent or colored backgrounds.
- MP4 export produces a playable silent `.mp4` file at up to `1080px` on a
  supported browser and gives an actionable message on unsupported browsers.
- No uploaded source image or generated frame leaves the local browser.
