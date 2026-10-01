# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-10-01

### Fixed

- `import "liquid-glass-components/styles.css"` no longer fails type checking in TypeScript 7, which checks side effect imports by default. The stylesheet export now ships a declaration file.

## [1.0.0] - 2026-10-01

### Added

- `LiquidGlass` surface with edge refraction, chromatic dispersion, rim highlight and continuous corners
- Shared pointer driven light source
- Spring based motion language, liquid stretch and press feedback
- `GlassMerge` and `GlassMergeItem` for surfaces that fuse like drops
- Components: `GlassButton`, `GlassIconButton`, `GlassSegmented`, `GlassSwitch`, `GlassSlider`, `GlassInput`, `GlassChip`, `GlassCard`, `GlassMenu`, `GlassDialog`, `GlassToast`
- `GlassProvider` with presets, light, dark and automatic color schemes, accent color and right to left support
- Interactive demo
