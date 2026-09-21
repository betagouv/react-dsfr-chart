import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import chroma from 'chroma-js';
import source from '../scripts/dsfr-colors.json' with { type: 'json' };
import fixture from './fixtures/colors.json' with { type: 'json' };

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

const token = (theme: Theme, name: string): string => (source as Record<string, Record<string, string>>)[theme][`dsfr-chart-colors-${name}`];

/** Reads the custom properties the generator wrote, one block per theme. */
function readGeneratedCss(): Record<Theme, Record<string, string>> {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/colors.generated.css'), 'utf8');
  const result = { light: {}, dark: {} } as Record<Theme, Record<string, string>>;
  const blocks = css.matchAll(/(:root|\[data-fr-theme="dark"\])\s*\{([^}]*)\}/g);
  for (const [, selector, body] of blocks) {
    const theme: Theme = selector === ':root' ? 'light' : 'dark';
    for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
      result[theme][name] = value.trim();
    }
  }
  return result;
}

const generated = readGeneratedCss();

describe('the generated colours match chroma-js', () => {
  const names = [...Array.from({ length: 8 }, (_, i) => String(i + 1).padStart(2, '0')), 'default', 'neutral'];
  /** 09 to 15 only feed the two scales: no chart names them. */
  const scaleOnly = ['09', '10', '11', '12', '13', '14', '15'];

  for (const theme of THEMES) {
    it(`carries the ten named tokens of the "${theme}" theme and their hover variant`, () => {
      for (const name of names) {
        const hex = token(theme, name);
        expect(generated[theme][`--rdc-${name}`]).toBe(hex);
        expect(generated[theme][`--rdc-${name}-dk`]).toBe(chroma(hex).darken(0.8).hex());
      }
    });

    it(`leaves out the tokens of the "${theme}" theme that only feed a scale`, () => {
      for (const name of scaleOnly) {
        expect(generated[theme][`--rdc-${name}`]).toBeUndefined();
      }
    });

    it(`carries the sequential scale of the "${theme}" theme`, () => {
      const stops = chroma.scale([token(theme, '09'), token(theme, '10')]).colors(10);
      stops.forEach((hex, i) => {
        expect(generated[theme][`--rdc-seq-${i}`]).toBe(hex);
        expect(generated[theme][`--rdc-seq-${i}-dk`]).toBe(chroma(hex).darken(0.8).hex());
      });
    });

    it(`carries the divergent scale of the "${theme}" theme`, () => {
      const stops = chroma.scale([token(theme, '11'), token(theme, '13'), token(theme, '15')]).colors(4);
      stops.forEach((hex, i) => {
        expect(generated[theme][`--rdc-div-${i}`]).toBe(hex);
        expect(generated[theme][`--rdc-div-${i}-dk`]).toBe(chroma(hex).darken(0.8).hex());
      });
    });

    it(`reverses the ascending scales to obtain the descending ones, as the upstream does`, () => {
      const sequential = chroma.scale([token(theme, '09'), token(theme, '10')]).colors(10);
      const divergent = chroma.scale([token(theme, '11'), token(theme, '13'), token(theme, '15')]).colors(4);
      expect(sequential.slice().reverse()).toEqual(chroma.scale([token(theme, '10'), token(theme, '09')]).colors(10));
      expect(divergent.slice().reverse()).toEqual(chroma.scale([token(theme, '15'), token(theme, '13'), token(theme, '11')]).colors(4));
    });
  }

  it('matches the committed fixture, which the stylesheet and the tests share', () => {
    expect(generated).toEqual(fixture);
  });
});
