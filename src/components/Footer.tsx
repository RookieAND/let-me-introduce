import { Link } from "react-router-dom";

interface FooterProps {
  variant?: "portfolio" | "posts";
}

export function Footer({ variant = "portfolio" }: FooterProps) {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="border-t border-border py-[30px]">
      <div className="max-w-[1120px] mx-auto px-8 w-full flex justify-between items-center flex-wrap gap-3">
        <span className="font-mono text-[12px] text-text-3">
          © 2026 BAIK GWANGIN · Frontend Engineer
        </span>
        {variant === "portfolio" ? (
          <button
            className="font-mono text-[12px] text-text-3 hover:text-accent transition-colors duration-200 cursor-pointer bg-transparent border-none"
            onClick={scrollToTop}
          >
            ↑ BACK TO TOP
          </button>
        ) : (
          <div className="flex gap-5">
            <Link
              to="/"
              className="font-mono text-[12px] text-text-3 hover:text-accent transition-colors duration-200"
            >
              Portfolio
            </Link>
            <a
              href="https://github.com/RookieAND"
              target="_blank"
              rel="noopener"
              className="font-mono text-[12px] text-text-3 hover:text-accent transition-colors duration-200"
            >
              GitHub ↗
            </a>
            <a
              href="https://velog.io/@rookieand/posts"
              target="_blank"
              rel="noopener"
              className="font-mono text-[12px] text-text-3 hover:text-accent transition-colors duration-200"
            >
              velog ↗
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
