# Rendering Pipeline

## SVG Generation (svg-builder.mjs)

### Node Type Dispatch

Each Figma node type maps to a render function. Unknown types emit a magenta
dashed placeholder so renders never crash.

| Node Type | Renderer | Description |
|-----------|----------|-------------|
| `ROUNDED_RECTANGLE` | `renderRect` | Fill, stroke, cornerRadius |
| `RECTANGLE` | `renderRect` | Same as ROUNDED_RECTANGLE |
| `SHAPE_WITH_TEXT` | `renderShapeWithText` | Pill/badge with embedded text |
| `ELLIPSE` | `renderEllipse` | Fill, stroke, cx/cy/rx/ry |
| `TEXT` | `renderText` | Full typography pipeline |
| `FRAME` | `renderFrame` | Container with fill/stroke/image, clips children |
| `GROUP` | `renderGroup` | Transform wrapper, recurses children |
| `SECTION` | `renderGroup` | Same as GROUP |
| `BOOLEAN_OPERATION` | `renderGroup` | Same as GROUP |
| `LINE` | `renderLine` | Uses full transform matrix for direction |
| `VECTOR` | placeholder | Not yet implemented |
| `STAR` | placeholder | Not yet implemented |
| `POLYGON` | placeholder | Not yet implemented |
| `INSTANCE` | placeholder | Needs symbol resolution + override application |

### Position and Size

All nodes use the same pattern:

- **Position**: `transform.m02` (x), `transform.m12` (y) — relative to parent
- **Size**: `size.x` (width), `size.y` (height)
- **LINE** is special: uses full transform matrix `(m00, m10)` for direction vector

### Color Resolution

Fill colors are resolved through a priority chain:

1. `node.fillPaints[]` — direct fills on the node
2. `node.nodeGenerationData.overrides[0].fillPaints` — for SHAPE_WITH_TEXT
3. Only `SOLID` type fills with `visible !== false` are used
4. Color format: `{ r, g, b, a }` where channels are 0-1 floats

## Text Rendering

Text is the most complex part of the pipeline. There are three paths, chosen
based on available data:

### Path 1: Mixed-style (glyph-level positioning)

**Used when**: `derivedTextData.baselines` + `derivedTextData.glyphs` +
`textData.characterStyleIDs` are all present.

This handles text with multiple fonts, weights, or decorations in a single node.

1. For each baseline (line of text):
   - Filter glyphs belonging to this line
   - Group consecutive glyphs by `characterStyleIDs[charIndex]`
   - Emit one `<tspan>` per run with per-run `font-family`, `font-weight`, `font-style`
2. Each glyph has an absolute `position.x/y` — no line-height guessing needed

Style overrides come from `textData.styleOverrideTable`:

```javascript
styleOverrideTable: [
  { styleID: 1, fontName: { family: 'Inter', style: 'Bold' } },
  { styleID: 2, textDecoration: 'UNDERLINE' },
]
```

A `characterStyleIDs` value of `0` means "use the base node style". Non-zero
values reference `styleID` entries in the table.

**Important**: Only override font properties from `styleOverrideTable` if the
entry has an explicit `fontName` — otherwise fall through to the node's base
`fontName`. This prevents decorations-only overrides from resetting font properties.

### Path 2: Uniform style (baseline positioning)

**Used when**: `derivedTextData.baselines` exists but glyphs/styleIDs don't.

One `<tspan>` per baseline with absolute `x/y` from `baseline.position`.

### Path 3: Fallback (line-height calculation)

**Used when**: No `derivedTextData` at all.

Splits `characters` on `\n`, uses `dy` with computed line height. Line height
resolution: `RAW` = multiplier, `PERCENT` = percentage, `PIXELS` = absolute.

## derivedTextData — Key Fields

Figma pre-computes layout data and stores it in the deck. This is authoritative —
use it instead of computing from font metrics.

### baselines

