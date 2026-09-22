import { useMemo, useState, type CSSProperties } from 'react';
import { Axes } from '../core/Axes.js';
import { barSpan, DEFAULT_MAX_BAR_SIZE, stackedRanges } from '../core/bars.js';
import { ChartFrame } from '../core/ChartFrame.js';
import { customColorSet, withCustomColors, type CustomColors } from '../core/customColors.js';
import { DataTable } from '../core/DataTable.js';
import { formatNumber } from '../core/format.js';
import { generateColors, type ChartColor, type Palette } from '../core/palette.js';
import { plot } from '../core/plot.js';
import { SubChartHeader } from '../core/SubChartHeader.js';
import { formatTick } from '../core/tickFormat.js';
import type { TooltipState } from '../core/Tooltip.js';
import { useSize } from '../core/useSize.js';

export interface BarChartProps {
  /** The label of every category. */
  x: string[];
  /** One array of values per series. */
  y: number[][];
  /** The second level of every category, reached by a click on its bar. */
  subX?: string[][];
  subY?: number[][];
  /** The legend labels. The default is `Série 1`, `Série 2`, and so on. */
  name?: string[];
  /** Piles the series of a category on one another. */
  stacked?: boolean;
  /** Lays the categories up the left side and the values along the bottom. */
  horizontal?: boolean;
  /** The thickness of a bar in pixels. `'flex'` fills the room available. */
  barSize?: number | 'flex';
  /** The thickness a bar never exceeds. `0` removes the limit. */
  maxBarSize?: number;
  /** With the `neutral` palette, the categories drawn in the accent colour. */
  highlightIndex?: number[];
  /** A bound the axis takes in, which the data may still exceed. */
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  selectedPalette?: Palette;
  /**
   * One CSS colour per series, which replaces the palette where it is given.
   * An entry that is absent or unreadable keeps its palette colour, and the
   * second level always takes the palette.
   */
  colors?: CustomColors;
  /** The unit that follows the value in the tooltip. */
  unitTooltip?: string;
  /** The date of the last update, shown under the legend. */
  date?: string;
  aspectRatio?: number;
  /** The height in pixels. It holds whatever the width, and replaces `aspectRatio`. */
  height?: number;
  /**
   * The height in pixels one category takes, axes included. The height of the
   * chart then follows the number of categories, not the width. A vertical
   * chart ignores it: its categories run along the width, which the container
   * gives. `height` wins over it.
   */
  categorySize?: number;
  ariaLabel?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_ARIA_LABEL = 'Graphique en barres';
/** `ticks.padding` of src/components/BarChart.vue. */
const VALUE_PADDING = 5;

export function BarChart({
  x,
  y,
  subX,
  subY,
  name,
  stacked = false,
  horizontal = false,
  barSize = 'flex',
  maxBarSize = DEFAULT_MAX_BAR_SIZE,
  highlightIndex,
  xMin,
  xMax,
  yMin,
  yMax,
  selectedPalette,
  colors,
  unitTooltip,
  date,
  aspectRatio = 2,
  height: fixedHeight,
  categorySize,
  ariaLabel = DEFAULT_ARIA_LABEL,
  id,
  className,
  style,
}: BarChartProps) {
  const [level, setLevel] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const hasSubChart = Boolean(subX && subY);
  const labels = useMemo(() => (level === null ? x : (subX?.[level] ?? x)), [level, x, subX]);
  // `categorySize` measures the index axis, which runs down the height of a
  // horizontal chart only: a vertical chart lays its categories along the
  // width, which the container gives.
  const rowsHeight = horizontal && categorySize !== undefined && categorySize > 0 ? labels.length * categorySize : undefined;
  const { ref, width, height, fonts } = useSize<HTMLDivElement>(aspectRatio, fixedHeight ?? rowsHeight);
  // A second level replaces the data of the first series only, as upstream does.
  // Memoised because a fresh array on every render would redraw the whole chart.
  const series = useMemo(() => (level === null ? y : [subY?.[level] ?? []]), [level, y, subY]);

  const palette = useMemo(
    () => generateColors({ yparse: series, highlightIndex, selectedPalette }),
    [series, highlightIndex, selectedPalette],
  );

  // The `colors` prop names the series of the first level. The second level
  // holds other data, so it takes the palette, as the drill-down colours do.
  const custom = useMemo(() => customColorSet(level === null ? colors : undefined), [colors, level]);
  const { barColors, legendColors } = useMemo(
    () => ({
      barColors: palette.colorParse.map((set, s) => (custom.refs[s] ? set.map(() => custom.refs[s] as ChartColor) : set)),
      legendColors: palette.legendColors.map((color, s) => custom.refs[s] ?? color),
    }),
    [palette, custom],
  );

  const geometry = useMemo(() => {
    const fitted = plot({
      width,
      height,
      labels,
      series,
      stacked,
      horizontal,
      // Chart.js gives the value axis of a bar chart `beginAtZero`.
      beginAtZero: true,
      suggestedMin: horizontal ? xMin : yMin,
      suggestedMax: horizontal ? xMax : yMax,
      formatValue: formatTick,
      bottomPadding: horizontal ? VALUE_PADDING : 15,
      leftPadding: VALUE_PADDING,
    });
    if (!fitted) return null;

    const ranges = stackedRanges(series, stacked);
    const centres = labels.map((_, index) => fitted.categoryPixel(index));
    const stackCount = stacked ? 1 : series.length;
    const baseline = fitted.valuePixel(0);

    const bars = series.map((values, s) =>
      values.map((_, index) => {
        const span = barSpan(index, {
          centres,
          stackCount,
          stackIndex: stacked ? 0 : s,
          barThickness: barSize,
          maxBarThickness: maxBarSize,
          start: fitted.indexStart,
          end: fitted.indexEnd,
        });
        const range = ranges[s][index] ?? { from: 0, to: 0 };
        const from = fitted.valuePixel(range.from);
        const to = fitted.valuePixel(range.to);
        return horizontal
          ? { x: Math.min(from, to), y: span.from, width: Math.abs(to - from), height: span.size, centre: span.centre, tip: to }
          : { x: span.from, y: Math.min(from, to), width: span.size, height: Math.abs(to - from), centre: span.centre, tip: to };
      }),
    );

    return { ...fitted, bars, centres, baseline };
    // `fonts` is not read: it redraws once the real font is measurable.
  }, [width, height, labels, series, stacked, horizontal, barSize, maxBarSize, xMin, xMax, yMin, yMax, fonts]);

  const legend = useMemo(
    () =>
      series.map((_, index) => ({
        label: name?.[index] ?? `Série ${index + 1}`,
        color: legendColors[index] ?? 'var(--rdc-neutral)',
      })),
    [series, name, legendColors],
  );

  const tooltip: TooltipState | null = useMemo(() => {
    if (active === null || !geometry) return null;
    // The upstream tooltip runs in `index` mode: every series at that category.
    const rows = series
      .map((values, s) => ({ color: (barColors[s]?.[active] ?? 'var(--rdc-neutral)') as ChartColor, value: `${formatNumber(values[active])}${unitTooltip ? ` ${unitTooltip}` : ''}`, raw: values[active] }))
      .filter((row) => Number.isFinite(row.raw))
      .map(({ color, value }) => ({ color, value }));
    if (!rows.length) return null;

    const spans = geometry.bars.map((set) => set[active]).filter(Boolean);
    const anchorX = spans.reduce((sum, bar) => sum + (horizontal ? bar.tip : bar.centre), 0) / spans.length;
    const anchorY = spans.reduce((sum, bar) => sum + (horizontal ? bar.centre : bar.tip), 0) / spans.length;
    return { title: labels[active] ?? '', rows, x: anchorX, y: anchorY };
  }, [active, geometry, series, barColors, labels, unitTooltip, horizontal]);

  const drillDown = (index: number) => {
    if (!hasSubChart || level !== null) return;
    if (!subY?.[index]?.length) return;
    setActive(null);
    setLevel(index);
  };

  return (
    <ChartFrame
      id={id}
      className={className}
      style={withCustomColors(style, custom)}
      chartRef={ref}
      width={width}
      height={height}
      tooltip={tooltip}
      legend={legend}
      date={date}
      header={hasSubChart ? <SubChartHeader title={level === null ? null : (x[level] ?? '')} onBack={() => { setActive(null); setLevel(null); }} /> : null}
      table={
        <DataTable
          caption={ariaLabel}
          columns={labels}
          rows={series.map((values, index) => ({ header: name?.[index] ?? `Série ${index + 1}`, cells: values.map((value) => formatNumber(value)) }))}
        />
      }
    >
      {geometry ? (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
          <Axes
            area={geometry.area}
            bottom={
              horizontal
                ? geometry.visible.map((index) => ({ position: geometry.valuePixel(geometry.value.ticks[index]), label: geometry.valueLabels[index] })).filter((tick) => Number.isFinite(tick.position))
                : geometry.visible.map((index) => ({ position: geometry.centres[index], label: labels[index] }))
            }
            left={
              horizontal
                ? labels.map((label, index) => ({ position: geometry.centres[index], label }))
                : geometry.value.ticks.map((tick, index) => ({ position: geometry.valuePixel(tick), label: geometry.valueLabels[index] }))
            }
            bottomPadding={horizontal ? VALUE_PADDING : 15}
            leftPadding={VALUE_PADDING}
            labelRotation={geometry.labelRotation}
            grid={horizontal ? 'vertical' : 'horizontal'}
          />

          {geometry.bars.map((set, s) =>
            set.map((bar, index) => {
              if (bar.width <= 0 && bar.height <= 0) return null;
              // A custom colour has no second token, so its hover state is a
              // CSS filter. A palette colour keeps the darkened token upstream uses.
              const tinted = active === index && Boolean(custom.refs[s]);
              const colour = (active === index && !tinted ? palette.colorHover[s]?.[index] : barColors[s]?.[index]) ?? 'var(--rdc-neutral)';
              const clickable = hasSubChart && level === null && Boolean(subY?.[index]?.length);
              return (
                <rect
                  key={`${s}-${index}`}
                  className={`rdc-bar${clickable ? ' rdc-bar--clickable' : ''}${tinted ? ' rdc-hover--darken' : ''}`}
                  x={bar.x}
                  y={bar.y}
                  width={Math.max(bar.width, 0)}
                  height={Math.max(bar.height, 0)}
                  fill={colour}
                  tabIndex={0}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  onClick={clickable ? () => drillDown(index) : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            drillDown(index);
                          }
                        }
                      : undefined
                  }
                />
              );
            }),
          )}
        </svg>
      ) : null}
    </ChartFrame>
  );
}
