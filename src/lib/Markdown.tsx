import { tokenize } from "./markdown/tokenize";
import { renderBlock } from "./markdown/renderBlock";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = tokenize(content);
  return <div>{blocks.map((b, i) => renderBlock(b, i))}</div>;
}
