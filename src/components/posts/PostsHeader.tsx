import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function PostsHeader() {
  return (
    <header className="pt-[150px] pb-14 relative overflow-hidden">
      <div
        className="absolute w-[480px] h-[480px] rounded-full blur-[100px] opacity-60 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(91,141,239,0.30), transparent 70%)",
          top: "-160px",
          right: "-80px",
        }}
        aria-hidden
      />
      <div className="max-w-[1120px] mx-auto px-8 w-full relative z-[2] max-[520px]:px-5">
        <Reveal>
          <div className="font-mono text-[13px] tracking-[0.14em] uppercase text-accent inline-flex items-center gap-3 mb-[22px] before:content-[''] before:w-[34px] before:h-px before:bg-accent">
            Writing
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <Text
            variant="h1"
            className="font-display font-semibold text-[clamp(40px,7vw,84px)] tracking-[-0.02em] leading-none mb-5"
          >
            기록<span className="text-accent">.</span>
          </Text>
        </Reveal>
        <Reveal delay={0.16}>
          <Text variant="body" color="muted" className="text-[17px] max-w-[52ch] leading-[1.7]">
            배운 것을 설명할 수 있을 때 비로소 온전히 이해한 것이라 믿습니다.{" "}
            <strong className="text-text font-semibold">
              권한 설계, 상태 관리, 빌드 환경, 팀 운영
            </strong>
            에서 부딪힌 문제와 해결 과정을 정리합니다.
          </Text>
        </Reveal>
      </div>
    </header>
  );
}
