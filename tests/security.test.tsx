import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BarChart } from '../src/BarChart/index.js';
import { LineChart } from '../src/LineChart/index.js';
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

describe('injection through the props of the bar chart and the line chart', () => {
  it('keeps a category label out of the markup of the axis', () => {
    const { container } = render(<BarChart x={X} y={[Y]} />);
    const labels = Array.from(container.querySelectorAll('text.rdc-tick')).map((node) => node.textContent);
    expect(labels).toContain(X[0]);
    expect(container.querySelector('img')).toBeNull();
  });

  it('keeps a name, a unit and a date out of the markup of a bar chart', () => {
    const { container } = render(<BarChart x={X} y={[Y]} name={[PAYLOAD]} unitTooltip={PAYLOAD} date={PAYLOAD} />);
    fireEvent.focus(container.querySelector('rect.rdc-bar')!);
    expect(container).toHaveTextContent(PAYLOAD);
    expect(container.querySelector('img')).toBeNull();
  });

  it('keeps a second level label of a bar chart out of the markup', () => {
    const { container } = render(<BarChart x={X} y={[Y]} subX={[[PAYLOAD, 'B'], [], []]} subY={[[1, 2], [], []]} />);
    fireEvent.click(container.querySelector('rect.rdc-bar')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('columnheader', { name: PAYLOAD })).toBeInTheDocument();
  });

  it('keeps a label and a name out of the markup of a line chart', () => {
    const { container } = render(<LineChart x={X} y={[Y]} name={[PAYLOAD]} unitTooltip={PAYLOAD} date={PAYLOAD} />);
    fireEvent.focus(container.querySelector('circle.rdc-point')!);
    expect(container).toHaveTextContent(PAYLOAD);
    expect(container.querySelector('img')).toBeNull();
  });

  it('paints every bar, line and point with a colour the stylesheet names', () => {
    const colour = /^(var\(--rdc-[\w-]+\)|color-mix\([^<>]*\))$/;
    const bar = render(<BarChart x={X} y={[Y]} />);
    for (const rect of Array.from(bar.container.querySelectorAll('rect.rdc-bar'))) {
      expect(rect.getAttribute('fill')).toMatch(colour);
    }
    const line = render(<LineChart x={X} y={[Y]} fill />);
    for (const path of Array.from(line.container.querySelectorAll('path.rdc-line'))) {
      expect(path.getAttribute('stroke')).toMatch(colour);
    }
    for (const point of Array.from(line.container.querySelectorAll('circle.rdc-point'))) {
      expect(point.getAttribute('fill')).toMatch(colour);
    }
  });

  it('never builds an attribute out of a prop', () => {
    const bar = render(<BarChart x={X} y={[Y]} ariaLabel={PAYLOAD} />);
    const line = render(<LineChart x={X} y={[Y]} ariaLabel={`${PAYLOAD} ligne`} />);
    for (const { container } of [bar, line]) {
      expect(container.querySelector('[src]')).toBeNull();
      expect(container.querySelector('[href]')).toBeNull();
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
