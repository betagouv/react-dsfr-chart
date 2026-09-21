import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PieChart } from '../src/PieChart/index.js';

/**
 * The charts write text that comes from the host application into the DOM:
 * labels, legend names, units, dates. React escapes that text, and these tests
 * hold that property in place. They are the reason the library may never reach
 * for `dangerouslySetInnerHTML`, which @gouvfr/dsfr-chart avoids only because
 * it draws on a canvas.
 */

const PAYLOAD = '<img src=x onerror="alert(1)">';
const X = [`Salariés ${PAYLOAD}`, 'Non-salariés', 'Apprentis'];
const Y = [74.8, 11.7, 13.5];

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });

describe('injection through the props', () => {
  it('keeps a label out of the markup of the data table', () => {
    const { container } = render(<PieChart x={X} y={Y} />);
    const header = screen.getByRole('columnheader', { name: X[0] });
    expect(header).toHaveTextContent(PAYLOAD);
    expect(container.querySelector('img')).toBeNull();
  });

  it('keeps a label out of the markup of the tooltip', () => {
    const { container } = render(<PieChart x={X} y={Y} unitTooltip={PAYLOAD} />);
    fireEvent.focus(container.querySelector('path')!);
    const tooltip = container.querySelector('.tooltip')!;
    expect(tooltip).toHaveTextContent(PAYLOAD);
    expect(tooltip.querySelector('img')).toBeNull();
  });

  it('keeps a name and a date out of the markup of the legend', () => {
    const { container } = render(<PieChart x={X} y={Y} name={[PAYLOAD, 'B', 'C']} date={PAYLOAD} />);
    const legend = container.querySelector('.chart_legend')!;
    expect(legend).toHaveTextContent(PAYLOAD);
    expect(legend.querySelector('img')).toBeNull();
  });

  it('keeps a second level label out of the markup', () => {
    const { container } = render(<PieChart x={X} y={Y} subX={[[PAYLOAD, 'B'], [], []]} subY={[[1, 2], [], []]} />);
    fireEvent.click(container.querySelector('path')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('columnheader', { name: PAYLOAD })).toBeInTheDocument();
  });

  it('never builds an attribute out of a prop', () => {
    // An attribute the browser resolves — href, src, style — never carries a
    // value that comes from a prop, so no `javascript:` URL can reach one.
    const { container } = render(<PieChart x={X} y={Y} ariaLabel={PAYLOAD} id="chart" className="mine" />);
    expect(container.querySelector('[src]')).toBeNull();
    expect(container.querySelector('[href]')).toBeNull();
    expect(screen.getByRole('img', { name: PAYLOAD })).toBeInTheDocument();
  });

  it('fills every slice with a colour the stylesheet names', () => {
    // The fill of a slice comes from the palette, never from a prop. A future
    // custom-colour prop would have to pass this test, which refuses anything
    // but a variable of the stylesheet.
    const { container } = render(<PieChart x={X} y={Y} />);
    for (const path of Array.from(container.querySelectorAll('path'))) {
      expect(path.getAttribute('fill')).toMatch(/^(var\(--rdc-[\w-]+\)|color-mix\([^<>]*\))$/);
    }
  });
});

describe('the source of the library', () => {
  const files = sourceFiles('src').filter((path) => /\.tsx?$/.test(path));

  it('reads more than a handful of files', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(['dangerouslySetInnerHTML', 'innerHTML', 'eval(', 'new Function(', 'document.write'])(
    'never uses %s',
    (pattern) => {
      const guilty = files.filter((path) => readFileSync(path, 'utf8').includes(pattern));
      expect(guilty).toEqual([]);
    },
  );
});
