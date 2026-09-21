import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BarChart } from '../src/BarChart/index.js';

const X = ['2000', '2010', '2020'];
const Y = [[11.1, 10.5, 8.4]];

const bars = (container: HTMLElement): SVGRectElement[] => Array.from(container.querySelectorAll('rect.rdc-bar'));
const ticks = (container: HTMLElement): string[] => Array.from(container.querySelectorAll('text.rdc-tick')).map((node) => node.textContent ?? '');

describe('BarChart', () => {
  it('draws one bar per value, at the measured size', () => {
    const { container } = render(<BarChart x={X} y={Y} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '400');
    expect(bars(container)).toHaveLength(3);
  });

  it('draws one bar per value of every series', () => {
    const { container } = render(<BarChart x={X} y={[[1, 2, 3], [4, 5, 6]]} />);
    expect(bars(container)).toHaveLength(6);
  });

  it('labels the drawing for a screen reader', () => {
    render(<BarChart x={X} y={Y} />);
    expect(screen.getByRole('img', { name: 'Graphique en barres' })).toBeInTheDocument();
  });

  it('draws both axes, with the categories and the values', () => {
    const { container } = render(<BarChart x={X} y={Y} />);
    const labels = ticks(container);
    for (const label of X) expect(labels).toContain(label);
    expect(labels).toContain('0');
  });

  it('starts the value axis at zero', () => {
    const { container } = render(<BarChart x={X} y={[[50, 60, 70]]} />);
    expect(ticks(container)).toContain('0');
  });

  it('takes a suggested maximum into account', () => {
    const { container } = render(<BarChart x={X} y={[[1, 2, 3]]} yMax={100} />);
    expect(ticks(container)).toContain('100');
  });

  it('lays the categories up the left side when horizontal', () => {
    const { container } = render(<BarChart x={X} y={Y} horizontal />);
    const first = bars(container)[0];
    const second = bars(container)[1];
    // Vertical bars share a baseline; horizontal bars share a left edge.
    expect(first.getAttribute('x')).toBe(second.getAttribute('x'));
    expect(first.getAttribute('y')).not.toBe(second.getAttribute('y'));
  });

  it('piles the series of a category when stacked', () => {
    const { container } = render(<BarChart x={X} y={[[10, 10, 10], [10, 10, 10]]} stacked />);
    const all = bars(container);
    // Stacked bars of one category share a column and sit on one another.
    expect(all[0].getAttribute('x')).toBe(all[3].getAttribute('x'));
    expect(Number(all[3].getAttribute('y'))).toBeLessThan(Number(all[0].getAttribute('y')));
  });

  it('honours a fixed bar size', () => {
    const { container } = render(<BarChart x={X} y={Y} barSize={20} />);
    expect(Number(bars(container)[0].getAttribute('width'))).toBeCloseTo(20, 6);
  });

  it('never draws a bar wider than the maximum', () => {
    const { container } = render(<BarChart x={['a', 'b']} y={[[1, 2]]} maxBarSize={12} />);
    expect(Number(bars(container)[0].getAttribute('width'))).toBeLessThanOrEqual(12);
  });

  it('colours the highlighted categories with the accent of a neutral palette', () => {
    const { container } = render(<BarChart x={X} y={Y} selectedPalette="neutral" highlightIndex={[1]} />);
    expect(bars(container).map((bar) => bar.getAttribute('fill'))).toEqual(['var(--rdc-neutral)', 'var(--rdc-default)', 'var(--rdc-neutral)']);
  });

  it('names the legend entries "Série n" when no name is given', () => {
    render(<BarChart x={X} y={[[1, 2, 3], [4, 5, 6]]} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Série 1', 'Série 2']);
  });

  it('puts every series in the table for a screen reader', () => {
    render(<BarChart x={X} y={[[1, 2, 3], [4, 5, 6]]} name={['Empreinte', 'Émissions']} />);
    const table = screen.getByRole('table', { name: 'Graphique en barres' });
    expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['Empreinte', 'Émissions']);
  });

  it('opens a tooltip holding every series of the category', async () => {
    const user = userEvent.setup();
    const { container } = render(<BarChart x={X} y={[[1, 2, 3], [4, 5, 6]]} unitTooltip="t" />);
    const tooltip = container.querySelector('.tooltip') as HTMLElement;
    await user.hover(bars(container)[1]);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(tooltip).toHaveTextContent('2010');
    expect(tooltip).toHaveTextContent('2 t');
    expect(tooltip).toHaveTextContent('5 t');
  });

  it('opens the tooltip on focus', () => {
    const { container } = render(<BarChart x={X} y={Y} />);
    const tooltip = container.querySelector('.tooltip') as HTMLElement;
    fireEvent.focus(bars(container)[0]);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(tooltip).toHaveTextContent('2000');
  });

  it('redraws when the values change', () => {
    const { container, rerender } = render(<BarChart x={X} y={Y} />);
    const before = bars(container).map((bar) => bar.getAttribute('height'));
    rerender(<BarChart x={X} y={[[1, 1, 1]]} />);
    expect(bars(container).map((bar) => bar.getAttribute('height'))).not.toEqual(before);
  });

  it('disconnects the resize observer when it unmounts', () => {
    const observers = (globalThis as { TestResizeObserver?: { instances: { disconnected: boolean }[] } }).TestResizeObserver!.instances;
    const before = observers.length;
    const { unmount } = render(<BarChart x={X} y={Y} />);
    unmount();
    expect(observers[before].disconnected).toBe(true);
  });
});

describe('BarChart with a second level', () => {
  const subX = [['Janvier', 'Février'], ['Mars'], []];
  const subY = [[6, 5.1], [10.5], []];

  it('opens the second level on a click, then returns to the first one', async () => {
    const user = userEvent.setup();
    const { container } = render(<BarChart x={X} y={Y} subX={subX} subY={subY} />);

    await user.click(bars(container)[0]);
    expect(bars(container)).toHaveLength(2);
    expect(screen.getByText(X[0])).toBeInTheDocument();
    expect(ticks(container)).toContain('Janvier');

    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(bars(container)).toHaveLength(3);
  });

  it('opens the second level with the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(<BarChart x={X} y={Y} subX={subX} subY={subY} />);
    act(() => bars(container)[0].focus());
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument();
  });

  it('ignores a category that has no second level', async () => {
    const user = userEvent.setup();
    const { container } = render(<BarChart x={X} y={Y} subX={subX} subY={subY} />);
    await user.click(bars(container)[2]);
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument();
  });
});
