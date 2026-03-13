# Rasterizer

Render Figma Slides `.deck` files to PNG images without Figma.

## Architecture

```
FigDeck  →  slideToSvg()  →  SVG string  →  svgToPng()  →  PNG bytes
             svg-builder.mjs                  deck-rasterizer.mjs
                                              (resvg-wasm)
```

1. **svg-builder.mjs** — Walks the slide's node tree, dispatching each node type
   to a renderer that emits SVG elements. Uses Figma's `derivedTextData` for
   exact glyph positions, baseline offsets, and decoration rectangles.

2. **deck-rasterizer.mjs** — Loads fonts, initializes resvg-wasm once per process,
   and converts SVG strings to PNG bytes. Exposes `svgToPng()`, `renderDeck()`,
   `registerFont()`, and `registerFontDir()`.

## Documents

| Document | Description |
|----------|-------------|
| [fonts.md](fonts.md) | Font loading, Inter v3 vs v4, version detection, resvg matching, custom fonts |
| [pipeline.md](pipeline.md) | SVG generation pipeline, node type dispatch, derivedTextData fields |
| [testing.md](testing.md) | SSIM quality testing, reference decks, HTML comparison reports |

## Quick Start

```javascript
import { FigDeck } from 'figmatoolkit/lib/fig-deck.mjs';
import { renderDeck, registerFont } from 'figmatoolkit/lib/rasterizer/deck-rasterizer.mjs';

const deck = await FigDeck.fromDeckFile('slides.deck');

// Optional: register custom fonts before rendering
registerFont('/path/to/CustomFont.woff2');

const slides = await renderDeck(deck, { scale: 0.5 }); // 960x540 thumbnails
for (const { index, png } of slides) {
  writeFileSync(`slide-${index}.png`, png);
}
```
