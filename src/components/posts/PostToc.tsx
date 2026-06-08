import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TocEntry } from "#/lib/markdown/slugify";

function renderTocText(raw: string): ReactNode {
  const clean = raw.replace(/^[^\p{L}\p{N}`]+/u, "").trim();
  const parts = clean.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code
            key={i}
            className="font-mono text-[11px] bg-surface-2 border border-border px-1 py-px rounded text-text-2 leading-none"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function PostToc({ headings }: { headings: TocEntry[] }) {
  const [activeId, setActiveId] = useState("");
  const [indicator, setIndicator] = useState({ top: 0, height: 20 });
  const listRef = useRef<HTMLUListElement>(null);

  // Viewport-based active heading detection
  useEffect(() => {
    if (headings.length === 0) return;
    const NAV_HEIGHT = 68;

    const handleScroll = () => {
      const inViewport: { id: string; top: number }[] = [];
      let lastAbove: string | null = null;

      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (!el) continue;
        const { top } = el.getBoundingClientRect();
        if (top >= NAV_HEIGHT && top < window.innerHeight) {
          inViewport.push({ id, top });
        } else if (top < NAV_HEIGHT) {
          lastAbove = id;
        }
      }

      if (inViewport.length > 0) {
        setActiveId(inViewport.reduce((a, b) => (a.top < b.top ? a : b)).id);
      } else if (lastAbove) {
        setActiveId(lastAbove);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  // Slide indicator to the active item — top & height transition like Vapor UI
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const item = listRef.current.querySelector(
      `[data-toc-id="${activeId}"]`,
    ) as HTMLElement | null;
    if (item) {
      setIndicator({ top: item.offsetTop, height: item.offsetHeight });
    }
  }, [activeId]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="목차">
      <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-3 mb-3 pl-3">
        On this page
      </p>

      <div className="relative">
        {/* Static track line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />

        {/*
         * Sliding indicator — single element, transitions `top` and `height`.
         * Moves to the active item instead of fading in/out per item.
         */}
        <div
          className="absolute left-0 w-[2px] bg-accent rounded-full transition-[top,height] duration-200 ease-out"
          style={{ top: indicator.top, height: indicator.height }}
        />

        <ul ref={listRef} className="relative">
          {headings.map(({ id, text, level }) => {
            const isActive = activeId === id;
            const textIndent =
              level === 1 ? "pl-4" : level === 2 ? "pl-[26px]" : "pl-[40px]";

            return (
              <li key={id} className="relative">
                {/*
                 * SVG diagonal connector — matches Vapor UI's approach.
                 * A line from (1,0) → (10,12) inside a 16×16 viewBox
                 * creates a gentle diagonal bend from the track into the item.
                 *
                 * h2: branches from the main track (left-0)
                 * h3: branches from the h2 continuation level (left=[10px])
                 */}
                {level === 2 && (
                  <svg
                    viewBox="0 0 16 16"
                    className="pointer-events-none absolute -top-1.5 left-0 size-4"
                    aria-hidden
                  >
                    <line
                      x1="1" y1="0" x2="10" y2="12"
                      strokeWidth="1"
                      className="stroke-border"
                    />
                  </svg>
                )}
                {level === 3 && (
                  <svg
                    viewBox="0 0 16 16"
                    className="pointer-events-none absolute -top-1.5 size-4"
                    style={{ left: "10px" }}
                    aria-hidden
                  >
                    <line
                      x1="1" y1="0" x2="10" y2="12"
                      strokeWidth="1"
                      className="stroke-border"
                    />
                  </svg>
                )}

                {/* Continuation vertical line for h2 — connects sibling h2 items */}
                {level === 2 && (
                  <div
                    className="absolute w-px bg-border"
                    style={{ left: "10px", top: "6px", bottom: 0 }}
                  />
                )}

                <a
                  href={`#${id}`}
                  data-toc-id={id}
                  className={`block py-[5px] font-sans text-[12.5px] leading-[1.45] transition-colors duration-150 ${textIndent} ${
                    isActive ? "text-text font-medium" : "text-text-3 hover:text-text-2"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActiveId(id);
                  }}
                >
                  {renderTocText(text)}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
