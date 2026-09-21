import { useMemo, useState, type CSSProperties } from 'react';
import { Axes } from '../core/Axes.js';
import { ChartFrame } from '../core/ChartFrame.js';
import { DataTable } from '../core/DataTable.js';
import { formatNumber } from '../core/format.js';
import { choosePalette } from '../core/palette.js';
import type { Palette } from '../core/palette.js';
import { plot } from '../core/plot.js';
import { areaPath, linePath, type Point } from '../core/spline.js';
import { formatShortTick } from '../core/tickFormat.js';
import type { TooltipState } from '../core/Tooltip.js';
import { useSize } from '../core/useSize.js';

export interface LineChartProps {
  /** The label of every point. Numbers give the axis a linear scale. */
  x: (string | number)[];
  /** One array of values per series. */
  y: number[][];
  /** The legend labels. The default is `Série 1`, `Série 2`, and so on. */
  name?: string[];
  /**
   * Fills the space under the line. @gouvfr/dsfr-chart has no such option;
   * this one exists so that an area chart needs no second library.
   */
  fill?: boolean;
  /** A bound the axis takes in, which the data may still exceed. */
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  selectedPalette?: Palette;
  /** The unit that follows the value in the tooltip. */
  unitTooltip?: string;
  /** The date of the last update, shown under the legend. */
  date?: string;
  aspectRatio?: number;
  ariaLabel?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_ARIA_LABEL = 'Graphique en ligne';
/** `ticks.padding` and `pointRadius` of src/components/LineChart.vue. */
const VALUE_PADDING = 5;
const INDEX_PADDING = 10;
const POINT_RADIUS = 5;
/** `ticks.maxTicksLimit` of the value axis of the upstream line chart. */
const MAX_VALUE_TICKS = 5;

export function LineChart({
  x,
  y,
  name,
  fill = false,
  xMin,
  xMax,
  yMin,
  yMax,
  selectedPalette,
  unitTooltip,
  date,
  aspectRatio = 2,
  ariaLabel = DEFAULT_ARIA_LABEL,
  id,
  className,
  style,
}: LineChartProps) {
  const { ref, width, height, fonts } = useSize<HTMLDivElement>(aspectRatio);
  const [active, setActive] = useState<number | null>(null);

  const labels = useMemo(() => x.map((label) => String(label)), [x]);
  /** `xAxisType` of the upstream: a first label that reads as a number. */
  const indexValues = useMemo(() => {
    if (!x.length) return undefined;
    const numbers = x.map((label) => Number(label));
    return numbers.every((value) => Number.isFinite(value)) && String(Number(x[0])) === String(x[0]).trim() ? numbers : undefined;
  }, [x]);

  const { colors, hovers } = useMemo(() => {
    // `loadColors` of the upstream line chart: one colour per series, by index,
    // and a brightened variant on hover where the other charts darken.
    const palette = choosePalette(selectedPalette);
    const names = y.map((_, index) => palette[index % palette.length]);
    return { colors: names.map((token) => `var(${token})`), hovers: names.map((token) => `var(${token}-br)`) };
  }, [y, selectedPalette]);

  const geometry = useMemo(() => {
    const fitted = plot({
      width,
      height,
      labels,
      series: y,
      stacked: false,
      horizontal: false,
      beginAtZero: false,
      suggestedMin: yMin,
      suggestedMax: yMax,
      maxTicksLimit: MAX_VALUE_TICKS,
      formatValue: (value) => formatShortTick(value),
      indexValues,
      bottomPadding: INDEX_PADDING,
      leftPadding: VALUE_PADDING,
    });
    if (!fitted) return null;

    const points: Point[][] = y.map((values) => values.map((value, index) => ({ x: fitted.categoryPixel(index), y: fitted.valuePixel(value) })));
    return {
      ...fitted,
      points,
      lines: points.map((set) => linePath(set, fitted.area)),
      areas: fill ? points.map((set) => areaPath(set, fitted.area, fitted.area.bottom)) : [],
    };
    // `fonts` is not read: it redraws once the real font is measurable.
  }, [width, height, labels, y, indexValues, fill, yMin, yMax, fonts]);

  const legend = useMemo(() => y.map((_, index) => ({ label: name?.[index] ?? `Série ${index + 1}`, color: colors[index] ?? 'var(--rdc-neutral)' })), [y, name, colors]);

  const tooltip: TooltipState | null = useMemo(() => {
    if (active === null || !geometry) return null;
    const rows = y
      .map((values, s) => ({ color: colors[s] ?? 'var(--rdc-neutral)', value: `${formatNumber(values[active])}${unitTooltip ? ` ${unitTooltip}` : ''}`, raw: values[active] }))
      .filter((row) => Number.isFinite(row.raw))
      .map(({ color, value }) => ({ color, value }));
    if (!rows.length) return null;

    const anchors = geometry.points.map((set) => set[active]).filter(Boolean);
    return {
      title: labels[active] ?? '',
      rows,
      x: anchors.reduce((sum, point) => sum + point.x, 0) / anchors.length,
      y: anchors.reduce((sum, point) => sum + point.y, 0) / anchors.length,
    };
  }, [active, geometry, y, colors, labels, unitTooltip]);

  return (
    <ChartFrame
      id={id}
      className={className}
      style={style}
      chartRef={ref}
      width={width}
      height={height}
      tooltip={tooltip}
      legend={legend}
      date={date}
      table={
        <DataTable
          caption={ariaLabel}
          columns={labels}
          rows={y.map((values, index) => ({ header: name?.[index] ?? `Série ${index + 1}`, cells: values.map((value) => formatNumber(value)) }))}
        />
      }
    >
      {geometry ? (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
          <Axes
            area={geometry.area}
            bottom={geometry.indexTicks}
            left={geometry.value.ticks.map((tick, index) => ({ position: geometry.valuePixel(tick), label: geometry.valueLabels[index] }))}
            bottomPadding={INDEX_PADDING}
            leftPadding={VALUE_PADDING}
            labelRotation={geometry.labelRotation}
            grid="horizontal"
          />

          {geometry.areas.map((path, s) => (path ? <path key={`a${s}`} className="rdc-area" d={path} fill={colors[s]} /> : null))}
          {geometry.lines.map((path, s) => (path ? <path key={`l${s}`} className="rdc-line" d={path} stroke={colors[s]} /> : null))}

          {active !== null ? <line className="rdc-crosshair" x1={geometry.points[0]?.[active]?.x ?? 0} x2={geometry.points[0]?.[active]?.x ?? 0} y1={geometry.area.top} y2={geometry.area.bottom} /> : null}

          {geometry.points.map((set, s) =>
            set.map((point, index) => (
              <circle
                key={`${s}-${index}`}
                className="rdc-point"
                cx={point.x}
                cy={point.y}
                r={POINT_RADIUS}
                fill={active === index ? (hovers[s] ?? colors[s]) : colors[s]}
                tabIndex={0}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              />
            )),
          )}
        </svg>
      ) : null}
    </ChartFrame>
  );
}
