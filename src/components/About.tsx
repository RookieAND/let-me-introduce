import { PRINCIPLES } from "#/data/Portfolio";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function About() {
  return (
    <section className="relative py-[120px] max-[520px]:py-[84px]" id="about">
      <div className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-[18px] mb-14">
          <Text variant="caption" color="accent">01</Text>
          <Text variant="h2" className="text-[clamp(28px,3.6vw,44px)]">About</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            // 어떤 개발자인가
          </Text>
        </Reveal>

        <div className="flex flex-col gap-16">
          <Reveal>
            <Text
              variant="h2"
              className="font-extrabold tracking-[-0.02em] leading-[1.28] text-[clamp(28px,4vw,50px)] max-w-[18ch]"
            >
              좋은 개발의 시작은{" "}
              <span className="text-accent">올바른 문제 정의</span>라고 믿습니다.
            </Text>
          </Reveal>

          <div className="grid grid-cols-2 gap-x-16 gap-y-10 items-start max-[760px]:grid-cols-1">
            <Reveal>
              <Text variant="body" color="muted" className="text-[16.5px]">
                Tally와 Google Form으로 분산 운영하던 모집 플랫폼을 자체 시스템으로 옮기면서,
                수작업으로 관리하던 데이터가 대시보드로 정리되고 반복 업무가 하나씩
                자동화됐습니다.{" "}
                <strong className="text-text font-semibold">
                  운영팀이 스프레드시트 대신 대시보드를 열게 된 순간
                </strong>
                , 코드가 사람의 일하는 방식 자체를 바꿀 수 있다는 걸 처음 실감했습니다.
              </Text>
            </Reveal>
            <Reveal delay={0.08}>
              <Text variant="body" color="muted" className="text-[16.5px]">
                그 이후로 개발을 시작하기 전에 늘 먼저 따져봅니다. 팀 리더로 제품 비전과
                로드맵을 직접 세우며,{" "}
                <strong className="text-text font-semibold">
                  개인의 기술력만큼 팀 전체가 같은 방향을 보는 것
                </strong>
                이 중요하다는 걸 배웠습니다. 아는 것을 설명할 수 있을 때 비로소 온전히
                이해한 것이라 믿어, 개발자 스크럼을 직접 열고 함께 성장하는 문화를
                만들어왔습니다.
              </Text>
            </Reveal>
          </div>

          <div className="grid grid-cols-3 gap-[18px] mt-2 max-[760px]:grid-cols-1">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.num} delay={i * 0.08}>
                <div className="bg-surface border border-border rounded-[14px] p-6 transition-[border-color,transform,background] duration-300 hover:border-border-strong hover:-translate-y-1 hover:bg-surface-2 h-full">
                  <Text variant="caption" color="accent" className="block mb-[14px]">
                    {p.num}
                  </Text>
                  <Text variant="h4" className="text-[16px] mb-2">{p.title}</Text>
                  <Text variant="body" color="subtle" className="text-[13.5px] leading-[1.65]">
                    {p.desc}
                  </Text>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
