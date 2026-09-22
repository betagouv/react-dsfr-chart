import { expect, type Page } from '@playwright/test';
import { compare } from './compare.js';

/** The width and height the parity page gives every chart. */
export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 300;

interface ParityChart {
  name: string;
  chart: string;
  theme: 'light' | 'dark';
  palette?: string;
}

/**
 * A case states how much it may differ, in one of two ways, never both.
 *
 * `measured` is the share of pixels measured to differ today, as a baseline;
 * the test allows one percentage point above it, so a real regression fails
 * while the noise of a font or a browser update does not. A chart that draws
 * its text inside the SVG needs this, because a canvas rasterises a glyph its
 * own way and the share is never near zero.
 *
 * `tolerance` is a flat cap, for a chart that leaves its text in the DOM. The
 * pie is the only one today, and it measures about 0.01 %.
 */
export type ParityCase = ParityChart & ({ measured: number; tolerance?: never } | { tolerance: number; measured?: never });

/** Opens one case and waits for both libraries to finish their first draw. */
export async function open(page: Page, { chart, theme, palette = '' }: ParityChart) {
  await page.goto(`/parity.html?case=${chart}&theme=${theme}&palette=${palette}`);
  await page.waitForFunction(
    (width) => {
      const svg = document.querySelector('#ours svg');
      const canvas = document.querySelector('#theirs canvas') as HTMLCanvasElement | null;
      return Boolean(svg && canvas && canvas.clientWidth === width && svg.getAttribute('width') === String(width));
    },
    CHART_WIDTH,
  );
  // Chart.js animates its first draw; our own transitions are as long.
  await page.waitForTimeout(1200);
}

/** How far above its baseline a case may drift before the test fails. */
export const MARGIN = 0.01;

/** Compares the two drawings and reports the share of pixels that differ. */
export async function measure(page: Page, testCase: ParityCase): Promise<number> {
  await open(page, testCase);
  const ours = await page.locator('#ours svg').screenshot({ animations: 'disabled' });
  const theirs = await page.locator('#theirs canvas').screenshot({ animations: 'disabled' });
  const result = compare(ours, theirs, testCase.name);
  const allowed = testCase.tolerance !== undefined ? testCase.tolerance : testCase.measured + MARGIN;
  const against = testCase.tolerance !== undefined ? `a tolerance of ${(testCase.tolerance * 100).toFixed(2)} %` : `a baseline of ${(testCase.measured * 100).toFixed(2)} %`;
  expect(result.ratio, `${(result.ratio * 100).toFixed(2)} % of the pixels differ, against ${against}. See ${result.diffPath}.`).toBeLessThanOrEqual(allowed);
  return result.ratio;
}

/** Prints the measurements, so a change in them is visible in the run log. */
export function report(label: string, measured: { name: string; ratio: number }[]) {
  if (!measured.length) return;
  const rows = measured.map(({ name, ratio }) => `  ${name.padEnd(30)} ${(ratio * 100).toFixed(2)} %`).join('\n');
  console.log(`\n${label}: pixels that differ, per case:\n${rows}\n`);
}
