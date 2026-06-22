import type { ReactNode } from "react";
import { Text } from "#/components/ui/text";
import { parseInline } from "#/lib/markdown/parseInline";

interface Props {
  text: string;
}

export function ParagraphBlock({ text }: Props) {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];

  lines.forEach((line, idx) => {
    const isLast = idx === lines.length - 1;
    const hasBreak = line.endsWith("  ");
    nodes.push(parseInline(hasBreak ? line.slice(0, -2) : line));
    if (!isLast) {
      nodes.push(hasBreak ? <br key={idx} /> : " ");
    }
  });

  return (
    <Text variant="body1" color="muted" className="text-[16px] leading-[1.9] mb-5 last:mb-0">
      {nodes}
    </Text>
  );
}
