import { About } from "#/components/About";
import { Career } from "#/components/Career";
import { Contact } from "#/components/Contact";
import { Footer } from "#/components/Footer";
import { Hero } from "#/components/Hero";
import { Nav } from "#/components/Nav";
import { Stack } from "#/components/Stack";
import { Stats } from "#/components/Stats";
import { Work } from "#/components/Work";
import { useNavScroll } from "#/hooks/UseNavScroll";
import { cn } from "#/lib/Utils";

const PORTFOLIO_NAV = [
  { href: "#about", label: "About", idx: "01" },
  { href: "#stack", label: "Stack", idx: "02" },
  { href: "#career", label: "Career", idx: "03" },
  { href: "#work", label: "Work", idx: "04" },
  { href: "#contact", label: "Contact", idx: "05" },
] as const;

export function PortfolioPage() {
  const { activeSection } = useNavScroll();

  return (
    <>
      <Nav>
        {PORTFOLIO_NAV.map(({ href, label, idx }) => (
          <Nav.Link
            key={href}
            href={href}
            className={cn(
              "text-text-3 hover:text-text relative py-1",
              activeSection === href.slice(1) && "text-text nav-active",
            )}
          >
            <span className="text-accent mr-1.25">{idx}</span>
            {label}
          </Nav.Link>
        ))}
        <Nav.Link to="/posts" className="text-accent hover:text-accent-bright">
          <span className="mr-1.25">↗</span>Writing
        </Nav.Link>
      </Nav>
      <Hero />
      <About />
      <Stats />
      <Stack />
      <Career />
      <Work />
      <Contact />
      <Footer variant="portfolio" />
    </>
  );
}
