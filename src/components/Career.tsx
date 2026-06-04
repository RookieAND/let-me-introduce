import { CAREER_ITEMS } from "#/data/Portfolio";
import { Badge } from "#/components/ui/badge";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function Career() {
  return (
    <section className="relative py-[120px] max-[520px]:py-[84px]" id="career">
      <div className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-[18px] mb-14">
          <Text variant="caption" color="accent">03</Text>
          <Text variant="h2" className="text-[clamp(28px,3.6vw,44px)]">Career</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            // 2023 — Now
          </Text>
        </Reveal>

        <Reveal className="flex items-center gap-[18px] mb-11 px-[26px] py-[22px] bg-gradient-to-r from-surface to-bg-soft border border-border rounded-[16px]">
          <div className="w-12 h-12 rounded-[12px] bg-accent-dim border border-[rgba(91,141,239,0.35)] grid place-items-center font-display font-bold text-accent-bright text-xl shrink-0">
            g
          </div>
          <div>
            <Text variant="h3" className="text-[19px]">
              주식회사 구름{" "}
              <span className="text-text-3 font-medium text-[14px]">goorm Inc.</span>
            </Text>
            <Text variant="caption" color="muted" className="mt-[3px] block">
              Fullstack Engineer
            </Text>
          </div>
          <div className="ml-auto font-mono text-[12.5px] text-text-3 text-right max-[600px]:hidden">
            2023.03
            <br />— 현재
          </div>
        </Reveal>

        <Reveal>
          <Text variant="body" color="muted" className="text-[16px] leading-[1.8] max-w-[60ch] -mt-7 mb-10">
            에듀테크 기업 구름에서 교육 사업 플랫폼을 개발해왔습니다. 서비스 개발로 시작해{" "}
            <strong className="text-text font-semibold">스쿼드 리더</strong>를 거쳤고, 지금은
            권한 관리와 학습 경험을 다룹니다.
          </Text>
        </Reveal>

        <div className="relative pl-[30px] timeline-line">
          {CAREER_ITEMS.map((item, i) => (
            <Reveal key={item.when} delay={i * 0.06} className="relative pb-10 last:pb-0 tl-dot">
              <Text variant="caption" color="accent" className="text-[12px]">
                {item.when}
              </Text>
              <div className="flex items-center gap-3 flex-wrap my-[7px]">
                <Text variant="h4" className="text-[18px]">{item.title}</Text>
                {item.badge && <Badge>{item.badge}</Badge>}
              </div>
              <Text variant="body" color="muted" className="text-[15px] leading-[1.7] max-w-[64ch]">
                {item.desc}
              </Text>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
