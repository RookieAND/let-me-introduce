import { Link } from "react-router-dom";
import { Text } from "#/components/ui/text";
import type { Post } from "#/data/Posts";

interface PostCardProps {
  post: Post;
}

const CARD_CLASS =
  "group grid grid-cols-[120px_1fr_auto] gap-7 items-start px-2 py-7.5 border-t border-border transition-[background] duration-250 hover:bg-surface max-tablet:grid-cols-1 max-tablet:gap-2.5";

function CardInner({ post }: { post: Post }) {
  const [yearStr, monthStr] = post.date.split("-");
  const month = `${monthStr.replace(/^0/, "")}월`;

  return (
    <>
      <Text as="div" variant="caption" color="subtle" className="pt-1 leading-normal max-tablet:pt-0 max-tablet:order-first">
        {month}
        <Text as="span" variant="body3" color="muted" className="block max-tablet:inline max-tablet:ml-1.5">
          {yearStr}
        </Text>
      </Text>

      <div className="min-w-0">
        <Text variant="label" color="accent" className="tracking-[0.06em] mb-2.25 block">
          {post.cat}
        </Text>
        <Text
          variant="heading5"
          className="leading-[1.3] mb-2 transition-colors duration-200 group-hover:text-accent-bright"
        >
          {post.title}
        </Text>
        <div className="max-w-64ch mb-3.5 flex flex-col gap-1">
          {post.excerpt.map((line) => (
            <Text key={line} variant="body2" color="muted">
              {line}
            </Text>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.75">
          {post.tags.map((tag) => (
            <Text
              as="span"
              key={tag}
              variant="caption"
              color="subtle"
              className="text-[11px] border border-border rounded-md px-2 py-0.75"
            >
              #{tag}
            </Text>
          ))}
        </div>
      </div>

      <Text as="div" variant="caption" color="subtle" className="whitespace-nowrap pt-1 flex items-center gap-1.75 max-tablet:hidden">
        {post.read}
        <span className="text-accent opacity-0 -translate-x-1.5 transition-all duration-250 group-hover:opacity-100 group-hover:translate-x-0">
          {post.href.startsWith("/") ? "→" : "↗"}
        </span>
      </Text>
    </>
  );
}

export function PostCard({ post }: PostCardProps) {
  if (post.href.startsWith("/")) {
    return (
      <Link to={`/posts/${post.slug}`} className={CARD_CLASS}>
        <CardInner post={post} />
      </Link>
    );
  }

  return (
    <a href={post.href} target="_blank" rel="noreferrer noopener" className={CARD_CLASS}>
      <CardInner post={post} />
    </a>
  );
}
