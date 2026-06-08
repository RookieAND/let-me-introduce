import type { ReactNode } from "react";
import { CalloutBlock } from "./blocks/CalloutBlock";
import { CodeBlock } from "./blocks/CodeBlock";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { OrderedListBlock, UnorderedListBlock } from "./blocks/ListBlock";
import { ParagraphBlock } from "./blocks/ParagraphBlock";
import { QuoteBlock } from "./blocks/QuoteBlock";
import { TableBlock } from "./blocks/TableBlock";
import type { Block } from "./types";

export function renderBlock(block: Block, idx: number): ReactNode {
  switch (block.kind) {
    case "h":
      return <HeadingBlock key={idx} level={block.level} text={block.text} />;
    case "p":
      return <ParagraphBlock key={idx} text={block.text} />;
    case "code":
      return <CodeBlock key={idx} lang={block.lang} body={block.body} />;
    case "quote":
      return <QuoteBlock key={idx} lines={block.lines} />;
    case "callout":
      return <CalloutBlock key={idx} calloutType={block.calloutType} lines={block.lines} />;
    case "ul":
      return <UnorderedListBlock key={idx} items={block.items} />;
    case "ol":
      return <OrderedListBlock key={idx} items={block.items} />;
    case "table":
      return <TableBlock key={idx} headers={block.headers} rows={block.rows} />;
    case "hr":
      return <hr key={idx} className="border-0 border-t border-border my-10" />;
    case "img":
      return <ImageBlock key={idx} src={block.src} alt={block.alt} />;
  }
}
