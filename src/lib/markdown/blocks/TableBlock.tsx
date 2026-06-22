import { parseInline } from "#/lib/markdown/parseInline";

interface Props {
  headers: string[];
  rows: string[][];
}

export function TableBlock({ headers, rows }: Props) {
  return (
    <div className="my-7 w-full overflow-x-auto rounded-chip border border-border">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-strong">
            {headers.map((h, j) => (
              <th
                key={j}
                className="bg-surface-2 px-4 py-3 font-mono text-[11.5px] tracking-[0.06em] uppercase text-text-3 whitespace-nowrap first:rounded-tl-btn last:rounded-tr-btn"
              >
                {parseInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, j) => (
            <tr
              key={j}
              className="border-b border-border last:border-0 transition-colors duration-100 hover:bg-surface-2/60"
            >
              {row.map((cell, k) => (
                <td key={k} className="px-4 py-3 font-sans text-[14px] leading-[1.75] text-text-2">
                  {parseInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
