import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue, useTransform } from "framer-motion";

export function useCountAnimation(target: number, duration = 1.4) {
  const ref = useRef<HTMLElement>(null);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, target, {
      duration,
      ease: [0, 0, 0.2, 1],
    });
    return controls.stop;
  }, [inView, target, duration, count]);

  return { rounded, ref };
}
