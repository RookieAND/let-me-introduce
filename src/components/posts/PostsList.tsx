import { type Category, POSTS } from "#/data/Posts";
import { PostCard } from "./PostCard";

interface PostsListProps {
  activeCat: Category | "all";
  query: string;
}

export function PostsList({ activeCat, query }: PostsListProps) {
  const q = query.trim().toLowerCase();

  const filtered = POSTS.filter((p) => {
    const matchCat = activeCat === "all" || p.cat === activeCat;
    const hay = [p.title, p.excerpt, ...p.tags, p.cat].join(" ").toLowerCase();
    const matchQ = !q || hay.includes(q);
    return matchCat && matchQ;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-[70px] text-text-3 font-mono text-[14px]">
        // 조건에 맞는 글이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-[110px]">
      {filtered.map((post) => (
        <PostCard key={post.title} post={post} />
      ))}
    </div>
  );
}
