import { type VariantProps, cva } from "class-variance-authority";
import type { Ref } from "react";
import { cn } from "#/lib/Utils";
import { Box, type BoxProps } from "./box";

const gridVariants = cva("grid", {
  variants: {
    cols: {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
      12: "grid-cols-12",
    },
    rows: {
      1: "grid-rows-1",
      2: "grid-rows-2",
      3: "grid-rows-3",
      4: "grid-rows-4",
    },
    flow: {
      row: "grid-flow-row",
      col: "grid-flow-col",
      dense: "grid-flow-dense",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-items-start",
      center: "justify-items-center",
      end: "justify-items-end",
      stretch: "justify-items-stretch",
    },
  },
});

export interface GridProps extends BoxProps, VariantProps<typeof gridVariants> {
  ref?: Ref<HTMLElement>;
  gap?: string;
  colGap?: string;
  rowGap?: string;
}

export function Grid({
  cols,
  rows,
  flow,
  align,
  justify,
  gap,
  colGap,
  rowGap,
  className,
  ...props
}: GridProps) {
  return (
    <Box
      className={cn(
        gridVariants({ cols, rows, flow, align, justify }),
        gap && `gap-${gap}`,
        colGap && `gap-x-${colGap}`,
        rowGap && `gap-y-${rowGap}`,
        className,
      )}
      {...props}
    />
  );
}
