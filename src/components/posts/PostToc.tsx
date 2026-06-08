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

  // Slide indicator + keep active item visible in the TOC container
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const item = listRef.current.querySelector(
      `[data-toc-id="${activeId}"]`,
    ) as HTMLElement | null;
    if (!item) return;

    setIndicator({ top: item.offsetTop, height: item.offsetHeight });

    // Find the nearest overflow-y scrollable ancestor (the sticky wrapper in PostDetailPage)
    let container: HTMLElement | null = item.parentElement;
    while (container) {
      const overflow = getComputedStyle(container).overflowY;
      if (overflow === "auto" || overflow === "scroll") break;
      container = container.parentElement;
    }
    if (!container) return;

    const pad = 24;
    const { top: itemTop, bottom: itemBottom } = item.getBoundingClientRect();
    const { top: cTop, bottom: cBottom } = container.getBoundingClientRect();

    if (itemTop < cTop + pad) {
      container.scrollBy({ top: itemTop - cTop - pad, behavior: "smooth" });
    } else if (itemBottom > cBottom - pad) {
      container.scrollBy({ top: itemBottom - cBottom + pad, behavior: "smooth" });
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
                 * Cascading diagonal connectors — depth가 깊어질수록
                 * 대각선이 누적되어 안쪽으로 파고드는 효과.
                 *
                 * h2: 메인 트랙(x=0)에서 대각선 1개
                 * h3: h2 context(x=0) + h3 own(x=10) 대각선 2개 cascade
                 *
                 * 각 SVG는 16×16 viewBox, (1,0)→(10,12) 동일 각도.
                 * 시작 left 위치만 10px씩 shift되어 깊이감을 표현.
                 */}
                {level >= 2 && (
                  <svg
                    viewBox="0 0 16 16"
                    className="pointer-events-none absolute -top-1.5 left-0 size-4"
                    aria-hidden
                  >
                    <line x1="1" y1="0" x2="10" y2="12" strokeWidth="1" className="stroke-border" />
                  </svg>
                )}
                {level >= 3 && (
                  <svg
                    viewBox="0 0 16 16"
                    className="pointer-events-none absolute -top-1.5 size-4"
                    style={{ left: "10px" }}
                    aria-hidden
                  >
                    <line x1="1" y1="0" x2="10" y2="12" strokeWidth="1" className="stroke-border" />
                  </svg>
                )}

                {/* Continuation vertical lines — sibling 항목 연결 */}
                {level === 2 && (
                  <div className="absolute w-px bg-border" style={{ left: "10px", top: "6px", bottom: 0 }} />
                )}
                {level === 3 && (
                  <div className="absolute w-px bg-border" style={{ left: "20px", top: "6px", bottom: 0 }} />
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
