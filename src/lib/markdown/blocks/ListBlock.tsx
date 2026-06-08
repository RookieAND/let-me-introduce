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
    <ol className="mb-5 space-y-3 list-none">
      {items.map((item, j) => (
        <li key={j} className="flex flex-col gap-2 rounded-[8px] bg-surface px-4 py-3 border border-border font-sans text-[16px] leading-[1.75] text-text-2">
          <div className="flex items-baseline gap-3">
            {/* Number badge */}
            <span className="inline-flex items-center justify-center shrink-0 w-[22px] h-[22px] rounded-full bg-accent/15 font-mono font-bold text-[11px] text-accent-bright translate-y-[1px]">
              {item.num ?? j + 1}
            </span>
            <span className="font-medium text-text">{parseInline(item.text)}</span>
          </div>
          {item.subItems && item.subItems.length > 0 && (
            <ul className="ml-[34px] space-y-1.5 border-l border-border pl-4">
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
