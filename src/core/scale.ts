/**
 * The two scales a bar chart and a line chart need, ported from Chart.js 4.x:
 * `LinearScale` (dist/chart.js, `generateTicks$1`, `LinearScaleBase` and
 * `LinearScale`) and `CategoryScale`, plus the helpers they call
 * (dist/chunks/helpers.dataset.js, `niceNum`, `almostEquals`, `almostWhole`
 * and `_decimalPlaces`).
 *
 * The names of the upstream keep their upstream spelling, so that a reader can
 * put the two side by side.
 */

const log10 = Math.log10;

export function almostEquals(x: number, y: number, epsilon: number): boolean {
  return Math.abs(x - y) < epsilon;
}

export function almostWhole(x: number, epsilon: number): boolean {
  const rounded = Math.round(x);
  return rounded - epsilon <= x && rounded + epsilon >= x;
}

/** The number of decimals `x` needs to be written exactly. */
export function decimalPlaces(x: number): number {
  if (!Number.isFinite(x)) return 0;
  let e = 1;
  let p = 0;
  while (Math.round(x * e) / e !== x) {
    e *= 10;
    p++;
  }
  return p;
}

/** Rounds a range up to 1, 2, 5 or 10 times a power of ten. */
export function niceNum(range: number): number {
  const rounded = Math.round(range);
  range = almostEquals(range, rounded, range / 1000) ? rounded : range;
  const niceRange = Math.pow(10, Math.floor(log10(range)));
  const fraction = range / niceRange;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * niceRange;
}

export interface TickOptions {
  maxTicks: number;
  /** A bound the user asked for, through `xMin`, `xMax`, `yMin` or `yMax`. */
  min?: number;
  max?: number;
  /** The scale length divided by the line height: how many labels fit. */
  maxDigits: number;
}

/** Port of `generateTicks$1`, restricted to the options the charts use. */
export function generateTicks({ maxTicks, min, max, maxDigits }: TickOptions, range: { min: number; max: number }): number[] {
  const ticks: number[] = [];
  const MIN_SPACING = 1e-14;
  const maxSpaces = maxTicks - 1;
  const { min: rmin, max: rmax } = range;
  const minDefined = min !== undefined;
  const maxDefined = max !== undefined;
  const minSpacing = (rmax - rmin) / (maxDigits + 1);
  let spacing = niceNum((rmax - rmin) / maxSpaces);

  if (spacing < MIN_SPACING && !minDefined && !maxDefined) return [rmin, rmax];

  let numSpaces = Math.ceil(rmax / spacing) - Math.floor(rmin / spacing);
  if (numSpaces > maxSpaces) {
    spacing = niceNum((numSpaces * spacing) / maxSpaces);
  }

  // `bounds` keeps its default, `'ticks'`: the ends move out to a round value.
  let niceMin = Math.floor(rmin / spacing) * spacing;
  let niceMax = Math.ceil(rmax / spacing) * spacing;

  numSpaces = (niceMax - niceMin) / spacing;
  numSpaces = almostEquals(numSpaces, Math.round(numSpaces), spacing / 1000) ? Math.round(numSpaces) : Math.ceil(numSpaces);

  const places = Math.max(decimalPlaces(spacing), decimalPlaces(niceMin));
  const factor = Math.pow(10, places);
  niceMin = Math.round(niceMin * factor) / factor;
  niceMax = Math.round(niceMax * factor) / factor;

  let j = 0;
  if (minDefined) {
    if (niceMin !== min) {
      ticks.push(min);
      if (niceMin < min) j++;
      if (almostEquals(Math.round((niceMin + j * spacing) * factor) / factor, min, relativeLabelSize(min, minSpacing))) j++;
    } else if (niceMin < min) {
      j++;
    }
  }

  for (; j < numSpaces; ++j) {
    const value = Math.round((niceMin + j * spacing) * factor) / factor;
    if (maxDefined && value > max) break;
    ticks.push(value);
  }

  if (maxDefined && niceMax !== max) {
    if (ticks.length && almostEquals(ticks[ticks.length - 1], max, relativeLabelSize(max, minSpacing))) {
      ticks[ticks.length - 1] = max;
    } else {
      ticks.push(max);
    }
  } else if (!maxDefined || niceMax === max) {
    ticks.push(niceMax);
  }

  return ticks;
}

