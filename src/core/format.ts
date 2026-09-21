/** Port of `formatNumber` of @gouvfr/dsfr-chart src/utils/global.js. */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (isNaN(value as number)) return String(value);
  if (Number.isInteger(value)) return parseInt(value as string).toLocaleString('fr-FR');
  return parseFloat(value as string).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/** Port of `capitalize` of @gouvfr/dsfr-chart src/utils/global.js. */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
