import { useMemo, useState, type CSSProperties } from 'react';
import { arcCenter, arcPath, arcs, BORDER_WIDTH, ring } from '../core/arc.js';
import { ChartFrame } from '../core/ChartFrame.js';
import { DataTable } from '../core/DataTable.js';
import { formatNumber } from '../core/format.js';
import { generateColors, type Palette } from '../core/palette.js';
import type { TooltipState } from '../core/Tooltip.js';
import { useSize } from '../core/useSize.js';

export interface PieChartProps {
  /** The label of every slice. */
  x: string[];
  /** The value of every slice. */
  y: number[];
  /** The second level of every slice, reached by a click on that slice. */
  subX?: string[][];
  subY?: number[][];
  /** The legend labels. The default is `Série 1`, `Série 2`, and so on. */
  name?: string[];
  /** `true` draws a pie, `false` a doughnut. */
  fill?: boolean;
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

/** The padding @gouvfr/dsfr-chart puts on the left and the right of a pie. */
const PADDING_X = 50;
const DEFAULT_ARIA_LABEL = 'Diagramme circulaire';

export function PieChart({
  x,
  y,
  subX,
  subY,
  name,
  fill = false,
  selectedPalette,
  unitTooltip,
  date,
  aspectRatio = 2,
  ariaLabel = DEFAULT_ARIA_LABEL,
  id,
  className,
  style,
}: PieChartProps) {
  const { ref, width, height } = useSize<HTMLDivElement>(aspectRatio);
  const [level, setLevel] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const hasSubChart = Boolean(subX && subY);
  const labels = level === null ? x : (subX?.[level] ?? x);
  const values = level === null ? y : (subY?.[level] ?? y);

  const { colors, hovers } = useMemo(() => {
    // Port of `loadColors` of src/components/PieChart.vue: a categorical
    // palette colours by slice index, any other one by slice value.
    const byIndex = !selectedPalette || selectedPalette === 'categorical';
    const { colorParse, colorHover } = generateColors({
      yparse: byIndex ? values : [values],
      selectedPalette,
    });
    return { colors: colorParse.flat(), hovers: colorHover.flat() };
  }, [values, selectedPalette]);

  const geometry = useMemo(() => {
    if (width <= 0 || height <= 0) return null;
    const box = ring({ left: PADDING_X, top: 0, right: width - PADDING_X, bottom: height }, fill ? 0 : '50%');
    return { box, slices: arcs(values) };
  }, [width, height, fill, values]);

  const legend = useMemo(() => {
    const names = level === null ? name : labels;
    return values.map((_, index) => ({
      label: names?.[index] ?? `Série ${index + 1}`,
      color: colors[index] ?? 'var(--rdc-neutral)',
    }));
  }, [values, labels, name, colors, level]);

  const tooltip: TooltipState | null = useMemo(() => {
    if (active === null || !geometry) return null;
    const { x: cx, y: cy } = arcCenter(geometry.box, geometry.slices[active]);
    return {
      title: labels[active] ?? '',
      rows: [
        {
          color: colors[active] ?? 'var(--rdc-neutral)',
          value: `${formatNumber(values[active])}${unitTooltip ? ` ${unitTooltip}` : ''}`,
        },
      ],
      x: cx,
      y: cy,
    };
  }, [active, geometry, labels, values, colors, unitTooltip]);

  const drillDown = (index: number) => {
    if (!hasSubChart || level !== null) return;
    if (!subY?.[index]?.length) return;
    setActive(null);
    setLevel(index);
  };

  const header = hasSubChart ? (
    <div className={level === null ? 'fr-mt-6v' : ''} style={{ textAlign: 'center', position: 'relative' }}>
      {level !== null ? (
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-icon-arrow-go-back-fill fr-btn--icon-left fr-btn--tertiary-no-outline fr-ml-4w"
          style={{ position: 'absolute', left: 0 }}
          onClick={() => {
            setActive(null);
            setLevel(null);
          }}
        >
          Retour
        </button>
      ) : null}
      {level !== null ? <p className="fr-mb-0">{x[level]}</p> : null}
    </div>
  ) : null;

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
      header={header}
      table={
        <DataTable
          caption={ariaLabel}
          columns={labels}
          rows={[{ header: unitTooltip || 'Valeur', cells: values.map((value) => formatNumber(value)) }]}
        />
      }
    >
      {geometry ? (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
          {geometry.slices.map((slice, index) => {
            const path = arcPath(geometry.box, slice);
            if (!path) return null;
            const color = (active === index ? hovers[index] : colors[index]) ?? 'var(--rdc-neutral)';
            const clickable = hasSubChart && level === null && Boolean(subY?.[index]?.length);
            return (
              <path
                key={index}
                className={`rdc-arc${clickable ? ' rdc-arc--clickable' : ''}`}
                d={path}
                fill={color}
                stroke={color}
                strokeWidth={BORDER_WIDTH}
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
          })}
        </svg>
      ) : null}
    </ChartFrame>
  );
}
