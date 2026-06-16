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
    slug: "cjs-module-evaluation-pipeline",
    date: "2026-06-13",
    cat: "Backend",
    title: "CJS : string 에서 exports 까지, 모듈 평가 파이프라인",
    excerpt: [
      "require() 가 파일을 불러온 뒤 실제로 무슨 일이 벌어지는가. loadSource 로 파일을 읽고, Module.wrap 으로 감싸고, wrapSafe 가 V8 에 컴파일하고, FunctionPrototypeCall 로 실행되기까지 — module.exports 에 값이 채워지는 전 과정을 Node.js 소스로 따라간다.",
    ],
    tags: ["Node.js", "CJS", "JavaScript", "Module"],
    read: "13 min",
    href: "/posts/cjs-module-evaluation-pipeline",
  },
  {
    slug: "cjs-require-module-resolution",
    date: "2026-06-12",
    cat: "Backend",
    title: "CJS : require 의 모듈 탐색 알고리즘",
    excerpt: [
      "require('./foo') 한 줄 뒤에서 Node.js 가 하는 일. Module 클래스, Module Wrapper, exports/module.exports 참조 관계, 캐싱 구조, 그리고 Core → 상대경로 → node_modules 순서로 진행되는 탐색 알고리즘까지.",
    ],
    tags: ["Node.js", "CJS", "JavaScript", "Module"],
    read: "12 min",
    href: "/posts/cjs-require-module-resolution",
  },
  {
    slug: "suites-nestjs-auto-mock",
    date: "2026-06-01",
    cat: "Backend",
    title: "@suites로 NestJS 단위 테스트 Auto-Mock 적용하기",
    excerpt: [
      "수동 jest.fn()과 as any 캐스팅으로 가득한 테스트 셋업을 줄이기 위해 도입한 @suites. NestJS DI 메타데이터를 읽어 의존성을 자동 Mock하는 원리와 solitary/sociable 두 전략을 정리했다.",
    ],
    tags: ["NestJS", "Testing", "Jest", "Auto-Mock"],
    read: "8 min",
    href: "/posts/suites-nestjs-auto-mock",
  },
  {
    slug: "tsjest-to-swcjest-migration",
    date: "2026-06-01",
    cat: "Backend",
    title: "ts-jest에서 @swc/jest로 — isolatedModules, 트레이드오프, V8 coverage",
    excerpt: [
      "65개 suite가 전부 실패한 것이 출발점이었다. isolatedModules 설정 하나로 복구하고, @swc/jest로 28% 속도를 얻으면서 잃는 것과 대응 방법. V8 coverage로 바꿨더니 수치가 달라진 이유까지.",
    ],
    tags: ["NestJS", "Jest", "swc", "Testing", "Coverage"],
    read: "8 min",
    href: "/posts/tsjest-to-swcjest-migration",
  },
  {
    slug: "queue-delayed-job-bullmq-fix",
    date: "2026-06-01",
    cat: "Backend",
    title: "Queue 기반 지연 실행의 함정 — 자동 퇴장 유실 버그 해결기",
    excerpt: [
      "BullMQ 인메모리 모드로 운영하다가 서버 재시작 시 delayed job이 전부 사라지는 버그를 만났다. setTimeout + onModuleInit 재등록 로직으로 전환하면서 깨달은 것 — Queue를 믿는 게 아니라 DB를 믿어야 한다.",
    ],
    tags: ["NestJS", "BullMQ", "Queue", "버그"],
    read: "8 min",
    href: "/posts/queue-delayed-job-bullmq-fix",
  },
  {
    slug: "mongoose-connection-internals",
    date: "2023-06-01",
    cat: "Backend",
    title: "Mongoose Connection 내부 동작 — 싱글톤, Default Connection, Hot Reload 메모리 누수",
    excerpt: [
      "require('mongoose') 한 줄이 실행되는 순간 이미 connections 배열에는 빈 Connection이 하나 들어간다. 생성자 내부에서 createConnection()을 호출하기 때문이다. connect()와 createConnection()의 슬롯 차이, 그리고 Hot Reload마다 Connection이 쌓이는 메모리 누수까지.",
    ],
    tags: ["Node.js", "Mongoose", "MongoDB", "메모리 누수"],
    read: "8 min",
    href: "/posts/mongoose-connection-internals",
  },
];
