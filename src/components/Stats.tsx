import { motion } from "framer-motion";
import { STATS } from "#/data/Portfolio";
import { useCountAnimation } from "#/hooks/UseCountAnimation";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

function CountUp({ target, prefix, unit }: { target: number; prefix?: string; unit?: string }) {
  const { rounded, ref } = useCountAnimation(target);

  return (
    <div className="font-display text-[clamp(32px,4vw,46px)] font-semibold tracking-[-0.02em] leading-none flex items-baseline gap-[3px] whitespace-nowrap">
      {prefix && <span className="text-[0.5em] text-accent font-mono">{prefix}</span>}
      <motion.span ref={ref}>{rounded}</motion.span>
      {unit && <span className="text-[0.5em] text-accent font-mono">{unit}</span>}
    </div>
  );
}

function StatItem({ prefix, target, unit, label }: (typeof STATS)[number]) {
  const lines = label.split("\n");

  return (
    <div className="py-8 px-[26px] border-r border-border last:border-r-0 max-[760px]:[&:nth-child(2)]:border-r-0 max-[760px]:[&:nth-child(1)]:border-b max-[760px]:[&:nth-child(2)]:border-b">
      <CountUp target={target} prefix={prefix} unit={unit} />
      <Text variant="caption" color="subtle" className="mt-3 leading-[1.5] block">
        {lines[0]}
        <br />
        {lines[1]}
      </Text>
    </div>
  );
}

export function Stats() {
  return (
    <section className="py-0 pb-[120px] max-[520px]:pb-[84px]">
      <div className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal>
          <div className="grid grid-cols-4 border border-border rounded-[16px] overflow-hidden bg-surface max-[760px]:grid-cols-2">
            {STATS.map((stat) => (
              <StatItem key={stat.label} {...stat} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
