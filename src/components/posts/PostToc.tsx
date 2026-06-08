import { useEffect, useState } from "react";
import type { TocEntry } from "#/lib/markdown/slugify";

interface PostTocProps {
  headings: TocEntry[];
}

// Strip leading emoji/symbols, keep readable text
function cleanText(text: string): string {
  return text.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

export function PostToc({ headings }: PostTocProps) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const offset = 120;
      const scrollY = window.scrollY + offset;

      let current = headings[0].id;
      for (const { id } of headings) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) {
          current = id;
        }
      }
      setActiveId(current);
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

      {/* Vertical tabs line style — border track + active indicator */}
      <ul className="border-l border-border">
        {headings.map(({ id, text, level }) => {
          const isActive = activeId === id;
          const indent =
            level === 1 ? "pl-3" : level === 2 ? "pl-5" : "pl-7";

          return (
            <li key={id} className="relative">
              {/* Active indicator — overlays the border track */}
              <span
                className={`absolute left-0 top-0 bottom-0 w-[2px] rounded-full transition-all duration-200 ${
                  isActive ? "bg-accent opacity-100" : "opacity-0"
                }`}
              />
              <a
                href={`#${id}`}
                className={`block py-[5px] font-sans text-[12.5px] leading-[1.45] transition-colors duration-150 ${indent} ${
                  isActive
                    ? "text-text font-medium"
                    : "text-text-3 hover:text-text-2"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  setActiveId(id);
                }}
              >
                {cleanText(text)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
