/**
 * figmatk programmatic API
 *
 * High-level Deck / Slide / Symbol classes wrapping FigDeck.
 * Analogous to python-pptx's Presentation / Slide model.
 *
 * Phases implemented:
 *   Phase 1 — Read API       (Deck.open, deck.slides, slide.textNodes, slide.imageNodes)
 *   Phase 2 — Text write     (slide.setText, slide.setTexts)
 *   Phase 3 — Image write    (slide.setImage)
 *   Phase 4 — Slide mgmt     (deck.addSlide, deck.removeSlide, deck.moveSlide)
 *   Phase 5+ — Shape props   (not yet implemented)
 */

import { FigDeck } from './fig-deck.mjs';
import { nid, parseId, positionChar } from './node-helpers.mjs';
import { imageOv } from './image-helpers.mjs';
import { deepClone } from './deep-clone.mjs';
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { join, resolve } from 'path';

// ---------------------------------------------------------------------------
// Deck
// ---------------------------------------------------------------------------

export class Deck {
  constructor(figDeck, sourcePath = null) {
    this._fd = figDeck;
    this._sourcePath = sourcePath;
  }

  /**
   * Open a .deck file.
   * @param {string} path
   * @returns {Promise<Deck>}
   */
  static async open(path) {
    const fd = await FigDeck.fromDeckFile(resolve(path));
    return new Deck(fd, resolve(path));
  }

  /** Presentation metadata from meta.json */
  get meta() {
    return this._fd.deckMeta ?? {};
  }

  /** Ordered list of active (non-REMOVED) Slide objects */
  get slides() {
    return this._fd.getActiveSlides().map(n => new Slide(this._fd, n));
  }

  /** All SYMBOL nodes available as templates */
  get symbols() {
    return this._fd.getSymbols().map(n => new Symbol(this._fd, n));
  }

  /**
   * Save to a file. Defaults to overwriting the source path.
   * @param {string} [outPath]
   */
  async save(outPath) {
    const target = outPath ? resolve(outPath) : this._sourcePath;
    if (!target) throw new Error('No output path specified and no source path known');
    await this._fd.saveDeck(target);
  }

  // --- Phase 4: Slide management -------------------------------------------

  /**
   * Add a new slide by cloning a Symbol (template).
   * @param {Symbol} symbol   - Template to clone from
   * @param {object} [opts]
   * @param {Slide}  [opts.after]  - Insert after this slide (default: end)
   * @param {string} [opts.name]   - Slide name (default: symbol name)
   * @returns {Slide}
   */
  addSlide(symbol, opts = {}) {
    const fd = this._fd;

    // Find a representative slide that uses this symbol as a template source
    // to clone its SLIDE node structure (transform, size, etc.)
    const templateSlide = fd.getActiveSlides().find(s => {
      const inst = fd.getSlideInstance(nid(s));
      return inst?.symbolData?.symbolID &&
        nid({ guid: inst.symbolData.symbolID }) === nid(symbol._node);
    }) ?? fd.getActiveSlides()[0];

    if (!templateSlide) throw new Error('No slides to clone structure from');

    const templateInst = fd.getSlideInstance(nid(templateSlide));
    if (!templateInst) throw new Error('Template slide has no instance');

    const slideRowId = templateSlide.parentIndex?.guid
      ? `${templateSlide.parentIndex.guid.sessionID}:${templateSlide.parentIndex.guid.localID}`
      : null;

    // Assign new GUIDs
    let nextId = fd.maxLocalID() + 1;
    const slideLocalId = nextId++;
    const instLocalId = nextId++;

    // Clone SLIDE node
    const newSlide = deepClone(templateSlide);
    newSlide.guid = { sessionID: 1, localID: slideLocalId };
    newSlide.name = opts.name ?? symbol._node.name ?? 'New Slide';
    newSlide.phase = 'CREATED';
    delete newSlide.prototypeInteractions;
    delete newSlide.slideThumbnailHash;
    delete newSlide.editInfo;

    // Position in SLIDE_ROW
    if (slideRowId) {
      const activeCount = fd.getActiveSlides().length;
      const insertAt = opts.after
        ? fd.getActiveSlides().indexOf(opts.after._node) + 1
        : activeCount;
      newSlide.parentIndex = {
        guid: parseId(slideRowId),
        position: positionChar(insertAt),
      };
    }

    // X transform position
    if (newSlide.transform) {
      const activeCount = fd.getActiveSlides().length;
      newSlide.transform.m02 = activeCount * 2160;
    }

    // Clone INSTANCE node, pointing at the given symbol
    const newInst = deepClone(templateInst);
    newInst.guid = { sessionID: 1, localID: instLocalId };
    newInst.name = newSlide.name;
    newInst.phase = 'CREATED';
    newInst.parentIndex = { guid: { sessionID: 1, localID: slideLocalId }, position: '!' };
    newInst.symbolData = {
      symbolID: deepClone(symbol._node.guid),
      symbolOverrides: [],
      uniformScaleFactor: 1,
    };
    delete newInst.derivedSymbolData;
    delete newInst.derivedSymbolDataLayoutVersion;
    delete newInst.editInfo;

    fd.message.nodeChanges.push(newSlide);
    fd.message.nodeChanges.push(newInst);
    fd.rebuildMaps();

    return new Slide(fd, newSlide);
  }

