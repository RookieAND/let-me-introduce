import type { Post } from "#/data/Posts";

export const BACKEND_POSTS: Post[] = [
  {
    slug: "suites-nestjs-auto-mock-testing",
    date: "2026-01-12",
    cat: "Backend",
    title: "@suites로 NestJS 단위 테스트 작성하기 — Solitary·Sociable·Test Double",
    excerpt: [
      "jest.fn() 수동 작성에서 벗어나 @suites의 TestBed로 Auto-Mock을 구성하고, Solitary·Sociable 두 전략과 Test Double 4종을 실제 코드로 정리.",
    ],
    tags: ["NestJS", "Testing", "Jest", "Auto-Mock", "@suites"],
    read: "7 min",
    href: "/posts/suites-nestjs-auto-mock-testing",
  },
  {
    slug: "suites-nestjs-auto-mock",
    date: "2026-01-18",
    cat: "Backend",
    title: "@suites로 NestJS 단위 테스트 Auto-Mock 적용하기",
    excerpt: [
      "NestJS DI 메타데이터로 의존성을 자동 Mock하는 @suites — solitary/sociable 두 전략과 도입 배경.",
    ],
    tags: ["NestJS", "Testing", "Jest", "Auto-Mock"],
    read: "8 min",
    href: "/posts/suites-nestjs-auto-mock",
  },
  {
    slug: "tsjest-to-swcjest-migration",
    date: "2025-03-17",
    cat: "Backend",
    title: "ts-jest에서 @swc/jest로 — isolatedModules, 트레이드오프, V8 coverage",
    excerpt: [
      "65개 suite 전부 실패에서 출발해 @swc/jest로 28% 속도를 얻으면서 잃는 것과 V8 coverage 수치 차이까지.",
    ],
    tags: ["NestJS", "Jest", "swc", "Testing", "Coverage"],
    read: "8 min",
    href: "/posts/tsjest-to-swcjest-migration",
  },
  {
    slug: "queue-delayed-job-bullmq-fix",
    date: "2024-06-19",
    cat: "Backend",
    title: "Queue 기반 지연 실행의 함정 — 자동 퇴장 유실 버그 해결기",
    excerpt: [
      "BullMQ 인메모리 모드에서 서버 재시작 시 delayed job이 전부 사라지는 버그와 setTimeout + onModuleInit으로 전환한 과정.",
    ],
    tags: ["NestJS", "BullMQ", "Queue", "버그"],
    read: "8 min",
    href: "/posts/queue-delayed-job-bullmq-fix",
  },
];
