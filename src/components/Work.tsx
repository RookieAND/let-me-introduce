import { WORK_ITEMS } from "#/data/Portfolio";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function Work() {
  return (
    <section className="relative py-[120px] max-[520px]:py-[84px]" id="work">
      <div className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-[18px] mb-14">
          <Text variant="caption" color="accent">04</Text>
          <Text variant="h2" className="text-[clamp(28px,3.6vw,44px)]">Selected Work</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            // 이런 일들을 해왔습니다
          </Text>
        </Reveal>

        <div className="flex flex-col">
          {WORK_ITEMS.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.05}>
              <div className="grid grid-cols-[230px_1fr] gap-7 px-1 py-6 border-t border-border last:border-b transition-[padding,background,border-radius] duration-[250ms] hover:bg-surface hover:rounded-[12px] hover:px-[18px] max-[640px]:grid-cols-1 max-[640px]:gap-2">
                <div>
                  <Text variant="h4" className="text-[17px]">{item.name}</Text>
                  <Text variant="label" color="subtle" className="tracking-[0.06em] mt-[7px] block">
                    {item.kind}
                  </Text>
                </div>
                <Text variant="body" color="muted" className="text-[14.5px] leading-[1.7]">
                  {item.desc}
                </Text>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
