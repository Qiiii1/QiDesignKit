# Visual Text Tool

Visual Text Tool is a browser-local text-effects editor. Choose a solid-color
canvas, draw freeform regions, densely fill each region with preset or custom text,
select regions to adjust their typography, text color, optional region color,
and contour visibility independently, undo recent changes, and export an
original-size PNG.

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
