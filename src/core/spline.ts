/**
 * The curve of a line chart, ported from Chart.js 4.x
 * (dist/chunks/helpers.dataset.js: `splineCurve`, `_updateBezierControlPoints`,
 * `capBezierPoints` and `capControlPoint`).
 *
 * @gouvfr/dsfr-chart leaves `cubicInterpolationMode` alone, so the curve is the
 * plain spline, never the monotone one, with a tension of 0.4.
 */
import type { Box } from './layout.js';

export interface Point {
  x: number;
  y: number;
}

export interface ControlPoints {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

/** `ElementOptions.tension` of the upstream line chart. */
export const TENSION = 0.4;

const distance = (a: Point, b: Point) => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));

/** `splineCurve`: the two control points around one point of the line. */
export function splineCurve(previous: Point, current: Point, next: Point, tension: number): { previous: Point; next: Point } {
  const d01 = distance(current, previous);
  const d12 = distance(next, current);
  let s01 = d01 / (d01 + d12);
  let s12 = d12 / (d01 + d12);
  if (isNaN(s01)) s01 = 0;
  if (isNaN(s12)) s12 = 0;
  const fa = tension * s01;
  const fb = tension * s12;
  return {
    previous: { x: current.x - fa * (next.x - previous.x), y: current.y - fa * (next.y - previous.y) },
    next: { x: current.x + fb * (next.x - previous.x), y: current.y + fb * (next.y - previous.y) },
  };
}

const cap = (value: number, min: number, max: number) => Math.max(Math.min(value, max), min);
const inArea = (point: Point, area: Box) => point.x >= area.left && point.x <= area.right && point.y >= area.top && point.y <= area.bottom;

/**
 * `_updateBezierControlPoints` followed by `capBezierPoints`: the control
 * points of every point of an open line, clamped to the plot box.
 */
export function controlPoints(points: Point[], area: Box, tension = TENSION): ControlPoints[] {
  const result: ControlPoints[] = [];
  let previous = points[0];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const next = points[Math.min(i + 1, points.length - 1)];
    const { previous: cp1, next: cp2 } = splineCurve(previous, point, next, tension);
    result.push({ cp1x: cp1.x, cp1y: cp1.y, cp2x: cp2.x, cp2y: cp2.y });
    previous = point;
  }

  // `capBezierPoints`: a control point only moves when its neighbour is inside.
  let insideNext = points.length > 0 && inArea(points[0], area);
  let inside = false;
  let insidePrevious: boolean;
  for (let i = 0; i < points.length; i++) {
    insidePrevious = inside;
    inside = insideNext;
    insideNext = i < points.length - 1 && inArea(points[i + 1], area);
    if (!inside) continue;
    const cp = result[i];
    if (insidePrevious) {
      cp.cp1x = cap(cp.cp1x, area.left, area.right);
      cp.cp1y = cap(cp.cp1y, area.top, area.bottom);
    }
    if (insideNext) {
      cp.cp2x = cap(cp.cp2x, area.left, area.right);
      cp.cp2y = cap(cp.cp2y, area.top, area.bottom);
    }
  }

  return result;
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

/** The line through the points, as an SVG path. */
export function linePath(points: Point[], area: Box, tension = TENSION): string {
  if (!points.length) return '';
  if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;
  const cp = controlPoints(points, area, tension);
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    // Chart.js joins point i-1 to point i with its `cp2` and the `cp1` of i.
    path += ` C ${round(cp[i - 1].cp2x)} ${round(cp[i - 1].cp2y)} ${round(cp[i].cp1x)} ${round(cp[i].cp1y)} ${round(points[i].x)} ${round(points[i].y)}`;
  }
  return path;
}

/** The same line, closed down to a baseline, for the area of a filled chart. */
export function areaPath(points: Point[], area: Box, baseline: number, tension = TENSION): string {
  const line = linePath(points, area, tension);
  if (!line) return '';
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${round(last.x)} ${round(baseline)} L ${round(first.x)} ${round(baseline)} Z`;
}
