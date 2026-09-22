export interface SubChartHeaderProps {
  /** The title of the second level, or `null` while the first one shows. */
  title: string | null;
  onBack: () => void;
}

/**
 * The "Retour" button and the sub-title a chart with a second level carries,
 * as src/components/{Pie,Bar}Chart.vue of @gouvfr/dsfr-chart draw them.
 */
export function SubChartHeader({ title, onBack }: SubChartHeaderProps) {
  return (
    <div className={title === null ? 'fr-mt-6v' : ''} style={{ textAlign: 'center', position: 'relative' }}>
      {title !== null ? (
        <button type="button" className="fr-btn fr-btn--sm fr-icon-arrow-go-back-fill fr-btn--icon-left fr-btn--tertiary-no-outline fr-ml-4w" style={{ position: 'absolute', left: 0 }} onClick={onBack}>
          Retour
        </button>
      ) : null}
      {title !== null ? <p className="fr-mb-0">{title}</p> : null}
    </div>
  );
}
