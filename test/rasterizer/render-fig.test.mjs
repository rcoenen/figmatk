/**
 * .fig (Figma Design) render quality tests — render frames from Design files
 * and compare against Figma reference PNGs using SSIM.
 *
 * Fixtures:  figs/reference/
 * Report:    /tmp/figmatk-render-report-fig.html
 */

import { describe, it, expect, afterAll } from 'vitest';
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FigDeck } from '../../lib/core/fig-deck.mjs';
import { frameToSvg } from '../../lib/rasterizer/svg-builder.mjs';
import { nid } from '../../lib/core/node-helpers.mjs';
import { svgToPng } from '../../lib/rasterizer/deck-rasterizer.mjs';
import { buildReportRow, writeRenderReport, computeSsim } from '../../lib/rasterizer/render-report-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_OUT = '/private/tmp/figmatk-render-report-fig.html';

const FIG_PATH = join(__dirname, '../../figs/reference/medium-complex.fig');
const FIG_REF  = join(__dirname, '../../figs/reference/medium-complex');

const reportRows = [];

describe('medium-complex.fig frame rendering', () => {
  let fig;

  it('loads .fig file', async () => {
    fig = await FigDeck.fromDeckFile(FIG_PATH);
    expect(fig.getPages().length).toBe(3);
  });

  const expectedFrames = [
    { page: 'Great Seal Page', frame: 'GreatSeal' },
    { page: 'Page 2', frame: 'how-to' },
    { page: 'Page 2', frame: 'Lady' },
    { page: 'Page 3', frame: 'User Bio' },
    { page: 'Page 3', frame: 'bike lady' },
  ];

  for (const { page, frame } of expectedFrames) {
    it(`${page} / ${frame} renders`, async () => {
      if (!fig) fig = await FigDeck.fromDeckFile(FIG_PATH);

      const pageNode = fig.getPages().find(p => p.name === page);
      const frameNode = fig.getChildren(nid(pageNode))
        .filter(c => c.phase !== 'REMOVED' && c.type === 'FRAME')
        .find(c => c.name === frame);
      expect(frameNode).toBeTruthy();

      const svg = frameToSvg(fig, frameNode);
      const png = await svgToPng(svg, {});
      const pngBuf = Buffer.from(png);
      const slug = `${page}-${frame}`.replace(/\s+/g, '_').toLowerCase();
      const outPath = join('/tmp', `figmatk-test-fig-${slug}.png`);
      writeFileSync(outPath, pngBuf);

      const refPath = join(FIG_REF, `${slug}.png`);
      if (existsSync(refPath)) {
        const score = await computeSsim(pngBuf, refPath);
        reportRows.push(await buildReportRow({ slideNumber: `fig:${frame}`, renderedPng: pngBuf, refPath, score }));
        console.log(`  ${page}/${frame}  SSIM=${score.toFixed(4)}  →  ${outPath}`);
        // Low threshold for now — .fig reference exports may differ in size/crop
        expect(score).toBeGreaterThanOrEqual(0.50);
      } else {
        // No reference yet — just include in report for visual review
        reportRows.push(await buildReportRow({ slideNumber: `fig:${frame}`, renderedPng: pngBuf, refPath: null }));
        console.log(`  ${page}/${frame}  (no ref)  →  ${outPath}`);
      }
    });
  }
});

afterAll(() => {
  if (!reportRows.length) return;
  writeRenderReport({ outHtml: REPORT_OUT, rows: reportRows, title: 'FigmaTK Design Render Report' });
  console.log(`\nReport → ${REPORT_OUT}`);
});
