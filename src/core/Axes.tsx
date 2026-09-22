import type { Box } from './layout.js';
import { LINE_HEIGHT } from './measureText.js';

export interface AxisTick {
  /** Where the tick sits, in pixels. */
  position: number;
  label: string;
}

export interface AxesProps {
  area: Box;
  /** The ticks of the axis along the bottom, and of the one up the left side. */
  bottom: AxisTick[];
  left: AxisTick[];
  /** `ticks.padding` of each axis. */
  bottomPadding: number;
  leftPadding: number;
  /** Degrees. The labels along the bottom turn when they do not fit. */
  labelRotation: number;
  /** Which axis draws its lines across the plot: the value axis does. */
  grid: 'horizontal' | 'vertical';
}

/**
 * The two axes of a bar chart or a line chart: the dashed grid of the value
 * axis, the solid border along the category axis, and the labels.
 *
 * @gouvfr/dsfr-chart sets `grid.drawTicks: false`, so no tick mark is drawn,
 * and `border.dash: [3]` on the value axis, which dashes its grid. The value
 * axis draws no line of its own.
 */
export function Axes({ area, bottom, left, bottomPadding, leftPadding, labelRotation, grid }: AxesProps) {
  const horizontalGrid = grid === 'horizontal';
  return (
    <g className="rdc-axes" aria-hidden="true">
      {horizontalGrid
        ? left.map((tick, index) => <line key={index} className="rdc-grid" x1={area.left} x2={area.right} y1={tick.position} y2={tick.position} />)
        : bottom.map((tick, index) => <line key={index} className="rdc-grid" x1={tick.position} x2={tick.position} y1={area.top} y2={area.bottom} />)}

      {horizontalGrid ? (
        <line className="rdc-axis" x1={area.left} x2={area.right} y1={area.bottom} y2={area.bottom} />
      ) : (
        <line className="rdc-axis" x1={area.left} x2={area.left} y1={area.top} y2={area.bottom} />
      )}

      {left.map((tick, index) => (
        <text key={index} className="rdc-tick" x={area.left - leftPadding} y={tick.position} textAnchor="end" dominantBaseline="middle">
          {tick.label}
        </text>
      ))}

      {bottom.map((tick, index) => {
        const y = area.bottom + bottomPadding;
        if (labelRotation === 0) {
          return (
            <text key={index} className="rdc-tick" x={tick.position} y={y + LINE_HEIGHT / 2} textAnchor="middle" dominantBaseline="middle">
              {tick.label}
            </text>
          );
        }
        // Chart.js turns the label about its right end, so it stays under its tick.
        return (
          <text key={index} className="rdc-tick" x={tick.position} y={y} textAnchor="end" dominantBaseline="hanging" transform={`rotate(${-labelRotation} ${tick.position} ${y})`}>
            {tick.label}
          </text>
        );
      })}
    </g>
  );
}
