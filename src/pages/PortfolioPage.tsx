import { About } from "#/components/About";
import { Career } from "#/components/Career";
import { Contact } from "#/components/Contact";
import { Footer } from "#/components/Footer";
import { Hero } from "#/components/Hero";
import { Nav } from "#/components/Nav";
import { Stack } from "#/components/Stack";
import { Stats } from "#/components/Stats";
import { Work } from "#/components/Work";

export function PortfolioPage() {
  return (
    <>
      <Nav />
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
