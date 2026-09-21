import { CAT_STOPS, DIV_STOPS, SEQ_STOPS } from './colors.generated.js';

export type Palette =
  | 'default'
  | 'neutral'
  | 'categorical'
  | 'sequentialAscending'
  | 'sequentialDescending'
  | 'divergentAscending'
  | 'divergentDescending';

/** A CSS colour: either a `var()` reference or a `color-mix()` of two of them. */
export type ChartColor = string;

const ref = (name: string): ChartColor => `var(${name})`;

const range = (count: number, name: (i: number) => string, descending: boolean): string[] => {
  const names = Array.from({ length: count }, (_, i) => name(i));
  return descending ? names.reverse() : names;
};

/**
 * Port of `choosePalette` of @gouvfr/dsfr-chart src/utils/colors.js. It returns
 * the names of the CSS custom properties instead of the hexadecimal values, so
 * that a theme change repaints without JavaScript.
 */
export function choosePalette(selectedPalette: Palette | '' | undefined): string[] {
  switch (selectedPalette) {
    case 'default':
      return ['--rdc-default'];
    case 'neutral':
      return ['--rdc-neutral'];
    case 'sequentialAscending':
    case 'sequentialDescending':
      return range(SEQ_STOPS, (i) => `--rdc-seq-${i}`, selectedPalette === 'sequentialDescending');
    case 'divergentAscending':
    case 'divergentDescending':
      return range(DIV_STOPS, (i) => `--rdc-div-${i}`, selectedPalette === 'divergentDescending');
    default:
      return range(CAT_STOPS, (i) => `--rdc-${String(i + 1).padStart(2, '0')}`, false);
  }
}

/** The hover variant of a palette entry: `darken(0.8)` of the upstream colours. */
const hoverName = (name: string): string => `${name}-dk`;

/**
 * Interpolates a palette in the sRGB space, the way `chroma.scale()` does.
 * `t` is `0` at the first stop and `1` at the last one.
 */
function interpolate(names: string[], t: number): ChartColor {
  const last = names.length - 1;
  if (last <= 0) return ref(names[0]);
  const position = Math.min(Math.max(t, 0), 1) * last;
  const index = Math.min(Math.floor(position), last - 1);
  const fraction = position - index;
  if (fraction === 0) return ref(names[index]);
  return `color-mix(in srgb, ${ref(names[index])} ${(1 - fraction) * 100}%, ${ref(names[index + 1])})`;
}

export interface GenerateColorsInput {
  /** One entry per data set. */
  yparse: (number[] | number)[];
  highlightIndex?: number[];
  selectedPalette?: Palette | '';
}

export interface GeneratedColors {
  colorParse: ChartColor[][];
  colorHover: ChartColor[][];
  legendColors: ChartColor[];
}

/**
 * Port of `generateColors` of @gouvfr/dsfr-chart src/utils/colors.js.
 *
 * The `tmpColorParse` branch of the original is not ported: version 2.1.1
 * exposes no custom-colour attribute on the pie, bar and line charts, so that
 * branch is unreachable.
 */
export function generateColors({ yparse, highlightIndex = [], selectedPalette = '' }: GenerateColorsInput): GeneratedColors {
  const palette = choosePalette(selectedPalette);
  const colorParse: ChartColor[][] = [];
  const colorHover: ChartColor[][] = [];

  for (let i = 0; i < yparse.length; i++) {
    const dataSet = yparse[i];
    const length = Array.isArray(dataSet) && dataSet.length ? dataSet.length : 1;
    let names: string[] | null = null;
    let colors: ChartColor[] = [];
    let hovers: ChartColor[] = [];

    if (selectedPalette === 'neutral' && highlightIndex.length > 0 && Array.isArray(dataSet)) {
      names = Array.from({ length }, (_, j) => (highlightIndex.includes(j) ? '--rdc-default' : '--rdc-neutral'));
    } else if (selectedPalette.startsWith('divergent')) {
      names = Array<string>(length).fill(palette[i % palette.length]);
    } else if (selectedPalette === 'categorical' || !selectedPalette) {
      names = Array<string>(length).fill(palette[i % palette.length]);
    } else {
      // Value-based scale: the upstream maps the whole data range onto the
      // palette with `chroma.scale(palette).domain([max, min])`.
      const all = yparse.flat() as number[];
      const min = Math.min(...all);
      const max = Math.max(...all);
      const data = Array.isArray(dataSet) ? dataSet : [min];
      const hoverNames = palette.map(hoverName);
      colors = data.map((value) => interpolate(palette, max === min ? 0 : (value - max) / (min - max)));
      hovers = data.map((value) => interpolate(hoverNames, max === min ? 0 : (value - max) / (min - max)));
    }

    if (names) {
      colors = names.map(ref);
      hovers = names.map((name) => ref(hoverName(name)));
    }

    colorParse.push(colors);
    colorHover.push(hovers);
  }

  return { colorParse, colorHover, legendColors: colorParse.map((c) => c[0]) };
}
