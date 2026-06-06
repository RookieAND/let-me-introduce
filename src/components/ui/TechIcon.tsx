import {
  siDocker,
  siGithubactions,
  siJavascript,
  siMongodb,
  siMongoose,
  siNestjs,
  siNextdotjs,
  siNodedotjs,
  siPnpm,
  siReact,
  siReactquery,
  siTurborepo,
  siTypescript,
  siVite,
} from "simple-icons";

const ICON_MAP: Record<string, string> = {
  siTypescript: siTypescript.path,
  siJavascript: siJavascript.path,
  siReact: siReact.path,
  siNextdotjs: siNextdotjs.path,
  siVite: siVite.path,
  siReactquery: siReactquery.path,
  siNestjs: siNestjs.path,
  siNodedotjs: siNodedotjs.path,
  siMongodb: siMongodb.path,
  siMongoose: siMongoose.path,
  siDocker: siDocker.path,
  siGithubactions: siGithubactions.path,
  siTurborepo: siTurborepo.path,
  siPnpm: siPnpm.path,
};

interface TechIconProps {
  slug: string;
  size?: number;
}

export function TechIcon({ slug, size = 13 }: TechIconProps) {
  const path = ICON_MAP[slug];
  if (!path) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      className="shrink-0"
    >
      <title>{slug}</title>
      <path d={path} />
    </svg>
  );
}
