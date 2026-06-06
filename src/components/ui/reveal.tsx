import { motion, type MotionProps } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "#/lib/Utils";

const VARIANTS = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  delay?: number;
  children: ReactNode;
  as?: keyof typeof motion;
  motionProps?: MotionProps;
}

export function Reveal({
  delay = 0,
  children,
  className,
  as = "div",
  motionProps,
  ...rest
}: RevealProps) {
  const MotionTag = motion[as as "div"] as typeof motion.div;

  return (
    <MotionTag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={VARIANTS}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 0.8, 0.3, 1],
      }}
      className={cn(className)}
      {...motionProps}
      {...(rest as object)}
    >
      {children}
    </MotionTag>
  );
}
