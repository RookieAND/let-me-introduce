import { parseInline } from "#/lib/markdown/parseInline";

interface Props {
  lines: string[];
}

export function QuoteBlock({ lines }: Props) {
  return (
    <blockquote className="border-l-2 border-accent pl-5 my-6 text-text-2 italic space-y-1">
      {lines.map((l, j) => (
        <p key={j} className="font-sans text-[15.5px] leading-[1.75]">
          {parseInline(l)}
        </p>
      ))}
    </blockquote>
  );
}
