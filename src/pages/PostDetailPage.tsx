import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Footer } from "#/components/Footer";
import { Nav } from "#/components/Nav";
import { PostToc } from "#/components/posts/PostToc";
import { ALL_POSTS, CONTENT_LOADERS } from "#/data/Posts";
import { MarkdownRenderer } from "#/lib/Markdown";
import { extractHeadings } from "#/lib/markdown/slugify";
import { tokenize } from "#/lib/markdown/tokenize";

export function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [progress, setProgress] = useState(0);
  const [content, setContent] = useState<string | null>(null);

  const post = ALL_POSTS.find((p) => p.slug === slug);
  const loader = slug ? CONTENT_LOADERS[slug] : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (el.scrollTop / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!loader) return;
    setContent(null);
    loader().then(setContent);
  }, [loader]);

  if (!post || !loader) return <Navigate to="/posts" replace />;
  if (!content) return null;

  const [yearStr, monthStr] = post.date.split("-");
  const monthNum = monthStr.replace(/^0/, "");

  const headings = extractHeadings(tokenize(content));

  return (
    <>
      <div
        className="fixed top-0 left-0 h-[2px] bg-accent z-[200] transition-[width] duration-75 ease-linear"
        style={{ width: `${progress}%` }}
        aria-hidden
      />

      <Nav alwaysScrolled>
        <Nav.Link to="/" className="text-text-3 hover:text-text">
          ← Portfolio
        </Nav.Link>
        <Nav.Link to="/posts" className="text-text-3 hover:text-text">
          Writing
        </Nav.Link>
      </Nav>

      {/*
        3-column grid on xl+: [auto | article(≤740px) | auto]
        TOC lives in the left auto column, right-aligned.
        Article stays perfectly centered on all screen sizes.
      */}
      <div className="pt-32 pb-28">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_min(740px,100%)_1fr] max-w-[740px] xl:max-w-none mx-auto">
          {/* Left col: TOC (xl only) */}
          <div className="hidden xl:flex justify-end pr-10 items-start">
            <div className="sticky top-28 w-[200px] max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide">
              <PostToc headings={headings} />
            </div>
          </div>

          {/* Center col: article */}
          <article className="px-8 max-[520px]:px-5">
            <Link
              to="/posts"
              className="group inline-flex items-center gap-2 font-mono text-[12.5px] text-text-3 hover:text-text mb-10 transition-colors duration-150"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">
                ←
              </span>
              글 목록으로
            </Link>

            <header className="mb-10">
              <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-accent mb-4">
                {post.cat}
              </div>
              <h1 className="font-display font-semibold text-[clamp(26px,4vw,44px)] leading-[1.15] tracking-[-0.02em] text-text mb-5">
                {post.title}
              </h1>
              <div className="mb-6 max-w-[58ch] flex flex-col gap-1.5">
                {post.excerpt.map((line) => (
                  <p key={line} className="font-sans text-[16px] leading-[1.75] text-text-2">
                    {line}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-3.5 font-mono text-[12.5px] text-text-3 flex-wrap">
                <span>
                  {yearStr}년 {monthNum}월
                </span>
                <span className="text-border-strong">·</span>
                <span>{post.read} read</span>
              </div>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.75 mt-5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[11px] text-text-3 border border-border rounded-md px-2 py-0.75"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <hr className="border-0 border-t border-border mb-12" />

            <MarkdownRenderer content={content} />

            <div className="mt-16 pt-8 border-t border-border">
              <Link
                to="/posts"
                className="group inline-flex items-center gap-2 font-mono text-[12.5px] text-text-3 hover:text-text transition-colors duration-150"
              >
                <span className="transition-transform duration-200 group-hover:-translate-x-1">
                  ←
                </span>
                모든 글 보기
              </Link>
            </div>
          </article>

          {/* Right col: empty (balances the grid) */}
          <div className="hidden xl:block" />
        </div>
      </div>

      <Footer variant="posts" />
    </>
  );
}
