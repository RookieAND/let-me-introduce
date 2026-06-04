import { FEATURED_POST } from "#/data/Posts";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

export function FeaturedPost() {
  return (
    <section className="pt-11 pb-0">
      <Reveal as="div">
        <a
          href={FEATURED_POST.href}
          target="_blank"
          rel="noopener"
          className="group grid border border-border rounded-[18px] overflow-hidden bg-gradient-to-r from-surface to-bg-soft transition-[border-color,transform] duration-300 hover:border-border-strong hover:-translate-y-1 block"
        >
          <div className="p-[38px] max-[520px]:p-6">
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-accent-bright bg-accent-dim border border-[rgba(91,141,239,0.3)] rounded-[6px] px-[10px] py-[4px] inline-flex items-center gap-[7px]">
              ★ Featured
            </span>
            <div className="flex gap-[14px] items-center font-mono text-[12px] text-text-3 mt-[22px] mb-3 flex-wrap">
              <span className="text-accent">{FEATURED_POST.cat}</span>
              <span>·</span>
              <span>{FEATURED_POST.date}</span>
              <span>·</span>
              <span>{FEATURED_POST.read}</span>
            </div>
            <Text
              variant="h2"
              className="text-[clamp(24px,3.2vw,36px)] tracking-[-0.02em] leading-[1.2] mb-[14px] max-w-[22ch]"
            >
              {FEATURED_POST.title}
            </Text>
            <Text
              variant="body"
              color="muted"
              className="text-[15.5px] leading-[1.75] max-w-[60ch] mb-[22px]"
            >
              {FEATURED_POST.excerpt}
            </Text>
            <span className="font-mono text-[13px] text-accent-bright inline-flex items-center gap-2 transition-[gap] duration-200 group-hover:gap-[13px]">
              자세히 읽기 →
            </span>
          </div>
        </a>
      </Reveal>
    </section>
  );
}
