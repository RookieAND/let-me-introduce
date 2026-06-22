import { parseInline } from "#/lib/markdown/parseInline";
import type { CalloutType } from "#/lib/markdown/types";

const CONFIG: Record<
  CalloutType,
  { icon: string; label: string; bg: string; border: string; title: string; text: string }
> = {
  note: {
    icon: "📝",
    label: "Note",
    bg: "bg-blue-500/8",
    border: "border-blue-400/40",
    title: "text-blue-300",
    text: "text-blue-200/80",
  },
  tip: {
    icon: "💡",
    label: "Tip",
    bg: "bg-green-500/8",
    border: "border-green-400/40",
    title: "text-green-300",
    text: "text-green-200/80",
  },
  warning: {
    icon: "⚠️",
    label: "Warning",
    bg: "bg-amber-500/8",
    border: "border-amber-400/40",
    title: "text-amber-300",
    text: "text-amber-200/80",
  },
  important: {
    icon: "🔥",
    label: "Important",
    bg: "bg-purple-500/8",
    border: "border-purple-400/40",
    title: "text-purple-300",
    text: "text-purple-200/80",
  },
  caution: {
    icon: "🚨",
    label: "Caution",
    bg: "bg-red-500/8",
    border: "border-red-400/40",
    title: "text-red-300",
    text: "text-red-200/80",
  },
};

interface Props {
  calloutType: CalloutType;
  lines: string[];
}

export function CalloutBlock({ calloutType, lines }: Props) {
  const cfg = CONFIG[calloutType];
  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-chip px-5 py-4 my-6`}>
      <div
        className={`flex items-center gap-2 font-sans font-semibold text-[13px] tracking-[0.04em] uppercase mb-2 ${cfg.title}`}
      >
        <span>{cfg.icon}</span>
        <span>{cfg.label}</span>
      </div>
      <div className={`space-y-1 ${cfg.text}`}>
        {lines.map((l, j) => (
          <p key={j} className="font-sans text-[15px] leading-[1.75]">
            {parseInline(l)}
          </p>
        ))}
      </div>
    </div>
  );
}
