import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BarChart } from '../src/BarChart/index.js';
import { plot } from '../src/core/plot.js';

// `plot` carries the whole of the layout work. Counting its calls tells a
// render that rebuilt the chart from one that reused what it already had.
vi.mock('../src/core/plot.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/core/plot.js')>();
  return { ...actual, plot: vi.fn(actual.plot) };
});

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

  it('holds the height that `height` gives, whatever the width', () => {
    const { container } = render(<BarChart x={X} y={Y} height={250} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '250');
  });

  it('takes the height of a horizontal chart from the number of categories', () => {
    const { container } = render(<BarChart x={X} y={Y} horizontal categorySize={40} />);
    expect(container.querySelector('svg')).toHaveAttribute('height', '120');

    const six = render(<BarChart x={[...X, '2030', '2040', '2050']} y={[[1, 2, 3, 4, 5, 6]]} horizontal categorySize={40} />);
    expect(six.container.querySelector('svg')).toHaveAttribute('height', '240');
  });

  it('gives the second level of a horizontal chart the height of its own categories', () => {
    const { container } = render(
      <BarChart x={X} y={Y} subX={[['A', 'B'], [], []]} subY={[[1, 2], [], []]} horizontal categorySize={40} />,
    );
    fireEvent.click(bars(container)[0]);
    expect(container.querySelector('svg')).toHaveAttribute('height', '80');
  });

  it('ignores `categorySize` on a vertical chart, whose categories follow the width', () => {
    const { container } = render(<BarChart x={X} y={Y} categorySize={40} />);
    expect(container.querySelector('svg')).toHaveAttribute('height', '400');
  });

  it('gives `height` precedence over `categorySize`', () => {
    const { container } = render(<BarChart x={X} y={Y} horizontal categorySize={40} height={300} />);
    expect(container.querySelector('svg')).toHaveAttribute('height', '300');
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

  it('drops the value labels that do not fit along the bottom of a horizontal chart', () => {
    const regions = ['Nouvelle-Aquitaine', 'Auvergne-Rhône-Alpes', 'Provence-Alpes-Côte d’Azur'];
    // A short and wide plot: eleven labels of a billion each do not fit along it.
    const { container } = render(<BarChart x={regions} y={[[2e9, 6e9, 1e10]]} horizontal aspectRatio={8} />);
    const drawn = ticks(container)
      .filter((label) => !regions.includes(label))
      .map((label) => Number(label.replace(/\D/g, '')));
    expect(drawn).toEqual([0, 2e9, 4e9, 6e9, 8e9, 1e10]);
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

  it('paints every bar of a series with the colour the colors prop gives', () => {
    const { container } = render(<BarChart x={X} y={[Y[0], [5, 6, 7]]} colors={['#ff0000', 'var(--mine)']} />);
    expect(bars(container).map((bar) => bar.getAttribute('fill'))).toEqual([
      'var(--rdc-custom-0)',
      'var(--rdc-custom-0)',
      'var(--rdc-custom-0)',
      'var(--rdc-custom-1)',
      'var(--rdc-custom-1)',
      'var(--rdc-custom-1)',
    ]);
    const wrapper = container.querySelector('.rdc') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--rdc-custom-0')).toBe('#ff0000');
  });

  it('keeps the palette for a series the colors prop leaves out or writes badly', () => {
    const plain = render(<BarChart x={X} y={[Y[0], [5, 6, 7]]} />);
    const custom = render(<BarChart x={X} y={[Y[0], [5, 6, 7]]} colors={['url(https://example.com/x.png)', '#00ff00']} />);
    const palette = bars(plain.container).map((bar) => bar.getAttribute('fill'));
    const painted = bars(custom.container).map((bar) => bar.getAttribute('fill'));
    expect(painted.slice(0, 3)).toEqual(palette.slice(0, 3));
    expect(painted.slice(3)).toEqual(['var(--rdc-custom-1)', 'var(--rdc-custom-1)', 'var(--rdc-custom-1)']);
  });

  it('colours the legend like the bars, and darkens a custom bar on hover with a filter', async () => {
    const user = userEvent.setup();
    const { container } = render(<BarChart x={X} y={Y} colors={['#ff0000']} />);
    const dot = container.querySelector('.legend_dot') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('var(--rdc-custom-0)');
    const first = bars(container)[0];
    await user.hover(first);
    expect(first).toHaveClass('rdc-hover--darken');
    expect(first.getAttribute('fill')).toBe('var(--rdc-custom-0)');
  });
});

describe('BarChart with a second level', () => {
  const subX = [['Janvier', 'Février'], ['Mars'], []];
  const subY = [[6, 5.1], [10.5], []];

  it('gives the second level the palette, never the colors prop', async () => {
    const user = userEvent.setup();
    const plain = render(<BarChart x={X} y={Y} subX={subX} subY={subY} />);
    const custom = render(<BarChart x={X} y={Y} subX={subX} subY={subY} colors={['#ff0000']} />);
    await user.click(bars(plain.container)[0]);
    await user.click(bars(custom.container)[0]);
    expect(bars(custom.container).map((bar) => bar.getAttribute('fill'))).toEqual(
      bars(plain.container).map((bar) => bar.getAttribute('fill')),
    );
  });

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

  it('draws the second level again only when something changes', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<BarChart x={X} y={Y} subX={subX} subY={subY} />);
    await user.click(bars(container)[0]);

    vi.mocked(plot).mockClear();
    rerender(<BarChart x={X} y={Y} subX={subX} subY={subY} />);
    expect(plot).not.toHaveBeenCalled();
  });

  it('ignores a category that has no second level', async () => {
    const user = userEvent.setup();
    const { container } = render(<BarChart x={X} y={Y} subX={subX} subY={subY} />);
    await user.click(bars(container)[2]);
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument();
  });
});
