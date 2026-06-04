import { AWARDS, CERTS } from "#/data/Portfolio";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function Contact() {
  return (
    <section className="pt-[130px] pb-20" id="contact">
      <div className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5 text-center">
        <Reveal>
          <Text
            variant="h1"
            className="text-[clamp(36px,6vw,76px)] tracking-[-0.025em] leading-[1.04] mb-[22px]"
          >
            함께{" "}
            <span className="bg-gradient-to-r from-accent to-accent-bright bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">
              맥락
            </span>
            을 만들어요.
          </Text>
        </Reveal>

        <Reveal delay={0.08}>
          <Text variant="body" color="muted" className="text-[17px] mb-11">
            새로운 문제와 좋은 팀을 언제든 기다리고 있습니다.
          </Text>
        </Reveal>

        <Reveal delay={0.16} className="inline-flex flex-wrap gap-[14px] justify-center">
          {[
            { label: "Email", text: "gwangin1999@naver.com", href: "mailto:gwangin1999@naver.com" },
            { label: "GitHub", text: "RookieAND ↗", href: "https://github.com/RookieAND" },
            { label: "Blog", text: "velog/@rookieand ↗", href: "https://velog.io/@rookieand/posts" },
          ].map(({ label, text, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("mailto") ? undefined : "_blank"}
              rel={href.startsWith("mailto") ? undefined : "noopener"}
              className="group inline-flex items-center gap-[11px] px-6 py-[15px] rounded-[11px] border border-border-strong font-mono text-[14px] text-text bg-surface transition-all duration-[250ms] hover:border-accent hover:bg-accent-dim hover:-translate-y-[3px]"
            >
              <span className="text-text-3 group-hover:text-accent-bright transition-colors duration-[250ms]">
                {label}
              </span>
              {text}
            </a>
          ))}
        </Reveal>

        <div className="mt-[90px] grid grid-cols-2 gap-[18px] max-w-[880px] mx-auto text-left max-[700px]:grid-cols-1">
          <Reveal>
            <div className="bg-surface border border-border rounded-[14px] p-6">
              <Text variant="label" color="subtle" className="tracking-[0.08em] mb-4 block">
                Awards
              </Text>
              {AWARDS.map((award) => (
                <div key={award.name} className="flex justify-between gap-3 py-[9px] border-t border-border first:border-t-0 text-[14px]">
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
                <div key={cert.name} className="flex justify-between gap-3 py-[9px] border-t border-border first:border-t-0 text-[14px]">
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
