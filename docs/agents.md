# Agent Guide

Project reference for AI agents and developers working on figmatk.
Tool-agnostic — not specific to any assistant or IDE.

## Project Overview

**figmatk** is a Node.js toolkit for reading, modifying, and rendering Figma
files natively. Package name: `figmatk` (npm). Use `figmatoolkit` only in prose.

Currently supports `.deck` files (Figma Slides). Future: `.fig` files (Figma
Design). The binary codec is already format-agnostic — both formats share the
same kiwi schema + zstd pipeline.

## Architecture

```
.deck (ZIP)  →  FigDeck (codec)  →  node tree  →  Deck/Slide API  →  user code
.fig (raw)   →  FigDeck (codec)  →  node tree  →  (future API)    →  user code
                                         ↓
                                  svg-builder.mjs  →  SVG  →  resvg-wasm  →  PNG
```

### Layers

| Layer | Path | Format-agnostic? | Description |
|-------|------|-------------------|-------------|
| Binary codec | `lib/core/fig-deck.mjs` | Yes | Kiwi schema, zstd, node tree, blobs |
| Node helpers | `lib/core/node-helpers.mjs` | Yes | GUIDs, tree traversal, `nid()` |
| Image helpers | `lib/core/image-helpers.mjs` | Yes | SHA-1 hashing, thumbnails |
| High-level API | `lib/slides/api.mjs` | Slides-only | `Deck`, `Slide`, `Symbol`, `TextNode`, `ImageNode` |
| Templates | `lib/slides/template-deck.mjs` | Slides-only | Template inspection, authoring, instantiation |
| Rasterizer | `lib/rasterizer/` | Yes | SVG generation + PNG rendering |
| CLI commands | `commands/` | Slides-only | inspect, update-text, clone-slide, etc. |
| MCP server | `mcp-server.mjs` | Slides-only | Tool server for AI assistants |

### .deck vs .fig

A `.deck` file is a ZIP containing `canvas.fig` + `meta.json` + `thumbnail.png`
+ `images/`. The `canvas.fig` inside uses the same binary format as standalone
`.fig` files. `FigDeck` already has both `fromDeckFile()` (ZIP) and
`fromFigFile()` (raw binary).

When adding `.fig` support, build parallel high-level classes (e.g. `FigFile`,
`Page`) — the codec and rasterizer need no changes.

## Key directories

```
lib/core/               Shared codec, helpers (format-agnostic)
lib/slides/             Slides-specific API, templates (.deck)
lib/rasterizer/         SVG builder + PNG renderer + font resolution
commands/               CLI command implementations
decks/reference/        Ground-truth decks from Figma (for format learning + SSIM tests)
decks/generated-for-validation/  Decks our code produces (user tests in Figma)
docs/format/            Binary format specification
docs/rasterizer/        Rendering pipeline, fonts, testing
test/                   Vitest test suites
```

## Development methodology

1. **Learn**: User creates X in Figma → saves `.deck` → we inspect to learn format
2. **Implement**: Write code based on observed format
3. **Validate**: Produce `.deck` → user uploads to Figma → confirm it renders correctly
4. **Regress**: Add SSIM test with reference PNG → threshold guards prevent regressions

Unknown format features must go through this loop before implementing. Never guess
at undocumented format behavior.

## Slide access is 1-indexed

```javascript
deck.getSlide(1)   // first slide (FigDeck low-level)
deck.slide(1)      // first slide (Deck high-level API)
deck.getActiveSlides()  // all slides as array (for iteration)
```

There is no slide 0.

## Format rules (crash if violated)

See `docs/format/invariants.md` for the full list. The critical ones:

- **Never filter `nodeChanges`** — set `phase: 'REMOVED'` instead
- **Never use `''` empty string for text** — use `' '` (space); empty crashes Figma
- **Chunk 1 must be zstd** — Figma silently rejects deflateRaw
- **Preserve original kiwi schema** verbatim — never regenerate
- **`thumbHash` must be `new Uint8Array(0)`**, never `{}`

## Rendering principles

See `docs/rasterizer/pipeline.md` for full details. Key non-obvious behaviors:

- **Full affine transforms**: FRAME/GROUP/INSTANCE can be rotated+scaled, not just
  translated. Use the full `matrix()` SVG transform with 6dp precision for
  rotation/scale components.
- **Per-path vector fills**: A single VECTOR node can have different fill colors on
  different sub-paths via `fillGeometry[].styleID` → `vectorData.styleOverrideTable`.
- **Stroke geometry is pre-expanded**: strokeGeometry blobs are filled outline shapes,
  not SVG strokes. Fill them with the stroke color.
- **INSIDE stroke clipping**: Figma's stroke geometry extends symmetrically outside the
  frame edge. Clip to frame bounds to show only the inside portion.
- **Node opacity**: Applied as SVG group opacity on the entire subtree.
- **frameMaskDisabled=false**: Clips children to frame bounds (Figma default).
- **derivedTextData is authoritative**: Always use Figma's pre-computed glyph positions,
  baselines, and decoration rectangles over manual font metric calculation.

## SSIM testing

Rendered slides are compared pixel-by-pixel against Figma reference PNGs.
See `docs/rasterizer/testing.md`.

- Thresholds are regression guards — raise as rendering improves, never lower
- Reports show 3 columns: Reference, Render, Overlay (50% diff composite)
- Run `npm test` to execute all SSIM tests

## Validation approach

- Use **high-contrast, obviously different colors** in test decks — subtle hues are
  easy to miss
- When regenerating a validation deck, bump a numeric suffix `_01`, `_02`, `_03` —
  user keeps multiple versions open in Figma simultaneously
- Always fix rendering issues at the **root cause level** — first-principles fixes
  that improve all slides, not per-slide hacks

## Documentation index

| Document | What it covers |
|----------|----------------|
| `docs/architecture.md` | Multi-product architecture: shared core, product layers, migration path |
| `docs/format/` | Binary format: ZIP structure, nodes, shapes, text, images, overrides |
| `docs/rasterizer/pipeline.md` | SVG generation: node dispatch, transforms, VECTOR, INSTANCE |
| `docs/rasterizer/fonts.md` | Font resolution, Google Fonts, Inter v3/v4, TTC |
| `docs/rasterizer/testing.md` | SSIM testing, reference decks, HTML comparison reports |
| `docs/figmatk-api-spec.md` | High-level API design (phases 1–5) |
| `docs/feature-map.md` | python-pptx → figmatk feature mapping |
| `docs/library.md` | Library usage examples |
