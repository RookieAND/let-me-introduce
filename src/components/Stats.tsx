import { motion } from "framer-motion";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";
import { STATS } from "#/data/Portfolio";
import { useCountAnimation } from "#/hooks/UseCountAnimation";

function CountUp({ target, prefix, unit }: { target: number; prefix?: string; unit?: string }) {
  const { rounded, ref } = useCountAnimation(target);

  return (
    <div className="font-display text-[clamp(32px,4vw,46px)] font-semibold tracking-[-0.02em] leading-none flex items-baseline gap-0.75 whitespace-nowrap">
      {prefix && <span className="text-[0.5em] text-accent">{prefix}</span>}
      <motion.span ref={ref}>{rounded}</motion.span>
      {unit && <span className="text-[0.5em] text-accent">{unit}</span>}
    </div>
  );
}

function StatItem({ prefix, target, unit, label, method, context }: (typeof STATS)[number]) {
  return (
    <div className="py-8 px-6.5 border-r border-border last:border-r-0 max-[760px]:nth-2:border-r-0 max-[760px]:nth-1:border-b max-[760px]:nth-2:border-b">
      <CountUp target={target} prefix={prefix} unit={unit} />
      <Text variant="caption" color="subtle" className="mt-3 leading-normal block">
        {label}
        <br />
        {method}
      </Text>
      <Text
        variant="caption"
        color="subtle"
        className="mt-1.5 block opacity-50 text-[10.5px] tracking-[0.06em]"
      >
        {context}
      </Text>
    </div>
  );
}

export function Stats() {
  return (
    <section className="py-0 pb-30 max-[520px]:pb-21">
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal>
          <div className="grid grid-cols-4 border border-border rounded-2xl overflow-hidden bg-surface max-[760px]:grid-cols-2">
            {STATS.map((stat) => (
              <StatItem key={stat.label} {...stat} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
