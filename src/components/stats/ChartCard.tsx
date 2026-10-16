import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  /** Wat wordt precies gemeten (eenheid en definitie): voorkomt dat gewicht en volume door elkaar lopen. */
  description?: string;
  isEmpty: boolean;
  emptyMessage?: string;
  children: ReactNode;
  tableHeaders: string[];
  tableRows: (string | number)[][];
  actions?: ReactNode;
}

/** Sectie met titel, definitie, grafiek en een uitklapbare tabel met dezelfde gegevens (toegankelijk alternatief). */
export function ChartCard({
  title,
  description,
  isEmpty,
  emptyMessage = "Geen gegevens voor deze selectie.",
  children,
  tableHeaders,
  tableRows,
  actions,
}: ChartCardProps) {
  return (
    <section className="p-5 rounded-2xl gradient-card border border-border space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>

      {isEmpty ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
      ) : (
        <>
          {children}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none hover:text-foreground">Toon gegevens als tabel</summary>
            <div className="mt-2 overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    {tableHeaders.map((h) => (
                      <th key={h} className="py-1 pr-4 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => (
                    <tr key={i} className="border-b border-border/40">
                      {row.map((cell, j) => (
                        <td key={j} className="py-1 pr-4 text-foreground">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
