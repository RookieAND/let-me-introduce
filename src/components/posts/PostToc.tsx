import { minBy } from "es-toolkit";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { TocEntry } from "#/lib/markdown/slugify";

const NAV_HEIGHT = 68;
const DEPTH_LEFT: Record<number, number> = { 1: 0, 2: 10, 3: 20 };
const TEXT_INDENT: Record<number, string> = { 1: "pl-4", 2: "pl-[26px]", 3: "pl-[40px]" };

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

function findScrollContainer(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

export function PostToc({ headings }: { headings: TocEntry[] }) {
  const [activeId, setActiveId] = useState("");
  const [indicator, setIndicator] = useState({ top: 0, height: 20, left: 0 });
  const listRef = useRef<HTMLUListElement>(null);

  // viewport 기반 active 헤딩 감지
  useEffect(() => {
    if (headings.length === 0) return;

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
        const topmost = minBy(inViewport, (item) => item.top);
        if (topmost) setActiveId(topmost.id);
      } else if (lastAbove) {
        setActiveId(lastAbove);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  // 인디케이터 위치 업데이트 + TOC 컨테이너 자동 스크롤
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-toc-id="${activeId}"]`) as HTMLElement | null;
    if (!item) return;

    const level = headings.find((h) => h.id === activeId)?.level ?? 1;
    // a.offsetParent = li(relative) → a.offsetTop은 항상 0. li 기준으로 측정해야 함.
    const li = item.parentElement as HTMLElement;
    setIndicator({ top: li.offsetTop, height: li.offsetHeight, left: DEPTH_LEFT[level] ?? 0 });

    const container = findScrollContainer(item);
    if (!container) return;

    const PAD = 24;
    const { top: iTop, bottom: iBottom } = item.getBoundingClientRect();
    const { top: cTop, bottom: cBottom } = container.getBoundingClientRect();

    if (iTop < cTop + PAD) {
      container.scrollBy({ top: iTop - cTop - PAD, behavior: "smooth" });
    } else if (iBottom > cBottom - PAD) {
      container.scrollBy({ top: iBottom - cBottom + PAD, behavior: "smooth" });
    }
  }, [activeId, headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="목차">
      <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-3 mb-3 pl-3">
        On this page
      </p>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
        <div
          className="absolute w-[2px] bg-accent rounded-full transition-[top,height,left] duration-200 ease-out"
          style={{ top: indicator.top, height: indicator.height, left: indicator.left }}
        />

        <ul ref={listRef} className="relative">
          {headings.map(({ id, text, level }) => (
            <li key={id} className="relative">
              {/* depth별 cascade 대각선 — level >= 2마다 10px씩 안쪽으로 */}
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

              {/* sibling 연결 continuation line */}
              {level === 2 && (
                <div
                  className="absolute w-px bg-border"
                  style={{ left: "10px", top: "6px", bottom: 0 }}
                />
              )}
              {level === 3 && (
                <div
                  className="absolute w-px bg-border"
                  style={{ left: "20px", top: "6px", bottom: 0 }}
                />
              )}

              <a
                href={`#${id}`}
                data-toc-id={id}
                className={`block py-[5px] font-sans text-[12.5px] leading-[1.45] transition-colors duration-150 ${TEXT_INDENT[level] ?? "pl-4"} ${
                  activeId === id ? "text-text font-medium" : "text-text-3 hover:text-text-2"
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
          ))}
        </ul>
      </div>
    </nav>
  );
}
