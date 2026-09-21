/**
 * Doughnut and pie geometry, ported from the `DoughnutController` of Chart.js
 * 4.x (dist/chart.js, `update()` and `updateElements()`) with the option values
 * that @gouvfr/dsfr-chart sets: `rotation: 0`, `circumference: 360`,
 * `radius: '100%'`, `spacing: 0`, `offset: 0`, `borderWidth: 2`.
 */
export const TAU = Math.PI * 2;

/** Chart.js draws an arc with a 2px border centred on its outline. */
export const BORDER_WIDTH = 2;

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Ring {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
}

/**
 * `DoughnutController.update()`, restricted to a full circle, for which
 * `getRatioAndOffset()` returns a ratio of 1 and no offset on both axes.
 */
export function ring(area: Box, cutout: number | string): Ring {
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  const spacing = BORDER_WIDTH;
  const maxSize = Math.max((Math.min(width, height) - spacing) / 2, 0);
  const ratio = Math.min(toPercentage(cutout, maxSize), 1);
  const outerRadius = Math.max(Math.min(width - spacing, height - spacing) / 2, 0);
  return {
    cx: (area.left + area.right) / 2,
    cy: (area.top + area.bottom) / 2,
    innerRadius: Math.max(outerRadius * ratio, 0),
    outerRadius,
  };
}

/** `toPercentage()` of the Chart.js helpers. */
function toPercentage(value: number | string, dimension: number): number {
  if (typeof value === 'string' && value.endsWith('%')) return parseFloat(value) / 100;
  return (value as number) / dimension;
}

export interface Arc {
  startAngle: number;
  endAngle: number;
}

/**
 * The angle of every slice. Chart.js starts at the top, turns clockwise, and
 * sizes each slice by the absolute value of its datum.
 */
export function arcs(values: number[]): Arc[] {
  const total = values.reduce((sum, value) => sum + (isNaN(value) ? 0 : Math.abs(value)), 0);
  let angle = -Math.PI / 2;
  return values.map((value) => {
    const startAngle = angle;
    angle += total > 0 && !isNaN(value) ? (TAU * Math.abs(value)) / total : 0;
    return { startAngle, endAngle: angle };
  });
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

const point = (cx: number, cy: number, radius: number, angle: number): string =>
  `${round(cx + Math.cos(angle) * radius)} ${round(cy + Math.sin(angle) * radius)}`;

/** The outline of one slice, as an SVG path. An empty slice has no outline. */
export function arcPath({ cx, cy, innerRadius, outerRadius }: Ring, { startAngle, endAngle }: Arc): string {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return '';

  // A single SVG arc command cannot span a full turn: split it in two.
  if (sweep >= TAU) {
    const half = startAngle + Math.PI;
    const outer = `M ${point(cx, cy, outerRadius, startAngle)} A ${outerRadius} ${outerRadius} 0 0 1 ${point(cx, cy, outerRadius, half)} A ${outerRadius} ${outerRadius} 0 0 1 ${point(cx, cy, outerRadius, startAngle)} Z`;
    if (innerRadius <= 0) return outer;
    const inner = `M ${point(cx, cy, innerRadius, startAngle)} A ${innerRadius} ${innerRadius} 0 0 0 ${point(cx, cy, innerRadius, half)} A ${innerRadius} ${innerRadius} 0 0 0 ${point(cx, cy, innerRadius, startAngle)} Z`;
    return `${outer} ${inner}`;
  }

  const large = sweep > Math.PI ? 1 : 0;
  if (innerRadius <= 0) {
    return `M ${round(cx)} ${round(cy)} L ${point(cx, cy, outerRadius, startAngle)} A ${outerRadius} ${outerRadius} 0 ${large} 1 ${point(cx, cy, outerRadius, endAngle)} Z`;
  }
  return [
    `M ${point(cx, cy, outerRadius, startAngle)}`,
    `A ${outerRadius} ${outerRadius} 0 ${large} 1 ${point(cx, cy, outerRadius, endAngle)}`,
    `L ${point(cx, cy, innerRadius, endAngle)}`,
    `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${point(cx, cy, innerRadius, startAngle)}`,
    'Z',
  ].join(' ');
}

/** `ArcElement.getCenterPoint()`: where Chart.js anchors the tooltip. */
export function arcCenter({ cx, cy, innerRadius, outerRadius }: Ring, { startAngle, endAngle }: Arc): { x: number; y: number } {
  const angle = (startAngle + endAngle) / 2;
  const radius = (innerRadius + outerRadius) / 2;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}
