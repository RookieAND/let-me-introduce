import { ARCHITECTURE_POSTS } from "#/data/posts/ArchitecturePosts";
import { BACKEND_POSTS } from "#/data/posts/BackendPosts";
import { FRONTEND_POSTS } from "#/data/posts/FrontendPosts";
import { INFRA_POSTS } from "#/data/posts/InfraPosts";
import { RETROSPECTIVE_POSTS } from "#/data/posts/RetrospectivePosts";

export type Category = "Frontend" | "Backend" | "Architecture" | "Infra" | "Retrospective";

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
    "외부 관리자 요구사항 하나로 RBAC의 한계가 드러났다. 역할 기반으로는 표현 자체가 불가능한 케이스에서, CASL + Level 추상화로 리소스 단위 권한 체계를 설계한 과정.",
  ],
  tags: ["CASL", "ABAC", "NestJS", "권한", "아키텍처"],
  href: "/posts/gem-abac-nestjs-1",
};

export const POSTS: Post[] = [
  ...FRONTEND_POSTS,
  ...BACKEND_POSTS,
  ...ARCHITECTURE_POSTS,
  ...INFRA_POSTS,
  ...RETROSPECTIVE_POSTS,
];

export const ALL_POSTS: Post[] = [FEATURED_POST, ...POSTS];

export const CATEGORIES: (Category | "all")[] = [
  "all",
  "Frontend",
  "Backend",
  "Architecture",
  "Infra",
  "Retrospective",
];
