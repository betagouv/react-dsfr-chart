import { test } from '@playwright/test';
import { measure, report, type ParityCase } from './parity.js';

/**
 * A bar chart is made of straight edges, so its bodies land on the same pixels
 * as the canvas of @gouvfr/dsfr-chart. What differs is the text, which a
 * canvas and an SVG never rasterise alike.
 *
 * Two cases stand far above the others, and neither is a geometry error.
 * `bar-sequential-light` and `bar-stacked-light` fill a large part of the
 * frame with a value-based palette, which this library interpolates in CSS
 * where the upstream interpolates in chroma-js; a whole bar body then differs
 * by a unit or two per channel. `bar-sequential-light` also turns thirteen
 * long region names, and a turned glyph is where an SVG and a canvas agree
 * least. `tests/layout.test.ts` is the precise oracle for those labels: it
 * holds the angle to a billionth of a degree against Chart.js.
 *
 * Every case carries the share measured today. The test allows one percentage
 * point above it, which also covers the drift of about a tenth of a point that
 * one run shows against the next.
 */

const CASES: ParityCase[] = [
  { name: 'bar-vertical-light', measured: 0.0314, chart: 'barVertical', theme: 'light' },
  { name: 'bar-vertical-dark', measured: 0.0446, chart: 'barVertical', theme: 'dark' },
  { name: 'bar-highlight-light', measured: 0.0178, chart: 'barUnicolor', theme: 'light' },
  { name: 'bar-highlight-dark', measured: 0.0472, chart: 'barUnicolor', theme: 'dark' },
  { name: 'bar-sequential-light', measured: 0.1078, chart: 'barSequential', theme: 'light' },
  { name: 'bar-horizontal-light', measured: 0.0093, chart: 'barHorizontal', theme: 'light' },
  { name: 'bar-horizontal-dark', measured: 0.0233, chart: 'barHorizontal', theme: 'dark' },
  { name: 'bar-stacked-light', measured: 0.1264, chart: 'barStacked', theme: 'light' },
  { name: 'bar-divergent-light', measured: 0.0327, chart: 'barVertical', theme: 'light', palette: 'divergentAscending' },
];

const measured: { name: string; ratio: number }[] = [];

for (const testCase of CASES) {
  test(`the bar chart matches @gouvfr/dsfr-chart: ${testCase.name}`, async ({ page }) => {
    measured.push({ name: testCase.name, ratio: await measure(page, testCase) });
  });
}

test.afterAll(() => report('Bar', measured));
