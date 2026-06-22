import { type VariantProps, cva } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "#/lib/Utils";

const badgeVariants = cva(
  "font-sans text-[10.5px] rounded-tag px-2 py-0.75 border tracking-[0.03em] inline-flex items-center",
  {
    variants: {
      variant: {
        accent: "text-accent-bright bg-accent-dim border-[var(--color-accent-border)]",
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
