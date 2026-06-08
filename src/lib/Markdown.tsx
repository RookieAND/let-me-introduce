import { renderBlock } from "./markdown/renderBlock";
import { tokenize } from "./markdown/tokenize";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = tokenize(content);
  return <div>{blocks.map((b, i) => renderBlock(b, i))}</div>;
}
