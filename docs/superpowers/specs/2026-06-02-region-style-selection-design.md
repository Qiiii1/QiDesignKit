# Region Style Selection Design

## Goal

Make per-region typography and color editing explicit and easy to discover.

## Interaction

- Show a compact region list in the inspector whenever the document contains regions.
- Each list item displays its region number plus small text-color and fill-color previews.
- Clicking a list item selects that region.
- The existing region controls continue to edit only the selected region: font family, font size, font weight, spacing, text color, contour color, fill color, and related options.
- Each region gets its own contour visibility checkbox. The existing top-bar contour action remains a global preview switch.
- Canvas selection remains available.

## Architecture

`TextRegion` already stores its own style and the reducer already applies `region/update` only to `selectedRegionId`. `App` passes regions, the selected id, and a selection callback to `Inspector`; `Inspector` renders the list and keeps the current style controls bound to the selected region. A new `showContour` style defaults to `true`; rendering treats a missing value as visible so older locally saved regions keep their outlines.

## Verification

- Add a reducer assertion that both font family and text color update only one selected region.
- Add an app workflow test that switches between two saved regions from the inspector list and verifies independent font, text-color, and contour-visibility values.
- Add renderer coverage for the per-region contour switch and older regions without the new field.
- Run the complete unit suite, build, and browser verification against the local Vite server.
