import { STACK_CARDS } from "#/data/Portfolio";
import { Chip } from "#/components/ui/chip";
import { Reveal } from "#/components/ui/reveal";
import { TechIcon } from "#/components/ui/TechIcon";
import { Text } from "#/components/ui/text";

export function Stack() {
  return (
    <section className="relative py-[120px] max-[520px]:py-[84px]" id="stack">
      <div className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-[18px] mb-14">
          <Text variant="caption" color="accent">02</Text>
          <Text variant="h2" className="text-[clamp(28px,3.6vw,44px)]">Tech Stack</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            // 프론트엔드 중심, 풀스택으로
          </Text>
        </Reveal>

        <div className="grid grid-cols-2 gap-[18px] max-[760px]:grid-cols-1">
          {STACK_CARDS.map((card, i) => (
            <Reveal key={card.category} delay={i % 2 === 1 ? 0.08 : 0}>
              <div className="bg-surface border border-border rounded-[16px] p-7 transition-[border-color] duration-300 hover:border-border-strong">
                <div className="font-mono text-[12px] tracking-[0.06em] text-text-3 uppercase mb-[18px] flex items-center gap-[10px]">
                  <span className="w-[18px] h-[2px] bg-accent" />
                  {card.category}
                </div>
                <div className="flex flex-wrap gap-[9px]">
                  {card.chips.map((chip) => (
                    <Chip key={chip.label} variant={chip.key ? "key" : "default"}>
                      {chip.icon && <TechIcon slug={chip.icon} />}
                      {chip.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
