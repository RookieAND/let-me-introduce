import { STACK_CARDS } from "#/data/Portfolio";
import { Reveal } from "#/components/ui/reveal";
import { TechIcon } from "#/components/ui/TechIcon";
import { Text } from "#/components/ui/text";
import { cn } from "#/lib/Utils";

export function Stack() {
  return (
    <section className="relative py-30 max-[520px]:py-21" id="stack">
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-4.5 mb-14">
          <Text variant="caption" color="accent">02</Text>
          <Text variant="heading4">Tech Stack</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            {"// 실무에서 주로 사용한 기술입니다"}
          </Text>
        </Reveal>

        <div className="grid grid-cols-2 gap-4.5 max-[760px]:grid-cols-1">
          {STACK_CARDS.map((card, i) => (
            <Reveal key={card.category} delay={i % 2 === 1 ? 0.08 : 0}>
              <div className="bg-surface border border-border rounded-2xl p-7 transition-[border-color] duration-300 hover:border-border-strong">
                <div className="font-mono text-[12px] tracking-[0.06em] text-text-3 uppercase mb-4.5 flex items-center gap-2.5">
                  <span className="w-4.5 h-0.5 bg-accent" />
                  {card.category}
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                  {card.chips.map((chip) => (
                    <div
                      key={chip.label}
                      className={cn(
                        "flex flex-col items-center gap-2.5 rounded-[10px] px-2 py-3.5 transition-all duration-200 cursor-default select-none group",
                        chip.key
                          ? "bg-accent-dim text-accent-bright hover:bg-[rgba(91,141,239,0.22)] hover:-translate-y-0.5"
                          : "bg-surface-2 text-text-3 hover:bg-accent-dim hover:text-accent-bright hover:-translate-y-0.5",
                      )}
                    >
                      {chip.icon ? (
                        <TechIcon slug={chip.icon} size={26} />
                      ) : (
                        <span className="w-6.5 h-6.5 rounded-full border border-current opacity-30 flex items-center justify-center font-mono text-[10px]">
                          ~
                        </span>
                      )}
                      <span className="font-mono text-[11px] tracking-[0.01em] leading-tight text-center w-full truncate px-1">
                        {chip.label}
                      </span>
                    </div>
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
