import { TechIcon } from "#/components/ui/TechIcon";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";
import { STACK_CARDS } from "#/data/Portfolio";

export function Stack() {
  return (
    <section className="relative py-30 max-compact:py-21" id="stack">
      <div className="max-w-280 mx-auto px-8 w-full max-compact:px-5">
        <Reveal className="flex items-baseline gap-4.5 mb-14">
          <Text variant="caption" color="accent">
            02
          </Text>
          <Text variant="heading4">Tech Stack</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-narrow:hidden">
            {"// 실무에서 주로 사용한 기술입니다"}
          </Text>
        </Reveal>

        <div className="grid grid-cols-2 gap-4.5 max-tablet:grid-cols-1">
          {STACK_CARDS.map((card, i) => (
            <Reveal key={card.category} delay={i % 2 === 1 ? 0.08 : 0}>
              <div className="bg-surface border border-border rounded-2xl p-7 transition-[border-color] duration-300 hover:border-border-strong">
                <Text
                  as="div"
                  variant="label"
                  color="subtle"
                  className="mb-4.5 flex items-center gap-2.5"
                >
                  <span className="w-4.5 h-0.5 bg-accent" />
                  {card.category}
                </Text>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
                  {card.chips.map((chip) => (
                    <div
                      key={chip.label}
                      className="flex flex-col items-center justify-center gap-2.5 rounded-chip px-2 h-20 cursor-default select-none group bg-accent-dim text-accent-bright transition-all duration-200 hover:scale-105 hover:brightness-110"
                    >
                      {chip.icon ? (
                        <TechIcon slug={chip.icon} size={26} />
                      ) : (
                        <span className="w-6.5 h-6.5 rounded-full border border-current opacity-30 flex items-center justify-center font-sans text-[10px]">
                          ~
                        </span>
                      )}
                      <Text
                        as="span"
                        variant="caption"
                        className="text-[11px] tracking-[0.01em] leading-tight text-center w-full break-words px-1"
                      >
                        {chip.label}
                      </Text>
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
