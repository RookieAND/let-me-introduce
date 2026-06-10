import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CATEGORIES, type Category } from "#/data/Posts";

function parseCat(raw: string | null): Category | "all" {
  return CATEGORIES.includes(raw as Category | "all") ? (raw as Category | "all") : "all";
}

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function usePostsParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCat = parseCat(searchParams.get("cat"));
  const query = searchParams.get("q") ?? "";
  const page = parsePage(searchParams.get("page"));

  const setActiveCat = useCallback(
    (cat: Category | "all") => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (cat === "all") next.delete("cat");
        else next.set("cat", cat);
        next.delete("page");
        return next;
      });
    },
    [setSearchParams],
  );

  const setQuery = useCallback(
    (q: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!q.trim()) next.delete("q");
          else next.set("q", q);
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (p: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (p === 1) next.delete("page");
        else next.set("page", String(p));
        return next;
      });
    },
    [setSearchParams],
  );

  return { activeCat, query, page, setActiveCat, setQuery, setPage };
}
