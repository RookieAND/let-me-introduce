import { Link } from "react-router-dom";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";
import { AWARDS, CERTS } from "#/data/Portfolio";

export function Contact() {
  return (
    <section className="pt-32.5 pb-20" id="contact">
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5 text-center">
        <Reveal>
          <Text variant="heading2" className="mb-5.5">
            함께{" "}
            <span className="bg-linear-to-r from-accent to-accent-bright bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">
              맥락
            </span>
            을 만들어요.
          </Text>
        </Reveal>

        <Reveal delay={0.08}>
          <Text variant="subtitle2" color="muted" className="mb-11">
            새로운 문제와 좋은 구성원이 함께하는 팀을 항상 기다리고 있습니다.
          </Text>
        </Reveal>

        <Reveal delay={0.16} className="inline-flex flex-wrap gap-3.5 justify-center">
          <a
            href="mailto:gwangin1999@naver.com"
            className="group inline-flex items-center gap-2.75 px-6 py-3.75 rounded-[11px] border border-border-strong font-mono text-[14px] text-text bg-surface transition-all duration-250 hover:border-accent hover:bg-accent-dim hover:-translate-y-0.75"
          >
            <span className="text-text-3 group-hover:text-accent-bright transition-colors duration-250">
              Email
            </span>
            gwangin1999@naver.com
          </a>
          <a
            href="https://github.com/RookieAND"
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex items-center gap-2.75 px-6 py-3.75 rounded-[11px] border border-border-strong font-mono text-[14px] text-text bg-surface transition-all duration-250 hover:border-accent hover:bg-accent-dim hover:-translate-y-0.75"
          >
            <span className="text-text-3 group-hover:text-accent-bright transition-colors duration-250">
              GitHub
            </span>
            RookieAND ↗
          </a>
          <Link
            to="/posts"
            className="group inline-flex items-center gap-2.75 px-6 py-3.75 rounded-[11px] border border-border-strong font-mono text-[14px] text-text bg-surface transition-all duration-250 hover:border-accent hover:bg-accent-dim hover:-translate-y-0.75"
          >
            <span className="text-text-3 group-hover:text-accent-bright transition-colors duration-250">
              Writing
            </span>
            기록 보기
          </Link>
        </Reveal>

        <div className="mt-22.5 grid grid-cols-2 gap-4.5 max-w-220 mx-auto text-left max-[700px]:grid-cols-1">
          <Reveal>
            <div className="bg-surface border border-border rounded-[14px] p-6">
              <Text variant="label" color="subtle" className="tracking-[0.08em] mb-4 block">
                Awards
              </Text>
              {AWARDS.map((award) => (
                <div
                  key={award.name}
                  className="flex justify-between gap-3 py-2.25 border-t border-border first:border-t-0 text-[14px]"
                >
                  <span className="text-text">
                    {award.name}{" "}
                    <strong className="text-accent-bright font-semibold">{award.prize}</strong>
                  </span>
                  <Text variant="caption" color="subtle" className="text-[12px] shrink-0">
                    {award.year}
                  </Text>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="bg-surface border border-border rounded-[14px] p-6">
              <Text variant="label" color="subtle" className="tracking-[0.08em] mb-4 block">
                Certificates &amp; Education
              </Text>
              {CERTS.map((cert) => (
                <div
                  key={cert.name}
                  className="flex justify-between items-center gap-3 py-2.25 border-t border-border first:border-t-0 text-[14px]"
                >
                  <span className="text-text">{cert.name}</span>
                  <Text variant="caption" color="subtle" className="text-[12px] shrink-0">
                    {cert.year}
                  </Text>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
