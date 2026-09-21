import { test } from '@playwright/test';
import { measure, report, type ParityCase } from './parity.js';

/**
 * A bar chart is made of straight edges, so its bodies land on the same pixels
 * as the canvas of @gouvfr/dsfr-chart. What differs is the text, which a
 * canvas and an SVG never rasterise alike, and a horizontal offset of about
 * two pixels on the plot box. The cases whose category labels rotate differ
 * more: Chart.js settles the angle through a negotiation between its boxes
 * that this port does not reproduce, so the plot can end up a little shorter
 * and carry fewer value ticks. CLAUDE.md records the deviation.
 *
 * Every case carries the share measured today. The test allows one percentage
 * point above it.
 */

const CASES: ParityCase[] = [
  { name: 'bar-vertical-light', measured: 0.0314, chart: 'barVertical', theme: 'light' },
  { name: 'bar-vertical-dark', measured: 0.0446, chart: 'barVertical', theme: 'dark' },
  { name: 'bar-highlight-light', measured: 0.0178, chart: 'barUnicolor', theme: 'light' },
  { name: 'bar-highlight-dark', measured: 0.0472, chart: 'barUnicolor', theme: 'dark' },
  { name: 'bar-sequential-light', measured: 0.0979, chart: 'barSequential', theme: 'light' },
  { name: 'bar-horizontal-light', measured: 0.0093, chart: 'barHorizontal', theme: 'light' },
  { name: 'bar-horizontal-dark', measured: 0.0233, chart: 'barHorizontal', theme: 'dark' },
  { name: 'bar-stacked-light', measured: 0.1274, chart: 'barStacked', theme: 'light' },
  { name: 'bar-divergent-light', measured: 0.0327, chart: 'barVertical', theme: 'light', palette: 'divergentAscending' },
];

const measured: { name: string; ratio: number }[] = [];

for (const testCase of CASES) {
  test(`the bar chart matches @gouvfr/dsfr-chart: ${testCase.name}`, async ({ page }) => {
    measured.push({ name: testCase.name, ratio: await measure(page, testCase) });
  });
}

test.afterAll(() => report('Bar', measured));
