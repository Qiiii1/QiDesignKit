# Verseform

Verseform is a browser-local poetry image editor. Choose a solid-color canvas,
draw freeform regions, densely fill each region with included or custom poetry,
select regions to adjust their typography, text color, optional region color,
and contour visibility independently, undo recent changes, and export an
original-size PNG.

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

The active project is saved in IndexedDB in the current browser. Verseform does
not upload artwork to a server.
