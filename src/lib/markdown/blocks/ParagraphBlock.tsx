import { parseInline } from "#/lib/markdown/parseInline";

interface Props {
  text: string;
}

export function ParagraphBlock({ text }: Props) {
  return (
    <p className="font-sans text-[16px] leading-[1.9] text-text-2 mb-5 last:mb-0">
      {parseInline(text)}
    </p>
  );
}