  /**
   * Remove a slide (marks as REMOVED — never deletes from nodeChanges).
   * @param {Slide} slide
   */
  removeSlide(slide) {
    const node = slide._node;
    node.phase = 'REMOVED';
    delete node.prototypeInteractions;

    const inst = this._fd.getSlideInstance(nid(node));
    if (inst) {
      inst.phase = 'REMOVED';
      delete inst.prototypeInteractions;
    }
  }

  /**
   * Move a slide to a given index (0-based) in the active slide list.
   * Adjusts parentIndex.position characters to reorder.
   * @param {Slide} slide
   * @param {number} toIndex
   */
  moveSlide(slide, toIndex) {
    const active = this._fd.getActiveSlides();
    const fromIndex = active.indexOf(slide._node);
    if (fromIndex === -1) throw new Error('Slide not found in active slides');

    // Reorder array
    active.splice(fromIndex, 1);
    active.splice(toIndex, 0, slide._node);

    // Reassign position characters
    active.forEach((s, i) => {
      s.parentIndex.position = positionChar(i);
    });
  }
}

// ---------------------------------------------------------------------------
// Slide
// ---------------------------------------------------------------------------

export class Slide {
  constructor(figDeck, slideNode) {
    this._fd = figDeck;
    this._node = slideNode;
  }

  get name() { return this._node.name; }
  get guid() { return nid(this._node); }
  get index() { return this._fd.getActiveSlides().indexOf(this._node); }

  /** The INSTANCE child of this slide */
  get _instance() {
    return this._fd.getSlideInstance(nid(this._node));
  }

  /** The SYMBOL this slide's instance references */
  get _symbol() {
    const inst = this._instance;
    if (!inst?.symbolData?.symbolID) return null;
    const { sessionID, localID } = inst.symbolData.symbolID;
    return this._fd.getNode(`${sessionID}:${localID}`);
  }

  /**
   * All TEXT nodes in the symbol that have an overrideKey,
   * merged with any active text overrides on this instance.
   * @returns {TextNode[]}
   */
  get textNodes() {
    const sym = this._symbol;
    if (!sym) return [];
    const nodes = [];
    this._fd.walkTree(nid(sym), (node) => {
      if (node.type === 'TEXT' && node.overrideKey) {
        const ov = this._findTextOverride(node.overrideKey);
        nodes.push(new TextNode(node, ov));
      }
    });
    return nodes;
  }

  /**
   * Image placeholder nodes in the symbol (ROUNDED_RECTANGLE with overrideKey).
   * @returns {ImageNode[]}
   */
  get imageNodes() {
    const sym = this._symbol;
    if (!sym) return [];
    const nodes = [];
    this._fd.walkTree(nid(sym), (node) => {
      if (node.overrideKey &&
          (node.type === 'ROUNDED_RECTANGLE' || node.type === 'RECTANGLE') &&
          node.fillPaints?.some(p => p.type === 'IMAGE')) {
        const ov = this._findImageOverride(node.overrideKey);
        nodes.push(new ImageNode(node, ov));
      }
    });
    return nodes;
  }

  // --- Phase 2: Text write --------------------------------------------------

