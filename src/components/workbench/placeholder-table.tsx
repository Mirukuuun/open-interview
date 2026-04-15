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
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-border)]",
        className,
      )}
    >
      <table className="min-w-full border-collapse text-left text-[13px]">
        <thead className="bg-[color:var(--color-surface-muted)]">
          <tr>
            {columns.map((column) => (
              <th
                className="border-b border-[color:var(--color-border)] px-3 py-2 font-mono text-[11px] text-[color:var(--color-muted-foreground)]"
                key={column}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-[color:var(--color-surface)]">
          {rows.map((row, index) => (
            <tr
              className="border-b border-[color:var(--color-border)] last:border-b-0"
              key={`${row[0]}-${index}`}
            >
              {row.map((cell, cellIndex) => (
                <td
                  className={cn(
                    "px-3 py-2 align-top text-[color:var(--color-foreground)]",
                    cellIndex > 0 && "text-[color:var(--color-muted-foreground)]",
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
