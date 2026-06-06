import { PRINCIPLES } from "#/data/Portfolio";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function About() {
  return (
    <section className="relative py-30 max-[520px]:py-21" id="about">
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <Reveal className="flex items-baseline gap-4.5 mb-14">
          <Text variant="caption" color="accent">01</Text>
          <Text variant="heading4">About</Text>
          <Text variant="caption" color="subtle" className="ml-auto max-[600px]:hidden">
            {"// 개인과 팀, 모두의 성장에 집중합니다"}
          </Text>
        </Reveal>

        <div className="flex flex-col gap-16">
          <Reveal>
            <Text variant="heading3" className="max-w-[18ch]">
              좋은 개발의 시작은<br />
              <span className="text-accent">올바른 문제 정의</span>라고 믿습니다.
            </Text>
          </Reveal>

          <div className="flex flex-col gap-5.5 max-w-[68ch]">
            <Reveal>
              <Text variant="body1" color="muted">
                Tally와 Google Form으로 흩어져 운영하던 모집 플랫폼을 자체 시스템으로 옮기며,
                수작업 데이터가 대시보드로 정리되고 반복 업무가 자동화됐습니다.{" "}
                <strong className="text-text font-semibold">
                  운영팀이 스프레드시트 대신 대시보드를 열게 된 순간
                </strong>
                , 코드가 사람의 일하는 방식을 바꿀 수 있다는 걸 실감했습니다.
              </Text>
            </Reveal>
            <Reveal delay={0.08}>
              <Text variant="body1" color="muted">
                그 뒤로 개발을 시작하기 전에 늘 먼저 따져봅니다.
                <br />
                팀 리더로 비전과 로드맵을 세우며{" "}
                <strong className="text-text font-semibold">
                  기술력만큼 팀이 같은 방향을 보는 것
                </strong>
                이 중요함을 배웠고, 아는 것을 설명할 수 있을 때 비로소 이해한 것이라 믿어
                개발자 스크럼을 열어 함께 성장하는 문화를 만들어왔습니다.
              </Text>
            </Reveal>
          </div>

          <div className="grid grid-cols-3 gap-4.5 mt-2 max-[760px]:grid-cols-1">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.num} delay={i * 0.08}>
                <div className="bg-surface border border-border rounded-[14px] p-6 transition-[border-color,transform,background] duration-300 hover:border-border-strong hover:-translate-y-1 hover:bg-surface-2 h-full">
                  <Text variant="caption" color="accent" className="block mb-3.5">
                    {p.num}
                  </Text>
                  <Text variant="heading6" className="mb-2">{p.title}</Text>
                  <Text variant="body3" color="subtle">
                    {p.lines.map((line, j) => (
                      <span key={line}>{line}{j < p.lines.length - 1 && <br />}</span>
                    ))}
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
