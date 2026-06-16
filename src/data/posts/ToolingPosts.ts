import type { Post } from "#/data/Posts";

export const TOOLING_POSTS: Post[] = [
  {
    slug: "turborepo-task-configuration",
    date: "2026-06-16",
    cat: "Tooling",
    title: "Turborepo v2 Task 설정 완전 정복",
    excerpt: [
      "turbo.json의 tasks 옵션 전체를 v2 기준으로 — dependsOn, env, passThroughEnv, outputLogs까지 정리했다.",
    ],
    tags: ["Turborepo", "Monorepo", "CI/CD", "빌드 캐시"],
    read: "12 min",
    href: "/posts/turborepo-task-configuration",
  },
  {
    slug: "changesets-monorepo-versioning",
    date: "2026-06-01",
    cat: "Tooling",
    title: "gem 모노레포에 Changesets를 도입한 이야기",
    excerpt: [
      "PR마다 .changeset 파일로 버전 범프를 선언하는 Changesets — 도입 이유, snapshot 버전, major 범프 연쇄 문제.",
    ],
    tags: ["Changesets", "pnpm", "Monorepo", "CI/CD", "버전 관리"],
    read: "8 min",
    href: "/posts/changesets-monorepo-versioning",
  },
  {
    slug: "gemc-monorepo-cli",
    date: "2026-06-01",
    cat: "Tooling",
    title: "gemc — gem-server 모노레포를 위한 내부 CLI 개선기",
    excerpt: [
      "process.cwd() 의존성 제거와 NVM PATH 주입으로 실행 환경 의존성을 없앤 내부 CLI gemc 개선기.",
    ],
    tags: ["CLI", "Monorepo", "NestJS", "DX", "Node.js"],
    read: "7 min",
    href: "/posts/gemc-monorepo-cli",
  },
  {
    slug: "turborepo-remote-cache-self-hosted",
    date: "2025-05-01",
    cat: "Tooling",
    title: "Turborepo Remote Cache, 클라우드 대신 직접 구축한 이유",
    excerpt: [
      "추가 비용 없이 AWS EFS + Jenkins로 Remote Cache 서버를 직접 구축해 CI 빌드 속도를 끌어올린 과정.",
    ],
    tags: ["Turborepo", "pnpm", "CI", "빌드 캐시"],
    read: "11 min",
    href: "/posts/turborepo-remote-cache-self-hosted",
  },
  {
    slug: "pnpm-dependency-deep-dive",
    date: "2024-12-01",
    cat: "Tooling",
    title: "pnpm 의존성 파일을 관리 Deep Dive",
    excerpt: [
      "CAS·하드링크·심볼릭링크 구조와 피어 의존성 처리 방식 — pnpm이 node_modules를 만드는 원리 전체.",
    ],
    tags: ["pnpm", "node_modules", "패키지 관리"],
    read: "15 min",
    href: "/posts/pnpm-dependency-deep-dive",
  },
  {
    slug: "pnpm-catalog",
    date: "2024-12-01",
    cat: "Tooling",
    title: "pnpm Catalog 로 버전 관리 쉽게 하기",
    excerpt: [
      "모노레포 라이브러리 버전을 pnpm Catalog로 통합 — Named Catalog로 도메인별 분리하고 버전 업은 단 한 곳만.",
    ],
    tags: ["pnpm", "Monorepo", "패키지 관리"],
    read: "5 min",
    href: "/posts/pnpm-catalog",
  },
  {
    slug: "hard-link-symbolic-link",
    date: "2024-11-01",
    cat: "Tooling",
    title: "Hard Link, Symbolic Link 에 대해 알아보자",
    excerpt: [
      "pnpm의 Global Store와 node_modules 사이에서 Hard Link·Symbolic Link를 함께 쓰는 이유.",
    ],
    tags: ["pnpm", "Linux", "파일 시스템"],
    read: "7 min",
    href: "/posts/hard-link-symbolic-link",
  },
  {
    slug: "turbo-prune-monorepo",
    date: "2024-11-01",
    cat: "Tooling",
    title: "Turbo prune 으로 모노레포 앱 빌드하기",
    excerpt: [
      "--docker 옵션으로 관련 없는 패키지 변경이 Cache Miss를 유발하는 문제를 잡고 pnpm Cache Mount 조합 Dockerfile까지.",
    ],
    tags: ["Turborepo", "Docker", "Monorepo"],
    read: "8 min",
    href: "/posts/turbo-prune-monorepo",
  },
];
