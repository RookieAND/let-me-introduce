import { useEffect, useId, useState } from "react";

let initialized = false;

async function renderDiagram(id: string, code: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      darkMode: true,
      fontFamily: "inherit",
      fontSize: 13,
      themeVariables: {
        background: "transparent",
        primaryColor: "#1e1e2e",
        primaryBorderColor: "#444",
        lineColor: "#888",
        secondaryColor: "#2a2a3e",
        tertiaryColor: "#1a1a2e",
        primaryTextColor: "#cdd6f4",
        secondaryTextColor: "#bac2de",
        tertiaryTextColor: "#a6adc8",
        edgeLabelBackground: "#1e1e2e",
        clusterBkg: "#181825",
        clusterBorder: "#444",
        titleColor: "#cdd6f4",
      },
    });
    initialized = true;
  }
  const { svg } = await mermaid.render(id, code);
  return svg;
}

interface MermaidBlockProps {
  code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  const rawId = useId();
  // useId can contain colons which are invalid in SVG element IDs
  const id = `mermaid-${rawId.replace(/:/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSvg(null);
    setError(null);
    renderDiagram(id, code)
      .then(setSvg)
      .catch((err) => setError(err instanceof Error ? err.message : "Parse error"));
  }, [id, code]);

  if (error) {
    return (
      <div className="my-6 rounded-xl border border-red-400/40 bg-red-500/8 px-5 py-4">
        <p className="font-mono text-[12px] text-red-300">mermaid: {error}</p>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-6 h-40 animate-pulse rounded-xl border border-border bg-surface" />
    );
  }

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-border bg-surface p-6 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
