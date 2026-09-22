import { test } from '@playwright/test';
import { measure, report, type ParityCase } from './parity.js';

/**
 * A curve, its points and its text never rasterise the same way in a canvas
 * and in an SVG, so a line chart differs more than a bar chart does. Every
 * case carries the share measured today; the test allows one percentage point
 * above it.
 */

const CASES: ParityCase[] = [
  { name: 'line-single-light', measured: 0.0304, chart: 'lineDefault', theme: 'light' },
  { name: 'line-single-dark', measured: 0.0536, chart: 'lineDefault', theme: 'dark' },
  { name: 'line-multiple-light', measured: 0.0397, chart: 'lineMultiple', theme: 'light' },
  { name: 'line-multiple-dark', measured: 0.0652, chart: 'lineMultiple', theme: 'dark' },
  { name: 'line-sequential-light', measured: 0.0103, chart: 'lineDefault', theme: 'light', palette: 'sequentialAscending' },
  { name: 'line-neutral-dark', measured: 0.0645, chart: 'lineMultiple', theme: 'dark', palette: 'neutral' },
];

const measured: { name: string; ratio: number }[] = [];

for (const testCase of CASES) {
  test(`the line chart matches @gouvfr/dsfr-chart: ${testCase.name}`, async ({ page }) => {
    measured.push({ name: testCase.name, ratio: await measure(page, testCase) });
  });
}

test.afterAll(() => report('Line', measured));
