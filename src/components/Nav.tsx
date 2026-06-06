import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { Link, useLocation } from "react-router-dom";
import { cn } from "#/lib/Utils";
import { useNavScroll } from "#/hooks/UseNavScroll";

interface NavProps {
  alwaysScrolled?: boolean;
}

const PORTFOLIO_NAV = [
  { href: "#about", label: "About", idx: "01" },
  { href: "#stack", label: "Stack", idx: "02" },
  { href: "#career", label: "Career", idx: "03" },
  { href: "#work", label: "Work", idx: "04" },
  { href: "#contact", label: "Contact", idx: "05" },
] as const;

export function Nav({ alwaysScrolled = false }: NavProps) {
  const { scrolled, activeSection } = useNavScroll();
  const location = useLocation();
  const isPostsPage = location.pathname === "/posts";
  const navScrolled = alwaysScrolled || scrolled;

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] h-17 flex items-center transition-[background,border-color,backdrop-filter] duration-300 border-b border-transparent",
        navScrolled &&
          "bg-[rgba(10,10,11,0.72)] backdrop-blur-[14px] saturate-[1.2] border-border",
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

        <NavigationMenuPrimitive.Root>
          <NavigationMenuPrimitive.List className="hidden md:flex gap-7.5 items-center list-none">
            {isPostsPage ? (
              <>
                <NavigationMenuPrimitive.Item>
                  <NavigationMenuPrimitive.Link asChild>
                    <Link
                      to="/"
                      className="font-mono text-[12.5px] tracking-[0.03em] text-text-3 hover:text-text transition-colors duration-200"
                    >
                      ← Portfolio
                    </Link>
                  </NavigationMenuPrimitive.Link>
                </NavigationMenuPrimitive.Item>
                <NavigationMenuPrimitive.Item>
                  <span className="font-mono text-[12.5px] tracking-[0.03em] text-accent">
                    Writing
                  </span>
                </NavigationMenuPrimitive.Item>
              </>
            ) : (
              <>
                {PORTFOLIO_NAV.map(({ href, label, idx }) => (
                  <NavigationMenuPrimitive.Item key={href}>
                    <NavigationMenuPrimitive.Link asChild>
                      <a
                        href={href}
                        className={cn(
                          "font-mono text-[12.5px] tracking-[0.03em] text-text-3 hover:text-text transition-colors duration-200 relative py-1",
                          activeSection === href.slice(1) && "text-text nav-active",
                        )}
                      >
                        <span className="text-accent mr-1.25">{idx}</span>
                        {label}
                      </a>
                    </NavigationMenuPrimitive.Link>
                  </NavigationMenuPrimitive.Item>
                ))}
                <NavigationMenuPrimitive.Item>
                  <NavigationMenuPrimitive.Link asChild>
                    <Link
                      to="/posts"
                      className="font-mono text-[12.5px] tracking-[0.03em] text-accent hover:text-accent-bright transition-colors duration-200"
                    >
                      <span className="mr-1.25">↗</span>Writing
                    </Link>
                  </NavigationMenuPrimitive.Link>
                </NavigationMenuPrimitive.Item>
              </>
            )}
          </NavigationMenuPrimitive.List>
        </NavigationMenuPrimitive.Root>
      </div>
    </nav>
  );
}
