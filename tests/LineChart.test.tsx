import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BarChart } from '../src/BarChart/index.js';
import { LineChart } from '../src/LineChart/index.js';

const X = [2001, 2002, 2003, 2004];
const Y = [[51.5, 55.3, 61.5, 70.2]];

const lines = (container: HTMLElement): SVGPathElement[] => Array.from(container.querySelectorAll('path.rdc-line'));
const areas = (container: HTMLElement): SVGPathElement[] => Array.from(container.querySelectorAll('path.rdc-area'));
const points = (container: HTMLElement): SVGCircleElement[] => Array.from(container.querySelectorAll('circle.rdc-point'));
const ticks = (container: HTMLElement): string[] => Array.from(container.querySelectorAll('text.rdc-tick')).map((node) => node.textContent ?? '');
const crosshairs = (container: HTMLElement): SVGLineElement[] => Array.from(container.querySelectorAll('line.rdc-crosshair'));

describe('LineChart', () => {
  it('draws one line per series, at the measured size', () => {
    const { container } = render(<LineChart x={X} y={[[1, 2, 3, 4], [4, 3, 2, 1]]} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '400');
    expect(lines(container)).toHaveLength(2);
  });

  it('holds the height that `height` gives, whatever the width', () => {
    const { container } = render(<LineChart x={X} y={[[1, 2, 3, 4]]} height={250} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '250');
  });

  it('draws one point per value', () => {
    const { container } = render(<LineChart x={X} y={Y} />);
    expect(points(container)).toHaveLength(4);
  });

  it('joins the points with cubic segments', () => {
    const { container } = render(<LineChart x={X} y={Y} />);
    expect(lines(container)[0].getAttribute('d')!.match(/ C /g)).toHaveLength(3);
  });

  it('labels the drawing for a screen reader', () => {
    render(<LineChart x={X} y={Y} />);
    expect(screen.getByRole('img', { name: 'Graphique en ligne' })).toBeInTheDocument();
  });

  it('fills the space under the line only when asked', () => {
    const { container, rerender } = render(<LineChart x={X} y={Y} />);
    expect(areas(container)).toHaveLength(0);
    rerender(<LineChart x={X} y={Y} fill />);
    expect(areas(container)).toHaveLength(1);
    expect(areas(container)[0].getAttribute('d')).toMatch(/Z$/);
  });

  it('does not begin the value axis at zero', () => {
    const { container } = render(<LineChart x={X} y={[[51.5, 55.3, 61.5, 70.2]]} />);
    expect(ticks(container)).not.toContain('0');
  });

  it('shortens a large value on the axis', () => {
    const { container } = render(<LineChart x={X} y={[[1000, 2000, 3000, 4000]]} />);
    expect(ticks(container).some((label) => label.endsWith('K'))).toBe(true);
  });

  it('spreads numeric labels along a linear axis', () => {
    const { container } = render(<LineChart x={[2000, 2001, 2010]} y={[[1, 2, 3]]} />);
    const cx = points(container).map((point) => Number(point.getAttribute('cx')));
    // 2000 and 2001 sit close together; 2010 sits far away.
    expect(cx[1] - cx[0]).toBeLessThan(cx[2] - cx[1]);
  });

  it('spaces text labels evenly', () => {
    const { container } = render(<LineChart x={['un', 'deux', 'trois']} y={[[1, 2, 3]]} />);
    const cx = points(container).map((point) => Number(point.getAttribute('cx')));
    expect(cx[1] - cx[0]).toBeCloseTo(cx[2] - cx[1], 6);
  });

  it('widens a linear index axis to take a suggested minimum in', () => {
    const before = render(<LineChart x={[2000, 2001, 2002]} y={[[1, 2, 3]]} />);
    const gap = (container: HTMLElement) => {
      const cx = points(container).map((point) => Number(point.getAttribute('cx')));
      return cx[1] - cx[0];
    };
    const after = render(<LineChart x={[2000, 2001, 2002]} y={[[1, 2, 3]]} xMin={1990} />);
    // A wider range over the same plot puts the same three years closer together.
    expect(gap(after.container)).toBeLessThan(gap(before.container));
  });

  it('leaves a category index axis alone, which reads no numeric bound', () => {
    const before = render(<LineChart x={['un', 'deux', 'trois']} y={[[1, 2, 3]]} />);
    const after = render(<LineChart x={['un', 'deux', 'trois']} y={[[1, 2, 3]]} xMin={0} xMax={100} />);
    const cx = (container: HTMLElement) => points(container).map((point) => Number(point.getAttribute('cx')));
    expect(cx(after.container)).toEqual(cx(before.container));
  });

  it('skips the category labels that do not fit, as the bar chart does', () => {
    const many = Array.from({ length: 40 }, (_, index) => `catégorie ${index + 1}`);
    const values = [many.map((_, index) => index + 1)];
    const line = render(<LineChart x={many} y={values} />);
    const bar = render(<BarChart x={many} y={values} />);
    const drawn = (container: HTMLElement) => ticks(container).filter((label) => many.includes(label)).length;
    expect(drawn(line.container)).toBeLessThan(many.length);
    expect(drawn(line.container)).toBe(drawn(bar.container));
  });

  it('names the legend entries "Série n" when no name is given', () => {
    render(<LineChart x={X} y={[[1, 2, 3, 4], [4, 3, 2, 1]]} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Série 1', 'Série 2']);
  });

  it('puts every series in the table for a screen reader', () => {
    render(<LineChart x={X} y={[[1, 2, 3, 4], [4, 3, 2, 1]]} name={['Femmes', 'Hommes']} />);
    const table = screen.getByRole('table', { name: 'Graphique en ligne' });
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['Femmes', 'Hommes']);
  });

  it('brightens the point under the pointer, where the other charts darken', () => {
    const { container } = render(<LineChart x={X} y={Y} />);
    fireEvent.mouseEnter(points(container)[0]);
    expect(points(container)[0].getAttribute('fill')).toBe('var(--rdc-01-br)');
  });

  it('opens a tooltip and a guide line on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(<LineChart x={X} y={[[1, 2, 3, 4], [4, 3, 2, 1]]} unitTooltip="%" />);
    const tooltip = container.querySelector('.tooltip') as HTMLElement;
    await user.hover(points(container)[1]);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(tooltip).toHaveTextContent('2002');
    expect(tooltip).toHaveTextContent('2 %');
    expect(tooltip).toHaveTextContent('3 %');
    expect(container.querySelector('line.rdc-crosshair')).toBeInTheDocument();
  });

  it('guides the eye down the category and across every series on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(<LineChart x={X} y={[[1, 2, 3, 4], [4, 3, 2, 1]]} />);
    await user.hover(points(container)[1]);

    const all = crosshairs(container);
    const vertical = all.filter((line) => line.getAttribute('x1') === line.getAttribute('x2'));
    const horizontal = all.filter((line) => line.getAttribute('y1') === line.getAttribute('y2'));
    expect(vertical).toHaveLength(1);
    expect(horizontal).toHaveLength(2);
    // Each one sits at the point of its own series.
    const cy = points(container)
      .filter((_, index) => index % 4 === 1)
      .map((point) => point.getAttribute('cy'));
    expect(horizontal.map((line) => line.getAttribute('y1'))).toEqual(cy);
  });

  it('draws no guide line across a series that has no value there', async () => {
    const user = userEvent.setup();
    const { container } = render(<LineChart x={X} y={[[1, 2, 3, 4], [4, Number.NaN, 2, 1]]} />);
    await user.hover(points(container)[1]);
    expect(crosshairs(container).filter((line) => line.getAttribute('y1') === line.getAttribute('y2'))).toHaveLength(1);
  });

  it('opens the tooltip on focus', () => {
    const { container } = render(<LineChart x={X} y={Y} />);
    const tooltip = container.querySelector('.tooltip') as HTMLElement;
    fireEvent.focus(points(container)[0]);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(tooltip).toHaveTextContent('2001');
  });

  it('redraws when the values change', () => {
    const { container, rerender } = render(<LineChart x={X} y={Y} />);
    const before = lines(container)[0].getAttribute('d');
    rerender(<LineChart x={X} y={[[1, 1, 1, 1]]} />);
    expect(lines(container)[0].getAttribute('d')).not.toBe(before);
  });

  it('disconnects the resize observer when it unmounts', () => {
    const observers = (globalThis as { TestResizeObserver?: { instances: { disconnected: boolean }[] } }).TestResizeObserver!.instances;
    const before = observers.length;
    const { unmount } = render(<LineChart x={X} y={Y} />);
    unmount();
    expect(observers[before].disconnected).toBe(true);
  });

  it('paints a series with the colour the colors prop gives', () => {
    const { container } = render(<LineChart x={X} y={[Y[0], [10, 20, 30, 40]]} fill colors={['#ff0000', 'var(--mine)']} />);
    expect(lines(container).map((line) => line.getAttribute('stroke'))).toEqual(['var(--rdc-custom-0)', 'var(--rdc-custom-1)']);
    expect(areas(container).map((area) => area.getAttribute('fill'))).toEqual(['var(--rdc-custom-0)', 'var(--rdc-custom-1)']);
    const wrapper = container.querySelector('.rdc') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--rdc-custom-1')).toBe('var(--mine)');
  });

  it('keeps the palette for a series the colors prop leaves out or writes badly', () => {
    const plain = render(<LineChart x={X} y={[Y[0], [10, 20, 30, 40]]} />);
    const custom = render(<LineChart x={X} y={[Y[0], [10, 20, 30, 40]]} colors={['url(https://example.com/x.png)', '#00ff00']} />);
    const palette = lines(plain.container).map((line) => line.getAttribute('stroke'));
    expect(lines(custom.container).map((line) => line.getAttribute('stroke'))).toEqual([palette[0], 'var(--rdc-custom-1)']);
  });

  it('brightens a custom point on hover with a filter, and keeps its colour', async () => {
    const user = userEvent.setup();
    const { container } = render(<LineChart x={X} y={Y} colors={['#ff0000']} />);
    const first = points(container)[0];
    await user.hover(first);
    expect(first).toHaveClass('rdc-hover--brighten');
    expect(first.getAttribute('fill')).toBe('var(--rdc-custom-0)');
    const dot = container.querySelector('.legend_dot') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('var(--rdc-custom-0)');
  });
});
