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
          <li key={j} className={`flex gap-3 font-sans text-[16px] leading-[1.75] text-text-2 ${ml}`}>
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
    <ol className="mb-5 space-y-2.5 list-none">
      {items.map((item, j) => (
        <li key={j} className="font-sans text-[16px] leading-[1.75] text-text-2">
          <div className="flex gap-3">
            <span className="font-mono text-[12px] text-accent-bright shrink-0 mt-[0.3em] w-5 text-right">
              {item.num ?? j + 1}.
            </span>
            <span>{parseInline(item.text)}</span>
          </div>
          {item.subItems && item.subItems.length > 0 && (
            <ul className="mt-1.5 ml-8 space-y-1">
              {item.subItems.map((sub, k) => (
                <li key={k} className="flex gap-2.5 font-sans text-[15px] leading-[1.75] text-text-2/80">
                  <span className="text-text-3 shrink-0 mt-[0.6em] text-[9px]">◇</span>
                  <span>{parseInline(sub.text)}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
