import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PieChart } from '../src/PieChart/index.js';

const X = ['Emplois à durée indéterminée', 'Non-salariés', 'Contrats à durée déterminée'];
const Y = [74.8, 11.7, 13.5];

const paths = (container: HTMLElement): SVGPathElement[] => Array.from(container.querySelectorAll('path'));

describe('PieChart', () => {
  it('draws one slice per value, at the measured size', () => {
    const { container } = render(<PieChart x={X} y={Y} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '400');
    expect(paths(container)).toHaveLength(3);
  });

  it('holds the height that `height` gives, whatever the width', () => {
    const { container } = render(<PieChart x={X} y={Y} height={250} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '250');
  });

  it('labels the drawing for a screen reader', () => {
    render(<PieChart x={X} y={Y} />);
    expect(screen.getByRole('img', { name: 'Diagramme circulaire' })).toBeInTheDocument();
  });

  it('accepts its own label', () => {
    render(<PieChart x={X} y={Y} ariaLabel="Répartition de l’emploi" />);
    expect(screen.getByRole('img', { name: 'Répartition de l’emploi' })).toBeInTheDocument();
  });

  it('draws a doughnut by default and a pie when fill is set', () => {
    const { container, rerender } = render(<PieChart x={X} y={Y} />);
    // A doughnut slice starts on its outer edge; a pie slice starts at the centre.
    expect(paths(container)[0].getAttribute('d')).not.toMatch(/^M 400 200 L/);
    rerender(<PieChart x={X} y={Y} fill />);
    expect(paths(container)[0].getAttribute('d')).toMatch(/^M 400 200 L/);
  });

  it('redraws when the values change', () => {
    const { container, rerender } = render(<PieChart x={X} y={Y} />);
    const before = paths(container).map((path) => path.getAttribute('d'));
    rerender(<PieChart x={X} y={[1, 1, 1]} />);
    expect(paths(container).map((path) => path.getAttribute('d'))).not.toEqual(before);
  });

  it('skips a slice whose value is zero', () => {
    const { container } = render(<PieChart x={X} y={[50, 0, 50]} />);
    expect(paths(container)).toHaveLength(2);
  });

  it('names the legend entries "Série n" when no name is given', () => {
    render(<PieChart x={X} y={Y} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Série 1', 'Série 2', 'Série 3']);
  });

  it('uses the given names, with a capital first letter', () => {
    render(<PieChart x={X} y={Y} name={['emplois', 'non-salariés', 'contrats']} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Emplois', 'Non-salariés', 'Contrats']);
  });

  it('shows the update date under the legend', () => {
    render(<PieChart x={X} y={Y} date="31 décembre 2025" />);
    expect(screen.getByText('Mise à jour : 31 décembre 2025')).toBeInTheDocument();
  });

  it('puts the data in a table for a screen reader', () => {
    render(<PieChart x={X} y={Y} unitTooltip="%" />);
    const table = screen.getByRole('table', { name: 'Diagramme circulaire' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(X);
    // The first cell of the header row is the empty corner of the table.
    expect(within(table).getAllByRole('cell').map((cell) => cell.textContent).slice(1)).toEqual(['74,8', '11,7', '13,5']);
    expect(within(table).getByRole('rowheader')).toHaveTextContent('%');
  });

  it('opens the tooltip on hover and closes it on leave', async () => {
    const user = userEvent.setup();
    const { container } = render(<PieChart x={X} y={Y} unitTooltip="%" />);
    const tooltip = container.querySelector('.tooltip') as HTMLElement;
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');

    await user.hover(paths(container)[1]);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(tooltip).toHaveTextContent('Non-salariés');
    expect(tooltip).toHaveTextContent('11,7 %');

    await user.unhover(paths(container)[1]);
    await user.pointer({ target: container.querySelector('svg')! });
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens the tooltip on focus', () => {
    const { container } = render(<PieChart x={X} y={Y} />);
    const tooltip = container.querySelector('.tooltip') as HTMLElement;
    fireEvent.focus(paths(container)[0]);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(tooltip).toHaveTextContent('Emplois à durée indéterminée');
  });

  it('colours the slices with the categorical palette by default', () => {
    const { container } = render(<PieChart x={X} y={Y} />);
    expect(paths(container).map((path) => path.getAttribute('fill'))).toEqual(['var(--rdc-01)', 'var(--rdc-02)', 'var(--rdc-03)']);
  });

  it('mixes two stops of a sequential palette', () => {
    const { container } = render(<PieChart x={X} y={Y} selectedPalette="sequentialAscending" />);
    const fills = paths(container).map((path) => path.getAttribute('fill')!);
    expect(fills[0]).toBe('var(--rdc-seq-0)');
    expect(fills[1]).toMatch(/^color-mix\(in srgb, var\(--rdc-seq-\d\) [\d.]+%, var\(--rdc-seq-\d\)\)$/);
  });

  it('disconnects the resize observer when it unmounts', () => {
    const observers = (globalThis as { TestResizeObserver?: { instances: { disconnected: boolean }[] } }).TestResizeObserver!.instances;
    const before = observers.length;
    const { unmount } = render(<PieChart x={X} y={Y} />);
    expect(observers.length).toBe(before + 1);
    unmount();
    expect(observers[before].disconnected).toBe(true);
  });

  it('paints a slice with the colour the colors prop gives', () => {
    const { container } = render(<PieChart x={X} y={Y} colors={['#ff0000', 'var(--mine)', 'rebeccapurple']} />);
    expect(paths(container).map((path) => path.getAttribute('fill'))).toEqual([
      'var(--rdc-custom-0)',
      'var(--rdc-custom-1)',
      'var(--rdc-custom-2)',
    ]);
    const wrapper = container.querySelector('.rdc') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--rdc-custom-0')).toBe('#ff0000');
    expect(wrapper.style.getPropertyValue('--rdc-custom-2')).toBe('rebeccapurple');
  });

  it('keeps the palette for a slice the colors prop leaves out or writes badly', () => {
    const plain = render(<PieChart x={X} y={Y} />);
    const custom = render(<PieChart x={X} y={Y} colors={[undefined, 'url(https://example.com/x.png)', '#00ff00']} />);
    const palette = paths(plain.container).map((path) => path.getAttribute('fill'));
    expect(paths(custom.container).map((path) => path.getAttribute('fill'))).toEqual([palette[0], palette[1], 'var(--rdc-custom-2)']);
  });

  it('colours the legend and the tooltip like the slice', async () => {
    const user = userEvent.setup();
    const { container } = render(<PieChart x={X} y={Y} colors={['#ff0000']} />);
    const dot = container.querySelector('.legend_dot') as HTMLElement;
    expect(dot.style.backgroundColor).toBe('var(--rdc-custom-0)');
    await user.hover(paths(container)[0]);
    const tooltipDot = container.querySelector('.tooltip_dot') as HTMLElement;
    expect(tooltipDot.style.backgroundColor).toBe('var(--rdc-custom-0)');
  });

  it('darkens a custom slice on hover with a filter, and keeps its colour', async () => {
    const user = userEvent.setup();
    const { container } = render(<PieChart x={X} y={Y} colors={['#ff0000']} />);
    const [first, second] = paths(container);
    await user.hover(first);
    expect(first).toHaveClass('rdc-hover--darken');
    expect(first.getAttribute('fill')).toBe('var(--rdc-custom-0)');
    await user.hover(second);
    expect(first).not.toHaveClass('rdc-hover--darken');
    expect(second).not.toHaveClass('rdc-hover--darken');
  });
});

describe('PieChart with a second level', () => {
  const subX = [['Cadres', 'Employés'], ['Artisans'], []];
  const subY = [[40, 34.8], [11.7], []];

  it('shows no "Retour" button before a drill-down', () => {
    render(<PieChart x={X} y={Y} subX={subX} subY={subY} />);
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument();
  });

  it('opens the second level on a click, then returns to the first one', async () => {
    const user = userEvent.setup();
    const { container } = render(<PieChart x={X} y={Y} subX={subX} subY={subY} />);

    await user.click(paths(container)[0]);
    expect(paths(container)).toHaveLength(2);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Cadres', 'Employés']);
    expect(screen.getByText(X[0])).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(paths(container)).toHaveLength(3);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Série 1', 'Série 2', 'Série 3']);
  });

  it('gives the second level the palette, never the colors prop', async () => {
    const user = userEvent.setup();
    const plain = render(<PieChart x={X} y={Y} subX={subX} subY={subY} />);
    const custom = render(<PieChart x={X} y={Y} subX={subX} subY={subY} colors={['#ff0000', '#00ff00']} />);
    await user.click(paths(plain.container)[0]);
    await user.click(paths(custom.container)[0]);
    expect(paths(custom.container).map((path) => path.getAttribute('fill'))).toEqual(
      paths(plain.container).map((path) => path.getAttribute('fill')),
    );
  });

  it('opens the second level with the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(<PieChart x={X} y={Y} subX={subX} subY={subY} />);
    act(() => paths(container)[0].focus());
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Retour' })).toBeInTheDocument();
  });

  it('ignores a slice that has no second level', async () => {
    const user = userEvent.setup();
    const { container } = render(<PieChart x={X} y={Y} subX={subX} subY={subY} />);
    await user.click(paths(container)[2]);
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument();
  });
});
