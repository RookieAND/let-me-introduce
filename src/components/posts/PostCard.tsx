import { type Post } from "#/data/Posts";
import { Text } from "#/components/ui/text";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [monthStr, yearStr] = post.date.split(".");
  const month = `${monthStr.replace(/^0/, "")}월`;

  return (
    <a
      href={post.href}
      target="_blank"
      rel="noopener"
      className="group grid grid-cols-[120px_1fr_auto] gap-7 items-start px-2 py-[30px] border-t border-border transition-[background,padding,border-radius] duration-[250ms] hover:bg-surface hover:rounded-[14px] hover:px-[22px] max-[760px]:grid-cols-1 max-[760px]:gap-[10px]"
    >
      <div className="font-mono text-[12px] text-text-3 pt-1 leading-[1.5] max-[760px]:pt-0 max-[760px]:order-first">
        {month}
        <span className="block text-[13px] text-text-2 max-[760px]:inline max-[760px]:ml-[6px]">
          {yearStr}
        </span>
      </div>

      <div className="min-w-0">
        <Text variant="label" color="accent" className="tracking-[0.06em] mb-[9px] block">
          {post.cat}
        </Text>
        <Text
          variant="h4"
          className="text-[20px] leading-[1.3] mb-2 transition-colors duration-200 group-hover:text-accent-bright"
        >
          {post.title}
        </Text>
        <Text variant="body" color="muted" className="text-[14.5px] leading-[1.65] max-w-[64ch] mb-[14px]">
          {post.excerpt}
        </Text>
        <div className="flex flex-wrap gap-[7px]">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[11px] text-text-3 border border-border rounded-[6px] px-2 py-[3px]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="font-mono text-[12px] text-text-3 whitespace-nowrap pt-1 flex items-center gap-[7px] max-[760px]:hidden">
        {post.read}
        <span className="text-accent opacity-0 -translate-x-[6px] transition-all duration-[250ms] group-hover:opacity-100 group-hover:translate-x-0">
          ↗
        </span>
      </div>
    </a>
  );
}
