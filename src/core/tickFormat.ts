/**
 * The label of a tick on a value axis, ported from Chart.js 4.x
 * (dist/chunks/helpers.dataset.js, `Ticks.formatters.numeric` and
 * `calculateDelta`).
 *
 * Chart.js formats with the locale of the page. This library always formats in
 * French, as `formatNumber` of the upstream already does for the tooltip.
 */
const LOCALE = 'fr-FR';

/** `calculateDelta`: the step the labels must be precise enough to tell apart. */
function calculateDelta(value: number, ticks: number[]): number {
  let delta = ticks.length > 3 ? ticks[2] - ticks[1] : ticks[1] - ticks[0];
  if (Math.abs(delta) >= 1 && value !== Math.floor(value)) delta = value - Math.floor(value);
  return delta;
}

/** `Ticks.formatters.numeric`. */
export function formatTick(value: number, ticks: number[]): string {
  if (value === 0) return '0';

  let notation: 'scientific' | undefined;
  let delta = value;
  if (ticks.length > 1) {
    const largest = Math.max(Math.abs(ticks[0]), Math.abs(ticks[ticks.length - 1]));
    if (largest < 1e-4 || largest > 1e15) notation = 'scientific';
    delta = calculateDelta(value, ticks);
  }

  const logDelta = Math.log10(Math.abs(delta));
  const decimals = Number.isNaN(logDelta) ? 1 : Math.max(Math.min(-1 * Math.floor(logDelta), 20), 0);
  return new Intl.NumberFormat(LOCALE, { notation, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

/**
 * The short label the line chart of @gouvfr/dsfr-chart puts on its value axis:
 * a thousand becomes `1K`, a million `1M`, a billion `1B`.
 */
export function formatShortTick(value: number): string {
  const size = Math.abs(value);
  if (size >= 1e9) return `${value / 1e9}B`;
  if (size >= 1e6) return `${value / 1e6}M`;
  if (size >= 1e3) return `${value / 1e3}K`;
  return String(value);
}
