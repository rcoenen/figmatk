# figmatk API — Feature Map

Maps every python-pptx feature to its figmatk equivalent.
Used to drive spec and phase planning.

## Categories

| Symbol | Meaning |
|--------|---------|
| ✅ Direct | Same concept, straightforward mapping |
| ⭐ Richer | Figma does this better / differently — worth going beyond pptx |
| ❌ Skip | No Figma Slides equivalent, omit |
| 🔬 Unknown | Figma has it internally but format is unvalidated — needs investigation |

---

## Presentation

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| `Presentation('file.pptx')` | ✅ Direct | `Deck.open('file.deck')` | Phase 1 — done |
| `Presentation()` new blank | 🔬 Unknown | `Deck.create()` | Needs a blank deck template to clone from |
| `prs.save('out.pptx')` | ✅ Direct | `deck.save('out.deck')` | Phase 1 — done |
| `slide_width`, `slide_height` | 🔬 Unknown | `deck.slideWidth`, `deck.slideHeight` | Stored on CANVAS or SLIDE_GRID node; format unvalidated |
| Core metadata (title, author, etc.) | ✅ Direct | `deck.meta.file_name` | Only `file_name` + `version` in `meta.json`; no rich metadata |

---

## Slides

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| `slides.add_slide(layout)` | ✅ Direct | `deck.addSlide(symbol)` | Phase 4 — done |
| `slides[0]` | ✅ Direct | `deck.slides[0]` | Phase 1 — done |
| Remove slide | ✅ Direct | `deck.removeSlide(slide)` | Phase 4 — done |
| Reorder slides | ✅ Direct | `deck.moveSlide(slide, index)` | Phase 4 — done |
| `slide.background` fill | 🔬 Unknown | `slide.background.solid(r,g,b)` | SLIDE node has fill fields; format unvalidated |
| Notes slide | 🔬 Unknown | `slide.notes` | Unknown if Figma Slides has a notes equivalent |
| `slide.slide_layout` | ⭐ Richer | `slide.symbol` | In Figma, the "layout" is a full SYMBOL with overrideable slots |

---

## Slide Layouts & Masters

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| `prs.slide_layouts` | ⭐ Richer | `deck.symbols` | Figma SYMBOLs are richer than pptx layouts — full component model |
| `slide_layout.placeholders` | ⭐ Richer | `symbol.textSlots`, `symbol.imageSlots` | Phase 1 — done |
| Slide master | ⭐ Richer | `deck.master` (future) | Figma has SYMBOL masters + COMPONENT_SET variants |
| Notes master | 🔬 Unknown | — | Unknown if applicable |

---

## Shapes — General

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| `shape.left`, `top`, `width`, `height` | 🔬 Unknown | `shape.x`, `shape.y`, `shape.width`, `shape.height` | Phase 5 — fields exist on nodes, unvalidated write |
| `shape.rotation` | 🔬 Unknown | `shape.rotation` | Phase 5 |
| `shape.name` | ✅ Direct | `shape.name` | Already readable from node |
| `shape.visible` | 🔬 Unknown | `shape.visible` | `visible` field on nodes; write unvalidated |
| `shape.fill` | 🔬 Unknown | `shape.fill` | Phase 5 — solid first, then gradient |
| `shape.line` (outline) | 🔬 Unknown | `shape.stroke` | Phase 5 |
| `shapes.add_shape(type, ...)` | 🔬 Unknown | `slide.addShape(type, x, y, w, h)` | Phase 6 — RECTANGLE, ELLIPSE, POLYGON, etc. |
| `shapes.add_textbox(...)` | 🔬 Unknown | `slide.addTextBox(x, y, w, h)` | Phase 6 — TEXT node |
| `shapes.add_connector(...)` | 🔬 Unknown | `slide.addConnector(...)` | Phase 6 — LINE node |
| `shapes.add_group_shape()` | 🔬 Unknown | `slide.addGroup()` | Phase 6 — GROUP node |
| Freeform shape | 🔬 Unknown | `slide.addVector(...)` | Phase 6 — VECTOR node with blob geometry |
| OLE objects | ❌ Skip | — | No Figma equivalent |

---

## Placeholders

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| Title placeholder | ⭐ Richer | `slide.setText('Title', value)` | Symbol override by node name — Phase 2 done |
| Body placeholder | ⭐ Richer | `slide.setText('Body', value)` | Phase 2 done |
| Picture placeholder | ⭐ Richer | `slide.setImage('Photo', path)` | Phase 3 done |
| `placeholder.insert_picture(path)` | ✅ Direct | `slide.setImage(name, path)` | Phase 3 done |
| Table placeholder | 🔬 Unknown | `slide.setTable(name, data)` | Unknown if Figma Slides has table nodes |
| Chart placeholder | ❌ Skip | — | Figma Slides has no native chart nodes |

---

