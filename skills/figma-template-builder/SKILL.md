---
name: figma-template-builder
description: >
  Author reusable Figma Slides templates as .deck files. Use when the user
  wants to build a template, derive a new template from an existing deck, mark
  editable text/image slots, or prepare a draft template for later
  instantiation.
metadata:
  version: "0.1.0"
---

# Figma Template Builder

Use this skill when the goal is to build or refine the template itself. For the common workflow of taking an existing template and producing a new presentation, use `skills/figma-slides-creator/SKILL.md`.

## Core Model

Template work happens in two states:

- Draft template: `SLIDE_ROW -> SLIDE -> ...`
- Published or publish-like template: `SLIDE_ROW -> MODULE -> SLIDE -> ...`

Draft templates are easier to author. Publish-like wrapping is the final step before later instantiation.

## Naming Conventions

Always use explicit metadata when authoring reusable layouts:

- Layouts: `layout:<name>`
- Text slots: `slot:text:<name>`
- Image slots: `slot:image:<name>`
- Decorative fixed imagery: `fixed:image:<name>`

These conventions are how later sessions discover what is editable.

## Recommended Flow

### 1. Create or inspect a draft template

- New draft from scratch: `figmatk_create_template_draft`
- Existing deck/template: `figmatk_list_template_layouts`
- Structural inspection: `figmatk_inspect`

### 2. Annotate reusable layouts

Use `figmatk_annotate_template_layout` to:

- rename a slide as a layout
- mark text nodes as editable text slots
- mark image-bearing nodes as editable image slots
- mark decorative imagery as fixed

The tool accepts node ID maps, so inspect first if you need the raw node IDs.

### 3. Publish-wrap when the template is ready

Use `figmatk_publish_template_draft` to add publish-like `MODULE` wrappers while preserving the slide subtree and internal assets.

### 4. Verify the result

- `figmatk_list_template_layouts`
- `figmatk_list_text`
- `figmatk_roundtrip` if you want a conservative encode/decode check

## Practical Rules

- Prefer explicit slot names over heuristic placeholders.
- Do not assume every image fill is editable content.
- Preserve `Internal Only Canvas` assets.
- Preserve special nodes such as device mockups and interactive slide elements; do not try to recreate them from scratch unless necessary.

## Example

```json
{
  "path": "/tmp/draft-template.deck",
  "output": "/tmp/draft-template-annotated.deck",
  "slideId": "1:42",
  "layoutName": "cover",
  "textSlots": {
    "1:120": "title",
    "1:121": "subtitle"
  },
  "imageSlots": {
    "1:144": "hero_image"
  },
  "fixedImages": {
    "1:199": "background_texture"
  }
}
```
