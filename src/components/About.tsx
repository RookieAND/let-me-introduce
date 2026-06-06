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
              좋은 개발은 <span className="text-accent">올바른 문제 정의</span>에서<br />
              시작한다고 믿습니다.
            </Text>
          </Reveal>

          <div className="flex flex-col gap-5.5 max-w-[68ch]">
            <Reveal>
              <Text variant="body1" color="muted">
                그래서 무언가를 맡으면 코드부터 짜지 않습니다. 지금 정말 풀어야 할 문제가
                무엇인지, 어떻게 풀어야 가장 깔끔한지를 먼저 들여다봅니다.<br />
                코드가 답일 때도 있고, 사람들과 맞추는 게 답일 때도 있습니다.{" "}
                <strong className="text-text font-semibold">
                  방향이 또렷해진 뒤에야 코드를 시작하는 것
                </strong>
                , 그게 제가 일하는 방식입니다.
              </Text>
            </Reveal>
            <Reveal delay={0.08}>
              <Text variant="body1" color="muted">
                기술적으로는 개발 생산성을 끌어올리는 빌드·툴링 영역을 깊이 파고들어 왔습니다.<br />
                FE든 BE든 그 위에서 돌아가는 빌드·의존성·개발 환경을 그저 가져다 쓰는 데서 멈추지 않고,{" "}
                <strong className="text-text font-semibold">
                  내부가 어떻게 맞물리는지까지 파고들며 전문성을 다져왔습니다.
                </strong>
              </Text>
            </Reveal>
            <Reveal delay={0.16}>
              <Text variant="body1" color="muted">
                그 외에도 폼 빌더의 상태 아키텍처, 권한 관리의 프론트엔드 레이어처럼 사용자가
                마주하는 화면 안쪽의 구조까지 직접 설계합니다.<br />
                <strong className="text-text font-semibold">
                  팀이 딛고 설 개발 기반과 사용자가 마주하는 화면을 동시에 책임지는 것
                </strong>
                이 제 강점입니다.
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
