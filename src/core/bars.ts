/**
 * Where a bar sits and how wide it is, ported from Chart.js 4.x
 * (dist/chart.js: `BarController._getRuler`, `_calculateBarIndexPixels`,
 * `_calculateBarValuePixels`, `computeFitCategoryTraits` and
 * `computeFlexCategoryTraits`).
 *
 * The defaults of the bar controller are `categoryPercentage: 0.8`,
 * `barPercentage: 0.9` and `grouped: true`. @gouvfr/dsfr-chart sets
 * `barThickness` from its `barSize` attribute, which defaults to `'flex'`, and
 * `maxBarThickness` from `maxBarSize`, which defaults to 32.
 */
export const CATEGORY_PERCENTAGE = 0.8;
export const BAR_PERCENTAGE = 0.9;
export const DEFAULT_MAX_BAR_SIZE = 32;

export interface BarSizeInput {
  /** The centre of every category, along the index axis, in pixels. */
  centres: number[];
  /** How many series share a category. Stacked series share one slot. */
  stackCount: number;
  /** The index of the series in that sharing, from 0. */
  stackIndex: number;
  /** `barThickness`: a width in pixels, or `'flex'`. */
  barThickness?: number | 'flex';
  maxBarThickness?: number;
  /** The ends of the index axis, in pixels. */
  start: number;
  end: number;
}

export interface BarSpan {
  /** The two edges of the bar along the index axis. */
  from: number;
  to: number;
  centre: number;
  size: number;
}

/** `_getRuler().min`: the smallest gap between two category centres. */
function smallestGap(centres: number[], start: number, end: number): number {
  if (centres.length < 2) return Math.abs(end - start);
  let min = Infinity;
  for (let i = 1; i < centres.length; i++) {
    min = Math.min(min, Math.abs(centres[i] - centres[i - 1]));
  }
  return Number.isFinite(min) ? min : Math.abs(end - start);
}

/** `computeFitCategoryTraits`: a fixed `barThickness`. */
function fitTraits(index: number, centres: number[], gap: number, stackCount: number, thickness: number | undefined) {
  let size: number;
  let ratio: number;
  if (thickness === undefined) {
    size = gap * CATEGORY_PERCENTAGE;
    ratio = BAR_PERCENTAGE;
  } else {
    size = thickness * stackCount;
    ratio = 1;
  }
  return { chunk: size / stackCount, ratio, start: centres[index] - size / 2 };
}

/** `computeFlexCategoryTraits`: the bar fills the room its neighbours leave. */
function flexTraits(index: number, centres: number[], stackCount: number, axisStart: number, axisEnd: number) {
  const current = centres[index];
  let previous = index > 0 ? centres[index - 1] : null;
  let next = index < centres.length - 1 ? centres[index + 1] : null;
  if (previous === null) previous = current - (next === null ? axisEnd - axisStart : next - current);
  if (next === null) next = current + current - previous;
  const start = current - ((current - Math.min(previous, next)) / 2) * CATEGORY_PERCENTAGE;
  const size = (Math.abs(next - previous) / 2) * CATEGORY_PERCENTAGE;
  return { chunk: size / stackCount, ratio: BAR_PERCENTAGE, start };
}

/** `_calculateBarIndexPixels`. */
export function barSpan(index: number, { centres, stackCount, stackIndex, barThickness = 'flex', maxBarThickness = DEFAULT_MAX_BAR_SIZE, start, end }: BarSizeInput): BarSpan {
  const gap = smallestGap(centres, start, end);
  const traits =
    barThickness === 'flex'
      ? flexTraits(index, centres, stackCount, start, end)
      : fitTraits(index, centres, gap, stackCount, typeof barThickness === 'number' ? barThickness : undefined);

  const centre = traits.start + traits.chunk * stackIndex + traits.chunk / 2;
  const size = Math.min(maxBarThickness > 0 ? maxBarThickness : Infinity, traits.chunk * traits.ratio);
  return { from: centre - size / 2, to: centre + size / 2, centre, size };
}

/**
 * The two ends of a bar along the value axis. Without stacking a bar starts at
 * the baseline; with it, it starts where the bars before it stopped.
 */
export function stackedRanges(series: number[][], stacked: boolean): { from: number; to: number }[][] {
  const length = Math.max(0, ...series.map((set) => set.length));
  const result: { from: number; to: number }[][] = series.map(() => []);
  for (let index = 0; index < length; index++) {
    let positive = 0;
    let negative = 0;
    for (let s = 0; s < series.length; s++) {
      const value = series[s][index];
      if (!Number.isFinite(value)) {
        result[s][index] = { from: 0, to: 0 };
        continue;
      }
      if (!stacked) {
        result[s][index] = { from: 0, to: value };
        continue;
      }
      if (value < 0) {
        result[s][index] = { from: negative, to: negative + value };
        negative += value;
      } else {
        result[s][index] = { from: positive, to: positive + value };
        positive += value;
      }
    }
  }
  return result;
}
