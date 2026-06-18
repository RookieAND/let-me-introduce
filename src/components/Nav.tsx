import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useNavScroll } from "#/hooks/UseNavScroll";
import { cn } from "#/lib/Utils";

interface NavProps {
  alwaysScrolled?: boolean;
  children?: ReactNode;
}

function NavRoot({ alwaysScrolled = false, children }: NavProps) {
  const { scrolled } = useNavScroll();
  const { pathname } = useLocation();
  const navScrolled = alwaysScrolled || scrolled;
  const isPostsPage = pathname.startsWith("/posts");

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] h-17 flex items-center transition-[background,border-color,backdrop-filter] duration-300 border-b border-transparent",
        navScrolled && "bg-[rgba(10,10,11,0.72)] backdrop-blur-[14px] saturate-[1.2] border-border",
      )}
    >
      <div className="max-w-280 mx-auto px-8 w-full flex items-center justify-between">
        <Link
          to="/"
          className="font-mono text-[14px] tracking-[0.04em] text-text font-medium flex items-center gap-2.25"
        >
          <span className="w-1.75 h-1.75 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)] shrink-0" />
          BAIK GWANGIN
        </Link>

        <div className="flex items-center gap-2">
          {!isPostsPage && (
            <Link
              to="/posts"
              aria-label="글 목록"
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg text-text-3 hover:text-accent transition-colors duration-200"
            >
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden={true}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </Link>
          )}
          {children && (
            <NavigationMenuPrimitive.Root>
              <NavigationMenuPrimitive.List className="hidden md:flex gap-7.5 items-center list-none">
                {children}
              </NavigationMenuPrimitive.List>
            </NavigationMenuPrimitive.Root>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  to,
  className,
  children,
}: {
  href?: string;
  to?: string;
  className?: string;
  children: ReactNode;
}) {
  const base = "font-mono text-[12.5px] tracking-[0.03em] transition-colors duration-200";

  return (
    <NavigationMenuPrimitive.Item>
      <NavigationMenuPrimitive.Link asChild>
        {to ? (
          <Link to={to} className={cn(base, className)}>
            {children}
          </Link>
        ) : (
          <a href={href} className={cn(base, className)}>
            {children}
          </a>
        )}
      </NavigationMenuPrimitive.Link>
    </NavigationMenuPrimitive.Item>
  );
}

export const Nav = Object.assign(NavRoot, { Link: NavLink });
