import { Link } from "react-router-dom";
import { Text } from "#/components/ui/text";
import type { Post } from "#/data/Posts";

interface PostCardProps {
  post: Post;
}

const CARD_CLASS =
  "group grid grid-cols-[120px_1fr_auto] gap-7 items-start px-2 py-7.5 border-t border-border transition-[background] duration-250 hover:bg-surface max-[760px]:grid-cols-1 max-[760px]:gap-2.5";

function CardInner({ post }: { post: Post }) {
  const [yearStr, monthStr] = post.date.split("-");
  const month = `${monthStr.replace(/^0/, "")}월`;

  return (
    <>
      <div className="font-mono text-[12px] text-text-3 pt-1 leading-[1.5] max-[760px]:pt-0 max-[760px]:order-first">
        {month}
        <span className="block text-[13px] text-text-2 max-[760px]:inline max-[760px]:ml-1.5">
          {yearStr}
        </span>
      </div>

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
        <Text variant="body2" color="muted" className="max-w-[64ch] mb-3.5">
          {post.excerpt}
        </Text>
        <div className="flex flex-wrap gap-1.75">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[11px] text-text-3 border border-border rounded-md px-2 py-0.75"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="font-mono text-[12px] text-text-3 whitespace-nowrap pt-1 flex items-center gap-1.75 max-[760px]:hidden">
        {post.read}
        <span className="text-accent opacity-0 -translate-x-1.5 transition-all duration-250 group-hover:opacity-100 group-hover:translate-x-0">
          {post.content ? "→" : "↗"}
        </span>
      </div>
    </>
  );
}

export function PostCard({ post }: PostCardProps) {
  if (post.content) {
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
