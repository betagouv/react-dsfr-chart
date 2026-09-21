import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import chroma from 'chroma-js';
import source from '../scripts/dsfr-colors.json' with { type: 'json' };
import fixture from './fixtures/colors.json' with { type: 'json' };
import { choosePalette, generateColors, type Palette } from '../src/core/palette.js';

const light = (fixture as Record<string, Record<string, string>>).light;
const token = (name: string): string => (source as Record<string, Record<string, string>>).light[`dsfr-chart-colors-${name}`];

/** Resolves a colour of the library into a hexadecimal value of the light theme. */
function resolve(color: string): string {
  const variable = color.match(/^var\((--[\w-]+)\)$/);
  if (variable) return light[variable[1]].toLowerCase();

  const mix = color.match(/^color-mix\(in srgb, var\((--[\w-]+)\) ([\d.]+)%, var\((--[\w-]+)\)\)$/);
  if (!mix) throw new Error(`Unexpected colour: ${color}`);
  const [, first, share, second] = mix;
  const weight = Number(share) / 100;
  const a = chroma(light[first]).rgb();
  const b = chroma(light[second]).rgb();
  return chroma(a.map((channel, i) => channel * weight + b[i] * (1 - weight)) as [number, number, number]).hex();
}

/** The palettes of src/utils/colors.js of @gouvfr/dsfr-chart, recomputed here. */
const upstreamPalette = (name: Palette | ''): string[] => {
  switch (name) {
    case 'default':
      return [token('default')];
    case 'neutral':
      return [token('neutral')];
    case 'sequentialAscending':
      return chroma.scale([token('09'), token('10')]).colors(10);
    case 'sequentialDescending':
      return chroma.scale([token('10'), token('09')]).colors(10);
    case 'divergentAscending':
      return chroma.scale([token('11'), token('13'), token('15')]).colors(4);
    case 'divergentDescending':
      return chroma.scale([token('15'), token('13'), token('11')]).colors(4);
    default:
      return [token('01'), token('02'), token('03'), token('04'), token('05'), token('06'), token('07'), token('08')];
  }
};

describe('choosePalette', () => {
  it('returns the eight categorical colours by default', () => {
    expect(choosePalette('')).toEqual(['--rdc-01', '--rdc-02', '--rdc-03', '--rdc-04', '--rdc-05', '--rdc-06', '--rdc-07', '--rdc-08']);
    expect(choosePalette(undefined)).toEqual(choosePalette('categorical'));
  });

  it('reverses the descending scales', () => {
    expect(choosePalette('sequentialDescending')).toEqual(choosePalette('sequentialAscending').slice().reverse());
    expect(choosePalette('divergentDescending')).toEqual(choosePalette('divergentAscending').slice().reverse());
  });

  it('returns the single colour of the default and neutral palettes', () => {
    expect(choosePalette('default')).toEqual(['--rdc-default']);
    expect(choosePalette('neutral')).toEqual(['--rdc-neutral']);
  });

  it('resolves to the colours of the upstream palettes', () => {
    for (const name of ['', 'default', 'neutral', 'sequentialAscending', 'sequentialDescending', 'divergentAscending', 'divergentDescending'] as const) {
      const resolved = choosePalette(name).map((variable) => light[variable].toLowerCase());
      expect(resolved).toEqual(upstreamPalette(name).map((hex) => hex.toLowerCase()));
    }
  });
});

