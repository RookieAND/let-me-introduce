import type { Block } from "./types";

export function slugify(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export function extractHeadings(blocks: Block[]): TocEntry[] {
  return blocks
    .filter((b): b is Extract<Block, { kind: "h" }> => b.kind === "h" && b.level <= 3)
    .map((b) => ({ id: slugify(b.text), text: b.text, level: b.level }));
}
