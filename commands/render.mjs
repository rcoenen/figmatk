/**
 * render — Rasterize slides in a .deck file to PNG.
 *
 * Usage:
 *   figmatk render <file.deck> -o <output-dir> [options]
 *
 * Options:
 *   -o <dir>        Output directory (default: ./render-out)
 *   --slide <n>     Render only slide N (1-based). Omit to render all.
 *   --scale <n>     Zoom factor: 1 = 1920×1080, 0.5 = 960×540 (default: 1)
 *   --width <px>    Output width in pixels (height scales proportionally)
 *   --fonts <dir>   Extra font directory to load (can repeat)
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { FigDeck } from '../lib/fig-deck.mjs';
import { renderDeck, registerFontDir } from '../lib/rasterizer/deck-rasterizer.mjs';
import { resolveFonts } from '../lib/rasterizer/font-resolver.mjs';

export async function run(args, flags) {
  const file = args[0];
  if (!file) {
    console.error('Usage: render <file.deck> -o <output-dir> [--slide N] [--scale 0.5] [--width 400] [--fonts <dir>]');
    process.exit(1);
  }

  const outDir = resolve(flags.o ?? flags.output ?? './render-out');

  // Build render options
  const renderOpts = {};
  if (flags.width) renderOpts.width = parseInt(flags.width);
  else if (flags.scale) renderOpts.scale = parseFloat(flags.scale);

  // Load extra font directories
  const fontDirs = [].concat(flags.fonts ?? []);
  for (const d of fontDirs) registerFontDir(resolve(d));

  const deck = await FigDeck.fromDeckFile(file);
  await resolveFonts(deck, { quiet: false });
  mkdirSync(outDir, { recursive: true });

  // Filter to single slide if requested
  const slideFilter = flags.slide ? parseInt(flags.slide) : null;
  const slides = await renderDeck(deck, renderOpts);

  for (const { index, slideId, png } of slides) {
    if (slideFilter && index + 1 !== slideFilter) continue;
    const outFile = join(outDir, `slide-${String(index + 1).padStart(3, '0')}.png`);
    writeFileSync(outFile, png);
    console.log(`  slide ${index + 1}  →  ${outFile}`);
  }

  const count = slideFilter ? 1 : slides.length;
  console.log(`\nRendered ${count} slide(s) to ${outDir}`);
}