describe('generateColors', () => {
  const values = [74.8, 11.7, 9.3, 1.6, 2.6];

  it('colours a categorical series by index, and cycles past the eighth colour', () => {
    const { colorParse } = generateColors({ yparse: [1, 2, 3, 4, 5, 6, 7, 8, 9], selectedPalette: 'categorical' });
    expect(colorParse.flat()).toEqual([...choosePalette('categorical').map((n) => `var(${n})`), 'var(--rdc-01)']);
  });

  it('gives every slice of a divergent palette the same colour, as the upstream does', () => {
    const { colorParse } = generateColors({ yparse: [values], selectedPalette: 'divergentAscending' });
    expect(new Set(colorParse[0])).toEqual(new Set(['var(--rdc-div-0)']));
  });

  it('highlights the chosen indices of a neutral palette', () => {
    const { colorParse } = generateColors({ yparse: [[1, 2, 3]], selectedPalette: 'neutral', highlightIndex: [1] });
    expect(colorParse[0]).toEqual(['var(--rdc-neutral)', 'var(--rdc-default)', 'var(--rdc-neutral)']);
  });

  it('takes the hover colour from the darkened variant', () => {
    const { colorParse, colorHover } = generateColors({ yparse: values, selectedPalette: 'categorical' });
    expect(colorHover.flat()).toEqual(colorParse.flat().map((color) => color.replace(/\)$/, '-dk)')));
  });

  it('reports the first colour of every series as the legend colour', () => {
    const { colorParse, legendColors } = generateColors({ yparse: [[1, 2], [3, 4]], selectedPalette: 'categorical' });
    expect(legendColors).toEqual([colorParse[0][0], colorParse[1][0]]);
  });

  // The divergent palettes never reach the value-based branch of the upstream.
  for (const palette of ['sequentialAscending', 'sequentialDescending', 'default', 'neutral'] as const) {
    it(`maps a value onto the "${palette}" palette the way chroma.scale does`, () => {
      const { colorParse } = generateColors({ yparse: [values], selectedPalette: palette });
      const scale = chroma.scale(upstreamPalette(palette)).domain([Math.max(...values), Math.min(...values)]);
      colorParse[0].forEach((color, index) => {
        const ours = chroma(resolve(color)).rgb();
        const theirs = chroma(scale(values[index]).hex()).rgb();
        // The upstream rounds every stop to a hexadecimal value before it
        // interpolates, so a channel may differ by one unit.
        ours.forEach((channel, i) => expect(Math.abs(channel - theirs[i])).toBeLessThanOrEqual(1));
      });
    });
  }
});

/**
 * Every value of the `Palette` union, as a record: adding a palette without
 * adding it here fails the typecheck, so the guard below cannot fall behind.
 */
const PALETTES: Record<Palette, true> = {
  default: true,
  neutral: true,
  categorical: true,
  sequentialAscending: true,
  sequentialDescending: true,
  divergentAscending: true,
  divergentDescending: true,
};

/** The hover suffixes the charts append: `-dk` for the pie and the bar, `-br` for the line. */
const HOVER_SUFFIXES = ['-dk', '-br'];

/** The custom properties the generated stylesheet declares, one set per theme block. */
function declaredProperties(): { light: Set<string>; dark: Set<string> } {
  const css = readFileSync(join(process.cwd(), 'src/styles/colors.generated.css'), 'utf8');
  const declared = { light: new Set<string>(), dark: new Set<string>() };
  for (const [, selector, body] of css.matchAll(/(:root|\[data-fr-theme="dark"\])\s*\{([^}]*)\}/g)) {
    const theme = selector === ':root' ? 'light' : 'dark';
    for (const [, name] of body.matchAll(/(--[\w-]+):/g)) declared[theme].add(name);
  }
  return declared;
}

describe('the stylesheet defines every custom property a palette can name', () => {
  const declared = declaredProperties();
  const palettes = [...(Object.keys(PALETTES) as Palette[]), '', undefined] as const;

  for (const palette of palettes) {
    it(`declares the colours of the "${palette ?? 'undefined'}" palette and their hover variants, in both themes`, () => {
      const names = choosePalette(palette).flatMap((name) => [name, ...HOVER_SUFFIXES.map((suffix) => `${name}${suffix}`)]);
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) {
        expect(declared.light, `${name} is missing from the light theme`).toContain(name);
        expect(declared.dark, `${name} is missing from the dark theme`).toContain(name);
      }
    });
  }
});
