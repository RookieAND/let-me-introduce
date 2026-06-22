import { Link } from "react-router-dom";
import { Text } from "#/components/ui/text";
import { useTheme } from "#/hooks/UseTheme";

interface FooterProps {
  variant?: "portfolio" | "posts";
}

export function Footer({ variant = "portfolio" }: FooterProps) {
  const { theme, toggle } = useTheme();
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="border-t border-border py-7.5">
      <div className="max-w-280 mx-auto px-8 w-full flex justify-between items-center flex-wrap gap-3">
        <Text as="span" variant="caption" color="subtle">
          © 2026 BAIK GWANGIN · Frontend Engineer
        </Text>
        <div className="flex items-center gap-5">
          {variant === "portfolio" ? (
            <Text
              as="button"
              type="button"
              variant="caption"
              color="subtle"
              className="hover:text-accent transition-colors duration-200 cursor-pointer bg-transparent border-none"
              onClick={scrollToTop}
            >
              ↑ BACK TO TOP
            </Text>
          ) : (
            <>
              <Text
                variant="caption"
                color="subtle"
                asChild
                className="hover:text-accent transition-colors duration-200"
              >
                <Link to="/">Portfolio</Link>
              </Text>
              <Text
                as="a"
                href="https://github.com/RookieAND"
                target="_blank"
                rel="noreferrer noopener"
                variant="caption"
                color="subtle"
                className="hover:text-accent transition-colors duration-200"
              >
                GitHub ↗
              </Text>
            </>
          )}
          <Text
            as="button"
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            variant="caption"
            color="subtle"
            className="hover:text-accent transition-colors duration-200 cursor-pointer bg-transparent border-none flex items-center gap-1.5"
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            {theme === "dark" ? "LIGHT" : "DARK"}
          </Text>
        </div>
      </div>
    </footer>
  );
}
