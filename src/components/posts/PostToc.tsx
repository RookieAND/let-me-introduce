import { useEffect, useState, type ReactNode } from "react";
import type { TocEntry } from "#/lib/markdown/slugify";

interface PostTocProps {
  headings: TocEntry[];
}

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

export function PostToc({ headings }: PostTocProps) {
  const [activeId, setActiveId] = useState("");

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

  if (headings.length < 2) return null;

  return (
    <nav aria-label="목차">
      <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-3 mb-3 pl-3">
        On this page
      </p>

      <ul className="border-l border-border">
        {headings.map(({ id, text, level }) => {
          const isActive = activeId === id;

          /*
           * Indent per level:
           *   h1 → pl-4  (16px)
           *   h2 → pl-6  (24px) — connector occupies 0~16px, 8px gap
           *   h3 → pl-10 (40px) — connector occupies 16~30px, 10px gap
           */
          const textIndent =
            level === 1 ? "pl-4" : level === 2 ? "pl-6" : "pl-10";

          return (
            <li key={id} className="relative">
              {/* Active indicator — overlays the border track */}
              <span
                className={`absolute left-0 inset-y-0 w-[2px] rounded-full transition-all duration-200 ${
                  isActive ? "bg-accent opacity-100" : "opacity-0"
                }`}
              />

              {/*
               * CSS-drawn depth connector.
               * The span is positioned absolutely so its left border aligns
               * with the ul's border-l track, then bends right at mid-height.
               *
               *  h2: starts at the main track (left-0), width 16px
               *  h3: starts at h2 text level (left-4 = 16px), width 14px
               *
               * border-l  = vertical segment (continues the track down to midpoint)
               * border-b  = horizontal segment (bends right toward the text)
               * rounded-bl = smooth corner at the bend
               */}
              {level === 2 && (
                <span
                  className="pointer-events-none absolute left-0 top-0 w-4 h-[calc(50%+1px)] border-l border-b border-border rounded-bl"
                  aria-hidden
                />
              )}
              {level === 3 && (
                <span
                  className="pointer-events-none absolute left-4 top-0 w-[14px] h-[calc(50%+1px)] border-l border-b border-border rounded-bl"
                  aria-hidden
                />
              )}

              <a
                href={`#${id}`}
                className={`block py-[5px] font-sans text-[12.5px] leading-[1.45] transition-colors duration-150 ${textIndent} ${
                  isActive ? "text-text font-medium" : "text-text-3 hover:text-text-2"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setActiveId(id);
                }}
              >
                {renderTocText(text)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
