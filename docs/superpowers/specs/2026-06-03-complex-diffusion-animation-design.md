# Complex Diffusion Animation Design

## Goal

Make the `扩散线稿` mode feel closer to the user's reference frames: a solid green subject with animated white reaction channels, round holes, and pale trailing marks that grow across the image over time.

## Visual Read

The reference frames are not only sparse green lines on a white background. They have four visible layers:

- A stable, high-contrast green silhouette.
- White organic channels carved into that silhouette.
- Round white nodes that appear along channel paths.
- Pale green residual strokes that make the animation feel soft and diffusive.

## Rendering Design

Keep the current `StencilSettings` controls, but reinterpret them for diffusion mode:

- `diffusionStrength`: increases channel bending, branching, and organic drift.
- `diffusionLineSpacing`: controls spacing between carved internal channels.
- `diffusionLineWidth`: controls the width of carved white channels.
- `diffusionDotDensity`: controls round white nodes and small holes.
- `diffusionGrowth`: controls how much of the internal reaction network is visible.

The diffusion renderer will:

1. Threshold the source image to create the selected subject mask.
2. Fill selected pixels with the foreground color by default.
3. Use luminance gradients plus wave fields to carve internal channels as background-colored pixels.
4. Add pale foreground trails near channels for residual diffusion.
5. Add deterministic round nodes along the same organic field.
6. Animate channels and nodes with `time` so MP4 export shows growing, drifting diffusion.

## Scope

No new UI controls are needed for this iteration. The existing controls remain visible and gain richer behavior.

## Verification

- Renderer tests should prove diffusion mode keeps a mostly solid foreground body while carving background channels.
- Renderer tests should prove pale trail pixels are produced.
- Renderer tests should prove later animation time reveals more carved channels/nodes than early time.
- Existing stencil mode tests must continue to pass.
