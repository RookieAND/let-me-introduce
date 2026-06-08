import { debounce } from "es-toolkit";
import { useMemo, useState } from "react";
import { Footer } from "#/components/Footer";
import { Nav } from "#/components/Nav";
import { FeaturedPost } from "#/components/posts/FeaturedPost";
import { PostsHeader } from "#/components/posts/PostsHeader";
import { PostsList } from "#/components/posts/PostsList";
import { PostsToolbar } from "#/components/posts/PostsToolbar";
import type { Category } from "#/data/Posts";

export function PostsPage() {
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");

  const handleQueryChange = useMemo(() => debounce((q: string) => setQuery(q), 120), []);

  const isFiltering = activeCat !== "all" || query.trim().length > 0;

  return (
    <>
      <Nav alwaysScrolled>
        <Nav.Link to="/" className="text-text-3 hover:text-text">
          ← Portfolio
        </Nav.Link>
        <Nav.Link to="/posts" className="text-accent cursor-default pointer-events-none">
          Writing
        </Nav.Link>
      </Nav>
      <PostsHeader />
      <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <PostsToolbar
          activeCat={activeCat}
          query={query}
          onCatChange={setActiveCat}
          onQueryChange={handleQueryChange}
        />
      </div>
      {!isFiltering && (
        <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
          <FeaturedPost />
        </div>
      )}
      <main className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <PostsList activeCat={activeCat} query={query} />
      </main>
      <Footer variant="posts" />
    </>
  );
}
