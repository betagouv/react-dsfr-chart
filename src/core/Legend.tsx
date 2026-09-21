import { capitalize } from './format.js';

export interface LegendItem {
  label: string;
  color: string;
}

export interface LegendProps {
  items: LegendItem[];
  /** The "Mise à jour" date of the chart. */
  date?: string;
}

/**
 * The legend of @gouvfr/dsfr-chart, as a list. The upstream uses `div`
 * elements, which give a screen reader no count and no item boundary.
 */
export function Legend({ items, date }: LegendProps) {
  return (
    <div className="chart_legend fr-mb-0 fr-mt-4v">
      <ul className="chart_legend_list">
        {items.map((item, index) => (
          <li className="flex fr-mt-3v fr-mb-1v" key={index}>
            <span className="legend_dot" style={{ backgroundColor: item.color }} />
            <p className="fr-text--sm fr-text--bold fr-ml-1w fr-mb-0">{capitalize(item.label)}</p>
          </li>
        ))}
      </ul>
      {date ? (
        <div className="flex fr-mt-1w">
          <p className="fr-text--xs fr-mb-0">Mise à jour : {date}</p>
        </div>
      ) : null}
    </div>
  );
}
