import { BarController, BarElement, CategoryScale, Chart, Filler, LinearScale as ChartLinearScale, LineController, LineElement, PointElement } from 'chart.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { linearScale, niceNum, decimalPlaces, almostWhole } from '../src/core/scale.js';
import { stubCanvas } from './chartjs-canvas.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, ChartLinearScale, CategoryScale, Filler);

/** The font @gouvfr/dsfr-chart configures: 12px Marianne, line height 1.66. */
const LINE_HEIGHT = 12 * 1.66;

/** Port of `configureChartDefaults` of src/utils/global.js. Without it the
 *  oracle measures its labels with the Chart.js defaults, not the DSFR ones,
 *  and the number of ticks that fit an axis changes. */
function configureChartDefaults() {
  Chart.defaults.font.family = 'Marianne';
  Chart.defaults.font.size = 12;
  Chart.defaults.font.lineHeight = 1.66;
  Chart.defaults.color = '#6b6b6b';
  Chart.defaults.borderColor = '#cecece';
}

interface Options {
  stacked?: boolean;
  suggestedMin?: number;
  suggestedMax?: number;
  maxTicksLimit?: number;
  /** `true` lays the categories up the left side and the values along the bottom. */
  horizontal?: boolean;
}

/**
 * Builds the chart @gouvfr/dsfr-chart builds, and reads the ticks back. The
 * option bag follows the axis name, not the role, exactly as
 * src/components/{Bar,Line}Chart.vue writes it: a horizontal bar chart carries
 * its values on `x` and its categories on `y`, and the two bags swap with it.
 */
