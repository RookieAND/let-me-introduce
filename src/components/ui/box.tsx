import { createElement, type ElementType, type HTMLAttributes, type Ref } from "react";
import { cn } from "#/lib/Utils";

export interface BoxProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  ref?: Ref<HTMLElement>;
}

export function Box({ as = "div", ref, className, ...props }: BoxProps) {
  return createElement(as, { ref, className: cn(className), ...props });
}
