import { ARCHITECTURE_POSTS } from "#/data/posts/ArchitecturePosts";
import { BACKEND_POSTS } from "#/data/posts/BackendPosts";
import { FRONTEND_POSTS } from "#/data/posts/FrontendPosts";
import { INFRA_POSTS } from "#/data/posts/InfraPosts";
import { JAVASCRIPT_POSTS } from "#/data/posts/JavaScriptPosts";
import { RETROSPECTIVE_POSTS } from "#/data/posts/RetrospectivePosts";
import { TOOLING_POSTS } from "#/data/posts/ToolingPosts";
import { TYPESCRIPT_POSTS } from "#/data/posts/TypescriptPosts";

export type Category =
  | "Frontend"
  | "TypeScript"
  | "Backend"
  | "JavaScript"
  | "Architecture"
  | "Tooling"
  | "DB / Infra"
  | "Retrospective";

export interface Post {
  slug: string;
  date: string;
  cat: Category;
  title: string;
  excerpt: string[];
  tags: string[];
  read: string;
  href: string;
}

const contentModules = import.meta.glob("../content/posts/**/*.md", {
  query: "?raw",
  import: "default",
  eager: false,
});

export const CONTENT_LOADERS: Record<string, () => Promise<string>> = Object.fromEntries(
  Object.entries(contentModules).map(([path, loader]) => [
    path.replace(/^.*\/([^/]+)\.md$/, "$1"),
    loader as () => Promise<string>,
  ]),
);

export const FEATURED_POST: Post = {
  slug: "gem-abac-nestjs-1",
  cat: "Architecture",
  date: "2026-06-01",
  read: "10 min",
  title: "GEM에 리소스 권한 체계를 도입한 이야기 (1편) — 왜 기존 시스템으로는 안 됐는가",
  excerpt: [
    "RBAC으로 표현 불가능한 요구사항에서 출발해 CASL + Level 추상화로 리소스 단위 권한 체계를 설계한 과정.",
  ],
  tags: ["CASL", "ABAC", "NestJS", "권한", "아키텍처"],
  href: "/posts/gem-abac-nestjs-1",
};

export const POSTS: Post[] = [
  ...FRONTEND_POSTS,
  ...TYPESCRIPT_POSTS,
  ...JAVASCRIPT_POSTS,
  ...BACKEND_POSTS,
  ...ARCHITECTURE_POSTS,
  ...TOOLING_POSTS,
  ...INFRA_POSTS,
  ...RETROSPECTIVE_POSTS,
];

export const ALL_POSTS: Post[] = [FEATURED_POST, ...POSTS];

export const CATEGORIES: (Category | "all")[] = [
  "all",
  "Frontend",
  "TypeScript",
  "JavaScript",
  "Backend",
  "Architecture",
  "Tooling",
  "DB / Infra",
  "Retrospective",
];
