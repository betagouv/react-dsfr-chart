import { useMemo, useState, type CSSProperties } from 'react';
import { Axes } from '../core/Axes.js';
import { ChartFrame } from '../core/ChartFrame.js';
import { customColorSet, withCustomColors, type CustomColors } from '../core/customColors.js';
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
  /**
   * One CSS colour per series, which replaces the palette where it is given.
   * An entry that is absent or unreadable keeps its palette colour.
   */
  colors?: CustomColors;
  /** The unit that follows the value in the tooltip. */
  unitTooltip?: string;
  /** The date of the last update, shown under the legend. */
  date?: string;
  aspectRatio?: number;
  /** The height in pixels. It holds whatever the width, and replaces `aspectRatio`. */
  height?: number;
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
  colors,
  unitTooltip,
  date,
  aspectRatio = 2,
  height: fixedHeight,
  ariaLabel = DEFAULT_ARIA_LABEL,
  id,
  className,
  style,
}: LineChartProps) {
  const { ref, width, height, fonts } = useSize<HTMLDivElement>(aspectRatio, fixedHeight);
  const [active, setActive] = useState<number | null>(null);

  const labels = useMemo(() => x.map((label) => String(label)), [x]);
  /** `xAxisType` of the upstream: a first label that reads as a number. */
  const indexValues = useMemo(() => {
    if (!x.length) return undefined;
    const numbers = x.map((label) => Number(label));
    return numbers.every((value) => Number.isFinite(value)) && String(Number(x[0])) === String(x[0]).trim() ? numbers : undefined;
  }, [x]);

  const custom = useMemo(() => customColorSet(colors), [colors]);
  const { lineColors, hovers } = useMemo(() => {
    // `loadColors` of the upstream line chart: one colour per series, by index,
    // and a brightened variant on hover where the other charts darken.
    const palette = choosePalette(selectedPalette);
    const names = y.map((_, index) => palette[index % palette.length]);
    return {
      lineColors: names.map((token, index) => custom.refs[index] ?? `var(${token})`),
      hovers: names.map((token) => `var(${token}-br)`),
    };
  }, [y, selectedPalette, custom]);

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
      // `suggestedMin` / `suggestedMax` of the `x` scale of the upstream. Only
      // a linear index axis reads them; a category axis has no numeric bounds.
      indexSuggestedMin: xMin,
      indexSuggestedMax: xMax,
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
  }, [width, height, labels, y, indexValues, fill, xMin, xMax, yMin, yMax, fonts]);

  const legend = useMemo(() => y.map((_, index) => ({ label: name?.[index] ?? `Série ${index + 1}`, color: lineColors[index] ?? 'var(--rdc-neutral)' })), [y, name, lineColors]);

  const tooltip: TooltipState | null = useMemo(() => {
    if (active === null || !geometry) return null;
    const rows = y
      .map((values, s) => ({ color: lineColors[s] ?? 'var(--rdc-neutral)', value: `${formatNumber(values[active])}${unitTooltip ? ` ${unitTooltip}` : ''}`, raw: values[active] }))
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
  }, [active, geometry, y, lineColors, labels, unitTooltip]);

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
            bottom={geometry.visible.map((index) => geometry.indexTicks[index]).filter(Boolean)}
            left={geometry.value.ticks.map((tick, index) => ({ position: geometry.valuePixel(tick), label: geometry.valueLabels[index] }))}
            bottomPadding={INDEX_PADDING}
            leftPadding={VALUE_PADDING}
            labelRotation={geometry.labelRotation}
            grid="horizontal"
          />

          {geometry.areas.map((path, s) => (path ? <path key={`a${s}`} className="rdc-area" d={path} fill={lineColors[s]} /> : null))}
          {geometry.lines.map((path, s) => (path ? <path key={`l${s}`} className="rdc-line" d={path} stroke={lineColors[s]} /> : null))}

          {/* The `afterDraw` plugin of src/components/LineChart.vue: one dashed line down the category, and one across the plot at the value of every series. */}
          {active !== null ? (
            <>
              <line className="rdc-crosshair" x1={geometry.points[0]?.[active]?.x ?? 0} x2={geometry.points[0]?.[active]?.x ?? 0} y1={geometry.area.top} y2={geometry.area.bottom} />
              {geometry.points.map((set, s) => {
                const point = set[active];
                if (!point || !Number.isFinite(y[s]?.[active])) return null;
                return <line key={`c${s}`} className="rdc-crosshair" x1={geometry.area.left} x2={geometry.area.right} y1={point.y} y2={point.y} />;
              })}
            </>
          ) : null}

          {geometry.points.map((set, s) =>
            set.map((point, index) => {
              // A custom colour has no second token, so its hover state is a
              // CSS filter. A palette colour keeps the brightened token upstream uses.
              const tinted = active === index && Boolean(custom.refs[s]);
              return (
                <circle
                  key={`${s}-${index}`}
                  className={`rdc-point${tinted ? ' rdc-hover--brighten' : ''}`}
                  cx={point.x}
                  cy={point.y}
                  r={POINT_RADIUS}
                  fill={active === index && !tinted ? (hovers[s] ?? lineColors[s]) : lineColors[s]}
                  tabIndex={0}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                />
              );
            }),
          )}
        </svg>
      ) : null}
    </ChartFrame>
  );
}
