import { type VariantProps, cva } from "class-variance-authority";
import { type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { cn } from "#/lib/Utils";

const buttonVariants = cva(
  "inline-flex items-center gap-2 font-mono text-[13px] rounded-[9px] transition-all duration-200 tracking-[0.02em] cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white hover:bg-accent-bright hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-8px_rgba(91,141,239,0.6)]",
        ghost:
          "border border-border-strong text-text-2 bg-transparent hover:border-accent hover:text-text hover:-translate-y-0.5",
      },
      size: {
        default: "px-5 py-3",
        sm: "px-3 py-2 text-[12px]",
      },
    },
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