/** Port of `relativeLabelSize`, with `minRotation` left at 0. */
function relativeLabelSize(value: number, minSpacing: number): number {
  const length = 0.75 * minSpacing * `${value}`.length;
  return Math.min(minSpacing / 0.001, length);
}

export interface LinearScaleInput {
  /** One array per data set. */
  data: number[][];
  stacked?: boolean;
  beginAtZero?: boolean;
  /** `suggestedMin` and `suggestedMax`: a hint, which the data may exceed. */
  suggestedMin?: number;
  suggestedMax?: number;
  /** The length of the axis in pixels. */
  length: number;
  maxTicksLimit?: number;
  /** The line height of a tick label. The DSFR uses 12px × 1.66. */
  lineHeight: number;
}

export interface LinearScale {
  min: number;
  max: number;
  ticks: number[];
}

/** `DatasetController.getMinMax`, with the stacking a bar chart may ask for. */
function dataLimits(data: number[][], stacked: boolean): { min: number; max: number } {
  const values: number[] = [];
  if (stacked) {
    const length = Math.max(0, ...data.map((set) => set.length));
    for (let i = 0; i < length; i++) {
      // Chart.js piles the positive values and the negative values apart.
      let positive = 0;
      let negative = 0;
      for (const set of data) {
        const value = set[i];
        if (!Number.isFinite(value)) continue;
        if (value < 0) negative += value;
        else positive += value;
      }
      values.push(positive, negative);
    }
  } else {
    for (const set of data) {
      for (const value of set) if (Number.isFinite(value)) values.push(value);
    }
  }
  if (!values.length) return { min: 0, max: 1 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * `LinearScale.determineDataLimits` + `handleTickRangeOptions` +
 * `getTickLimit` + `buildTicks`, then `_setMinAndMaxByKey` because `bounds`
 * keeps its default of `'ticks'`.
 */
export function linearScale({ data, stacked = false, beginAtZero = false, suggestedMin, suggestedMax, length, maxTicksLimit, lineHeight }: LinearScaleInput): LinearScale {
  const limits = dataLimits(data, stacked);
  let min = limits.min;
  let max = limits.max;

  // `suggestedMin` and `suggestedMax` widen the range; they never narrow it.
  if (suggestedMin !== undefined) min = Math.min(min, suggestedMin);
  if (suggestedMax !== undefined) max = Math.max(max, suggestedMax);

  if (beginAtZero) {
    if (min < 0 && max < 0) max = 0;
    else if (min > 0 && max > 0) min = 0;
  }
  if (min === max) {
    const offset = max === 0 ? 1 : Math.abs(max * 0.05);
    max = max + offset;
    if (!beginAtZero) min = min - offset;
  }

  // `computeTickLimit`, with `minRotation` at 0, so the ratio is 1.
  const fitting = Math.ceil(length / Math.min(40, lineHeight));
  const maxTicks = Math.max(2, Math.min(maxTicksLimit ?? 11, fitting));
  const maxDigits = length / lineHeight;
  const ticks = generateTicks({ maxTicks, maxDigits }, { min, max });

  return { min: ticks[0], max: ticks[ticks.length - 1], ticks };
}

/** The pixel of a value on a linear scale, along an axis of `length` pixels. */
export function linearPixel(scale: LinearScale, value: number, start: number, length: number, reverse: boolean): number {
  const range = scale.max - scale.min;
  const decimal = range === 0 ? 0 : (value - scale.min) / range;
  return reverse ? start + length - decimal * length : start + decimal * length;
}

/**
 * `CategoryScale`. With `offset` the first and the last band sit a half band
 * away from the ends, which is what a bar chart needs; without it a point sits
 * on each end, which is what a line chart needs.
 */
export function categoryPixel(index: number, count: number, start: number, length: number, offset: boolean): number {
  if (count <= 0) return start;
  if (offset) {
    const band = length / count;
    return start + band * (index + 0.5);
  }
  if (count === 1) return start + length / 2;
  return start + (length / (count - 1)) * index;
}

/** The width of one category band, which a bar divides between the series. */
export function categoryBand(count: number, length: number, offset: boolean): number {
  if (count <= 0) return 0;
  return offset ? length / count : length / Math.max(count - 1, 1);
}
