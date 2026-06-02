# Neutral Visual Text Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove poetry branding and the global contour control while preserving preset text, custom text, existing local projects, and per-region contour editing.

**Architecture:** Keep the existing editor model and local database name for compatibility. Limit interface changes to copy, top-bar composition, contour rendering semantics, and the export filename.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS.

---

### Task 1: Add regression coverage

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/canvas/renderDocument.test.ts`
- Modify: `src/canvas/exportPng.test.ts`
- Modify: `src/domain/defaults.test.ts`

- [x] Add app assertions for neutral text labels, absent branding, absent global contour actions, and retained custom text entry.
- [x] Change renderer coverage so a legacy document-level `showContours: false` value does not suppress a region contour.
- [x] Change export coverage to expect `visual-text.png`.
- [x] Run the targeted tests and confirm they fail for the missing neutral interface.

### Task 2: Implement the neutral interface

**Files:**
- Modify: `src/components/TopBar.tsx`
- Modify: `src/components/Inspector.tsx`
- Modify: `src/App.tsx`
- Modify: `src/canvas/renderDocument.ts`
- Modify: `src/canvas/exportPng.ts`
- Modify: `src/styles.css`
- Modify: `index.html`
- Modify: `README.md`

- [x] Remove the top-left brand lockup and global contour props, action, and button.
- [x] Replace visible poetry copy with text-effects copy.
- [x] Render contours from each region's local switch only.
- [x] Rename the browser title and PNG filename.
- [x] Remove unused brand CSS and update the README.

### Task 3: Verify and publish

**Files:**
- Verify all changed files.

- [x] Run `npm run test:run`.
- [x] Run `npm run test:coverage`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Reload `http://127.0.0.1:4174/` and confirm the neutral interface, preset text, custom text, and region contour controls.
- [x] Commit, fast-forward `main`, and push to GitHub.
