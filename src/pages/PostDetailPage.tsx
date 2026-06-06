import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Footer } from "#/components/Footer";
import { Nav } from "#/components/Nav";
import { MarkdownRenderer } from "#/lib/Markdown";
import { ALL_POSTS } from "#/data/Posts";

export function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [progress, setProgress] = useState(0);

  const post = ALL_POSTS.find((p) => p.slug === slug);

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

  if (!post?.content) return <Navigate to="/posts" replace />;

  const [monthStr, yearStr] = post.date.split(".");
  const monthNum = monthStr.replace(/^0/, "");

  return (
    <>
      {/* Reading progress bar */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-accent z-[200] transition-[width] duration-75 ease-linear"
        style={{ width: `${progress}%` }}
        aria-hidden
      />

      <Nav alwaysScrolled />

      <article className="max-w-[740px] mx-auto px-8 pt-32 pb-28 max-[520px]:px-5">
        {/* Back */}
        <Link
          to="/posts"
          className="group inline-flex items-center gap-2 font-mono text-[12.5px] text-text-3 hover:text-text mb-10 transition-colors duration-150"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
          글 목록으로
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-accent mb-4">
            {post.cat}
          </div>
          <h1 className="font-display font-semibold text-[clamp(26px,4vw,44px)] leading-[1.15] tracking-[-0.02em] text-text mb-5">
            {post.title}
          </h1>
          <p className="font-sans text-[16px] leading-[1.75] text-text-2 mb-6 max-w-[58ch]">
            {post.excerpt}
          </p>
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

        {/* Content */}
        <MarkdownRenderer content={post.content} />

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border">
          <Link
            to="/posts"
            className="group inline-flex items-center gap-2 font-mono text-[12.5px] text-text-3 hover:text-text transition-colors duration-150"
          >
            <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
            모든 글 보기
          </Link>
        </div>
      </article>

      <Footer variant="posts" />
    </>
  );
}
