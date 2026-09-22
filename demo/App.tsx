import { useEffect, useState } from 'react';
import { BarChart, LineChart, PieChart, type Palette } from '../src/index.js';
import { barHorizontal, barSequential, barStacked, barUnicolor, barVertical, doughnut, drilldown, lineDefault, lineMultiple, pie } from './data.js';

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
      <Case
        title="Barres verticales"
        ours={<BarChart {...barVertical} selectedPalette={palette || barVertical.selectedPalette} />}
        theirs={<bar-chart x={JSON.stringify([barVertical.x])} y={JSON.stringify(barVertical.y)} name={JSON.stringify(barVertical.name)} unit-tooltip={barVertical.unitTooltip} selected-palette={palette || barVertical.selectedPalette} />}
      />

      <Case
        title="Barres avec mise en avant"
        ours={<BarChart {...barUnicolor} selectedPalette={palette || barUnicolor.selectedPalette} />}
        theirs={
          <bar-chart
            x={JSON.stringify([barUnicolor.x])}
            y={JSON.stringify(barUnicolor.y)}
            name={JSON.stringify(barUnicolor.name)}
            unit-tooltip={barUnicolor.unitTooltip}
            selected-palette={palette || barUnicolor.selectedPalette}
            highlight-index={JSON.stringify(barUnicolor.highlightIndex)}
          />
        }
      />

      <Case
        title="Barres, palette séquentielle et étiquettes longues"
        ours={<BarChart {...barSequential} selectedPalette={palette || barSequential.selectedPalette} />}
        theirs={<bar-chart x={JSON.stringify([barSequential.x])} y={JSON.stringify(barSequential.y)} name={JSON.stringify(barSequential.name)} unit-tooltip={barSequential.unitTooltip} selected-palette={palette || barSequential.selectedPalette} />}
      />

      <Case
        title="Barres horizontales"
        ours={<BarChart {...barHorizontal} selectedPalette={palette || undefined} />}
        theirs={<bar-chart x={JSON.stringify([barHorizontal.x])} y={JSON.stringify(barHorizontal.y)} name={JSON.stringify(barHorizontal.name)} unit-tooltip={barHorizontal.unitTooltip} horizontal="true" bar-size="20" selected-palette={palette} />}
      />

      <Case
        title="Barres empilées"
        ours={<BarChart {...barStacked} selectedPalette={palette || undefined} />}
        theirs={<bar-chart x={JSON.stringify([barStacked.x])} y={JSON.stringify(barStacked.y)} name={JSON.stringify(barStacked.name)} unit-tooltip={barStacked.unitTooltip} stacked="true" selected-palette={palette} />}
      />

      <Case
        title="Ligne"
        ours={<LineChart {...lineDefault} selectedPalette={palette || lineDefault.selectedPalette} />}
        theirs={<line-chart x={JSON.stringify([lineDefault.x])} y={JSON.stringify(lineDefault.y)} name={JSON.stringify(lineDefault.name)} unit-tooltip={lineDefault.unitTooltip} selected-palette={palette || lineDefault.selectedPalette} />}
      />

      <Case
        title="Lignes multiples"
        ours={<LineChart {...lineMultiple} selectedPalette={palette || undefined} />}
        theirs={<line-chart x={JSON.stringify([lineMultiple.x, lineMultiple.x])} y={JSON.stringify(lineMultiple.y)} name={JSON.stringify(lineMultiple.name)} unit-tooltip={lineMultiple.unitTooltip} selected-palette={palette} />}
      />

      <Case
        title="Aire (extension absente de la version amont)"
        ours={<LineChart {...lineDefault} fill selectedPalette={palette || lineDefault.selectedPalette} />}
        theirs={<p className="fr-text--sm">La version amont n’a pas d’option d’aire.</p>}
      />
    </main>
  );
}