  /**
   * Set text on a placeholder by name or override key string ("s:l").
   * @param {string} nameOrKey  - Node name (e.g. "Title") or key "57:48"
   * @param {string} value
   */
  setText(nameOrKey, value) {
    const key = this._resolveTextKey(nameOrKey);
    if (!key) throw new Error(`Text node not found: ${nameOrKey}`);

    const chars = (value === '' || value == null) ? ' ' : value;
    const overrides = this._ensureOverrides();
    const existing = this._findTextOverride(key);

    if (existing) {
      existing.textData.characters = chars;
    } else {
      overrides.push({ guidPath: { guids: [key] }, textData: { characters: chars } });
    }
  }

  /**
   * Set multiple text values at once.
   * @param {Record<string, string>} map  - { nameOrKey: value }
   */
  setTexts(map) {
    for (const [k, v] of Object.entries(map)) {
      this.setText(k, v);
    }
  }

  // --- Phase 3: Image write -------------------------------------------------

  /**
   * Set an image on a placeholder by name or override key string ("s:l").
   * Handles SHA-1 hashing, thumbnail generation, images/ dir management.
   * @param {string} nameOrKey  - Node name or key "57:48"
   * @param {string|Buffer} pathOrBuf
   */
  setImage(nameOrKey, pathOrBuf) {
    const key = this._resolveImageKey(nameOrKey);
    if (!key) throw new Error(`Image node not found: ${nameOrKey}`);

    const imgBuf = typeof pathOrBuf === 'string'
      ? readFileSync(resolve(pathOrBuf))
      : pathOrBuf;
    const imgPath = typeof pathOrBuf === 'string' ? resolve(pathOrBuf) : null;

    const imgHash = sha1Hex(imgBuf);

    // Dimensions via sips (macOS) or fallback to 0x0
    let width = 0, height = 0;
    if (imgPath) {
      try {
        const out = execSync(`sips -g pixelWidth -g pixelHeight "${imgPath}"`, { encoding: 'utf8' });
        width = parseInt(out.match(/pixelWidth:\s*(\d+)/)?.[1] ?? '0');
        height = parseInt(out.match(/pixelHeight:\s*(\d+)/)?.[1] ?? '0');
      } catch (_) { /* non-macOS: leave 0x0 */ }
    }

    // Generate thumbnail
    const tmpThumb = `/tmp/figmatk_thumb_${Date.now()}.png`;
    let thumbHash;
    if (imgPath) {
      execSync(`sips -Z 320 "${imgPath}" --out "${tmpThumb}"`, { stdio: 'pipe' });
      thumbHash = sha1Hex(readFileSync(tmpThumb));
      copyToImagesDir(this._fd, imgHash, imgPath);
      copyToImagesDir(this._fd, thumbHash, tmpThumb);
    } else {
      // Buffer-only path: write to temp, generate thumb from there
      const tmpImg = `/tmp/figmatk_img_${Date.now()}`;
      writeFileSync(tmpImg, imgBuf);
      execSync(`sips -Z 320 "${tmpImg}" --out "${tmpThumb}"`, { stdio: 'pipe' });
      thumbHash = sha1Hex(readFileSync(tmpThumb));
      copyToImagesDir(this._fd, imgHash, tmpImg);
      copyToImagesDir(this._fd, thumbHash, tmpThumb);
    }

    const override = imageOv(key, imgHash, thumbHash, width, height);
    const overrides = this._ensureOverrides();

    // Replace existing image override for this key if present
    const existingIdx = overrides.findIndex(o =>
      o.fillPaints &&
      o.guidPath?.guids?.length >= 1 &&
      o.guidPath.guids[0].sessionID === key.sessionID &&
      o.guidPath.guids[0].localID === key.localID
    );
    if (existingIdx >= 0) {
      overrides.splice(existingIdx, 1, override);
    } else {
      overrides.push(override);
    }
  }

  // --- Internals ------------------------------------------------------------

  _ensureOverrides() {
    const inst = this._instance;
    if (!inst) throw new Error(`Slide ${this.guid} has no instance`);
    if (!inst.symbolData) inst.symbolData = {};
    if (!inst.symbolData.symbolOverrides) inst.symbolData.symbolOverrides = [];
    return inst.symbolData.symbolOverrides;
  }

  _findTextOverride(key) {
    const overrides = this._instance?.symbolData?.symbolOverrides ?? [];
    return overrides.find(o =>
      o.textData &&
      o.guidPath?.guids?.length === 1 &&
      o.guidPath.guids[0].sessionID === key.sessionID &&
      o.guidPath.guids[0].localID === key.localID
    ) ?? null;
  }

