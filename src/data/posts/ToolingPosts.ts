import type { Post } from "#/data/Posts";

export const TOOLING_POSTS: Post[] = [
  {
    slug: "turborepo-task-configuration",
    date: "2026-06-16",
    cat: "Tooling",
    title: "Turborepo v2 Task 설정 완전 정복",
    excerpt: [
      "turbo.json의 tasks 옵션 전체를 v2 기준으로 정리했다. dependsOn 세 가지 변형부터 캐시 해시에 포함되는 env, v2에서 새로 생긴 passThroughEnv, globalEnv/globalPassThroughEnv, outputLogs까지. Strict Mode가 기본이 된 v2에서 환경 변수를 잘못 설정하면 CI 캐시가 매번 통째로 날아간다.",
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
      "PR마다 .changeset 파일로 버전 범프 의도를 선언하고 CI가 CHANGELOG와 버전을 자동 관리하는 Changesets. 커밋 컨벤션에 의존하지 않고 PR 단위로 명시성을 확보한 게 선택 이유였다. snapshot 버전, major 범프 연쇄 문제, 파일 본문을 비우면 CHANGELOG가 비는 함정까지.",
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
      "gem-server 모노레포 명령어를 감싸는 내부 CLI gemc. process.cwd() 의존성을 끊어 루트 밖에서도 동작하게 하고, NVM PATH를 자식 프로세스에 주입하는 두 가지 개선으로 실행 환경 의존성을 제거했다.",
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
      "추가 비용 없이 CI 빌드 캐시를 쓰고 싶었다. AWS EFS + Jenkins로 원격 캐시 서버를 세워 팀 전체 빌드 속도를 끌어올린 과정.",
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
      "CAS·하드링크·심볼릭링크 구조와 피어 의존성 처리 방식. pnpm이 node_modules를 만드는 원리 전체.",
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
      "모노레포에서 패키지가 많아질수록 복잡해지는 라이브러리 버전 관리를 pnpm Catalog로 해결한다. Named Catalog로 도메인별로 분리하고, 버전 업 시 단 한 곳만 수정하는 방법을 정리했다.",
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
      "pnpm을 파다 보면 계속 나오는 Hard Link와 Symbolic Link. 두 개념의 차이와 pnpm이 Global Store와 프로젝트 node_modules 사이에서 두 가지를 함께 쓰는 이유를 정리했다.",
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
      "--docker 옵션으로 관련 없는 패키지 변경이 Cache Miss를 유발하는 문제를 잡았다. pnpm Cache Mount를 조합한 멀티스테이지 Dockerfile까지.",
    ],
    tags: ["Turborepo", "Docker", "Monorepo"],
    read: "8 min",
    href: "/posts/turbo-prune-monorepo",
  },
];
