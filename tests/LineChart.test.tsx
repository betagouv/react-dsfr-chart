import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LineChart } from '../src/LineChart/index.js';

const X = [2001, 2002, 2003, 2004];
const Y = [[51.5, 55.3, 61.5, 70.2]];

const lines = (container: HTMLElement): SVGPathElement[] => Array.from(container.querySelectorAll('path.rdc-line'));
const areas = (container: HTMLElement): SVGPathElement[] => Array.from(container.querySelectorAll('path.rdc-area'));
const points = (container: HTMLElement): SVGCircleElement[] => Array.from(container.querySelectorAll('circle.rdc-point'));
const ticks = (container: HTMLElement): string[] => Array.from(container.querySelectorAll('text.rdc-tick')).map((node) => node.textContent ?? '');

describe('LineChart', () => {
  it('draws one line per series, at the measured size', () => {
    const { container } = render(<LineChart x={X} y={[[1, 2, 3, 4], [4, 3, 2, 1]]} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '400');
    expect(lines(container)).toHaveLength(2);
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
});
