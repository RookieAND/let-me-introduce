import { useEffect, useRef } from "react";
import { Button } from "#/components/ui/button";
import { Text } from "#/components/ui/text";

export function Hero() {
  const g1Ref = useRef<HTMLDivElement>(null);
  const g2Ref = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let scrollOffsetX = 0;
    let scrollOffsetY = 0;

    const applyTransform = (nx: number, ny: number) => {
      if (g1Ref.current)
        g1Ref.current.style.transform = `translate(${nx * -40 + scrollOffsetX}px, ${ny * -30 + scrollOffsetY}px)`;
      if (g2Ref.current)
        g2Ref.current.style.transform = `translate(${nx * 30 - scrollOffsetX}px, ${ny * 20 - scrollOffsetY}px)`;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      applyTransform(nx, ny);
    };

    const handleScroll = () => {
      scrollOffsetY = window.scrollY * -0.04;
      applyTransform(0, 0);
    };

    hero.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      hero.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      ref={heroRef}
      id="top"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div
          ref={g1Ref}
          className="absolute w-[540px] h-[540px] rounded-full blur-[90px] opacity-55 will-change-transform animate-drift1"
          style={{
            background: "radial-gradient(circle, rgba(91,141,239,0.42), transparent 70%)",
            top: "-120px",
            right: "-60px",
          }}
        />
        <div
          ref={g2Ref}
          className="absolute w-[460px] h-[460px] rounded-full blur-[90px] opacity-55 will-change-transform animate-drift2"
          style={{
            background: "radial-gradient(circle, rgba(60,90,200,0.30), transparent 70%)",
            bottom: "-160px",
            left: "-100px",
          }}
        />
        <div className="grid-overlay" />
      </div>

      {/* Content */}
      <div className="max-w-[1120px] mx-auto px-8 w-full relative z-[2] grid grid-cols-[1.25fr_0.9fr] gap-14 items-center pt-20 pb-10 max-[900px]:grid-cols-1 max-[900px]:gap-12">
        {/* Left: text */}
        <div>
          <div className="reveal in font-mono text-[13px] tracking-[0.14em] uppercase text-accent inline-flex items-center gap-3 mb-[26px] before:content-[''] before:w-[34px] before:h-px before:bg-accent">
            Frontend Engineer
          </div>

          <Text
            variant="h1"
            className="reveal in d1 text-[clamp(48px,7vw,92px)] mb-[10px]"
          >
            백광인<span className="text-accent">.</span>
          </Text>

          <Text
            variant="caption"
            color="subtle"
            className="reveal in d1 tracking-[0.22em] uppercase mb-8 block"
          >
            Baik&nbsp;Gwangin
          </Text>

          <Text
            variant="lead"
            className="reveal in d2 text-[clamp(18px,1.9vw,23px)] max-w-[30em]"
          >
            요구사항 너머의{" "}
            <strong className="text-accent-bright font-semibold">맥락을 읽고</strong>,<br />
            최선의 해결책을 찾아{" "}
            <strong className="text-accent-bright font-semibold">끝까지 실행</strong>
            하는 개발자입니다.
          </Text>

          <div className="reveal in d3 flex gap-[14px] mt-10 flex-wrap">
            <Button as="a" href="#contact" variant="primary">
              연락하기 <span>→</span>
            </Button>
            <Button
              as="a"
              href="https://github.com/RookieAND"
              target="_blank"
              rel="noopener"
              variant="ghost"
            >
              GitHub ↗
            </Button>
          </div>
        </div>

        {/* Right: portrait */}
        <div className="portrait-wrap relative justify-self-center max-[900px]:justify-self-start">
          <div
            className="absolute inset-[-14px] border border-border rounded-[26px] -z-[1]"
            aria-hidden
          />
          <div className="portrait-overlay relative w-[320px] h-[400px] rounded-[18px] overflow-hidden border border-border-strong shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8),0_0_60px_-20px_rgba(91,141,239,0.4)] max-[900px]:w-[260px] max-[900px]:h-[320px]">
            <img
              src="/assets/profile.jpg"
              alt="백광인 프로필 사진"
              className="portrait-img"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <div className="absolute -bottom-[14px] -left-[18px] bg-surface border border-border-strong rounded-[10px] px-[14px] py-[9px] font-mono text-[11.5px] text-text-2 flex items-center gap-2 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)]">
            <span className="w-2 h-2 rounded-full bg-green-ping shadow-[0_0_8px_var(--color-green-ping)] shrink-0" />
            goorm Inc. · Fullstack
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 z-[2] font-mono text-[11px] tracking-[0.2em] text-text-3 flex flex-col items-center gap-[10px] uppercase">
        <span>SCROLL</span>
        <span className="w-px h-10 bg-gradient-to-b from-accent to-transparent animate-scroll-line" />
      </div>
    </header>
  );
}
