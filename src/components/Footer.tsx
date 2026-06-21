import { Link } from "react-router-dom";

interface FooterProps {
  variant?: "portfolio" | "posts";
}

export function Footer({ variant = "portfolio" }: FooterProps) {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="border-t border-border py-7.5">
      <div className="max-w-280 mx-auto px-8 w-full flex justify-between items-center flex-wrap gap-3">
        <span className="font-sans text-[12px] text-text-3">
          © 2026 BAIK GWANGIN · Frontend Engineer
        </span>
        {variant === "portfolio" ? (
          <button
            type="button"
            className="font-sans text-[12px] text-text-3 hover:text-accent transition-colors duration-200 cursor-pointer bg-transparent border-none"
            onClick={scrollToTop}
          >
            ↑ BACK TO TOP
          </button>
        ) : (
          <div className="flex gap-5">
            <Link
              to="/"
              className="font-sans text-[12px] text-text-3 hover:text-accent transition-colors duration-200"
            >
              Portfolio
            </Link>
            <a
              href="https://github.com/RookieAND"
              target="_blank"
              rel="noreferrer noopener"
              className="font-sans text-[12px] text-text-3 hover:text-accent transition-colors duration-200"
            >
              GitHub ↗
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
