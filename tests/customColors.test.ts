import { describe, expect, it } from 'vitest';
import { customColorSet, isChartColor, withCustomColors } from '../src/core/customColors.js';

describe('isChartColor', () => {
  it.each([
    '#f00',
    '#ff0000',
    '#ff0000ff',
    'rgb(255, 0, 0)',
    'rgba(255 0 0 / 50%)',
    'hsl(0 100% 50%)',
    'oklch(62.8% 0.25 29.2)',
    'var(--my-token)',
    'red',
    'transparent',
    'currentcolor',
    '  #ff0000  ',
  ])('accepts %s', (colour) => {
    expect(isChartColor(colour)).toBe(true);
  });

  it.each([
    'url(https://example.com/x.png)',
    'rgb(0,0,0); background: url(x)',
    'var(--a, url(x))',
    'image-set("a.png")',
    '#ff',
    '#ff0000f',
    '#gggggg',
    'red;',
    '',
    'expression(alert(1))',
    'linear-gradient(red, blue)',
  ])('refuses %s', (colour) => {
    expect(isChartColor(colour)).toBe(false);
  });

  it.each([null, undefined, 0, {}, ['red']])('refuses the value %s, which is not a string', (value) => {
    expect(isChartColor(value)).toBe(false);
  });
});

describe('customColorSet', () => {
  it('gives one custom property per colour, and a reference to it', () => {
    const set = customColorSet(['#ff0000', 'var(--mine)']);
    expect(set.style).toEqual({ '--rdc-custom-0': '#ff0000', '--rdc-custom-1': 'var(--mine)' });
    expect(set.refs).toEqual(['var(--rdc-custom-0)', 'var(--rdc-custom-1)']);
  });

  it('leaves an entry it refuses without a reference', () => {
    const set = customColorSet(['url(x)', '#00ff00', undefined]);
    expect(set.style).toEqual({ '--rdc-custom-1': '#00ff00' });
    expect(set.refs).toEqual([undefined, 'var(--rdc-custom-1)', undefined]);
  });

  it('gives nothing when no entry is a colour', () => {
    expect(customColorSet(undefined)).toEqual({ style: undefined, refs: [] });
    expect(customColorSet([])).toEqual({ style: undefined, refs: [] });
    expect(customColorSet(['url(x)', null])).toEqual({ style: undefined, refs: [] });
  });

  it('keeps the style of the host beside the custom properties', () => {
    const set = customColorSet(['#ff0000']);
    expect(withCustomColors({ margin: 8 }, set)).toEqual({ margin: 8, '--rdc-custom-0': '#ff0000' });
    expect(withCustomColors({ margin: 8 }, customColorSet(undefined))).toEqual({ margin: 8 });
  });
});
