/**
 * Where the plot box sits inside the drawing, ported from Chart.js 4.x
 * (dist/chart.js: `Scale.calculateLabelRotation`, `Scale.fit`,
 * `Scale._calculatePadding`, `Scale._handleMargins`, `autoSkip` and
 * `layouts.update`).
 *
 * Only the arrangement @gouvfr/dsfr-chart asks for is ported: one category
 * axis at the bottom or on the left, one linear axis facing it, no title, no
 * legend box, no padding. Chart.js fits its boxes twice, because the length
 * of one axis depends on the thickness of the other; so does this.
 */
import { LINE_HEIGHT, measureText, widestText } from './measureText.js';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface AxisOptions {
  /** The labels the axis shows, already formatted. */
  labels: string[];
  /** `ticks.padding` of the upstream. */
  padding: number;
  /** A category axis with `offset` puts the first label half a band in. */
  offset: boolean;
  /** `ticks.autoSkip`; the upstream turns it off on the value axis. */
  autoSkip: boolean;
  /** `ticks.maxRotation`, which Chart.js defaults to 50 degrees. */
  maxRotation?: number;
}

export interface Layout {
  area: Box;
  /** The rotation of the labels of the horizontal axis, in degrees. */
  labelRotation: number;
  /** The indices of the labels the horizontal axis keeps after autoSkip. */
  visible: number[];
}

const MAX_ROTATION = 50;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const limit = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** `Scale.calculateLabelRotation` for the horizontal axis. */
function labelRotation(axis: AxisOptions, widest: number, chartWidth: number, maxWidth: number, maxHeight: number): number {
  const count = axis.labels.length;
  const maxRotation = axis.maxRotation ?? MAX_ROTATION;
  if (maxRotation <= 0 || count <= 1) return 0;

  const highest = LINE_HEIGHT;
  const available = limit(chartWidth - widest, 0, maxWidth);
  let tickWidth = axis.offset ? maxWidth / count : available / (count - 1);
  if (widest + 6 <= tickWidth) return 0;

  tickWidth = available / (count - (axis.offset ? 0 : 1));
  // `maxHeight - tickMarkLength - padding - titleHeight`, with no tick mark
  // and no title.
  const room = maxHeight - axis.padding;
  const diagonal = Math.sqrt(widest * widest + highest * highest);
  const rotation = toDegrees(
    Math.min(Math.asin(limit((highest + 6) / tickWidth, -1, 1)), Math.asin(limit(room / diagonal, -1, 1)) - Math.asin(limit(highest / diagonal, -1, 1))),
  );
  return Math.max(0, Math.min(maxRotation, rotation));
}

/**
 * `Scale._tickSize`, `autoSkip`, `determineMaxTicks`, `calculateSpacing` and
 * `skip`, for a horizontal axis on which no tick is major.
 *
 * `length` is the width of the plot box and `maxLength` the width the axis was
 * offered, which are the `_length` and `_maxLength` of the upstream.
 */
function autoSkip(axis: AxisOptions, widest: number, length: number, maxLength: number, rotation: number): number[] {
  const count = axis.labels.length;
  const all = Array.from({ length: count }, (_, i) => i);
  if (!axis.autoSkip || count <= 1) return all;

  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const w = widest;
  const h = LINE_HEIGHT;
  const tickSize = h * cos > w * sin ? w / cos : h / sin;
  if (!Number.isFinite(tickSize) || tickSize <= 0) return all;

  const limitTicks = Math.floor(Math.min(length / tickSize + (axis.offset ? 0 : 1), maxLength / tickSize));
  if (limitTicks >= count || limitTicks < 1) return all;

  // `spacing` is whole: Chart.js rounds it up, then keeps every nth label.
  const spacing = Math.ceil(Math.max(count / limitTicks, 1));
  const kept: number[] = [];
  let step = 0;
  let next = 0;
  for (let i = 0; i < count; i++) {
    if (i === next) {
      kept.push(i);
      step++;
      next = Math.round(step * spacing);
    }
  }
  return kept.length ? kept : all;
}

export interface LayoutInput {
  width: number;
  height: number;
  /** The axis that carries the categories, and the one that carries values. */
  horizontal: AxisOptions;
  vertical: AxisOptions;
}

/**
 * The plot box, or `null` when the labels cannot be measured, which is the
 * case on a server.
 */
export function layout({ width, height, horizontal, vertical }: LayoutInput): Layout | null {
  const widestVertical = widestText(vertical.labels);
  const widestHorizontal = widestText(horizontal.labels);
  if (widestVertical === null || widestHorizontal === null) return null;

  // `Scale.fit`: with `drawTicks: false` and no title, the thickness of an
  // axis is its label plus twice its padding. Chart.js never lets a box take
  // more than half of the drawing.
  const verticalWidth = Math.min(width / 2, widestVertical + vertical.padding * 2);
  let horizontalHeight = Math.min(height / 2, LINE_HEIGHT + horizontal.padding * 2);
  let rotation = 0;
  let visible = horizontal.labels.map((_, i) => i);

  // Two passes, as `layouts.update` does: the second knows the real lengths.
  let area: Box = { left: verticalWidth, top: 0, right: width, bottom: height };
  for (let pass = 0; pass < 2; pass++) {
    const plotWidth = width - verticalWidth;
    const plotHeight = height - horizontalHeight;

    rotation = labelRotation(horizontal, widestHorizontal, width, plotWidth, plotHeight);
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    // A rotated label is taller: `sin * widest + cos * lineHeight`.
    horizontalHeight = Math.min(height / 2, sin * widestHorizontal + cos * LINE_HEIGHT + horizontal.padding * 2);

    visible = autoSkip(horizontal, widestHorizontal, area.right - area.left, plotWidth, rotation);

    // `_calculatePadding` of the vertical axis, aligned to the centre.
    const paddingTop = LINE_HEIGHT / 2 + vertical.padding;
    const paddingBottom = LINE_HEIGHT / 2 + vertical.padding;

    // `_calculatePadding` of the horizontal axis, aligned to the centre.
    const count = horizontal.labels.length;
    const offsetLeft = horizontal.offset ? plotWidth / Math.max(count, 1) / 2 : 0;
    const offsetRight = offsetLeft;
    const firstWidth = measureText(horizontal.labels[0] ?? '') ?? 0;
    const lastWidth = measureText(horizontal.labels[count - 1] ?? '') ?? 0;
    const rawLeft = rotation !== 0 ? cos * firstWidth : firstWidth / 2;
    const rawRight = rotation !== 0 ? sin * LINE_HEIGHT : lastWidth / 2;
    const paddingLeft = Math.max(((rawLeft - offsetLeft + horizontal.padding) * plotWidth) / (plotWidth - offsetLeft), 0);
    const paddingRight = Math.max(((rawRight - offsetRight + horizontal.padding) * plotWidth) / (plotWidth - offsetRight), 0);

    area = {
      left: Math.max(verticalWidth, paddingLeft),
      top: paddingTop,
      right: width - paddingRight,
      bottom: height - Math.max(horizontalHeight, paddingBottom),
    };
  }

  return { area, labelRotation: rotation, visible };
}
