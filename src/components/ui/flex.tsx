import type { Ref } from "react";
import { cn } from "#/lib/Utils";
import { Box, type BoxProps } from "./box";

type Direction = "row" | "col" | "row-reverse" | "col-reverse";
type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";
type Wrap = "wrap" | "nowrap" | "wrap-reverse";

const DIR: Record<Direction, string> = {
  row: "flex-row",
  col: "flex-col",
  "row-reverse": "flex-row-reverse",
  "col-reverse": "flex-col-reverse",
};

const ALIGN: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const JUSTIFY: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const WRAP: Record<Wrap, string> = {
  wrap: "flex-wrap",
  nowrap: "flex-nowrap",
  "wrap-reverse": "flex-wrap-reverse",
};

export interface FlexProps extends BoxProps {
  ref?: Ref<HTMLElement>;
  direction?: Direction;
  align?: Align;
  justify?: Justify;
  wrap?: Wrap;
  gap?: string;
}

export function Flex({
  direction = "row",
  align,
  justify,
  wrap,
  gap,
  className,
  ...props
}: FlexProps) {
  return (
    <Box
      className={cn(
        "flex",
        DIR[direction],
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        wrap && WRAP[wrap],
        gap && `gap-${gap}`,
        className,
      )}
      {...props}
    />
  );
}
