import { STACK_CARDS } from "#/data/Portfolio";
import { Reveal } from "#/components/ui/reveal";
import { TechIcon } from "#/components/ui/TechIcon";
import { Text } from "#/components/ui/text";
import { cn } from "#/lib/Utils";

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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-[8px]">
                  {card.chips.map((chip) => (
                    <div
                      key={chip.label}
                      className={cn(
                        "flex flex-col items-center gap-[10px] rounded-[10px] px-2 py-[14px] transition-all duration-200 cursor-default select-none group",
                        chip.key
                          ? "bg-accent-dim text-accent-bright hover:bg-[rgba(91,141,239,0.22)] hover:-translate-y-0.5"
                          : "bg-surface-2 text-text-3 hover:text-text-2 hover:bg-[rgba(255,255,255,0.04)] hover:-translate-y-0.5",
                      )}
                    >
                      {chip.icon ? (
                        <TechIcon slug={chip.icon} size={26} />
                      ) : (
                        <span className="w-[26px] h-[26px] rounded-full border border-current opacity-30 flex items-center justify-center font-mono text-[10px]">
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
