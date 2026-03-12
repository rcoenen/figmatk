# FigmaTK — Figma Slides Deck Manipulation

Use the `figmatk` CLI to inspect and modify Figma `.deck` files natively — no lossy .pptx conversion.

## Prerequisites

```bash
npm install -g figmatoolkit
```

## Commands

### Inspect structure
```bash
figmatk inspect <file.deck>
```

### List all text content
```bash
figmatk list-text <file.deck>
```

### List editable override keys per symbol
```bash
figmatk list-overrides <file.deck>
```

### Update text overrides
```bash
figmatk update-text <file.deck> -o <output.deck> --slide <instance-id> --set "key=value"
```

### Insert image fill
```bash
figmatk insert-image <file.deck> -o <output.deck> --slide <instance-id> --target <override-key> --hash <image-hash> --thumb <thumb-hash> --width <w> --height <h>
```

### Clone a slide
```bash
figmatk clone-slide <file.deck> -o <output.deck> --source <slide-id>
```

### Remove a slide
```bash
figmatk remove-slide <file.deck> -o <output.deck> --slide <slide-id>
```

### Roundtrip validation
```bash
figmatk roundtrip <input.deck> <output.deck>
```

## Library usage

FigmaTK can also be imported as a Node.js library:

```javascript
import { FigDeck } from 'figmatoolkit/lib/fig-deck.mjs';
import { ov, nestedOv, removeNode } from 'figmatoolkit/lib/node-helpers.mjs';
import { imageOv } from 'figmatoolkit/lib/image-helpers.mjs';
import { deepClone } from 'figmatoolkit/lib/deep-clone.mjs';

const deck = await FigDeck.fromDeckFile('template.deck');
// ... modify slides, text, images ...
await deck.saveDeck('output.deck', { imagesDir: './images' });
```

## Key rules

- Text overrides: `{ guidPath, textData: { characters } }` — no `lines` array
- Blank fields must be `' '` (space), never `''` (crashes Figma)
- Image overrides require `styleIdForFill: { guid: { sessionID: 0xFFFFFFFF, localID: 0xFFFFFFFF } }`
- Node removal: set `phase: 'REMOVED'`, never filter from nodeChanges
- See `docs/deck-format.md` for full .deck file format spec