  _findImageOverride(key) {
    const overrides = this._instance?.symbolData?.symbolOverrides ?? [];
    return overrides.find(o =>
      o.fillPaints &&
      o.guidPath?.guids?.length >= 1 &&
      o.guidPath.guids[0].sessionID === key.sessionID &&
      o.guidPath.guids[0].localID === key.localID
    ) ?? null;
  }

  /** Resolve a name or "s:l" string to an overrideKey from the symbol tree. */
  _resolveTextKey(nameOrKey) {
    // Try as "s:l" string first
    if (/^\d+:\d+$/.test(nameOrKey)) return parseId(nameOrKey);

    const sym = this._symbol;
    if (!sym) return null;
    let found = null;
    this._fd.walkTree(nid(sym), (node) => {
      if (!found && node.type === 'TEXT' && node.name === nameOrKey && node.overrideKey) {
        found = node.overrideKey;
      }
    });
    return found;
  }

  _resolveImageKey(nameOrKey) {
    if (/^\d+:\d+$/.test(nameOrKey)) return parseId(nameOrKey);

    const sym = this._symbol;
    if (!sym) return null;
    let found = null;
    this._fd.walkTree(nid(sym), (node) => {
      if (!found && node.overrideKey && node.name === nameOrKey &&
          (node.type === 'ROUNDED_RECTANGLE' || node.type === 'RECTANGLE')) {
        found = node.overrideKey;
      }
    });
    return found;
  }
}

// ---------------------------------------------------------------------------
// Symbol
// ---------------------------------------------------------------------------

export class Symbol {
  constructor(figDeck, symbolNode) {
    this._fd = figDeck;
    this._node = symbolNode;
  }

  get name() { return this._node.name; }
  get guid() { return nid(this._node); }

  /** Text slots defined in this symbol (nodes with overrideKey). */
  get textSlots() {
    const slots = [];
    this._fd.walkTree(nid(this._node), (node) => {
      if (node.type === 'TEXT' && node.overrideKey) {
        slots.push({ name: node.name, key: `${node.overrideKey.sessionID}:${node.overrideKey.localID}` });
      }
    });
    return slots;
  }

  /** Image slots defined in this symbol. */
  get imageSlots() {
    const slots = [];
    this._fd.walkTree(nid(this._node), (node) => {
      if (node.overrideKey &&
          (node.type === 'ROUNDED_RECTANGLE' || node.type === 'RECTANGLE') &&
          node.fillPaints?.some(p => p.type === 'IMAGE')) {
        slots.push({ name: node.name, key: `${node.overrideKey.sessionID}:${node.overrideKey.localID}` });
      }
    });
    return slots;
  }
}

// ---------------------------------------------------------------------------
// TextNode
// ---------------------------------------------------------------------------

export class TextNode {
  constructor(symbolNode, override = null) {
    this._node = symbolNode;
    this._override = override;
  }

  get name() { return this._node.name; }
  get key() { return `${this._node.overrideKey.sessionID}:${this._node.overrideKey.localID}`; }

  /** Current characters — override value if set, else default from symbol. */
  get characters() {
    if (this._override) return this._override.textData.characters;
    return this._node.textData?.characters ?? '';
  }
}

// ---------------------------------------------------------------------------
// ImageNode
// ---------------------------------------------------------------------------

export class ImageNode {
  constructor(symbolNode, override = null) {
    this._node = symbolNode;
    this._override = override;
  }

  get name() { return this._node.name; }
  get key() { return `${this._node.overrideKey.sessionID}:${this._node.overrideKey.localID}`; }

  /** SHA-1 hex of the current image, or null if not overridden. */
  get hashHex() {
    const fill = this._override?.fillPaints?.[0] ?? this._node.fillPaints?.[0];
    if (!fill?.image?.name) return null;
    return fill.image.name;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha1Hex(buf) {
  return createHash('sha1').update(buf).digest('hex');
}

function copyToImagesDir(fd, hash, srcPath) {
  if (!fd.imagesDir) {
    fd.imagesDir = `/tmp/figmatk_images_${Date.now()}`;
    mkdirSync(fd.imagesDir, { recursive: true });
  }
  const dest = join(fd.imagesDir, hash);
  if (!existsSync(dest)) copyFileSync(srcPath, dest);
}
