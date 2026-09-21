import { describe, expect, it } from 'vitest';
import { capitalize, formatNumber } from '../src/core/format.js';

describe('formatNumber', () => {
  it('returns an empty string for an empty value', () => {
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(undefined)).toBe('');
    expect(formatNumber('')).toBe('');
  });

  it('returns the value itself when it is not a number', () => {
    expect(formatNumber('deux')).toBe('deux');
  });

  it('groups the thousands in the French way', () => {
    expect(formatNumber(10771923)).toBe((10771923).toLocaleString('fr-FR'));
    expect(formatNumber(0)).toBe('0');
  });

  it('keeps at most two decimals', () => {
    expect(formatNumber(74.8)).toBe((74.8).toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
    expect(formatNumber(1.23456)).toBe((1.23).toLocaleString('fr-FR', { maximumFractionDigits: 2 }));
  });
});

describe('capitalize', () => {
  it('raises the first letter only', () => {
    expect(capitalize('non-salariés')).toBe('Non-salariés');
    expect(capitalize('')).toBe('');
  });
});
