import { Text } from "#/components/ui/text";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

const NAV_BTN =
  "w-8.5 h-8.5 flex items-center justify-center rounded-lg border border-border text-text-3 transition-all duration-200 hover:border-border-strong hover:text-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer";

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 py-10">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="이전 페이지"
        className={NAV_BTN}
      >
        <svg
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <Text
            key={`ellipsis-${i}`}
            as="span"
            variant="caption"
            color="subtle"
            className="w-8.5 h-8.5 flex items-center justify-center"
          >
            …
          </Text>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={
              p === page
                ? "w-8.5 h-8.5 flex items-center justify-center rounded-lg font-mono text-xs bg-accent text-white cursor-default"
                : "w-8.5 h-8.5 flex items-center justify-center rounded-lg font-mono text-xs border border-border text-text-3 hover:border-border-strong hover:text-text transition-all duration-200 cursor-pointer"
            }
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="다음 페이지"
        className={NAV_BTN}
      >
        <svg
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
