import { useEffect, useState } from 'react';
import { PieChart, type Palette } from '../src/index.js';
import { doughnut, drilldown, pie } from './data.js';

type Theme = 'light' | 'dark';

const PALETTES: (Palette | '')[] = ['', 'default', 'neutral', 'categorical', 'sequentialAscending', 'sequentialDescending', 'divergentAscending', 'divergentDescending'];

/** Sets the theme the way the DSFR does, so that both charts repaint. */
function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-fr-theme', theme);
    document.documentElement.setAttribute('data-fr-scheme', theme);
    document.documentElement.dispatchEvent(new CustomEvent('dsfr.theme', { detail: { theme } }));
  }, [theme]);
  return [theme, setTheme];
}

interface CaseProps {
  title: string;
  ours: React.ReactNode;
  theirs: React.ReactNode;
}

function Case({ title, ours, theirs }: CaseProps) {
  return (
    <section className="fr-mb-8w">
      <h2 className="fr-h4">{title}</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-lg-6">
          <h3 className="fr-h6">react-dsfr-chart (SVG)</h3>
          {ours}
        </div>
        <div className="fr-col-12 fr-col-lg-6">
          <h3 className="fr-h6">@gouvfr/dsfr-chart 2.1.1 (canvas)</h3>
          {theirs}
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [theme, setTheme] = useTheme();
  const [palette, setPalette] = useState<Palette | ''>('');

  return (
    <main className="fr-container fr-my-6w">
      <h1 className="fr-h3">react-dsfr-chart — comparaison avec @gouvfr/dsfr-chart</h1>

      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <div className="fr-col-12 fr-col-md-4">
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Thème</legend>
            <div className="fr-fieldset__content">
              {(['light', 'dark'] as Theme[]).map((value) => (
                <div className="fr-radio-group" key={value}>
                  <input type="radio" id={`theme-${value}`} name="theme" checked={theme === value} onChange={() => setTheme(value)} />
                  <label className="fr-label" htmlFor={`theme-${value}`}>
                    {value === 'light' ? 'Clair' : 'Sombre'}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-select-group">
            <label className="fr-label" htmlFor="palette">
              Palette
            </label>
            <select className="fr-select" id="palette" value={palette} onChange={(event) => setPalette(event.target.value as Palette | '')}>
              {PALETTES.map((value) => (
                <option value={value} key={value}>
                  {value || '(défaut)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Case
        title="Anneau"
        ours={<PieChart {...doughnut} selectedPalette={palette || undefined} />}
        theirs={<pie-chart x={JSON.stringify([doughnut.x])} y={JSON.stringify([doughnut.y])} name={JSON.stringify(doughnut.name)} unit-tooltip={doughnut.unitTooltip} selected-palette={palette} />}
      />

      <Case
        title="Camembert"
        ours={<PieChart {...pie} selectedPalette={palette || undefined} />}
        theirs={<pie-chart x={JSON.stringify([pie.x])} y={JSON.stringify([pie.y])} name={JSON.stringify(pie.name)} fill="true" unit-tooltip={pie.unitTooltip} selected-palette={palette} />}
      />

      <Case
        title="Anneau avec second niveau"
        ours={<PieChart {...drilldown} name={drilldown.x} selectedPalette={palette || undefined} date="21 septembre 2026" />}
        theirs={
          <pie-chart
            x={JSON.stringify([drilldown.x])}
            y={JSON.stringify([drilldown.y])}
            name={JSON.stringify(drilldown.x)}
            subx={JSON.stringify(drilldown.subX)}
            suby={JSON.stringify(drilldown.subY)}
            date="21 septembre 2026"
            selected-palette={palette}
          />
        }
      />
    </main>
  );
}
