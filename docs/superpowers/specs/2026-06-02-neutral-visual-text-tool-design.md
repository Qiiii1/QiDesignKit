# Neutral Visual Text Tool Design

## Goal

Present the app as a neutral visual text-effects exploration tool rather than a poetry product.

## Visible Interface

- Remove the top-left `Verseform` brand lockup entirely.
- Replace visible poetry-oriented language with neutral text language:
  - `诗歌` becomes `文本`.
  - `内置诗歌` becomes `预设文本`.
  - `诗歌选集` becomes `文本预设`.
  - The custom textarea remains available and is labeled `填充文本内容`.
- Keep the included Chinese and English presets as convenient source material.
- Remove the top-right global contour button. Each region keeps its own `显示当前区域轮廓` checkbox.
- Use a neutral browser title and exported PNG filename.

## Compatibility

Keep the IndexedDB database name unchanged so existing local projects continue to load. Ignore any legacy document-level `showContours` value during rendering; contour visibility now comes only from each region's `showContour` value.

## Verification

- Assert that the visible app no longer renders the brand name, poetry-oriented labels, or the global contour button.
- Assert that text presets and custom text entry remain available.
- Assert that legacy document-level contour values no longer hide a region outline.
- Assert that PNG export uses the neutral filename.
- Run the full test suite, build, and local browser verification.
