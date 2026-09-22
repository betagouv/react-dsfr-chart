/**
 * The page the visual parity tests drive. It renders one chart of each library,
 * with the same data, in two boxes of the same width. Nothing else is on the
 * page, so a screenshot of one box holds the drawing and nothing more.
 */
import { createRoot } from 'react-dom/client';
import '@gouvfr/dsfr/dist/dsfr.min.css';
import '@gouvfr/dsfr-chart/PieChart/css';
import '@gouvfr/dsfr-chart/PieChart';
import '@gouvfr/dsfr-chart/BarChart/css';
import '@gouvfr/dsfr-chart/BarChart';
import '@gouvfr/dsfr-chart/LineChart/css';
import '@gouvfr/dsfr-chart/LineChart';
import '../src/styles/colors.generated.css';
import '../src/styles/chart.css';
import { BarChart, LineChart, PieChart, type Palette } from '../src/index.js';
import { barHorizontal, barSequential, barStacked, barUnicolor, barVertical, doughnut, lineDefault, lineMultiple, pie } from './data.js';

const PIE = { doughnut, pie };
const BAR = { barVertical, barUnicolor, barSequential, barHorizontal, barStacked };
const LINE = { lineDefault, lineMultiple };

const parameters = new URLSearchParams(location.search);
const key = parameters.get('case') ?? 'doughnut';
const palette = (parameters.get('palette') ?? '') as Palette | '';
const theme = parameters.get('theme') === 'dark' ? 'dark' : 'light';

document.documentElement.setAttribute('data-fr-theme', theme);
document.documentElement.setAttribute('data-fr-scheme', theme);

const root = createRoot(document.getElementById('ours')!);
const theirs = document.getElementById('theirs')!;

/** The attributes the web component of the upstream expects, all as strings. */
function element(tag: string, attributes: Record<string, string | undefined>) {
  const node = document.createElement(tag);
  for (const [attribute, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== '') node.setAttribute(attribute, value);
  }
  theirs.appendChild(node);
}

if (key in PIE) {
  const data = PIE[key as keyof typeof PIE];
  root.render(<PieChart {...data} selectedPalette={palette || undefined} />);
  element('pie-chart', {
    x: JSON.stringify([data.x]),
    y: JSON.stringify([data.y]),
    name: JSON.stringify(data.name),
    fill: 'fill' in data && data.fill ? 'true' : undefined,
    'selected-palette': palette,
  });
} else if (key in BAR) {
  const data = BAR[key as keyof typeof BAR];
  const selected = palette || ('selectedPalette' in data ? data.selectedPalette : undefined);
  root.render(<BarChart {...data} selectedPalette={selected} />);
  element('bar-chart', {
    x: JSON.stringify([data.x]),
    y: JSON.stringify(data.y),
    name: JSON.stringify(data.name),
    'selected-palette': selected,
    stacked: 'stacked' in data && data.stacked ? 'true' : undefined,
    horizontal: 'horizontal' in data && data.horizontal ? 'true' : undefined,
    'bar-size': 'barSize' in data ? String(data.barSize) : undefined,
    'highlight-index': 'highlightIndex' in data ? JSON.stringify(data.highlightIndex) : undefined,
  });
} else {
  const data = LINE[key as keyof typeof LINE] ?? lineDefault;
  const selected = palette || ('selectedPalette' in data ? data.selectedPalette : undefined);
  root.render(<LineChart {...data} selectedPalette={selected} />);
  element('line-chart', {
    x: JSON.stringify(data.y.map(() => data.x)),
    y: JSON.stringify(data.y),
    name: JSON.stringify(data.name),
    'selected-palette': selected,
  });
}
