import { MermaidBlock } from "#/lib/markdown/MermaidBlock";
import { highlight } from "#/lib/markdown/highlight";

interface Props {
  lang: string;
  body: string;
}

export function CodeBlock({ lang, body }: Props) {
  if (lang === "mermaid") {
    return <MermaidBlock code={body} />;
  }

  return (
    <div className="mb-6 rounded-[12px] overflow-hidden border border-border">
      {lang && (
        <div className="px-4 py-2 bg-surface-2 border-b border-border font-mono text-[11px] text-text-3 tracking-[0.06em] uppercase">
          {lang}
        </div>
      )}
      <pre className="p-5 bg-surface overflow-x-auto">
        <code
          className="font-mono text-[13px] leading-[1.75] text-[#c9d1d9] block"
          dangerouslySetInnerHTML={{ __html: highlight(body, lang) }}
        />
      </pre>
    </div>
  );
}
