import { Link } from "react-router-dom";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";
import { AWARDS, CERTS } from "#/data/Portfolio";

export function Contact() {
  return (
    <section className="pt-32.5 pb-20" id="contact">
      <div className="max-w-280 mx-auto px-8 w-full max-compact:px-5 text-center">
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

        <Reveal
          delay={0.16}
          className="inline-flex flex-wrap gap-3.5 justify-center max-compact:flex-col max-compact:w-full"
        >
          <Text
            as="a"
            href="mailto:gwangin1999@naver.com"
            variant="body2"
            color="default"
            className="group inline-flex items-center gap-2.75 px-6 py-3.75 rounded-btn border border-border-strong bg-surface transition-all duration-250 hover:border-accent hover:bg-accent-dim hover:-translate-y-0.75 max-compact:w-full max-compact:justify-between"
          >
            <Text as="span" variant="caption" color="subtle" className="group-hover:text-accent-bright transition-colors duration-250">
              Email
            </Text>
            gwangin1999@naver.com
          </Text>
          <Text
            as="a"
            href="https://github.com/RookieAND"
            target="_blank"
            rel="noreferrer noopener"
            variant="body2"
            color="default"
            className="group inline-flex items-center gap-2.75 px-6 py-3.75 rounded-btn border border-border-strong bg-surface transition-all duration-250 hover:border-accent hover:bg-accent-dim hover:-translate-y-0.75 max-compact:w-full max-compact:justify-between"
          >
            <Text as="span" variant="caption" color="subtle" className="group-hover:text-accent-bright transition-colors duration-250">
              GitHub
            </Text>
            RookieAND ↗
          </Text>
          <Text
            variant="body2"
            color="default"
            asChild
            className="group inline-flex items-center gap-2.75 px-6 py-3.75 rounded-btn border border-border-strong bg-surface transition-all duration-250 hover:border-accent hover:bg-accent-dim hover:-translate-y-0.75 max-compact:w-full max-compact:justify-between"
          >
            <Link to="/posts">
              <Text as="span" variant="caption" color="subtle" className="group-hover:text-accent-bright transition-colors duration-250">
                Writing
              </Text>
              기록 보기
            </Link>
          </Text>
        </Reveal>

        <div className="mt-22.5 grid grid-cols-2 gap-4.5 max-w-220 mx-auto text-left max-tablet:grid-cols-1">
          <Reveal>
            <div className="bg-surface border border-border rounded-card p-6">
              <Text variant="label" color="subtle" className="tracking-[0.08em] mb-4 block">
                Awards
              </Text>
              {AWARDS.map((award) => (
                <div
                  key={award.name}
                  className="flex justify-between gap-3 py-2.25 border-t border-border first:border-t-0"
                >
                  <Text as="span" variant="body2" color="default">
                    {award.name}{" "}
                    <Text as="strong" color="bright" className="font-semibold">{award.prize}</Text>
                  </Text>
                  <Text variant="caption" color="subtle" className="text-[12px] shrink-0">
                    {award.year}
                  </Text>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="bg-surface border border-border rounded-card p-6">
              <Text variant="label" color="subtle" className="tracking-[0.08em] mb-4 block">
                Certificates &amp; Education
              </Text>
              {CERTS.map((cert) => (
                <div
                  key={cert.name}
                  className="flex justify-between items-start gap-3 py-2.25 border-t border-border first:border-t-0"
                >
                  <Text as="span" variant="body2" color="default">{cert.name}</Text>
                  <Text variant="caption" color="subtle" className="text-[12px] shrink-0 whitespace-nowrap">
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
