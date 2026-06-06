import type { ReactNode } from "react";

// ── Inline parser ──────────────────────────────────────────────────────────

const INLINE_RE = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[(.+?)\]\((.+?)\)|~~(.+?)~~/g;

function parseInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(INLINE_RE.source, "g");
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [, bold, italic, code, linkText, linkHref, strike] = match;

    if (bold !== undefined) {
      parts.push(
        <strong key={key++} className="font-semibold text-text">
          {bold}
        </strong>,
      );
    } else if (italic !== undefined) {
      parts.push(
        <em key={key++} className="italic">
          {italic}
        </em>,
      );
    } else if (code !== undefined) {
      parts.push(
        <code
          key={key++}
          className="font-mono text-[0.875em] bg-surface border border-border rounded-[5px] px-1.5 py-0.5 text-accent-bright"
        >
          {code}
        </code>,
      );
    } else if (linkText !== undefined) {
      parts.push(
        <a
          key={key++}
          href={linkHref}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent-bright underline underline-offset-2 hover:text-accent transition-colors duration-150"
        >
          {linkText}
        </a>,
      );
    } else if (strike !== undefined) {
      parts.push(
        <del key={key++} className="line-through text-text-3">
          {strike}
        </del>,
      );
    }

    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return "";
  if (parts.length === 1 && typeof parts[0] === "string") return parts[0];
  return <>{parts}</>;
}

// ── Block tokenizer ────────────────────────────────────────────────────────

type Block =
  | { kind: "h"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "p"; text: string }
  | { kind: "code"; lang: string; body: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "hr" }
  | { kind: "img"; alt: string; src: string };

function tokenize(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading
    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      blocks.push({ kind: "h", level: hm[1].length as 1 | 2 | 3 | 4 | 5 | 6, text: hm[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        body.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ kind: "code", lang, body: body.join("\n") });
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const qlines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        qlines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ kind: "quote", lines: qlines });
      continue;
    }

    // Image (before ul to avoid `![` conflict)
    const imgm = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgm) {
      blocks.push({ kind: "img", alt: imgm[1], src: imgm[2] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph — accumulate until empty line or block-level marker
    const plines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ") &&
      !lines[i].startsWith("!") &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i])
    ) {
      plines.push(lines[i]);
      i++;
    }
    if (plines.length > 0) {
      blocks.push({ kind: "p", text: plines.join(" ") });
    }
  }

  return blocks;
}

// ── Block renderer ─────────────────────────────────────────────────────────

const H_CLASS: Record<number, string> = {
  1: "font-display font-semibold text-[clamp(26px,3.5vw,36px)] leading-[1.2] tracking-[-0.02em] text-text mt-14 mb-5 first:mt-0",
  2: "font-display font-semibold text-[clamp(20px,2.8vw,26px)] leading-[1.3] tracking-[-0.015em] text-text mt-11 mb-4 first:mt-0",
  3: "font-sans font-bold text-[19px] leading-[1.4] tracking-[-0.01em] text-text mt-8 mb-3",
  4: "font-sans font-semibold text-[17px] leading-[1.45] text-text mt-6 mb-2.5",
  5: "font-sans font-semibold text-[15px] text-text mt-5 mb-2",
  6: "font-sans font-medium text-[14px] text-text-2 mt-4 mb-2",
};

function renderBlock(block: Block, idx: number): ReactNode {
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

// ── Public component ───────────────────────────────────────────────────────

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = tokenize(content);
  return <div>{blocks.map((b, i) => renderBlock(b, i))}</div>;
}
