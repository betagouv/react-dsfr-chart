import type { CSSProperties } from 'react';

/**
 * One CSS colour per slice (`PieChart`) or per series (`BarChart`,
 * `LineChart`). @gouvfr/dsfr-chart 2.1.1 exposes no such attribute: its
 * `tmpColorParse` branch is dead code. This port adds the prop, and keeps the
 * two rules the palette obeys — a colour never reaches the drawing as a raw
 * value, and the hover variant comes from CSS, never from chroma-js.
 *
 * An entry that is absent, or that is not written in one of the plain colour
 * forms below, falls back to the palette.
 */
export type CustomColors = (string | null | undefined)[];

/**
 * The colour forms the charts accept, in one expression: a hexadecimal value,
 * a colour function, a custom property, or a keyword such as `red` or
 * `currentcolor`. None of them can hold a nested parenthesis, so no `url(…)`
 * reaches an attribute, and none can hold a quote or a semicolon, so none can
 * leave the custom property it is written into.
 */
const COLOR = /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?|hwb|(?:ok)?l(?:ab|ch))\([0-9a-z.%,/\s+-]*\)|var\(--[0-9a-z_-]+\)|[a-z]{3,20})$/i;

/** `true` when the value is a colour a chart may write into a stylesheet. */
export function isChartColor(value: unknown): value is string {
  return typeof value === 'string' && COLOR.test(value.trim());
}

export interface CustomColorSet {
  /** The custom properties the chart writes on its own wrapper. */
  style: CSSProperties | undefined;
  /** `var(--rdc-custom-N)` where the prop named a colour, `undefined` elsewhere. */
  refs: (string | undefined)[];
}

const NONE: CustomColorSet = { style: undefined, refs: [] };

/**
 * Turns the `colors` prop into one custom property per entry. The drawing then
 * carries `var(--rdc-custom-0)`, never the value itself, which keeps the fill
 * of every slice, bar and point a name the stylesheet resolves.
 */
export function customColorSet(colors: CustomColors | undefined): CustomColorSet {
  if (!colors?.length) return NONE;
  const properties: Record<string, string> = {};
  const refs = colors.map((color, index) => {
    if (!isChartColor(color)) return undefined;
    const name = `--rdc-custom-${index}`;
    properties[name] = color.trim();
    return `var(${name})`;
  });
  if (!refs.some(Boolean)) return NONE;
  return { style: properties as CSSProperties, refs };
}

/** Adds the custom properties of a chart to the `style` prop of its host. */
export function withCustomColors(style: CSSProperties | undefined, custom: CustomColorSet): CSSProperties | undefined {
  return custom.style ? { ...style, ...custom.style } : style;
}
