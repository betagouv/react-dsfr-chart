import { ArcElement, Chart, DoughnutController, PieController, Tooltip } from 'chart.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { arcCenter, arcPath, arcs, ring } from '../src/core/arc.js';
import { stubCanvas } from './chartjs-canvas.js';

Chart.register(DoughnutController, PieController, ArcElement, Tooltip);

/** The layout options @gouvfr/dsfr-chart gives a pie. */
const PADDING = { left: 50, right: 50, top: 0, bottom: 0 };

function reference(type: 'pie' | 'doughnut', values: number[], width: number, height: number) {
  const canvas = document.createElement('canvas');
  // Chart.js reads the size of the element, which jsdom never lays out.
  Object.defineProperty(canvas, 'getBoundingClientRect', { configurable: true, value: () => ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) });
  Object.defineProperty(canvas, 'clientWidth', { value: width });
  Object.defineProperty(canvas, 'clientHeight', { value: height });
  document.body.appendChild(canvas);

  const chart = new Chart(canvas, {
    type,
    data: { labels: values.map((_, i) => `s${i}`), datasets: [{ data: values }] },
    options: {
      responsive: false,
      animation: false,
      aspectRatio: 2,
      layout: { padding: PADDING },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
  chart.resize(width, height);
  chart.update('none');

  const elements = chart.getDatasetMeta(0).data as unknown as {
    x: number;
    y: number;
    innerRadius: number;
    outerRadius: number;
    startAngle: number;
    endAngle: number;
    getCenterPoint: () => { x: number; y: number };
  }[];
  const result = elements.map((element) => ({
    x: element.x,
    y: element.y,
    innerRadius: element.innerRadius,
    outerRadius: element.outerRadius,
    startAngle: element.startAngle,
    endAngle: element.endAngle,
    center: element.getCenterPoint(),
  }));
  chart.destroy();
  canvas.remove();
  return result;
}

beforeAll(() => {
  stubCanvas();
});

const SIZES: [number, number][] = [
  [800, 400],
  [640, 320],
  [320, 160],
  [1200, 600],
  [480, 240],
  [1000, 500],
];

const SERIES: number[][] = [
  [74.8, 11.7, 9.3, 1.6, 2.6],
  [40.8, 15.6, 11.5, 10.6, 9.4, 9, 3.1],
  [1],
  [1, 1, 1, 1],
  [10771923, 4532935, 2165000, 1589736, 124722],
  [5, 0, 5],
];

describe('the geometry matches Chart.js', () => {
  for (const type of ['doughnut', 'pie'] as const) {
    for (const [width, height] of SIZES) {
      for (const values of SERIES) {
        it(`${type} ${width}x${height} with ${values.length} slices`, () => {
          const expected = reference(type, values, width, height);
          const box = ring({ left: PADDING.left, top: PADDING.top, right: width - PADDING.right, bottom: height - PADDING.bottom }, type === 'pie' ? 0 : '50%');
          const slices = arcs(values);

          expect(slices).toHaveLength(expected.length);
          expected.forEach((element, index) => {
            expect(box.cx).toBeCloseTo(element.x, 6);
            expect(box.cy).toBeCloseTo(element.y, 6);
            expect(box.innerRadius).toBeCloseTo(element.innerRadius, 6);
            expect(box.outerRadius).toBeCloseTo(element.outerRadius, 6);
            expect(slices[index].startAngle).toBeCloseTo(element.startAngle, 6);
            expect(slices[index].endAngle).toBeCloseTo(element.endAngle, 6);
            const center = arcCenter(box, slices[index]);
            expect(center.x).toBeCloseTo(element.center.x, 6);
            expect(center.y).toBeCloseTo(element.center.y, 6);
          });
        });
      }
    }
  }
});

describe('arcPath', () => {
  const box = { cx: 100, cy: 100, innerRadius: 40, outerRadius: 80 };

  it('draws nothing for an empty slice', () => {
    expect(arcPath(box, { startAngle: 0, endAngle: 0 })).toBe('');
  });

  it('closes a full doughnut with two arcs per circle', () => {
    const path = arcPath(box, { startAngle: -Math.PI / 2, endAngle: -Math.PI / 2 + Math.PI * 2 });
    expect(path.match(/A /g)).toHaveLength(4);
    expect(path.match(/M /g)).toHaveLength(2);
  });

  it('draws a full pie as a single circle', () => {
    const path = arcPath({ ...box, innerRadius: 0 }, { startAngle: -Math.PI / 2, endAngle: -Math.PI / 2 + Math.PI * 2 });
    expect(path.match(/M /g)).toHaveLength(1);
  });

  it('sets the large-arc flag beyond a half turn', () => {
    expect(arcPath(box, { startAngle: 0, endAngle: Math.PI * 1.5 })).toContain('0 1 1');
    expect(arcPath(box, { startAngle: 0, endAngle: Math.PI * 0.5 })).toContain('0 0 1');
  });

  it('starts a pie slice at the centre', () => {
    expect(arcPath({ ...box, innerRadius: 0 }, { startAngle: 0, endAngle: 1 })).toMatch(/^M 100 100 L /);
  });
});
