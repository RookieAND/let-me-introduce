import { Text } from "#/components/ui/text";
import { parseInline } from "#/lib/markdown/parseInline";
import { slugify } from "#/lib/markdown/slugify";

const CLASSES: Record<number, string> = {
  1: "scroll-mt-24 font-semibold text-[clamp(26px,3.5vw,36px)] leading-[1.2] tracking-[-0.02em] mt-14 mb-5 first:mt-0",
  2: "scroll-mt-24 font-semibold text-[clamp(20px,2.8vw,26px)] leading-[1.3] tracking-[-0.015em] mt-11 mb-4 first:mt-0",
  3: "scroll-mt-24 font-bold text-[19px] leading-[1.4] tracking-[-0.01em] mt-8 mb-3",
  4: "scroll-mt-24 font-semibold text-[17px] leading-[1.45] mt-6 mb-2.5",
  5: "scroll-mt-24 font-semibold text-[15px] mt-5 mb-2",
  6: "scroll-mt-24 font-medium text-[14px] mt-4 mb-2",
};

interface Props {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export function HeadingBlock({ level, text }: Props) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Text
      as={Tag}
      id={slugify(text)}
      fontFamily={level <= 2 ? "display" : "sans"}
      color={level === 6 ? "muted" : "default"}
      className={CLASSES[level]}
    >
      {parseInline(text)}
    </Text>
  );
}
