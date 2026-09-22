import { CategoryScale, Chart, Filler, LinearScale, LineController, LineElement, PointElement } from 'chart.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { controlPoints, linePath, splineCurve, TENSION } from '../src/core/spline.js';
import { stubCanvas } from './chartjs-canvas.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler);

beforeAll(() => {
  stubCanvas();
  Chart.defaults.font.family = 'Marianne';
  Chart.defaults.font.size = 12;
  Chart.defaults.font.lineHeight = 1.66;
});

/**
 * Builds the line chart of @gouvfr/dsfr-chart and reads back, for every point,
 * the pixel Chart.js placed it at and the two control points it computed.
 */
function reference(labels: (string | number)[], data: number[], width: number, height: number) {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }),
  });
  document.body.appendChild(canvas);

  const chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: [{ data, fill: false, pointRadius: 5, borderWidth: 2, tension: TENSION }] },
    options: {
      responsive: false,
      animation: false,
      aspectRatio: 2,
      scales: {
        x: { offset: true, grid: { drawOnChartArea: false }, ticks: { padding: 10 } },
        y: { grid: { drawTicks: false }, border: { dash: [3] }, ticks: { autoSkip: false, padding: 5, maxTicksLimit: 5 } },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
  chart.resize(width, height);
  chart.update('none');

  const elements = chart.getDatasetMeta(0).data as unknown as { x: number; y: number; cp1x: number; cp1y: number; cp2x: number; cp2y: number }[];
  const result = {
    points: elements.map((element) => ({ x: element.x, y: element.y })),
    control: elements.map((element) => ({ cp1x: element.cp1x, cp1y: element.cp1y, cp2x: element.cp2x, cp2y: element.cp2y })),
    area: { ...chart.chartArea },
  };
  chart.destroy();
  canvas.remove();
  return result;
}

describe('splineCurve matches Chart.js', () => {
  it('places the control points along the chord of the neighbours', () => {
    const result = splineCurve({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }, TENSION);
    expect(result.previous.x).toBeCloseTo(10 - 0.4 * 0.5 * 20, 9);
    expect(result.next.x).toBeCloseTo(10 + 0.4 * 0.5 * 20, 9);
    expect(result.previous.y).toBeCloseTo(10, 9);
    expect(result.next.y).toBeCloseTo(10, 9);
  });

  it('gives a flat pair when every point is the same', () => {
    const result = splineCurve({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, TENSION);
    expect(result.previous).toEqual({ x: 5, y: 5 });
    expect(result.next).toEqual({ x: 5, y: 5 });
  });
});

const CASES: { name: string; labels: (string | number)[]; data: number[] }[] = [
  { name: 'a price index', labels: [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010], data: [51.5, 55.3, 61.5, 70.2, 81.1, 92.6, 100.2, 104.6, 96.9, 98] },
  { name: 'employment rates', labels: [1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020], data: [54.5, 58.2, 58.1, 59.6, 62.1, 64, 65.9, 67.1, 69, 69.2] },
  { name: 'two points', labels: ['a', 'b'], data: [3, 7] },
  { name: 'a flat line', labels: ['a', 'b', 'c', 'd'], data: [5, 5, 5, 5] },
  { name: 'a spike', labels: ['a', 'b', 'c', 'd', 'e'], data: [0, 0, 100, 0, 0] },
  { name: 'negative values', labels: ['a', 'b', 'c', 'd'], data: [-4, 9, -2, 7] },
];

const SIZES: [number, number][] = [
  [800, 400],
  [600, 300],
  [400, 200],
];

describe('the control points match Chart.js', () => {
  for (const [width, height] of SIZES) {
    for (const { name, labels, data } of CASES) {
      it(`${width}x${height}: ${name}`, () => {
        const expected = reference(labels, data, width, height);
        // The pixels of the points come from the oracle: this test measures the
        // curve through them, not the scales, which tests/scale.test.ts covers.
        const ours = controlPoints(expected.points, expected.area);

        expect(ours).toHaveLength(expected.control.length);
        ours.forEach((cp, index) => {
          expect(cp.cp1x).toBeCloseTo(expected.control[index].cp1x, 6);
          expect(cp.cp1y).toBeCloseTo(expected.control[index].cp1y, 6);
          expect(cp.cp2x).toBeCloseTo(expected.control[index].cp2x, 6);
          expect(cp.cp2y).toBeCloseTo(expected.control[index].cp2y, 6);
        });
      });
    }
  }
});

describe('linePath', () => {
  const area = { left: 0, top: 0, right: 100, bottom: 100 };

  it('returns nothing for no point', () => {
    expect(linePath([], area)).toBe('');
  });

  it('moves to the only point of a single-point line', () => {
    expect(linePath([{ x: 10, y: 20 }], area)).toBe('M 10 20');
  });

  it('writes one cubic segment per gap', () => {
    const path = linePath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }], area);
    expect(path.match(/ C /g)).toHaveLength(2);
  });
});
