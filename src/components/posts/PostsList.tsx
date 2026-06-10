import { Pagination } from "#/components/ui/pagination";
import { Text } from "#/components/ui/text";
import { POSTS } from "#/data/Posts";
import { usePostsParams } from "#/hooks/UsePostsParams";
import { PostCard } from "./PostCard";

const PAGE_SIZE = 10;

export function PostsList() {
  const { activeCat, query, page, setPage } = usePostsParams();

  const q = query.trim().toLowerCase();

  const filtered = POSTS.filter((p) => {
    const matchCat = activeCat === "all" || p.cat === activeCat;
    const hay = [p.title, ...p.excerpt, ...p.tags, p.cat].join(" ").toLowerCase();
    const matchQ = !q || hay.includes(q);
    return matchCat && matchQ;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-17.5">
        <Text variant="caption" color="subtle">
          {"// 조건에 맞는 글이 없습니다."}
        </Text>
      </div>
    );
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col">
      {paginated.map((post) => (
        <PostCard key={post.title} post={post} />
      ))}
      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
