import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function PostsHeader() {
  return (
    <header className="pt-37.5 pb-14 relative overflow-hidden">
      <div
        className="absolute w-120 h-120 rounded-full blur-[100px] opacity-60 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(91,141,239,0.30), transparent 70%)",
          top: "-160px",
          right: "-80px",
        }}
        aria-hidden
      />
      <div className="max-w-280 mx-auto px-8 w-full relative z-[2] max-[520px]:px-5">
        <Reveal>
          <div className="font-sans text-[13px] tracking-[0.14em] uppercase text-accent inline-flex items-center gap-3 mb-5.5 before:content-[''] before:w-8.5 before:h-px before:bg-accent">
            Writing
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <Text
            variant="heading1"
            className="font-display font-semibold text-[clamp(40px,7vw,84px)] leading-none mb-5"
          >
            기록<span className="text-accent">.</span>
          </Text>
        </Reveal>
        <Reveal delay={0.16}>
          <Text variant="subtitle2" color="muted" className="max-w-[70ch]">
            배운 것을 설명할 수 있을 때 비로소 온전히 이해한 것이라 믿습니다.
            <br />
            개인적으로 공부하며 얻은 지식과 개발을 진행하며 부딪힌 문제와 그 해결 과정을 정리합니다.
          </Text>
        </Reveal>
      </div>
    </header>
  );
}
