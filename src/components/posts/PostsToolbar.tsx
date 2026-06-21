import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { debounce, groupBy } from "es-toolkit";
import { type ChangeEvent, useEffect, useId, useMemo, useState } from "react";
import { CATEGORIES, type Category, POSTS } from "#/data/Posts";
import { usePostsParams } from "#/hooks/UsePostsParams";
import { cn } from "#/lib/Utils";

const grouped = groupBy(POSTS, (p) => p.cat);
const counts: Record<string, number> = {
  all: POSTS.length,
  ...Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])),
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "전체",
  Frontend: "Frontend",
  JavaScript: "Javascript",
  TypeScript: "Typescript",
  Backend: "Backend",
  Architecture: "Architecture",
  Tooling: "Build / Bundle",
  "DB / Infra": "DB / Infra",
  Retrospective: "Retrospective",
};

export function PostsToolbar() {
  const searchId = useId();
  const { activeCat, query, setActiveCat, setQuery } = usePostsParams();
  const [inputValue, setInputValue] = useState(query);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const handleSearch = useMemo(
    () =>
      debounce((q: string) => {
        setQuery(q);
      }, 120),
    [setQuery],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    handleSearch(e.target.value);
  };

  const handleCatChange = (val: string) => {
    if (val) setActiveCat(val as Category | "all");
  };

  return (
    <div className="flex items-center gap-4.5 flex-wrap py-5.5 border-b border-border">
      <ToggleGroupPrimitive.Root
        type="single"
        value={activeCat}
        onValueChange={handleCatChange}
        className="flex gap-2 flex-wrap"
        aria-label="카테고리 필터"
      >
        {CATEGORIES.map((cat) => (
          <ToggleGroupPrimitive.Item
            key={cat}
            value={cat}
            className={cn(
              "font-mono text-[12.5px] text-text-2 bg-transparent border border-border rounded-full px-3.75 py-2 cursor-pointer transition-all duration-200 tracking-[0.02em] hover:border-border-strong hover:text-text",
              activeCat === cat && "bg-accent border-accent text-white",
            )}
          >
            {CATEGORY_LABELS[cat]}
            <span className="opacity-60 ml-1.5">{counts[cat] ?? 0}</span>
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>

      <div className="ml-auto relative max-[640px]:ml-0 max-[640px]:w-full">
        <label htmlFor={searchId} className="sr-only">
          글 검색
        </label>
        <span className="absolute left-3.25 top-1/2 -translate-y-1/2 text-text-3 text-[14px] pointer-events-none select-none">
          ⌕
        </span>
        <input
          id={searchId}
          type="text"
          placeholder="search posts…"
          value={inputValue}
          onChange={handleChange}
          className="font-sans text-[13px] text-text bg-surface border border-border rounded-[9px] py-2.25 pl-9 pr-3.5 w-52.5 transition-[border-color,width] duration-200 outline-none placeholder:text-text-3 focus:border-accent focus:w-62.5 max-[640px]:w-full max-[640px]:focus:w-full"
        />
      </div>
    </div>
  );
}
