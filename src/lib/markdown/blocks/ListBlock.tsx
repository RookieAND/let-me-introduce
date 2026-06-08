import { parseInline } from "#/lib/markdown/parseInline";
import type { ListItem } from "#/lib/markdown/types";

interface UlProps {
  items: ListItem[];
}

export function UnorderedListBlock({ items }: UlProps) {
  return (
    <ul className="mb-5 space-y-1.5">
      {items.map((item, j) => {
        const ml = item.depth === 1 ? "ml-5" : item.depth >= 2 ? "ml-10" : "";
        const bullet =
          item.depth === 0 ? (
            <span className="text-accent shrink-0 mt-[0.55em] text-[10px]">◆</span>
          ) : (
            <span className="text-text-3 shrink-0 mt-[0.6em] text-[9px]">◇</span>
          );
        return (
          <li key={j} className={`flex gap-3 font-sans text-[16px] leading-[1.75] text-text ${ml}`}>
            {bullet}
            <span>{parseInline(item.text)}</span>
          </li>
        );
      })}
    </ul>
  );
}

interface OlProps {
  items: ListItem[];
}

export function OrderedListBlock({ items }: OlProps) {
  return (
    <ol className="mb-5 space-y-2 list-none">
      {items.map((item, j) => (
        <li key={j} className="flex gap-3 font-sans text-[16px] leading-[1.75] text-text">
          <span className="font-mono text-[12px] text-accent-bright shrink-0 mt-[0.3em] w-5 text-right">
            {item.num ?? j + 1}.
          </span>
          <span>{parseInline(item.text)}</span>
        </li>
      ))}
    </ol>
  );
}
