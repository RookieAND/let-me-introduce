import type { ReactNode } from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { Link } from "react-router-dom";
import { useNavScroll } from "#/hooks/UseNavScroll";
import { cn } from "#/lib/Utils";

interface NavProps {
  alwaysScrolled?: boolean;
  children?: ReactNode;
}

function NavRoot({ alwaysScrolled = false, children }: NavProps) {
  const { scrolled } = useNavScroll();
  const navScrolled = alwaysScrolled || scrolled;

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

        {children && (
          <NavigationMenuPrimitive.Root>
            <NavigationMenuPrimitive.List className="hidden md:flex gap-7.5 items-center list-none">
              {children}
            </NavigationMenuPrimitive.List>
          </NavigationMenuPrimitive.Root>
        )}
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
