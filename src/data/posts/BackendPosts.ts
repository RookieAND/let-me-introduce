import type { Post } from "#/data/Posts";

export const BACKEND_POSTS: Post[] = [
  {
    slug: "valkey-hash-key-expiration",
    date: "2026-06-16",
    cat: "Backend",
    title: "Valkey Hash Key Expiration — 필드 단위 TTL 설정",
    excerpt: [
      "Redis, Valkey 는 원래 Key 단위로만 TTL 을 지원했다. Hash 필드마다 만료 시간이 달라야 할 때 기존에는 개별 Key 로 분리하거나 Lua Script 로 우회하는 수밖에 없었다. Valkey 9.0 에서 추가된 HEXPIRE, HPEXPIRE, HEXPIREAT, HTTL, HPERSIST 등 9개 명령어와 Active Expiration 동작 방식을 정리했다.",
    ],
    tags: ["Valkey", "Redis", "Cache", "TTL", "Hash"],
    read: "8 min",
    href: "/posts/valkey-hash-key-expiration",
  },
  {
    slug: "suites-nestjs-auto-mock",
    date: "2026-06-01",
    cat: "Backend",
    title: "@suites로 NestJS 단위 테스트 Auto-Mock 적용하기",
    excerpt:
      ["수동 jest.fn()과 as any 캐스팅으로 가득한 테스트 셋업을 줄이기 위해 도입한 @suites. NestJS DI 메타데이터를 읽어 의존성을 자동 Mock하는 원리와 solitary/sociable 두 전략을 정리했다."],
    tags: ["NestJS", "Testing", "Jest", "Auto-Mock"],
    read: "8 min",
    href: "/posts/suites-nestjs-auto-mock",
  },
  {
    slug: "tsjest-to-swcjest-migration",
    date: "2026-06-01",
    cat: "Backend",
    title: "ts-jest에서 @swc/jest로 — isolatedModules, 트레이드오프, V8 coverage",
    excerpt:
      ["65개 suite가 전부 실패한 것이 출발점이었다. isolatedModules 설정 하나로 복구하고, @swc/jest로 28% 속도를 얻으면서 잃는 것과 대응 방법. V8 coverage로 바꿨더니 수치가 달라진 이유까지."],
    tags: ["NestJS", "Jest", "swc", "Testing", "Coverage"],
    read: "8 min",
    href: "/posts/tsjest-to-swcjest-migration",
  },
  {
    slug: "queue-delayed-job-bullmq-fix",
    date: "2026-06-01",
    cat: "Backend",
    title: "Queue 기반 지연 실행의 함정 — 자동 퇴장 유실 버그 해결기",
    excerpt:
      ["BullMQ 인메모리 모드로 운영하다가 서버 재시작 시 delayed job이 전부 사라지는 버그를 만났다. setTimeout + onModuleInit 재등록 로직으로 전환하면서 깨달은 것 — Queue를 믿는 게 아니라 DB를 믿어야 한다."],
    tags: ["NestJS", "BullMQ", "Queue", "버그"],
    read: "8 min",
    href: "/posts/queue-delayed-job-bullmq-fix",
  },
];
