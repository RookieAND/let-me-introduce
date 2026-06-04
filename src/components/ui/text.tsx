import { type VariantProps, cva } from "class-variance-authority";
import { type ElementType, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "#/lib/Utils";

const textVariants = cva("", {
  variants: {
    variant: {
      h1: "font-sans font-extrabold leading-[1.02] tracking-[-0.02em]",
      h2: "font-display font-semibold tracking-[-0.01em]",
      h3: "font-sans font-bold tracking-[-0.01em]",
      h4: "font-sans font-bold tracking-[-0.01em]",
      lead: "font-sans font-medium leading-[1.5] tracking-[-0.01em]",
      body: "font-sans leading-[1.85]",
      mono: "font-mono",
      label: "font-mono text-[12px] tracking-[0.06em] uppercase",
      eyebrow: "font-mono text-[13px] tracking-[0.14em] uppercase",
      caption: "font-mono text-[12px] tracking-[0.03em]",
    },
    color: {
      default: "text-text",
      muted: "text-text-2",
      subtle: "text-text-3",
      accent: "text-accent",
      bright: "text-accent-bright",
    },
  },
  defaultVariants: {
    color: "default",
  },
});

type TextAs =
  | "h1" | "h2" | "h3" | "h4"
  | "p" | "span" | "div" | "small" | "strong" | "em";

interface TextProps
  extends Omit<HTMLAttributes<HTMLElement>, "color">,
    VariantProps<typeof textVariants> {
  as?: TextAs;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

const defaultTagFor = (variant: TextProps["variant"]): TextAs => {
  switch (variant) {
    case "h1": return "h1";
    case "h2": return "h2";
    case "h3": return "h3";
    case "h4": return "h4";
    case "lead":
    case "body": return "p";
    default: return "span";
  }
};

export function Text({ as, ref, variant, color, className, children, ...props }: TextProps) {
  const Tag = (as ?? defaultTagFor(variant)) as ElementType;
  return (
    <Tag
      ref={ref}
      className={cn(textVariants({ variant, color }), className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
