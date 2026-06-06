import { CAREER_ITEMS } from "#/data/Portfolio";
import { Badge } from "#/components/ui/badge";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function Career() {
  return (
    <section className="relative py-30 max-[520px]:py-21" id="career">
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-4.5 mb-14">
          <Text variant="caption" color="accent">03</Text>
          <Text variant="heading4">Career</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            {"// 2023 — Now"}
          </Text>
        </Reveal>

        <Reveal className="flex items-center gap-4.5 mb-11 px-6.5 py-5.5 bg-linear-to-r from-surface to-bg-soft border border-border rounded-2xl">
          <img
            src="https://logo-resources.thevc.kr/organizations/200x200/8c0d21390153be22cc7715dbffaf133f821d54cce68f3c2f5e2a758f2befc77c_1775700700735069.jpg"
            alt="goorm 로고"
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl shrink-0 object-cover"
          />
          <div>
            <Text variant="heading5">
              주식회사 구름{" "}
              <span className="text-text-3 font-medium text-[14px]">goorm Inc.</span>
            </Text>
            <Text variant="caption" color="muted" className="mt-0.75 block">
              Fullstack Engineer
            </Text>
          </div>
          <div className="ml-auto font-mono text-[12.5px] text-text-3 text-right max-[600px]:hidden">
            2023.08
            <br />— 현재
          </div>
        </Reveal>

        <Reveal>
          <Text variant="subtitle2" color="muted" className="max-w-[80ch] -mt-7 mb-10">
            IT 에듀테크 기업인 구름의 교육 사업 플랫폼 (구름 EDU) 을 개발해왔습니다.
            <br />
            서비스 개발에서 소규모의 {" "}
            <strong className="text-text font-semibold">스쿼드 리더</strong>를 거쳤고, 지금은
           교육 사업의 모집 단계와 학습 경험을 주로 다룹니다.
          </Text>
        </Reveal>

        <div className="relative pl-7.5 timeline-line">
          {CAREER_ITEMS.map((item, i) => (
            <Reveal key={item.when} delay={i * 0.06} className="relative pb-10 last:pb-0 tl-dot">
              <Text variant="caption" color="accent">
                {item.when}
              </Text>
              <div className="flex items-center gap-3 flex-wrap my-1.75">
                <Text variant="heading6">{item.title}</Text>
                {item.badge && <Badge>{item.badge}</Badge>}
              </div>
              <ul className="flex flex-col gap-2.25 mt-1 mb-4 max-w-[64ch]">
                {item.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="relative pl-5 text-text-2 text-[14.5px] leading-[1.62]"
                  >
                    <span
                      className="absolute left-0.5 top-2.25 w-1.5 h-1.5 rounded-xs bg-accent rotate-45"
                      aria-hidden="true"
                    />
                    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static portfolio data */}
                    <span dangerouslySetInnerHTML={{ __html: bullet }} />
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
