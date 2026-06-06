import { type VariantProps, cva } from "class-variance-authority";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "#/lib/Utils";

const buttonVariants = cva(
  "inline-flex items-center gap-2 font-sans font-medium transition-all duration-200 tracking-[-0.01em] cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-accent-bright hover:-translate-y-0.5",
        ghost: "border border-border-strong text-text-2 bg-transparent hover:border-accent hover:text-text hover:-translate-y-0.5",
      },
      size: {
        default: "px-5 py-3 text-[14px] rounded-[9px]",
        sm: "px-3 py-2 text-[12px] rounded-[7px]",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        size: "default",
        className: "hover:shadow-[0_10px_30px_-8px_rgba(91,141,239,0.6)]",
      },
      {
        variant: "primary",
        size: "sm",
        className: "hover:shadow-[0_6px_16px_-6px_rgba(91,141,239,0.5)]",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonAsButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: "button";
} & VariantProps<typeof buttonVariants>;

type ButtonAsAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  as: "a";
} & VariantProps<typeof buttonVariants>;

type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

export function Button({ variant, size, className, ...props }: ButtonProps) {
  const cls = cn(buttonVariants({ variant, size }), className);

  if (props.as === "a") {
    const { as: _as, ...rest } = props as ButtonAsAnchorProps;
    return <a className={cls} {...rest} />;
  }

  const { as: _as, ...rest } = props as ButtonAsButtonProps;
  return <button className={cls} {...rest} />;
}