function reference(type: 'bar' | 'line', data: number[][], width: number, height: number, options: Options = {}) {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }),
  });
  document.body.appendChild(canvas);

  const horizontal = Boolean(options.horizontal);
  // The bounds belong to the value axis, wherever it runs.
  const valueBounds = {
    ...(options.suggestedMin !== undefined ? { suggestedMin: options.suggestedMin } : {}),
    ...(options.suggestedMax !== undefined ? { suggestedMax: options.suggestedMax } : {}),
  };

  const chart = new Chart(canvas, {
    type,
    data: {
      labels: data[0].map((_, i) => `c${i}`),
      datasets: data.map((values) => ({ data: values, fill: false, pointRadius: 5, borderWidth: 2, tension: 0.4 })),
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: false,
      animation: false,
      aspectRatio: 2,
      scales: {
        x: horizontal
          ? {
              offset: false,
              stacked: options.stacked,
              grid: { drawTicks: false, drawOnChartArea: true },
              // The upstream leaves `autoSkip` on here; it drops no tick at
              // these sizes, so the axis still reports what `buildTicks` made.
              ticks: { padding: 5, ...(options.maxTicksLimit ? { maxTicksLimit: options.maxTicksLimit } : {}) },
              ...valueBounds,
            }
          : {
              offset: type === 'bar',
              stacked: options.stacked,
              grid: { drawTicks: false, drawOnChartArea: false },
              ticks: { padding: type === 'bar' ? 15 : 10 },
            },
        y: horizontal
          ? {
              offset: true,
              stacked: options.stacked,
              grid: { drawTicks: false, drawOnChartArea: false },
              border: { dash: [3] },
              ticks: { autoSkip: false, padding: 5 },
            }
          : {
              stacked: options.stacked,
              offset: false,
              grid: { drawTicks: false },
              border: { dash: [3] },
              ticks: { autoSkip: false, padding: 5, ...(options.maxTicksLimit ? { maxTicksLimit: options.maxTicksLimit } : {}) },
              ...valueBounds,
            },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
  chart.resize(width, height);
  chart.update('none');

  const value = horizontal ? chart.scales.x : chart.scales.y;
  const result = {
    ticks: value.ticks.map((tick) => tick.value),
    min: value.min,
    max: value.max,
    // The length Chart.js gave the axis, which decides how many ticks fit.
    length: (value as unknown as { _length: number })._length,
  };
  chart.destroy();
  canvas.remove();
  return result;
}

beforeAll(() => {
  stubCanvas();
  configureChartDefaults();
});

describe('the helpers match Chart.js', () => {
  it('niceNum rounds to 1, 2, 5 or 10 times a power of ten', () => {
    expect([0.3, 1, 1.5, 2.5, 4, 7, 12, 37, 120, 999, 1000].map(niceNum)).toEqual([0.5, 1, 2, 5, 5, 10, 20, 50, 200, 1000, 1000]);
  });

  it('decimalPlaces counts the decimals a number needs', () => {
    expect([1, 1.5, 0.25, 0.1, 1e-7, 1234].map(decimalPlaces)).toEqual([0, 1, 2, 1, 7, 0]);
  });

  it('almostWhole allows a tolerance around a whole number', () => {
    expect(almostWhole(2.0001, 0.001)).toBe(true);
    expect(almostWhole(2.01, 0.001)).toBe(false);
  });
});

const SERIES: { name: string; data: number[][]; options?: Options; barOnly?: boolean }[] = [
  { name: 'population in millions', data: [[69.1, 70.3, 71.4, 72.5, 74, 75.2, 76.4]] },
  { name: 'percentages', data: [[75.4, 80.5, 66.8, 43.4, 12.1]] },
  { name: 'rainfall', data: [[1071, 927, 921, 850, 845, 838, 821, 793, 789, 771, 734, 485, 482]] },
  { name: 'two series', data: [[11.1, 10.5, 8.4], [8.8, 7.5, 5.6]] },
  { name: 'two series stacked', data: [[15, 19, 15, 12], [34, 31, 36, 33]], options: { stacked: true }, barOnly: true },
  { name: 'a price index', data: [[51.5, 55.3, 61.5, 70.2, 81.1, 92.6, 100.2, 104.6, 96.9, 98, 104.9, 106.8, 104.7, 102.7, 100.2, 100.4, 102.9, 106, 109.1, 114.6]] },
  { name: 'negative values', data: [[-4, -9, -2, -7]] },
  { name: 'across zero', data: [[-4, 9, -2, 7]] },
  { name: 'one value', data: [[42]] },
  { name: 'equal values', data: [[5, 5, 5]] },
  { name: 'zeroes', data: [[0, 0, 0]] },
  { name: 'large numbers', data: [[10771923, 4532935, 2165000, 1589736, 124722]] },
  { name: 'small decimals', data: [[0.12, 0.35, 0.07]] },
  { name: 'a suggested maximum', data: [[3, 5, 4]], options: { suggestedMax: 100 } },
  { name: 'a suggested minimum', data: [[30, 50, 40]], options: { suggestedMin: -20 } },
  { name: 'five ticks at most', data: [[51.5, 114.6, 92.6]], options: { maxTicksLimit: 5 } },
  { name: 'four counts', data: [[12, 47, 93, 61]] },
];

const SIZES: [number, number][] = [
  [800, 400],
  [600, 300],
  [400, 200],
  [1200, 600],
];

describe('the linear scale matches Chart.js', () => {
  for (const type of ['bar', 'line'] as const) {
    for (const [width, height] of SIZES) {
      for (const { name, data, options, barOnly } of SERIES) {
        if (barOnly && type === 'line') continue;
        it(`${type} ${width}x${height}: ${name}`, () => {
          const expected = reference(type, data, width, height, options);
          const ours = linearScale({
            data,
            stacked: options?.stacked,
            // Chart.js gives a bar chart `beginAtZero` through its overrides.
            beginAtZero: type === 'bar',
            suggestedMin: options?.suggestedMin,
            suggestedMax: options?.suggestedMax,
            maxTicksLimit: options?.maxTicksLimit,
            length: expected.length,
            lineHeight: LINE_HEIGHT,
          });

          expect(ours.ticks).toEqual(expected.ticks);
          expect(ours.min).toBeCloseTo(expected.min, 9);
          expect(ours.max).toBeCloseTo(expected.max, 9);
        });
      }
    }
  }
});

/**
 * A horizontal bar chart puts its value axis along the bottom, where
 * `computeTickLimit` divides by 40 instead of by the line height. The narrow
 * sizes are the band where the two rules part: a value axis of 364 pixels holds
 * six ticks under the horizontal rule and eleven under the vertical one.
 */
const HORIZONTAL_SIZES: [number, number][] = [
  [800, 400],
  [600, 300],
  [400, 200],
  [300, 150],
];

describe('the linear scale of a horizontal bar chart matches Chart.js', () => {
  for (const [width, height] of HORIZONTAL_SIZES) {
    for (const { name, data, options } of SERIES) {
      it(`${width}x${height}: ${name}`, () => {
        const expected = reference('bar', data, width, height, { ...options, horizontal: true });
        const ours = linearScale({
          data,
          stacked: options?.stacked,
          // Chart.js gives a bar chart `beginAtZero` through its overrides.
          beginAtZero: true,
          suggestedMin: options?.suggestedMin,
          suggestedMax: options?.suggestedMax,
          maxTicksLimit: options?.maxTicksLimit,
          length: expected.length,
          horizontal: true,
          lineHeight: LINE_HEIGHT,
        });

        expect(ours.ticks).toEqual(expected.ticks);
        expect(ours.min).toBeCloseTo(expected.min, 9);
        expect(ours.max).toBeCloseTo(expected.max, 9);
      });
    }
  }
});
