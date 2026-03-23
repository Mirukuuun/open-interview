import { cn } from "@/lib/utils";

type PlaceholderTableProps = {
  columns: string[];
  rows: Array<string[]>;
  className?: string;
};

export function PlaceholderTable({
  columns,
  rows,
  className,
}: PlaceholderTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border-strong", className)}>
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-surface-muted">
          <tr>
            {columns.map((column) => (
              <th
                className="border-b border-border-strong px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted"
                key={column}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row, index) => (
            <tr className="border-b border-border-muted last:border-b-0" key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td
                  className={cn(
                    "px-4 py-3 align-top text-text-strong",
                    cellIndex > 0 && "text-text-muted",
                  )}
                  key={`${cell}-${cellIndex}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
