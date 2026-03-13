# Template Workflows

FigmaTK supports two related template states and one downstream instantiation flow.

## States

### Draft template

- Structure: `SLIDE_ROW -> SLIDE -> ...`
- No `MODULE` node required
- Internal styles and variables remain on `Internal Only Canvas`
- Best for authoring new layouts and naming slots

### Published or publish-like template

- Structure: `SLIDE_ROW -> MODULE -> SLIDE -> ...`
- The slide subtree stays intact under a thin publishable `MODULE`
- Internal canvases and special nodes are preserved
- Best for later instantiation

### Instantiated deck

- In the current observed Figma flow, instantiation preserves the published module-backed structure
- FigmaTK follows that model and clones `MODULE -> SLIDE -> subtree` layouts directly

## Naming Conventions

Use explicit names so editable slots are discoverable from the `.deck` alone.

- Layouts: `layout:<name>`
- Text slots: `slot:text:<name>`
- Image slots: `slot:image:<name>`
- Decorative or fixed sample imagery: `fixed:image:<name>`

Examples:

- `layout:cover`
- `slot:text:title`
- `slot:text:subtitle`
- `slot:image:hero_image`
- `fixed:image:brand_texture`

If a layout contains any explicit slot metadata, FigmaTK will only promote explicitly marked image slots as editable. Unmarked image fills stay decorative by default.

## Recommended MCP Flow

### Author a draft template

1. `figmatk_create_template_draft`
2. `figmatk_inspect` or `figmatk_list_template_layouts`
3. `figmatk_annotate_template_layout`
4. Repeat until the draft layout names and slots are stable

### Publish-wrap the draft

1. `figmatk_publish_template_draft`
2. `figmatk_list_template_layouts`
3. Confirm the wrapped layout catalog still exposes the same slot names

### Instantiate a new deck

1. `figmatk_list_template_layouts`
2. `figmatk_create_from_template`

`figmatk_create_from_template` accepts:

- `text`: map of slot name, node ID, or fallback node name to string value
- `images`: map of slot name, node ID, or fallback node name to absolute image path

## Multi-Row Discovery

Template discovery scans every main-canvas `SLIDE_ROW`. It does not limit itself to the first row.

`Internal Only Canvas` assets are preserved during wrapping and instantiation, but slides on that canvas are not treated as primary instantiable layouts unless you explicitly inspect them.

## Special Nodes

FigmaTK preserves unsupported-but-known nodes during cloning and wrapping, including:

- device mockups
- vector masks
- interactive slide elements

The MVP does not synthesize those node types from scratch. It preserves them when they already exist in the source template.
