import { last } from "es-toolkit";
import { useEffect, useState } from "react";

const SECTION_IDS = ["about", "stack", "career", "work", "contact"];

export function useNavScroll() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);

      const pos = window.scrollY + window.innerHeight * 0.35;
      const current =
        last(
          SECTION_IDS.filter((id) => {
            const el = document.getElementById(id);
            return el !== null && el.offsetTop <= pos;
          }),
        ) ?? null;
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { scrolled, activeSection };
}
