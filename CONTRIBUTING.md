# Contributing

Thank you for taking the time to contribute. This document describes how to set up the project and what is expected from a change.

## Setup

```bash
git clone https://github.com/alimohammad0816/liquid-glass-components.git
cd liquid-glass-components
npm install
npm run dev
```

The demo runs at `http://localhost:5173` and consumes the library sources directly, so edits in `src/` appear immediately.

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

CI runs the same checks.

## Guidelines

- Keep changes focused. One pull request should do one thing.
- Add or update tests for behavior you change. Pure logic (geometry, corners, settings) lives in `src/core` and is covered in `tests`. Components are tested with Testing Library.
- Visual changes need a look in a real browser, in light and dark, and in right to left. Include a screenshot in the pull request. Refraction only renders in Chromium, so check there first and then check the fallback in another engine.
- Comments explain why, not what. Write them in English.
- Do not add runtime dependencies without discussing it first. The goal is for the package to depend only on React and `motion`.
- Respect accessibility: keyboard operation, focus visibility, roles and `prefers-reduced-motion`.
- Format with Prettier (`npm run format`).

## Project layout

```
src/core          Framework independent logic: corners, refraction maps, geometry, light, springs
src/components    Glass components built on LiquidGlass
src/LiquidGlass   The surface
src/GlassMerge    Merging groups
src/styles.css    Design tokens and component styles
demo              Interactive demo (Vite)
tests             Unit and component tests
```

## Reporting bugs

Open an issue with the browser and version, a minimal reproduction, and a screenshot. Rendering differences between engines are expected for refraction and corner shapes; see the browser support table in the README.
