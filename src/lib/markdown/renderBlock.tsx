import type { ReactNode } from "react";
import type { Block, CalloutType } from "./types";
import { parseInline } from "./parseInline";
import { MermaidBlock } from "./MermaidBlock";

const H_CLASS: Record<number, string> = {
  1: "font-display font-semibold text-[clamp(26px,3.5vw,36px)] leading-[1.2] tracking-[-0.02em] text-text mt-14 mb-5 first:mt-0",
  2: "font-display font-semibold text-[clamp(20px,2.8vw,26px)] leading-[1.3] tracking-[-0.015em] text-text mt-11 mb-4 first:mt-0",
  3: "font-sans font-bold text-[19px] leading-[1.4] tracking-[-0.01em] text-text mt-8 mb-3",
  4: "font-sans font-semibold text-[17px] leading-[1.45] text-text mt-6 mb-2.5",
  5: "font-sans font-semibold text-[15px] text-text mt-5 mb-2",
  6: "font-sans font-medium text-[14px] text-text-2 mt-4 mb-2",
};

const CALLOUT_CONFIG: Record<
  CalloutType,
  { icon: string; label: string; bg: string; border: string; title: string; text: string }
> = {
  note:      { icon: "📝", label: "Note",      bg: "bg-blue-500/8",   border: "border-blue-400/40",   title: "text-blue-300",   text: "text-blue-200/80"  },
  tip:       { icon: "💡", label: "Tip",       bg: "bg-green-500/8",  border: "border-green-400/40",  title: "text-green-300",  text: "text-green-200/80" },
  warning:   { icon: "⚠️",  label: "Warning",   bg: "bg-amber-500/8",  border: "border-amber-400/40",  title: "text-amber-300",  text: "text-amber-200/80" },
  important: { icon: "🔥", label: "Important", bg: "bg-purple-500/8", border: "border-purple-400/40", title: "text-purple-300", text: "text-purple-200/80" },
  caution:   { icon: "🚨", label: "Caution",   bg: "bg-red-500/8",    border: "border-red-400/40",    title: "text-red-300",    text: "text-red-200/80"   },
};

export function renderBlock(block: Block, idx: number): ReactNode {
  switch (block.kind) {
    case "h": {
      const Tag = `h${block.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Tag key={idx} className={H_CLASS[block.level]}>
          {parseInline(block.text)}
        </Tag>
      );
    }

    case "p":
      return (
        <p key={idx} className="font-sans text-[16px] leading-[1.9] text-text-2 mb-5 last:mb-0">
          {parseInline(block.text)}
        </p>
      );

    case "code":
      if (block.lang === "mermaid") {
        return <MermaidBlock key={idx} code={block.body} />;
      }
      return (
        <div key={idx} className="mb-6 rounded-[12px] overflow-hidden border border-border">
          {block.lang && (
            <div className="px-4 py-2 bg-surface-2 border-b border-border font-mono text-[11px] text-text-3 tracking-[0.06em] uppercase">
              {block.lang}
            </div>
          )}
          <pre className="p-5 bg-surface overflow-x-auto">
            <code className="font-mono text-[13px] leading-[1.75] text-[#c9d1d9] block">
              {block.body}
            </code>
          </pre>
        </div>
      );

    case "quote":
      return (
        <blockquote
          key={idx}
          className="border-l-2 border-accent pl-5 my-6 text-text-2 italic space-y-1"
        >
          {block.lines.map((l, j) => (
            <p key={j} className="font-sans text-[15.5px] leading-[1.75]">
              {parseInline(l)}
            </p>
          ))}
        </blockquote>
      );

    case "callout": {
      const cfg = CALLOUT_CONFIG[block.calloutType];
      return (
        <div
          key={idx}
          className={`${cfg.bg} border ${cfg.border} rounded-[10px] px-5 py-4 my-6`}
        >
          <div className={`flex items-center gap-2 font-sans font-semibold text-[13px] tracking-[0.04em] uppercase mb-2 ${cfg.title}`}>
            <span>{cfg.icon}</span>
            <span>{cfg.label}</span>
          </div>
          <div className={`space-y-1 ${cfg.text}`}>
            {block.lines.map((l, j) => (
              <p key={j} className="font-sans text-[15px] leading-[1.75]">
                {parseInline(l)}
              </p>
            ))}
          </div>
        </div>
      );
    }

    case "ul":
      return (
        <ul key={idx} className="mb-5 space-y-2">
          {block.items.map((item, j) => (
            <li key={j} className="flex gap-3 font-sans text-[16px] leading-[1.75] text-text-2">
              <span className="text-accent shrink-0 mt-[0.55em] text-[10px]">◆</span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "ol":
      return (
        <ol key={idx} className="mb-5 space-y-2 list-none">
          {block.items.map((item, j) => (
            <li key={j} className="flex gap-3 font-sans text-[16px] leading-[1.75] text-text-2">
              <span className="font-mono text-[12px] text-accent-bright shrink-0 mt-[0.3em] w-5 text-right">
                {j + 1}.
              </span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );

    case "hr":
      return <hr key={idx} className="border-0 border-t border-border my-10" />;

    case "img":
      return (
        <figure key={idx} className="my-8">
          <img
            src={block.src}
            alt={block.alt}
            className="w-full rounded-[12px] border border-border"
          />
          {block.alt && (
            <figcaption className="text-center font-mono text-[11.5px] text-text-3 mt-3">
              {block.alt}
            </figcaption>
          )}
        </figure>
      );
  }
}
