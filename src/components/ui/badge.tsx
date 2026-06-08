import { type VariantProps, cva } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "#/lib/Utils";

const badgeVariants = cva(
  "font-mono text-[10.5px] rounded-[5px] px-2 py-0.75 border tracking-[0.03em] inline-flex items-center",
  {
    variants: {
      variant: {
        accent: "text-accent-bright bg-accent-dim border-[rgba(91,141,239,0.3)]",
        surface: "text-text-3 bg-surface border-border",
      },
    },
    defaultVariants: {
      variant: "accent",
    },
  },
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ variant, className, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
