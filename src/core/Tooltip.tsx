import { useLayoutEffect, useRef, useState } from 'react';

export interface TooltipRow {
  color: string;
  value: string;
}

export interface TooltipState {
  title: string;
  rows: TooltipRow[];
  /** The anchor point, in the coordinates of the chart. */
  x: number;
  y: number;
}

export interface TooltipProps {
  state: TooltipState | null;
  width: number;
  height: number;
}

/** The padding Chart.js applies to its tooltip, which the DSFR keeps. */
const PADDING = 6;

/**
 * Port of the `external` tooltip of @gouvfr/dsfr-chart, including its placement
 * algorithm. The tooltip is HTML, not SVG, so that it inherits the DSFR text
 * styles and stays readable at any zoom level.
 */
export function Tooltip({ state, width, height }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !state) {
      setPosition(null);
      return;
    }
    const w = element.clientWidth;
    const h = element.clientHeight;
    let left = state.x + 10;
    let top = state.y - 20;
    if (left + w > width) left = state.x - w - 10;
    if (top + h > 0.9 * height) top = state.y - h + 20;
    if (left < 0) {
      left = state.x - w / 2;
      top = state.y - h - 20;
    }
    setPosition({ left, top });
  }, [state, width, height]);

  return (
    <div
      ref={ref}
      className="tooltip"
      role="tooltip"
      aria-hidden={!state}
      style={{
        padding: `${PADDING}px`,
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.top}px` : 0,
        opacity: state && position ? 1 : 0,
      }}
    >
      <div className="tooltip_header fr-text--sm fr-mb-0">{state?.title}</div>
      <div className="tooltip_body">
        <div className="tooltip_value">
          {state?.rows.map((row, index) => (
            <div className="tooltip_value-content" key={index}>
              <span className="tooltip_dot" style={{ backgroundColor: row.color }} />
              <p className="tooltip_place fr-mb-0">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
