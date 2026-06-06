import { Link } from "react-router-dom";
import { FEATURED_POST } from "#/data/Posts";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";

const CARD_CLASS =
  "group grid border border-border rounded-[18px] overflow-hidden bg-gradient-to-r from-surface to-bg-soft transition-[border-color] duration-300 hover:border-border-strong block";

function FeaturedCardInner() {
  return (
    <div className="p-9.5 max-[520px]:p-6">
      <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-accent-bright bg-accent-dim border border-[rgba(91,141,239,0.3)] rounded-md px-2.5 py-1 inline-flex items-center gap-1.75">
        ★ Featured
      </span>
      <div className="flex gap-3.5 items-center font-mono text-[12px] text-text-3 mt-5.5 mb-3 flex-wrap">
        <span className="text-accent">{FEATURED_POST.cat}</span>
        <span>·</span>
        <span>{FEATURED_POST.date}</span>
        <span>·</span>
        <span>{FEATURED_POST.read}</span>
      </div>
      <Text variant="heading4" className="text-[clamp(24px,3.2vw,36px)] mb-3.5 max-w-[22ch]">
        {FEATURED_POST.title}
      </Text>
      <Text variant="body1" color="muted" className="max-w-[60ch] mb-5.5">
        {FEATURED_POST.excerpt}
      </Text>
      <span className="font-mono text-[13px] text-accent-bright inline-flex items-center gap-2 transition-[gap] duration-200 group-hover:gap-3.25">
        자세히 읽기 {FEATURED_POST.content ? "→" : "↗"}
      </span>
    </div>
  );
}

export function FeaturedPost() {
  return (
    <section className="pt-11 pb-10">
      <Reveal as="div">
        {FEATURED_POST.content ? (
          <Link to={`/posts/${FEATURED_POST.slug}`} className={CARD_CLASS}>
            <FeaturedCardInner />
          </Link>
        ) : (
          <a
            href={FEATURED_POST.href}
            target="_blank"
            rel="noreferrer noopener"
            className={CARD_CLASS}
          >
            <FeaturedCardInner />
          </a>
        )}
      </Reveal>
    </section>
  );
}
