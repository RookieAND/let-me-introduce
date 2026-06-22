import type { ReactNode } from "react";

const INLINE_RE = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[(.+?)\]\((.+?)\)|~~(.+?)~~/g;

export function parseInline(text: string): ReactNode {
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
          {parseInline(bold)}
        </strong>,
      );
    } else if (italic !== undefined) {
      parts.push(
        <em key={key++} className="italic">
          {parseInline(italic)}
        </em>,
      );
    } else if (code !== undefined) {
      parts.push(
        <code
          key={key++}
          className="font-mono text-[0.875em] bg-surface border border-border rounded-tag px-1.5 py-0.5 text-accent-bright"
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
          {parseInline(strike)}
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
