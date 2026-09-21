export interface DataTableProps {
  caption: string;
  /** The header of every column, after the first one. */
  columns: string[];
  rows: { header: string; cells: string[] }[];
}

/**
 * The data of the chart, for a screen reader. @gouvfr/dsfr-chart offers no
 * such table: the canvas carries a label and nothing else.
 */
export function DataTable({ caption, columns, rows }: DataTableProps) {
  return (
    <table className="fr-sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <td />
          {columns.map((column, index) => (
            <th scope="col" key={index}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <th scope="row">{row.header}</th>
            {row.cells.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
