import { Link } from "react-router-dom";
import { Reveal } from "#/components/ui/reveal";
import { Text } from "#/components/ui/text";
import { FEATURED_POST } from "#/data/Posts";

const CARD_CLASS =
  "group grid border border-border rounded-card-lg overflow-hidden bg-gradient-to-r from-surface to-bg-soft transition-[border-color] duration-300 hover:border-border-strong block";

function FeaturedCardInner() {
  return (
    <div className="p-9.5 max-compact:p-6">
      <Text
        as="span"
        fontFamily="mono"
        color="bright"
        className="text-[11px] tracking-[0.1em] uppercase bg-accent-dim border border-[rgba(91,141,239,0.3)] rounded-md px-2.5 py-1 inline-flex items-center gap-1.75"
      >
        ★ Featured
      </Text>
      <Text as="div" variant="caption" color="subtle" fontFamily="mono" className="flex gap-3.5 items-center mt-5.5 mb-3 flex-wrap">
        <span className="text-accent">{FEATURED_POST.cat}</span>
        <span>·</span>
        <span>{FEATURED_POST.date.slice(0, 7).replace("-", ".")}</span>
        <span>·</span>
        <span>{FEATURED_POST.read}</span>
      </Text>
      <Text variant="heading4" className="text-[clamp(24px,3.2vw,36px)] mb-3.5 max-w-30ch">
        {FEATURED_POST.title}
      </Text>
      <div className="max-w-60ch mb-5.5 flex flex-col gap-1.5">
        {FEATURED_POST.excerpt.map((line) => (
          <Text key={line} variant="body1" color="muted">
            {line}
          </Text>
        ))}
      </div>
      <Text
        as="span"
        fontFamily="mono"
        color="bright"
        className="text-[13px] inline-flex items-center gap-2 transition-[gap] duration-200 group-hover:gap-3.25"
      >
        자세히 읽기 {FEATURED_POST.href.startsWith("/") ? "→" : "↗"}
      </Text>
    </div>
  );
}

export function FeaturedPost() {
  return (
    <section className="pt-11 pb-10">
      <Reveal as="div">
        {FEATURED_POST.href.startsWith("/") ? (
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
