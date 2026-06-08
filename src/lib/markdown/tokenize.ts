import type { Block, CalloutType } from "./types";

const CALLOUT_RE = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*$/i;
const BLOCK_START_RE = /^#{1,6}\s/;

export function tokenize(md: string): Block[] {
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

    // Callout (> [!NOTE]) or regular blockquote
    if (line.startsWith("> ")) {
      const calloutMatch = line.slice(2).match(CALLOUT_RE);
      if (calloutMatch) {
        const calloutType = calloutMatch[1].toLowerCase() as CalloutType;
        const body: string[] = [];
        i++;
        while (i < lines.length && lines[i].startsWith("> ")) {
          body.push(lines[i].slice(2));
          i++;
        }
        blocks.push({ kind: "callout", calloutType, lines: body });
        continue;
      }

      const quoted: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoted.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ kind: "quote", lines: quoted });
      continue;
    }

    // Image (before ul to avoid `![` conflict)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({ kind: "img", alt: imgMatch[1], src: imgMatch[2] });
      i++;
      continue;
    }

    // Unordered list (including indented sub-bullets)
    if (/^[ \t]*[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[ \t]*[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[ \t]*[-*+]\s+/, ""));
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
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].match(BLOCK_START_RE) &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ") &&
      !lines[i].startsWith("!") &&
      !/^[ \t]*[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ kind: "p", text: paraLines.join(" ") });
    }
  }

  return blocks;
}
