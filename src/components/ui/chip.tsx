import { type VariantProps, cva } from "class-variance-authority";
import { type HTMLAttributes } from "react";
import { cn } from "#/lib/Utils";

const chipVariants = cva(
  "font-mono text-[13px] border rounded-[8px] px-[13px] py-[7px] transition-all duration-200 cursor-default",
  {
    variants: {
      variant: {
        default:
          "text-text-2 bg-surface-2 border-border hover:text-text hover:border-accent hover:bg-accent-dim hover:-translate-y-0.5",
        key: "text-accent-bright border-[rgba(91,141,239,0.4)] bg-surface-2 hover:bg-accent-dim hover:-translate-y-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface ChipProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

export function Chip({ variant, className, ...props }: ChipProps) {
  return <span className={cn(chipVariants({ variant }), className)} {...props} />;
}
