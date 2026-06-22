import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Footer } from "#/components/Footer";
import { Nav } from "#/components/Nav";
import { PostToc } from "#/components/posts/PostToc";
import { Text } from "#/components/ui/text";
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
        className="fixed top-0 left-0 h-0.5 bg-accent z-[200] transition-[width] duration-75 ease-linear"
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
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_min(740px,100%)_1fr] max-w-article xl:max-w-none mx-auto">
          {/* Left col: TOC (xl only) */}
          <div className="hidden xl:flex justify-end pr-10 items-start">
            <div className="sticky top-28 w-50 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide">
              <PostToc headings={headings} />
            </div>
          </div>

          {/* Center col: article */}
          <article className="px-8 max-compact:px-5">
            <Text
              variant="caption"
              color="subtle"
              fontFamily="mono"
              asChild
              className="group inline-flex items-center gap-2 hover:text-text mb-10 transition-colors duration-150"
            >
              <Link to="/posts">
                <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
                글 목록으로
              </Link>
            </Text>

            <header className="mb-10">
              <Text
                as="div"
                fontFamily="mono"
                color="accent"
                className="text-[11.5px] tracking-[0.1em] uppercase mb-4"
              >
                {post.cat}
              </Text>
              <Text
                as="h1"
                fontFamily="display"
                className="font-semibold text-[clamp(26px,4vw,44px)] leading-[1.15] tracking-[-0.02em] mb-5"
              >
                {post.title}
              </Text>
              <div className="mb-6 max-w-58ch flex flex-col gap-1.5">
                {post.excerpt.map((line) => (
                  <Text key={line} variant="body1" color="muted" className="text-[16px] leading-[1.75]">
                    {line}
                  </Text>
                ))}
              </div>
              <Text as="div" variant="caption" color="subtle" fontFamily="mono" className="flex items-center gap-3.5 flex-wrap">
                <span>
                  {yearStr}년 {monthNum}월
                </span>
                <span className="text-border-strong">·</span>
                <span>{post.read} read</span>
              </Text>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.75 mt-5">
                  {post.tags.map((tag) => (
                    <Text
                      as="span"
                      key={tag}
                      fontFamily="mono"
                      color="subtle"
                      className="text-[11px] border border-border rounded-md px-2 py-0.75"
                    >
                      #{tag}
                    </Text>
                  ))}
                </div>
              )}
            </header>

            <hr className="border-0 border-t border-border mb-12" />

            <MarkdownRenderer content={content} />

            <div className="mt-16 pt-8 border-t border-border">
              <Text
                variant="caption"
                color="subtle"
                fontFamily="mono"
                asChild
                className="group inline-flex items-center gap-2 hover:text-text transition-colors duration-150"
              >
                <Link to="/posts">
                  <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
                  모든 글 보기
                </Link>
              </Text>
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
