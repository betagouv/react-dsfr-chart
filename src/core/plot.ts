/**
 * The arrangement a bar chart and a line chart share: fit the plot box, build
 * the value scale, and place a value or a category in pixels.
 *
 * The length of an axis decides how many ticks fit on it, and the ticks decide
 * how thick the facing axis is. Chart.js settles this by fitting its boxes
 * twice; so does this.
 */
import { layout, type AxisOptions, type Box, type Layout } from './layout.js';
import { LINE_HEIGHT } from './measureText.js';
import { categoryPixel, linearPixel, linearScale, type LinearScale } from './scale.js';

export interface PlotInput {
  width: number;
  height: number;
  /** The categories along the index axis. */
  labels: string[];
  /** One array of values per series. */
  series: number[][];
  stacked: boolean;
  /** `true` lays the categories up the left side and the values along the bottom. */
  horizontal: boolean;
  beginAtZero: boolean;
  suggestedMin?: number;
  suggestedMax?: number;
  /** The same hint for the index axis, which only a linear one reads. */
  indexSuggestedMin?: number;
  indexSuggestedMax?: number;
  maxTicksLimit?: number;
  /** How a value becomes the text of a tick. */
  formatValue: (value: number, ticks: number[]) => string;
  /**
   * The numeric value of every category, when they are numbers. The line chart
   * of the upstream then gives its index axis a linear scale instead of a
   * category one, so that uneven steps keep their spacing.
   */
  indexValues?: number[];
  /** `ticks.padding` of the axis along the bottom and of the one on the left. */
  bottomPadding: number;
  leftPadding: number;
}

export interface Plot {
  area: Box;
  value: LinearScale;
  /** The labels of the value axis, in tick order. */
  valueLabels: string[];
  labelRotation: number;
  /** The indices of the category labels that survive `autoSkip`. */
  visible: number[];
  /** The pixel of a value along the value axis. */
  valuePixel: (value: number) => number;
  /** The pixel of the centre of a category along the index axis. */
  categoryPixel: (index: number) => number;
  /** The ends of the index axis, which the bar sizing needs. */
  indexStart: number;
  indexEnd: number;
  /** The ticks of the index axis: every category, or the round values. */
  indexTicks: { position: number; label: string }[];
}

export function plot(input: PlotInput): Plot | null {
  const { width, height, labels, series, stacked, horizontal, beginAtZero, suggestedMin, suggestedMax, indexSuggestedMin, indexSuggestedMax, maxTicksLimit, formatValue, bottomPadding, leftPadding, indexValues } = input;
  if (width <= 0 || height <= 0) return null;

  // The value axis runs up the side of a vertical chart and along the bottom
  // of a horizontal one.
  let valueLength = horizontal ? width : height;
  let indexLength = horizontal ? height : width;
  let value = linearScale({ data: series, stacked, beginAtZero, suggestedMin, suggestedMax, length: valueLength, horizontal, lineHeight: LINE_HEIGHT, maxTicksLimit });
  let valueLabels = value.ticks.map((tick) => formatValue(tick, value.ticks));
  // A linear index axis labels its round values, not every point of the data.
  // It faces the value axis, so it is horizontal exactly when the chart is not.
  let indexScale = indexValues ? linearScale({ data: [indexValues], suggestedMin: indexSuggestedMin, suggestedMax: indexSuggestedMax, length: indexLength, horizontal: !horizontal, lineHeight: LINE_HEIGHT }) : null;
  let indexLabels = indexScale ? indexScale.ticks.map(String) : labels;
  let fitted: Layout | null = null;

  for (let pass = 0; pass < 2; pass++) {
    const valueAxis: AxisOptions = { labels: valueLabels, padding: horizontal ? bottomPadding : leftPadding, offset: false, autoSkip: horizontal };
    // The upstream puts `offset` on the index axis whichever type it carries:
    // `x.offset = !horizontal` in BarChart.vue, `x: { offset: true }` in
    // LineChart.vue, category or linear alike.
    const indexAxis: AxisOptions = { labels: indexLabels, padding: horizontal ? leftPadding : bottomPadding, offset: true, autoSkip: !horizontal };

    fitted = layout({
      width,
      height,
      horizontal: horizontal ? valueAxis : indexAxis,
      vertical: horizontal ? indexAxis : valueAxis,
    });
    if (!fitted) return null;

    valueLength = horizontal ? fitted.area.right - fitted.area.left : fitted.area.bottom - fitted.area.top;
    indexLength = horizontal ? fitted.area.bottom - fitted.area.top : fitted.area.right - fitted.area.left;
    value = linearScale({ data: series, stacked, beginAtZero, suggestedMin, suggestedMax, length: valueLength, horizontal, lineHeight: LINE_HEIGHT, maxTicksLimit });
    valueLabels = value.ticks.map((tick) => formatValue(tick, value.ticks));
    if (indexValues) {
      indexScale = linearScale({ data: [indexValues], suggestedMin: indexSuggestedMin, suggestedMax: indexSuggestedMax, length: indexLength, horizontal: !horizontal, lineHeight: LINE_HEIGHT });
      indexLabels = indexScale.ticks.map(String);
    }
  }

  const area = fitted!.area;
  const plotWidth = area.right - area.left;
  const plotHeight = area.bottom - area.top;
  const span = horizontal ? plotHeight : plotWidth;
  const indexOrigin = horizontal ? area.top : area.left;

  // A linear index axis spreads its values; `offset` then widens the range by
  // half a step at each end, as `LinearScaleBase.configure` does.
  let indexAt: (index: number) => number;
  let indexTicks: { position: number; label: string }[];
  if (indexValues && indexScale) {
    const step = (indexScale.max - indexScale.min) / Math.max(indexScale.ticks.length - 1, 1) / 2;
    const spread = { ...indexScale, min: indexScale.min - step, max: indexScale.max + step };
    const at = (v: number) => linearPixel(spread, v, indexOrigin, span, horizontal);
    indexAt = (index: number) => at(indexValues[index]);
    indexTicks = indexScale.ticks.map((tick) => ({ position: at(tick), label: String(tick) }));
  } else {
    indexAt = (index: number) => categoryPixel(index, labels.length, indexOrigin, span, true);
    indexTicks = labels.map((label, index) => ({ position: indexAt(index), label }));
  }

  return {
    area,
    value,
    valueLabels,
    labelRotation: fitted!.labelRotation,
    visible: fitted!.visible,
    valuePixel: (v: number) => (horizontal ? linearPixel(value, v, area.left, plotWidth, false) : linearPixel(value, v, area.top, plotHeight, true)),
    categoryPixel: indexAt,
    indexStart: horizontal ? area.top : area.left,
    indexEnd: horizontal ? area.bottom : area.right,
    indexTicks,
  };
}