## Text

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| `text_frame.text` read | ✅ Direct | `textNode.characters` | Phase 1 — done |
| Set text content | ✅ Direct | `slide.setText(name, value)` | Phase 2 — done |
| Batch set text | ✅ Direct | `slide.setTexts({name: value})` | Phase 2 — done |
| `paragraph.alignment` | 🔬 Unknown | `para.alignment` | Text style fields on TEXT node; write unvalidated |
| `paragraph.level` (bullets) | 🔬 Unknown | `para.level` | Unknown if Figma Slides uses indent levels |
| `paragraph.line_spacing` | 🔬 Unknown | `para.lineSpacing` | On TEXT node style; unvalidated |
| `paragraph.space_before/after` | 🔬 Unknown | `para.spaceBefore`, `para.spaceAfter` | Unvalidated |
| `run.font.name` | 🔬 Unknown | `run.font.name` | Font fields exist on TEXT node; write unvalidated |
| `run.font.size` | 🔬 Unknown | `run.font.size` | Unvalidated |
| `run.font.bold/italic` | 🔬 Unknown | `run.font.bold`, `.italic` | Unvalidated |
| `run.font.color` | 🔬 Unknown | `run.font.color` | Unvalidated |
| `run.font.underline` | 🔬 Unknown | `run.font.underline` | Unvalidated |
| `run.hyperlink.address` | 🔬 Unknown | `run.hyperlink` | Figma has link nodes; format unvalidated |
| `text_frame.vertical_anchor` | 🔬 Unknown | `textFrame.verticalAlign` | Unvalidated |
| `text_frame.word_wrap` | 🔬 Unknown | `textFrame.wordWrap` | Unvalidated |
| `text_frame.auto_size` | ⭐ Richer | `textFrame.autoSize` | Figma has auto-layout which is more powerful |
| `text_frame.columns` | 🔬 Unknown | — | Unknown if Figma Slides supports text columns |

---

## Fill

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| Solid fill | 🔬 Unknown | `shape.fill.solid(r,g,b)` | Phase 5 — `fillPaints` array on nodes |
| Gradient fill | 🔬 Unknown | `shape.fill.gradient(stops)` | Phase 5 |
| Pattern fill | ❌ Skip | — | No pattern fill concept in Figma |
| Picture fill | ✅ Direct | `shape.fill.image(path)` | Similar to image override; Phase 5 |
| No fill / transparent | 🔬 Unknown | `shape.fill.none()` | Set `visible: false` on fillPaints or empty array |
| Opacity | 🔬 Unknown | `shape.opacity` | `opacity` field on nodes; unvalidated write |

---

## Line / Border

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| Line color | 🔬 Unknown | `shape.stroke.color` | `strokePaints` array on nodes; unvalidated |
| Line width | 🔬 Unknown | `shape.stroke.weight` | `strokeWeight` field; unvalidated |
| Dash style | 🔬 Unknown | `shape.stroke.dash` | Unknown if Figma stores dash style in this format |
| No stroke | 🔬 Unknown | `shape.stroke.none()` | Unvalidated |

---

## Charts

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| All chart types | ❌ Skip | — | Figma Slides has no native chart nodes |

---

## Tables

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| `add_table(rows, cols, ...)` | 🔬 Unknown | `slide.addTable(...)` | Unknown if Figma Slides supports TABLE nodes |
| Cell text | 🔬 Unknown | `table.cell(r,c).text` | Unvalidated |
| Cell fill | 🔬 Unknown | `table.cell(r,c).fill` | Unvalidated |
| Merge cells | 🔬 Unknown | `cell.merge(other)` | Unknown if Figma has cell merge concept |
| Row/col sizing | 🔬 Unknown | `row.height`, `col.width` | Unvalidated |

---

## Images

| python-pptx | Category | figmatk API | Notes |
|-------------|----------|-------------|-------|
| `add_picture(path, l, t, w, h)` | 🔬 Unknown | `slide.addImage(x, y, w, h, path)` | Phase 6 — freestanding image node |
| `insert_picture` into placeholder | ✅ Direct | `slide.setImage(name, path)` | Phase 3 — done |
| Auto aspect-ratio preserve | ✅ Direct | handled in `setImage` | Phase 3 — done |
| SHA-1 hash + thumbnail | ✅ Direct | handled internally | Phase 3 — done |

---

## Figma-Only (no pptx equivalent)

These have no python-pptx counterpart but are natural targets for figmatk.

| Feature | figmatk API | Phase | Notes |
|---------|-------------|-------|-------|
| Component variants (`COMPONENT_SET`) | `deck.componentSets` | Future | Multiple layout variants per template |
| Design variables / tokens | `deck.variables` | Future | `VARIABLE_SET`, `VARIABLE` nodes |
| Auto-layout frames | `frame.autoLayout` | Future | Figma's layout engine — far more powerful than pptx text columns |
| Prototype interactions / animations | `slide.interactions` | Future | `prototypeInteractions` on nodes; format unvalidated |
| Slide grid layout | `deck.grid` | Future | `SLIDE_GRID` + `SLIDE_ROW` structure |
| Multiple pages | `deck.pages` | Future | Multiple CANVAS nodes — unknown if Figma Slides uses these |

---

## Summary

| Category | Count |
|----------|-------|
| ✅ Direct — done or straightforward | ~15 |
| ⭐ Richer — Figma exceeds pptx | ~6 |
| 🔬 Unknown — needs format validation | ~35 |
| ❌ Skip | ~5 |

The bulk of the work is in the 🔬 Unknown category — the features are all present
in the Figma node graph, but each needs an isolated write test before it can be
considered implemented.
