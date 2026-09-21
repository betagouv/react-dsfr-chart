import type { CSSProperties, ReactNode, RefObject } from 'react';
import { Legend, type LegendItem } from './Legend.js';
import { Tooltip, type TooltipState } from './Tooltip.js';

export interface ChartFrameProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** The element the chart is measured on. */
  chartRef: RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
  tooltip: TooltipState | null;
  legend: LegendItem[];
  date?: string;
  /** The "Retour" button and the sub-title of a chart with a second level. */
  header?: ReactNode;
  /** The data of the chart, for a screen reader. */
  table: ReactNode;
  /** The drawing itself. */
  children: ReactNode;
}

/** The markup every chart of the library shares. */
export function ChartFrame({ id, className, style, chartRef, width, height, tooltip, legend, date, header, table, children }: ChartFrameProps) {
  return (
    <div id={id} className={['rdc', 'widget_container', 'fr-grid-row', className].filter(Boolean).join(' ')} style={style}>
      <div className="fr-col-12">
        <div className="chart" ref={chartRef}>
          <Tooltip state={tooltip} width={width} height={height} />
          {header}
          {children}
          {table}
          <Legend items={legend} date={date} />
        </div>
      </div>
    </div>
  );
}
