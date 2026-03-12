---
name: figmatk
description: >
  Create, edit, and inspect Figma Slides .deck files. Use when the user asks to
  create a presentation, build a slide deck, edit slides, update text or images,
  clone or remove slides, or produce a .deck file for Figma Slides.
metadata:
  version: "0.0.6"
---

# FigmaTK Skill

## Quick Reference

| Task | Approach |
|------|----------|
| Create a new deck from scratch | Use the high-level JS API (`lib/api.mjs`) |
| Edit text or images in an existing deck | Use MCP tools (`figmatk_update_text`, `figmatk_insert_image`) |
| Clone, remove, or restructure slides | Use MCP tools (`figmatk_clone_slide`, `figmatk_remove_slide`) |
| Inspect structure or read content | Use MCP tools (`figmatk_inspect`, `figmatk_list_text`) |

---

## Path A — Create from Scratch (High-Level API)

Use this when the user wants a new presentation. Write a Node.js script and execute it.

```javascript
import { Deck } from 'figmatk';

const deck = await Deck.create('My Presentation');
const slide = deck.addBlankSlide();

slide.setBackground('slate');
slide.addText('Slide Title', { style: 'Title', color: 'white', x: 64, y: 80, width: 1792 });
slide.addText('Subtitle or tagline here', { style: 'Body 1', color: 'light-gray', x: 64, y: 240, width: 1200 });

await deck.save('/path/to/output.deck');
```

### Text styles

| Style | Size | Weight | Use for |
|-------|------|--------|---------|
| `Title` | 96pt | Bold | Slide title |
| `Header 1` | 60pt | Bold | Section headers |
| `Header 2` | 48pt | Bold | Sub-headers |
| `Header 3` | 36pt | Bold | In-slide headings |
| `Body 1` | 36pt | Regular | Primary body text |
| `Body 2` | 30pt | Regular | Secondary body text |
| `Body 3` | 24pt | Regular | Captions, labels |
| `Note` | 20pt | Regular | Footnotes, sources |

### Named colors (Light Slides theme)

`white`, `black`, `slate`, `light-gray`, `dark-gray`, `blue`, `light-blue`, `green`, `light-green`, `yellow`, `orange`, `red`, `pink`, `purple`

Pass a hex string (`'#E63946'`) for custom colours.

### Slide dimensions

1920 × 1080px. Position and size all elements in pixels.

### Available slide methods

```javascript
slide.setBackground(color)                        // named color or hex
slide.addText(text, opts)                         // opts: style, color, x, y, width, align, bold, italic, fontSize
slide.addFrame(opts)                              // auto-layout frame: stackMode, spacing, x, y, width, height
slide.addRectangle(opts)                          // opts: x, y, width, height, fill, opacity, cornerRadius
slide.addEllipse(opts)                            // circle/ellipse: x, y, width, height, fill
slide.addDiamond(opts)                            // diamond shape
slide.addTriangle(opts)                           // triangle
slide.addStar(opts)                               // 5-pointed star
slide.addLine(x1, y1, x2, y2, opts)             // line: strokeColor, strokeWeight
slide.addImage(path, opts)                        // freestanding image: x, y, width, height
slide.addTable(data, opts)                        // 2D array of strings: x, y, width, colWidths, rowHeight
slide.addSVG(x, y, width, svgPathOrBuf, opts)   // import SVG vector graphic
```

---

## Path B — Edit an Existing Deck (MCP Tools)

Use this when the user provides a `.deck` file to modify.

### Workflow

1. `figmatk_inspect` — understand the deck structure (node IDs, slide count, symbols)
2. `figmatk_list_text` — read current text and images per slide
3. `figmatk_list_overrides` — find the override keys for each symbol (what's editable)
4. `figmatk_update_text` — apply text changes
5. `figmatk_insert_image` — apply image changes
6. `figmatk_clone_slide` — duplicate a slide and populate it
7. `figmatk_remove_slide` — mark unwanted slides as REMOVED
8. Always write to a **new output path** — never overwrite the source

### MCP tool reference

| Tool | Purpose |
|------|---------|
| `figmatk_inspect` | Node hierarchy tree — structure, node IDs, slide count |
| `figmatk_list_text` | All text strings and image hashes per slide |
| `figmatk_list_overrides` | Editable override keys per symbol (component) |
| `figmatk_update_text` | Set text overrides on a slide instance |
| `figmatk_insert_image` | Set image fill override (handles SHA-1 hashing + thumbnail) |
| `figmatk_clone_slide` | Deep-clone a slide with new text and images |
| `figmatk_remove_slide` | Mark slides as REMOVED (never deleted) |
| `figmatk_roundtrip` | Decode + re-encode for pipeline validation |

---

## Design Philosophy

Every deck must look **intentionally designed**, not AI-generated. Follow these rules on every presentation task.

### Colour

- Pick a bold palette that reflects the **specific topic**. If the same palette would suit a completely different presentation, it's not specific enough.
- Use **one dominant colour** (60–70% visual weight) + 1–2 supporting tones + one sharp accent.
- Use dark backgrounds on title and conclusion slides, light on content slides ("sandwich" structure) — or commit fully to dark for a premium feel.

**Starter palettes:**

| Theme | Background | Accent | Text |
|-------|-----------|--------|------|
| Midnight | `#1E2761` | `#CADCFC` | `white` |
| Forest | `#2C5F2D` | `#97BC62` | `white` |
| Coral | `#F96167` | `#2F3C7E` | `white` |
| Terracotta | `#B85042` | `#E7E8D1` | `white` |
| Ocean | `#065A82` | `#21295C` | `white` |
| Minimal | `#F2F2F2` | `#36454F` | `#212121` |

### Layout

- Every slide needs at least **one visual element** — shape, image, SVG icon, or table. Text-only slides are forgettable.
- **Vary layouts** — never use the same structure slide after slide.
- Pick one visual motif (e.g. rounded image frames, coloured icon circles, thick side accent bars) and carry it through every slide.

**Layout options per slide:**

- Two-column (text left, visual right)
- Icon + text rows (icon in coloured circle, bold header, description)
- 2×2 or 2×3 grid of cards
- Large stat callout (big number + small label)
- Half-background image with text overlay
- Timeline / numbered steps

### Typography

- Left-align body text. Centre only titles.
- **Font sizes:** titles use `Title` style (96pt); section headers `Header 1` (60pt); body `Body 1` or `Body 2`; captions `Body 3` or `Note`.
- Minimum 64px margin from slide edges. 24–48px gap between content blocks.

### Things to never do

- Repeat the same layout slide after slide
- Centre body text
- Use accent lines under slide titles (hallmark of AI-generated slides — use colour or whitespace instead)
- Create text-only slides
- Use low-contrast text — always check text against its background
- Default to generic blue — pick colours that reflect the topic

---

## QA

After generating or editing a deck:

1. **Self-check:** confirm all placeholder text has been replaced, no `lorem ipsum` or `[title here]` remains
2. **Tell the user** to upload the `.deck` to Figma Slides and review visually — this is the only way to catch rendering issues
3. **Offer to fix** any issues the user reports after upload

---

## Critical Format Rules

- Blank text fields must use `" "` (space), **never** empty string — empty string crashes Figma
- Image overrides require both a full-image hash and a ~320px thumbnail hash (40-char hex SHA-1)
- Removed nodes use `phase: 'REMOVED'` — never delete from `nodeChanges`
- Chunk 1 of `canvas.fig` must be zstd-compressed — Figma silently rejects deflateRaw
- `thumbHash` must be `new Uint8Array(0)`, never `{}`
