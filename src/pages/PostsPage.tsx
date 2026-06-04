import { useMemo, useState } from "react";
import { debounce } from "es-toolkit";
import { FeaturedPost } from "#/components/posts/FeaturedPost";
import { PostsList } from "#/components/posts/PostsList";
import { PostsHeader } from "#/components/posts/PostsHeader";
import { PostsToolbar } from "#/components/posts/PostsToolbar";
import { Footer } from "#/components/Footer";
import { Nav } from "#/components/Nav";
import { type Category } from "#/data/Posts";

export function PostsPage() {
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");

  const handleQueryChange = useMemo(
    () => debounce((q: string) => setQuery(q), 120),
    [],
  );

  const isFiltering = activeCat !== "all" || query.trim().length > 0;

  return (
    <>
      <Nav alwaysScrolled />
      <PostsHeader />
      <div className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5">
        <PostsToolbar
          activeCat={activeCat}
          query={query}
          onCatChange={setActiveCat}
          onQueryChange={handleQueryChange}
        />
      </div>
      {!isFiltering && (
        <div className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5">
          <FeaturedPost />
        </div>
      )}
      <main className="max-w-[1120px] mx-auto px-8 w-full max-[520px]:px-5">
        <PostsList activeCat={activeCat} query={query} />
      </main>
      <Footer variant="posts" />
    </>
  );
}
