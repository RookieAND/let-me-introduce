import { Footer } from "#/components/Footer";
import { Nav } from "#/components/Nav";
import { FeaturedPost } from "#/components/posts/FeaturedPost";
import { PostsHeader } from "#/components/posts/PostsHeader";
import { PostsList } from "#/components/posts/PostsList";
import { PostsToolbar } from "#/components/posts/PostsToolbar";
import { usePostsParams } from "#/hooks/UsePostsParams";

export function PostsPage() {
  const { activeCat, query } = usePostsParams();

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
        <PostsToolbar />
      </div>
      {!isFiltering && (
        <div className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
          <FeaturedPost />
        </div>
      )}
      <main className="max-w-280 mx-auto px-8 w-full max-[520px]:px-5">
        <PostsList />
      </main>
      <Footer variant="posts" />
    </>
  );
}
