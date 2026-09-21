/**
 * The page the visual parity test drives. It renders one chart of each library,
 * with the same data, in two boxes of the same width. Nothing else is on the
 * page, so a screenshot of one box holds the drawing and nothing more.
 */
import { createRoot } from 'react-dom/client';
import '@gouvfr/dsfr/dist/dsfr.min.css';
import '@gouvfr/dsfr-chart/PieChart/css';
import '@gouvfr/dsfr-chart/PieChart';
import '../src/styles/colors.generated.css';
import '../src/styles/chart.css';
import { PieChart, type Palette } from '../src/index.js';
import { doughnut, pie } from './data.js';

const CASES = { doughnut, pie };

const parameters = new URLSearchParams(location.search);
const data = CASES[(parameters.get('case') as keyof typeof CASES) ?? 'doughnut'] ?? doughnut;
const palette = (parameters.get('palette') ?? '') as Palette | '';
const theme = parameters.get('theme') === 'dark' ? 'dark' : 'light';

document.documentElement.setAttribute('data-fr-theme', theme);
document.documentElement.setAttribute('data-fr-scheme', theme);

createRoot(document.getElementById('ours')!).render(<PieChart {...data} selectedPalette={palette || undefined} />);

const theirs = document.createElement('pie-chart');
theirs.setAttribute('x', JSON.stringify([data.x]));
theirs.setAttribute('y', JSON.stringify([data.y]));
theirs.setAttribute('name', JSON.stringify(data.name));
if ('fill' in data && data.fill) theirs.setAttribute('fill', 'true');
if (palette) theirs.setAttribute('selected-palette', palette);
document.getElementById('theirs')!.appendChild(theirs);
