import { expect, test, type Page } from '@playwright/test';
import { compare } from './compare.js';

/**
 * The share of pixels allowed to differ between our SVG and the canvas of
 * @gouvfr/dsfr-chart. A canvas and an SVG never antialias a curve the same
 * way, so the edge of every slice differs by a pixel or two. The measured
 * values are reported at the end of the run; raise this only with a reason.
 */
const TOLERANCE = 0.005;

const CASES = [
  { name: 'doughnut-light', chart: 'doughnut', theme: 'light', palette: '' },
  { name: 'doughnut-dark', chart: 'doughnut', theme: 'dark', palette: '' },
  { name: 'pie-light', chart: 'pie', theme: 'light', palette: '' },
  { name: 'pie-dark', chart: 'pie', theme: 'dark', palette: '' },
  { name: 'doughnut-sequential-light', chart: 'doughnut', theme: 'light', palette: 'sequentialAscending' },
  { name: 'doughnut-sequential-dark', chart: 'doughnut', theme: 'dark', palette: 'sequentialAscending' },
  { name: 'pie-divergent-light', chart: 'pie', theme: 'light', palette: 'divergentAscending' },
  { name: 'doughnut-default-light', chart: 'doughnut', theme: 'light', palette: 'default' },
  { name: 'doughnut-neutral-dark', chart: 'doughnut', theme: 'dark', palette: 'neutral' },
];

const measured: { name: string; ratio: number }[] = [];

async function open(page: Page, chart: string, theme: string, palette: string) {
  await page.goto(`/parity.html?case=${chart}&theme=${theme}&palette=${palette}`);
  await page.waitForFunction(() => {
    const svg = document.querySelector('#ours svg');
    const canvas = document.querySelector('#theirs canvas') as HTMLCanvasElement | null;
    return Boolean(svg && canvas && canvas.width === 600 && svg.getAttribute('width') === '600');
  });
  // Chart.js animates its first draw; the transition of our slices is as long.
  await page.waitForTimeout(1200);
}

for (const { name, chart, theme, palette } of CASES) {
  test(`the pie chart matches @gouvfr/dsfr-chart: ${name}`, async ({ page }) => {
    await open(page, chart, theme, palette);

    const ours = await page.locator('#ours svg').screenshot({ animations: 'disabled' });
    const theirs = await page.locator('#theirs canvas').screenshot({ animations: 'disabled' });

    const result = compare(ours, theirs, name);
    measured.push({ name, ratio: result.ratio });
    expect(result.ratio, `${(result.ratio * 100).toFixed(2)} % of the pixels differ. See ${result.diffPath}.`).toBeLessThan(TOLERANCE);
  });
}

// A comparison that reports no difference proves nothing until the harness is
// shown to report one. Compare a doughnut with a pie, which must differ.
test('the comparison detects a difference', async ({ page }) => {
  await open(page, 'doughnut', 'light', '');
  const doughnut = await page.locator('#ours svg').screenshot({ animations: 'disabled' });
  await open(page, 'pie', 'light', '');
  const pie = await page.locator('#theirs canvas').screenshot({ animations: 'disabled' });
  expect(compare(doughnut, pie, 'self-check').ratio).toBeGreaterThan(0.1);
});

test.afterAll(() => {
  if (!measured.length) return;
  const rows = measured.map(({ name, ratio }) => `  ${name.padEnd(28)} ${(ratio * 100).toFixed(2)} %`).join('\n');
  console.log(`\nPixels that differ, per case (tolerance ${(TOLERANCE * 100).toFixed(1)} %):\n${rows}\n`);
});