```javascript
baselines: [
  {
    firstCharacter: 0,     // char index of line start
    endCharacter: 15,      // char index of line end (exclusive)
    position: { x: 0, y: 91.6 },  // absolute position relative to node
    width: 632.98,         // rendered width of this line
    lineHeight: 115.2,     // total line height
    lineAscent: 91.636,    // ascent from baseline position
  },
  // ...
]
```

### glyphs

```javascript
glyphs: [
  {
    firstCharacter: 0,     // char index this glyph represents
    position: { x: 0, y: 91.6 },  // absolute glyph position
    fontSize: 96,          // font size for this glyph
  },
  // ...
]
```

### decorations

Figma pre-computes exact underline/strikethrough rectangles. These are the
**authoritative** decoration positions — do not compute from font metrics.

```javascript
decorations: [
  {
    rects: [
      { x: 0, y: 226.09, w: 632.98, h: 6.55 },  // relative to node top-left
    ],
    styleID: 6,  // references styleOverrideTable entry
  },
]
```

The rasterizer draws these as explicit `<rect>` elements after the `<text>`
element, giving pixel-perfect underline placement for any font.

**Why not SVG `text-decoration`?** resvg uses the font's `post.underlinePosition`
table, which varies between fonts and versions. Figma computes its own positions.
Manual `<rect>` elements match Figma exactly.

### fontMetaData

```javascript
fontMetaData: [
  {
    key: { family: 'Inter', style: 'Bold' },
    fontWeight: 700,
    fontDigest: Uint8Array(20),  // SHA-1 hash of the font binary Figma used
  },
]
```

`fontWeight` from here is used as the authoritative weight (overrides parsing
the style string).

## SHAPE_WITH_TEXT Nodes

Pill/badge nodes store shape and text in `nodeGenerationData.overrides`:

- `overrides[0]` — shape: `fillPaints`, `strokePaints`, `strokeWeight`, `cornerRadius`
- `overrides[1]` — text: `textData.characters`, `fontName`, `fontSize`, `textCase`

Text positioning comes from `derivedImmutableFrameData.overrides[]` — find the
entry with `derivedTextData` and use its `transform` for the text box offset.

**Important**: `derivedImmutableFrameData` values are authoritative.
`nodeGenerationData` can contain stale/wrong values for font properties.

## Image Fills

FRAME nodes can have `IMAGE` type fills. Supported scale modes:

| Mode | SVG | Description |
|------|-----|-------------|
| `FILL` | `preserveAspectRatio="xMidYMid slice"` | Cover (crop to fill) |
| `FIT` | `preserveAspectRatio="xMidYMid meet"` | Contain (fit within bounds) |
| `TILE` | `<pattern>` element | Repeat at `scale * originalImageWidth/Height` |

Images are read from `deck.imagesDir` by SHA-1 hash name, base64-encoded inline
as data URIs.

## Letter Spacing

- `PERCENT`: `(value / 100) * fontSize` in pixels
- `PIXELS`: direct pixel value
- Applied as SVG `letter-spacing` attribute on the `<text>` element
- In glyph path: each run already starts at the correct absolute position
  (accounting for letter spacing), so the attribute only affects intra-run spacing

## PNG Rendering (deck-rasterizer.mjs)

### Scale Options

```javascript
svgToPng(svg, { scale: 0.5 });  // 960x540
svgToPng(svg, { width: 800 });  // fit to width, preserve aspect ratio
svgToPng(svg, { height: 400 }); // fit to height, preserve aspect ratio
```

Native resolution is 1920x1080. The renderer never upscales beyond native.

### WASM Initialization

`@resvg/resvg-wasm` is initialized lazily on first render call. The WASM binary
is loaded synchronously from `node_modules`. Initialization happens once per
process — subsequent calls reuse the initialized instance.

System fonts are disabled (`loadSystemFonts: false`). Only explicitly registered
font buffers are available, ensuring reproducible renders across machines.
