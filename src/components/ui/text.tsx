import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import type { AllHTMLAttributes, ElementType, ReactNode, Ref } from "react";
import { cn } from "#/lib/Utils";

const textVariants = cva("", {
  variants: {
    variant: {
      heading1:
        "font-sans font-extrabold text-[clamp(48px,7vw,92px)] leading-[1.02] tracking-[-0.02em]",
      heading2:
        "font-sans font-extrabold text-[clamp(36px,6vw,76px)] leading-[1.04] tracking-[-0.025em]",
      heading3:
        "font-sans font-extrabold text-[clamp(28px,4vw,50px)] leading-[1.22] tracking-[-0.02em]",
      heading4: "font-display font-semibold text-[clamp(28px,3.6vw,44px)] tracking-[-0.01em]",
      heading5: "font-sans font-bold text-[19px] tracking-[-0.01em]",
      heading6: "font-sans font-semibold text-[17px] tracking-[-0.01em]",
      subtitle1:
        "font-sans font-medium text-[clamp(18px,1.9vw,23px)] leading-normal tracking-[-0.01em]",
      subtitle2: "font-sans text-[17px] leading-[1.8]",
      body1: "font-sans text-[16.5px] leading-[1.85]",
      body2: "font-sans text-[14.5px] leading-[1.7]",
      body3: "font-sans text-[13.5px] leading-[1.65]",
      caption: "font-sans text-[12px] tracking-[0.03em]",
      label: "font-sans text-[12px] tracking-[0.06em] uppercase",
      eyebrow: "font-sans text-[13px] tracking-[0.14em] uppercase",
    },
    color: {
      default: "text-text",
      muted: "text-text-2",
      subtle: "text-text-3",
      accent: "text-accent",
      bright: "text-accent-bright",
    },
    fontFamily: {
      sans: "font-sans",
      mono: "font-mono",
      display: "font-display",
    },
  },
  defaultVariants: {
    color: "default",
  },
});

type TextAs =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "div"
  | "small"
  | "strong"
  | "em"
  | "a"
  | "button"
  | "li";

interface TextProps
  extends Omit<AllHTMLAttributes<HTMLElement>, "color">,
    VariantProps<typeof textVariants> {
  as?: TextAs;
  asChild?: boolean;
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

const defaultTagFor = (variant: TextProps["variant"]): TextAs => {
  switch (variant) {
    case "heading1":
      return "h1";
    case "heading2":
    case "heading3":
    case "heading4":
      return "h2";
    case "heading5":
      return "h3";
    case "heading6":
      return "h4";
    case "subtitle1":
    case "subtitle2":
    case "body1":
    case "body2":
    case "body3":
      return "p";
    default:
      return "span";
  }
};

export function Text({
  as,
  asChild = false,
  ref,
  variant,
  color,
  fontFamily,
  className,
  children,
  ...props
}: TextProps) {
  const Comp = asChild ? Slot : ((as ?? defaultTagFor(variant)) as ElementType);
  return (
    <Comp ref={ref} className={cn(textVariants({ variant, color, fontFamily }), className)} {...props}>
      {children}
    </Comp>
  );
}
