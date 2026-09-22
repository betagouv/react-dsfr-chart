import { expect, test } from '@playwright/test';
import { compare } from './compare.js';
import { measure, open, report, type ParityCase } from './parity.js';

/**
 * A canvas and an SVG never antialias a curve the same way, so the edge of
 * every slice differs by a pixel or two. The pie keeps a flat tolerance where
 * the bar and the line carry a baseline each: its text lives in the DOM, not
 * in the drawing, so nothing but those edges can differ. Raise it only with a
 * reason; the measured values are reported at the end of the run.
 */
const TOLERANCE = 0.005;

const CASES: ParityCase[] = [
  { name: 'doughnut-light', chart: 'doughnut', theme: 'light', tolerance: TOLERANCE },
  { name: 'doughnut-dark', chart: 'doughnut', theme: 'dark', tolerance: TOLERANCE },
  { name: 'pie-light', chart: 'pie', theme: 'light', tolerance: TOLERANCE },
  { name: 'pie-dark', chart: 'pie', theme: 'dark', tolerance: TOLERANCE },
  { name: 'doughnut-sequential-light', chart: 'doughnut', theme: 'light', palette: 'sequentialAscending', tolerance: TOLERANCE },
  { name: 'doughnut-sequential-dark', chart: 'doughnut', theme: 'dark', palette: 'sequentialAscending', tolerance: TOLERANCE },
  { name: 'pie-divergent-light', chart: 'pie', theme: 'light', palette: 'divergentAscending', tolerance: TOLERANCE },
  { name: 'doughnut-default-light', chart: 'doughnut', theme: 'light', palette: 'default', tolerance: TOLERANCE },
  { name: 'doughnut-neutral-dark', chart: 'doughnut', theme: 'dark', palette: 'neutral', tolerance: TOLERANCE },
];

const measured: { name: string; ratio: number }[] = [];

for (const testCase of CASES) {
  test(`the pie chart matches @gouvfr/dsfr-chart: ${testCase.name}`, async ({ page }) => {
    measured.push({ name: testCase.name, ratio: await measure(page, testCase) });
  });
}

// A comparison that reports no difference proves nothing until the harness is
// shown to report one. Compare a doughnut with a pie, which must differ.
test('the comparison detects a difference', async ({ page }) => {
  await open(page, { name: 'self-check', chart: 'doughnut', theme: 'light' });
  const doughnut = await page.locator('#ours svg').screenshot({ animations: 'disabled' });
  await open(page, { name: 'self-check', chart: 'pie', theme: 'light' });
  const pie = await page.locator('#theirs canvas').screenshot({ animations: 'disabled' });
  expect(compare(doughnut, pie, 'self-check').ratio).toBeGreaterThan(0.1);
});

test.afterAll(() => report('Pie', measured));
