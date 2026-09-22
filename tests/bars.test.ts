import { BarController, BarElement, CategoryScale, Chart, LinearScale } from 'chart.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { barSpan, stackedRanges } from '../src/core/bars.js';
import { stubCanvas } from './chartjs-canvas.js';

Chart.register(BarController, BarElement, LinearScale, CategoryScale);

beforeAll(() => {
  stubCanvas();
  Chart.defaults.font.family = 'Marianne';
  Chart.defaults.font.size = 12;
  Chart.defaults.font.lineHeight = 1.66;
});

interface Options {
  barSize?: number | 'flex';
  maxBarSize?: number;
  stacked?: boolean;
  horizontal?: boolean;
}

/** The bar chart of @gouvfr/dsfr-chart, read back bar by bar. */
function reference(labels: string[], series: number[][], width: number, height: number, options: Options = {}) {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }),
  });
  document.body.appendChild(canvas);

  const { barSize = 'flex', maxBarSize = 32, stacked = false, horizontal = false } = options;
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: series.map((data) => ({ data, barThickness: barSize, ...(maxBarSize ? { maxBarThickness: maxBarSize } : {}) })),
    },
    options: {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: false,
      animation: false,
      aspectRatio: 2,
      scales: {
        x: { offset: !horizontal, stacked, grid: { drawTicks: false, drawOnChartArea: horizontal }, ticks: { padding: horizontal ? 5 : 15 } },
        y: { stacked, offset: horizontal, grid: { drawTicks: false, drawOnChartArea: !horizontal }, border: { dash: [3] }, ticks: { autoSkip: false, padding: 5 } },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
  chart.resize(width, height);
  chart.update('none');

  const indexScale = chart.scales[horizontal ? 'y' : 'x'];
  const result = {
    bars: series.map((_, s) => (chart.getDatasetMeta(s).data as unknown as { x: number; y: number; width: number; height: number; base: number }[]).map((bar) => ({ ...bar }))),
    centres: labels.map((_, i) => indexScale.getPixelForValue(i)),
    start: (indexScale as unknown as { _startPixel: number })._startPixel,
    end: (indexScale as unknown as { _endPixel: number })._endPixel,
  };
  chart.destroy();
  canvas.remove();
  return result;
}

const CASES: { name: string; labels: string[]; series: number[][]; options?: Options }[] = [
  { name: 'one series', labels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], series: [[69.1, 70.3, 71.4, 72.5, 74, 75.2, 76.4]] },
  { name: 'two series', labels: ['2000', '2010', '2020'], series: [[11.1, 10.5, 8.4], [8.8, 7.5, 5.6]] },
  { name: 'two series stacked', labels: ['a', 'b', 'c', 'd'], series: [[15, 19, 15, 12], [34, 31, 36, 33]], options: { stacked: true } },
  { name: 'three series', labels: ['a', 'b'], series: [[1, 2], [3, 4], [5, 6]] },
  { name: 'a fixed bar size', labels: ['2000', '2010', '2020'], series: [[11.1, 10.5, 8.4], [8.8, 7.5, 5.6]], options: { barSize: 20 } },
  { name: 'no maximum bar size', labels: ['a', 'b'], series: [[1, 2]], options: { maxBarSize: 0 } },
  { name: 'many categories', labels: Array.from({ length: 13 }, (_, i) => `c${i}`), series: [[1071, 927, 921, 850, 845, 838, 821, 793, 789, 771, 734, 485, 482]] },
  { name: 'horizontal', labels: ['2000', '2010', '2020'], series: [[11.1, 10.5, 8.4], [8.8, 7.5, 5.6]], options: { horizontal: true, barSize: 20 } },
];

const SIZES: [number, number][] = [
  [800, 400],
  [600, 300],
  [400, 200],
];

describe('the bar geometry matches Chart.js', () => {
  for (const [width, height] of SIZES) {
    for (const { name, labels, series, options } of CASES) {
      it(`${width}x${height}: ${name}`, () => {
        const expected = reference(labels, series, width, height, options);
        const horizontal = Boolean(options?.horizontal);
        const stacked = Boolean(options?.stacked);
        // Stacked series share one slot; otherwise each takes its own.
        const stackCount = stacked ? 1 : series.length;

        series.forEach((_, s) => {
          expected.bars[s].forEach((bar, index) => {
            const span = barSpan(index, {
              centres: expected.centres,
              stackCount,
              stackIndex: stacked ? 0 : s,
              barThickness: options?.barSize ?? 'flex',
              maxBarThickness: options?.maxBarSize ?? 32,
              start: expected.start,
              end: expected.end,
            });
            expect(span.size).toBeCloseTo(horizontal ? bar.height : bar.width, 6);
            expect(span.centre).toBeCloseTo(horizontal ? bar.y : bar.x, 6);
          });
        });
      });
    }
  }
});

describe('stackedRanges', () => {
  it('starts every bar at the baseline when nothing is stacked', () => {
    expect(stackedRanges([[3, 4], [5, 6]], false)).toEqual([
      [{ from: 0, to: 3 }, { from: 0, to: 4 }],
      [{ from: 0, to: 5 }, { from: 0, to: 6 }],
    ]);
  });

  it('piles the bars of a stack on one another', () => {
    expect(stackedRanges([[3, 4], [5, 6]], true)).toEqual([
      [{ from: 0, to: 3 }, { from: 0, to: 4 }],
      [{ from: 3, to: 8 }, { from: 4, to: 10 }],
    ]);
  });

  it('piles the negative values apart from the positive ones', () => {
    expect(stackedRanges([[-3], [5], [-2]], true)).toEqual([[{ from: 0, to: -3 }], [{ from: 0, to: 5 }], [{ from: -3, to: -5 }]]);
  });
});
