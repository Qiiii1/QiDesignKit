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

## Online

[Open Visual Text Tool](https://qiiii1.github.io/verseform/)

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

The active project is saved in IndexedDB in the current browser. The editor does
not upload artwork to a server.

MP4 export uses browser WebCodecs AVC/H.264 support through Mediabunny. If the
current browser cannot encode MP4 locally, the app shows a compatibility notice
and PNG export remains available.
