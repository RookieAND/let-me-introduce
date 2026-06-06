import { WORK_ITEMS } from "#/data/Portfolio";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function Work() {
  return (
    <section className="relative py-30 max-[520px]:py-21" id="work">
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-4.5 mb-14">
          <Text variant="caption" color="accent">04</Text>
          <Text variant="heading4">Selected Work</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            {"// 실무에서는 이런 일들을 해왔습니다"}
          </Text>
        </Reveal>

        <div className="flex flex-col">
          {WORK_ITEMS.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.05}>
              <div className="grid grid-cols-[230px_1fr] gap-7 px-1 py-6 border-t border-border last:border-b transition-[padding,background,border-radius] duration-250 hover:bg-surface hover:rounded-xl hover:px-4.5 max-[640px]:grid-cols-1 max-[640px]:gap-2">
                <div>
                  <Text variant="heading6">{item.name}</Text>
                  <Text variant="label" color="subtle" className="tracking-[0.06em] mt-1.75 block">
                    {item.kind}
                  </Text>
                </div>
                <Text variant="body2" color="muted">
                  {item.lines.map((line, j) => (
                    <span key={line}>{line}{j < item.lines.length - 1 && <br />}</span>
                  ))}
                </Text>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
