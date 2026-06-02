# Verseform Visual Inventory

## Reference

- Concept image: `docs/superpowers/concepts/verseform-editor-concept.png`
- Target viewport: desktop, approximately `1440 × 960`
- Product type: canvas editor, not a landing page

## Layout

- Ink-colored top bar with brand at left, canvas actions in the middle, and export at right.
- Compact left rail with selection and drawing tools only.
- Large central canvas as the dominant surface.
- Right inspector around `320px` wide with `诗歌` and `区域` tabs.
- No marketing copy, card grid, floating dashboard widgets, or decorative badges.

## Locked Colors

- App paper background: `#e8e3da`
- Cream panel: `#f7f3ec`
- Ink chrome and text: `#292720`
- Muted text: `#746f66`
- Borders: `#d5cfc4`
- Terracotta active state: `#bd7354`
- Terracotta hover: `#9f5d43`

## Typography

- Brand and canvas poetry: restrained serif character.
- UI chrome and inspector controls: clean sans-serif.
- Inspector labels remain compact but readable.
- Buttons and inputs receive deliberate font sizing; do not rely on browser defaults.

## Allowed Top-Bar Copy

- `VERSEFORM`
- `上传图片`
- `纯色画布`
- `撤销`
- `隐藏轮廓` or `显示轮廓`
- `导出 PNG`

## Tool Icons

- Selection: simple cursor arrow, filled or optically strong outline.
- Drawing: pen nib or pencil metaphor.
- Upload: upward arrow into a tray.
- Undo: curved left arrow.
- Contour visibility: eye or crossed-eye.
- Export: downward arrow into a tray.
- Delete region: trash can.

Use a consistent, compact SVG treatment with balanced stroke widths and `currentColor`.

## QA Checkpoints

1. The canvas remains the visual focus at a `1440 × 960` viewport.
2. The top bar and left rail read as one ink-colored frame.
3. Terracotta marks active states and primary actions without overwhelming the artwork.
4. The right inspector fits all typography controls without clipping or accidental wrapping.
5. Canvas text, contour, and nodes remain visually distinct.
