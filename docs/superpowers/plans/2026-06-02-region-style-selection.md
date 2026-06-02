# Region Style Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inspector region list so users can explicitly switch regions and edit each region's typography, colors, and contour visibility independently.

**Architecture:** Extend the existing per-region style model with a `showContour` flag while preserving the top-bar global preview switch. Pass region selection state into `Inspector`, render a compact selector there, and exercise the workflow through app-level and renderer tests.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

---

### Task 1: Add regression coverage

**Files:**
- Modify: `src/editor/reducer.test.ts`
- Modify: `src/App.test.tsx`
- Modify: `src/domain/defaults.test.ts`
- Modify: `src/canvas/renderDocument.test.ts`

- [x] Extend the selected-region reducer test to assert that `fontFamily`, `color`, and `showContour` change only on the selected region.
- [x] Add an app workflow test that hydrates two regions, selects each one through the inspector list, edits its font, text color, and contour visibility, and confirms values are restored when switching back.
- [x] Add default and renderer tests for per-region contour visibility, including backward compatibility for regions saved without the new field.
- [x] Run `npm run test:run -- src/editor/reducer.test.ts src/App.test.tsx` and confirm the new app test fails because the region-list controls do not exist yet.

### Task 2: Render the inspector region list

**Files:**
- Modify: `src/components/Inspector.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/domain/types.ts`
- Modify: `src/domain/defaults.ts`
- Modify: `src/canvas/renderDocument.ts`

- [x] Pass `regions`, `selectedRegionId`, and `onSelectRegion` from `App` to `Inspector`.
- [x] Render a region-list button for every region with an `aria-pressed` selected state and text/fill color previews.
- [x] Add `showContour` to new-region defaults and render contours only when both the global preview switch and local region flag permit it.
- [x] Add a selected-region checkbox for local contour visibility.
- [x] Style the compact list, selected state, and transparent fill preview.
- [x] Run `npm run test:run -- src/editor/reducer.test.ts src/App.test.tsx` and confirm the targeted tests pass.

### Task 3: Verify and publish

**Files:**
- Verify all changed files.

- [x] Run `npm run test:run`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Reload `http://127.0.0.1:4174/`, switch between two regions, and confirm typography, color, and contour controls retain independent values without console errors.
- [ ] Commit, fast-forward `main`, and push to GitHub.
