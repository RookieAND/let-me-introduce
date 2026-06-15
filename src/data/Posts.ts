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

const contentModules = import.meta.glob("../content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: false,
});

export const CONTENT_LOADERS: Record<string, () => Promise<string>> =
  Object.fromEntries(
    Object.entries(contentModules).map(([path, loader]) => [
      path.slice("../content/posts/".length, -".md".length),
      loader as () => Promise<string>,
    ]),
  );

export const FEATURED_POST: Post = {
  slug: "gem-abac-nestjs-1",
  cat: "Architecture",
  date: "2026-06-01",
  read: "10 min",
  title: "GEM에 리소스 권한 체계를 도입한 이야기 (1편) — 왜 기존 시스템으로는 안 됐는가",
  excerpt:
    ["외부 관리자 요구사항 하나로 RBAC의 한계가 드러났다. 역할 기반으로는 표현 자체가 불가능한 케이스에서, CASL + Level 추상화로 리소스 단위 권한 체계를 설계한 과정."],
  tags: ["CASL", "ABAC", "NestJS", "권한", "아키텍처"],
  href: "/posts/gem-abac-nestjs-1",
};

export const POSTS: Post[] = [
  // ── 2026 ──────────────────────────────────────────────────────────────────
  {
    slug: "gem-abac-nestjs-2",
    date: "2026-06-01",
    cat: "Architecture",
    title: "GEM에 리소스 권한 체계를 도입한 이야기 (2편) — 1차·2차 검증을 나눈 이유",
    excerpt:
      ["Guard 시점에는 리소스 객체가 없어서 검증을 두 단계로 나눴다. expandLevelToRules·AbilityBuildService·AbilityClsService·Guard·CheckService 구현까지."],
    tags: ["CASL", "NestJS", "Guard", "권한"],
    read: "10 min",
    href: "/posts/gem-abac-nestjs-2",
  },
  {
    slug: "gem-abac-nestjs-3",
    date: "2026-06-01",
    cat: "Architecture",
    title: "GEM에 리소스 권한 체계를 도입한 이야기 (3편) — 기존 시스템을 안전하게 전환하기",
    excerpt:
      ["설계는 끝났다, 이제 운영 중인 시스템을 바꿔야 한다. CQRS 자동 권한 부여, SpaceUser 마이그레이션, 40개 테스트, 그리고 솔직한 회고."],
    tags: ["CASL", "NestJS", "마이그레이션", "테스트"],
    read: "12 min",
    href: "/posts/gem-abac-nestjs-3",
  },
  {
    slug: "casl-library-intro",
    date: "2026-06-01",
    cat: "Architecture",
    title: "CASL 라이브러리 — TypeScript 권한 관리",
    excerpt:
      ["Ability, can/cannot, subject(), Condition 기반 평가, Allow/Deny 규칙 병합까지. CASL의 핵심 개념과 TypeScript 통합, NestJS 사용 패턴을 정리했다."],
    tags: ["CASL", "TypeScript", "NestJS", "권한"],
    read: "7 min",
    href: "/posts/casl-library-intro",
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
  {
    slug: "vite-code-splitting-bundle",
    date: "2026-06-01",
    cat: "Frontend",
    title: "Vite codeSplitting 번들 최적화 전략",
    excerpt:
      ["minSize·maxSize 7가지 시나리오를 Playwright 실측으로 비교했다. maxSize를 없애면 총 번들은 줄지만 초기 로드는 최악이 되는 이유와, modulepreload manifest가 초기 로드에 미치는 영향."],
    tags: ["Vite", "Bundle", "최적화"],
    read: "10 min",
    href: "/posts/vite-code-splitting-bundle",
  },
  {
    slug: "react-use-sync-external-store",
    date: "2026-06-15",
    cat: "Frontend",
    title: "useSyncExternalStore 기반으로 복잡한 트리 상태 풀어내기",
    excerpt: [
      "3 Depth 학습맵 Tree View에서 연쇄 선택·최소 선택 제약·리포트 타입별 분기가 useState 콜백 안에 뭉쳐버렸다. Class를 외부 스토어로 만들고 useSyncExternalStore로 연결해 비즈니스 로직을 캡슐화한 과정. Shim 코드로 Tearing 방지와 inst 객체 설계까지.",
    ],
    tags: ["React", "useSyncExternalStore", "외부 스토어", "상태 관리"],
    read: "12 min",
    href: "/posts/react-use-sync-external-store",
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
    slug: "docker-kubernetes-ch1",
    date: "2026-06-01",
    cat: "Infra",
    title: "도커란? — 가상 머신과 컨테이너의 차이",
    excerpt:
      ["하이퍼바이저 기반 VM의 성능 손실·이미지 크기 문제와, 도커가 chroot·네임스페이스·cgroup으로 프로세스 단위 격리를 구현하는 원리. MSA 환경에서 컨테이너가 주목받는 이유를 정리했다."],
    tags: ["Docker", "Container", "가상화"],
    read: "3 min",
    href: "/posts/docker-kubernetes-ch1",
  },
  {
    slug: "docker-kubernetes-ch2",
    date: "2026-06-01",
    cat: "Infra",
    title: "도커 엔진 — 이미지·컨테이너·볼륨·네트워크 완전 정리",
    excerpt:
      ["컨테이너 생성·볼륨·네트워크·로깅·자원 제한·이미지 레이어까지. 도커 엔진 핵심 기능 전체 정리."],
    tags: ["Docker", "Container", "Network", "Volume"],
    read: "15 min",
    href: "/posts/docker-kubernetes-ch2",
  },
  {
    slug: "module-federation",
    date: "2026-05-01",
    cat: "Frontend",
    title: "Module Federation",
    excerpt:
      ["런타임에 다른 앱의 코드를 동적으로 로드하는 MF 아키텍처. Producer/Consumer 구조와 도입 전 반드시 짚어야 할 트레이드오프."],
    tags: ["Module Federation", "Micro Frontend", "Webpack"],
    read: "8 min",
    href: "/posts/module-federation",
  },
  {
    slug: "typescript-module-resolution",
    date: "2026-05-01",
    cat: "Frontend",
    title: "TypeScript Module Resolution 전략을 알아보자",
    excerpt:
      ["node, node16, bundler 세 전략의 차이와 Vite 기반 프로젝트에서 bundler가 표준인 이유."],
    tags: ["TypeScript", "Vite", "모듈"],
    read: "7 min",
    href: "/posts/typescript-module-resolution",
  },
  {
    slug: "typescript-union-contravariance",
    date: "2026-03-01",
    cat: "Frontend",
    title: "유니온이 함수 인자에서 교차 타입으로 변했다",
    excerpt:
      ["이벤트 시스템에서 유니온 핸들러를 호출하자 교차 타입이 요구되는 현상을 맞닥뜨렸다. 함수 반공변성의 원리와 비분산 조건부 타입으로 as 없이 타입을 정확히 추론시킨 과정."],
    tags: ["TypeScript", "반공변성", "제네릭"],
    read: "12 min",
    href: "/posts/typescript-union-contravariance",
  },
  {
    slug: "sse-react-event-registry",
    date: "2026-03-01",
    cat: "Frontend",
    title: "SSE in React, 유연하게 다루기",
    excerpt:
      ["매 렌더마다 재연결되고 중복 EventSource가 생기는 기존 훅의 문제를, EventRegistry + Singleton Provider 구조로 재설계해 컴포넌트 어디서든 이벤트를 자유롭게 구독할 수 있게 만든 이야기."],
    tags: ["React", "SSE", "EventSource"],
    read: "12 min",
    href: "/posts/sse-react-event-registry",
  },
  {
    slug: "react-display-name",
    date: "2026-02-01",
    cat: "Frontend",
    title: "React displayName 을 알아보자",
    excerpt:
      ["HOC·memo·forwardRef·Context에서 Anonymous가 뜨는 이유와 displayName이 해결하는 방식. React 19 변화도 포함."],
    tags: ["React", "DevTools", "디버깅"],
    read: "8 min",
    href: "/posts/react-display-name",
  },
  {
    slug: "typescript-enum",
    date: "2026-02-01",
    cat: "Frontend",
    title: "TypeScript Enum 을 알아보자",
    excerpt:
      ["양방향 매핑, 타입 안전성 부재, Tree-shaking 불가. TS팀도 닫지 못한 버그가 71개 이상인 enum을 피해야 하는 이유."],
    tags: ["TypeScript", "Enum", "as const"],
    read: "7 min",
    href: "/posts/typescript-enum",
  },
  {
    slug: "typescript-satisfies",
    date: "2026-02-01",
    cat: "Frontend",
    title: "TypeScript satisfies 를 알아보자",
    excerpt:
      ["`satisfies`는 타입을 고정하지 않고 조건만 검사한다. `: Type`·`as`와의 차이와 쓰는 상황."],
    tags: ["TypeScript", "satisfies", "타입 안전성"],
    read: "5 min",
    href: "/posts/typescript-satisfies",
  },
  {
    slug: "casl-typescript-deep-dive",
    date: "2026-02-01",
    cat: "Architecture",
    title: "CASL 타입 시스템과 두 단계 권한 체크",
    excerpt:
      ["CASL/ABAC 포스트에서 미뤘던 두 가지. InferSubjects·MongoAbility·ForcedSubject가 타입 시스템에서 하는 역할과, Route Guard와 Service 두 단계에서 모두 권한을 검사해야 하는 이유를 정리했다."],
    tags: ["CASL", "TypeScript", "NestJS", "권한"],
    read: "8 min",
    href: "/posts/casl-typescript-deep-dive",
  },
  {
    slug: "partial-pre-rendering",
    date: "2026-01-01",
    cat: "Frontend",
    title: "Partial Pre-rendering",
    excerpt:
      ["HTML 소스를 직접 뜯어보며 파악한 PPR 동작 원리. Partial First Page와 B/S/P placeholder가 Streaming을 통해 교체되는 메커니즘."],
    tags: ["Next.js", "PPR", "Streaming SSR"],
    read: "10 min",
    href: "/posts/partial-pre-rendering",
  },
  // ── 2025 ──────────────────────────────────────────────────────────────────
  {
    slug: "frontend-test-thoughts",
    date: "2025-10-01",
    cat: "Frontend",
    title: "프론트엔드 테스트 코드에 대한 고찰",
    excerpt:
      ["테스트 코드를 왜 써야 하는지 뒤늦게 납득한 과정. 피드백 사이클 단축부터 테크스펙으로서의 테스트까지."],
    tags: ["Testing", "프론트엔드", "TDD"],
    read: "12 min",
    href: "/posts/frontend-test-thoughts",
  },
  {
    slug: "zustand-slice-form-builder",
    date: "2025-09-01",
    cat: "Frontend",
    title: "Zustand 슬라이스 패턴으로 계층형 폼 빌더 상태 관리하기",
    excerpt:
      ["문항이 수십 개로 늘어도 전체 리렌더링 없이 개별 수정이 가능해야 했다. 슬라이스로 상태를 쪼개 독립적으로 다룬 설계 기록."],
    tags: ["React", "Zustand", "Form"],
    read: "10 min",
    href: "/posts/zustand-slice-form-builder",
  },
  {
    slug: "retrospective-2025-1h",
    date: "2025-07-01",
    cat: "Retrospective",
    title: "2025년 상반기 회고록",
    excerpt:
      ["처음으로 팀 리더를 맡고, 체중 16kg 감량, 스마일라식까지. 개발 외 삶의 여러 측면을 다루려 애썼던 2025년 상반기."],
    tags: ["회고", "2025", "성장", "리더십"],
    read: "18 min",
    href: "/posts/retrospective-2025-1h",
  },
  {
    slug: "turborepo-remote-cache-self-hosted",
    date: "2025-05-01",
    cat: "Infra",
    title: "Turborepo Remote Cache, 클라우드 대신 직접 구축한 이유",
    excerpt:
      ["추가 비용 없이 CI 빌드 캐시를 쓰고 싶었다. AWS EFS + Jenkins로 원격 캐시 서버를 세워 팀 전체 빌드 속도를 끌어올린 과정."],
    tags: ["Turborepo", "pnpm", "CI", "빌드 캐시"],
    read: "11 min",
    href: "/posts/turborepo-remote-cache-self-hosted",
  },
  // ── 2024 ──────────────────────────────────────────────────────────────────
  {
    slug: "retrospective-2024",
    date: "2025-01-01",
    cat: "Retrospective",
    title: "2024년 회고록",
    excerpt:
      ["구름 1주년, 학사 졸업, Nexters 25기. 개발자 스크럼 67개 주제를 팀과 함께 나누고, 모노레포를 도입하고, 꾸준함의 부재를 반성하면서도 성장한 흔적을 되돌아본 2024년 연간 회고."],
    tags: ["회고", "2024", "성장"],
    read: "16 min",
    href: "/posts/retrospective-2024",
  },
  {
    slug: "pnpm-dependency-deep-dive",
    date: "2024-12-01",
    cat: "Infra",
    title: "pnpm 의존성 파일을 관리 Deep Dive",
    excerpt:
      ["CAS·하드링크·심볼릭링크 구조와 피어 의존성 처리 방식. pnpm이 node_modules를 만드는 원리 전체."],
    tags: ["pnpm", "node_modules", "패키지 관리"],
    read: "15 min",
    href: "/posts/pnpm-dependency-deep-dive",
  },
  {
    slug: "pnpm-catalog",
    date: "2024-12-01",
    cat: "Infra",
    title: "pnpm Catalog 로 버전 관리 쉽게 하기",
    excerpt:
      ["모노레포에서 패키지가 많아질수록 복잡해지는 라이브러리 버전 관리를 pnpm Catalog로 해결한다. Named Catalog로 도메인별로 분리하고, 버전 업 시 단 한 곳만 수정하는 방법을 정리했다."],
    tags: ["pnpm", "Monorepo", "패키지 관리"],
    read: "5 min",
    href: "/posts/pnpm-catalog",
  },
  {
    slug: "plop-code-generator",
    date: "2024-12-01",
    cat: "Architecture",
    title: "PlopJS 기반으로 Code Generator 제작하기",
    excerpt:
      ["모노레포에서 패키지·MongoDB Collection 생성 시 반복되는 코드를 자동화하기 위해 PlopJS로 Code Generator를 만들었다. hygen과의 비교, Custom Action 구현, TypeScript 세팅까지 정리했다."],
    tags: ["PlopJS", "DX", "코드 자동화"],
    read: "10 min",
    href: "/posts/plop-code-generator",
  },
  {
    slug: "theo-conference-3rd",
    date: "2024-11-01",
    cat: "Retrospective",
    title: "테오의 컨퍼런스 3회차 MC 후기",
    excerpt:
      ["400명 규모의 테오 컨퍼런스 3회차에서 처음으로 MC를 맡은 후기. 무대 뒤에서 진행을 이끌며 느낀 것들과, 행사 준비 과정에서 배운 점."],
    tags: ["회고", "커뮤니티", "테오"],
    read: "8 min",
    href: "/posts/theo-conference-3rd",
  },
  {
    slug: "hard-link-symbolic-link",
    date: "2024-11-01",
    cat: "Infra",
    title: "Hard Link, Symbolic Link 에 대해 알아보자",
    excerpt:
      ["pnpm을 파다 보면 계속 나오는 Hard Link와 Symbolic Link. 두 개념의 차이와 pnpm이 Global Store와 프로젝트 node_modules 사이에서 두 가지를 함께 쓰는 이유를 정리했다."],
    tags: ["pnpm", "Linux", "파일 시스템"],
    read: "7 min",
    href: "/posts/hard-link-symbolic-link",
  },
  {
    slug: "changesets-monorepo-versioning",
    date: "2026-06-01",
    cat: "Infra",
    title: "gem 모노레포에 Changesets를 도입한 이야기",
    excerpt:
      ["PR마다 .changeset 파일로 버전 범프 의도를 선언하고 CI가 CHANGELOG와 버전을 자동 관리하는 Changesets. 커밋 컨벤션에 의존하지 않고 PR 단위로 명시성을 확보한 게 선택 이유였다. snapshot 버전, major 범프 연쇄 문제, 파일 본문을 비우면 CHANGELOG가 비는 함정까지."],
    tags: ["Changesets", "pnpm", "Monorepo", "CI/CD", "버전 관리"],
    read: "8 min",
    href: "/posts/changesets-monorepo-versioning",
  },
  {
    slug: "gemc-monorepo-cli",
    date: "2026-06-01",
    cat: "Infra",
    title: "gemc — gem-server 모노레포를 위한 내부 CLI 개선기",
    excerpt:
      ["gem-server 모노레포 명령어를 감싸는 내부 CLI gemc. process.cwd() 의존성을 끊어 루트 밖에서도 동작하게 하고, NVM PATH를 자식 프로세스에 주입하는 두 가지 개선으로 실행 환경 의존성을 제거했다."],
    tags: ["CLI", "Monorepo", "NestJS", "DX", "Node.js"],
    read: "7 min",
    href: "/posts/gemc-monorepo-cli",
  },
  {
    slug: "turbo-prune-monorepo",
    date: "2024-11-01",
    cat: "Infra",
    title: "Turbo prune 으로 모노레포 앱 빌드하기",
    excerpt:
      ["--docker 옵션으로 관련 없는 패키지 변경이 Cache Miss를 유발하는 문제를 잡았다. pnpm Cache Mount를 조합한 멀티스테이지 Dockerfile까지."],
    tags: ["Turborepo", "Docker", "Monorepo"],
    read: "8 min",
    href: "/posts/turbo-prune-monorepo",
  },
  {
    slug: "docker-compose-basics",
    date: "2024-10-01",
    cat: "Infra",
    title: "Docker Compose 찍먹하기",
    excerpt:
      ["다수의 컨테이너를 일괄 실행·관리하기 위한 Docker Compose의 필요성과 compose 파일 작성 방법, 컨테이너 간 네트워크 구성, 주요 명령어를 정리했다."],
    tags: ["Docker", "Docker Compose", "Infra"],
    read: "6 min",
    href: "/posts/docker-compose-basics",
  },
  {
    slug: "react-use-suspensed-query",
    date: "2024-09-01",
    cat: "Frontend",
    title: "useSuspensedQuery 훅 제작일지",
    excerpt:
      ["Suspense를 써도 data 타입이 T | undefined로 추론되는 문제를 해결하기 위해 useSuspensedQuery 훅을 직접 만든 과정. enabled 옵션과 ErrorBoundary 조합으로 타입 무결성을 보장하는 방법을 정리했다."],
    tags: ["React Query", "TypeScript", "Suspense"],
    read: "8 min",
    href: "/posts/react-use-suspensed-query",
  },
  {
    slug: "react-query-mutation",
    date: "2024-09-01",
    cat: "Frontend",
    title: "React Query Mutation",
    excerpt:
      ["useMutation의 콜백 실행 순서, Query Invalidation·setQueryData·Optimistic Update 세 가지 결과 업데이트 전략을 코드 예시와 함께 정리했다."],
    tags: ["React Query", "TanStack Query", "Mutation"],
    read: "8 min",
    href: "/posts/react-query-mutation",
  },
  {
    slug: "retrospective-2024-1h",
    date: "2024-06-01",
    cat: "Retrospective",
    title: "2024년 상반기 회고록",
    excerpt:
      ["goorm에서 보낸 첫 1년의 절반. 익힌 것들과 부족함을 솔직하게 정리한 2024년 상반기 회고. 모노레포 도입, 팀 스터디, 그리고 꾸준함에 대한 고민."],
    tags: ["회고", "2024", "성장"],
    read: "14 min",
    href: "/posts/retrospective-2024-1h",
  },
  {
    slug: "devmalsami-release",
    date: "2024-06-01",
    cat: "Retrospective",
    title: "마침내, 데브말싸미 프로젝트 릴리즈를 마치며",
    excerpt:
      ["2전 3기 끝에 드디어 데브말싸미 사이드 프로젝트를 세상에 내놓았다. 팀 빌딩부터 배포까지, 좌충우돌 협업의 모든 과정을 담은 기록."],
    tags: ["회고", "사이드 프로젝트", "협업", "릴리즈"],
    read: "10 min",
    href: "/posts/devmalsami-release",
  },
  {
    slug: "nestjs-docker-image-optimization",
    date: "2024-06-01",
    cat: "Infra",
    title: "내겐 너무나 컸던 NestJS Docker Image, 이젠 좀 줄여보자",
    excerpt:
      ["급하게 만든 NestJS Dockerfile이 1GB에 육박했다. pnpm + turbo prune + 멀티스테이지 빌드를 조합해 이미지를 대폭 줄인 과정."],
    tags: ["NestJS", "Docker", "pnpm", "최적화"],
    read: "8 min",
    href: "/posts/nestjs-docker-image-optimization",
  },
  {
    slug: "nextjs-image-optimization",
    date: "2024-06-01",
    cat: "Frontend",
    title: "next/Image 최적화 — 왜 느리고 어떻게 해결하나",
    excerpt:
      ["캐시 MISS가 반복되는 next/image의 구조적 문제를 파악하고, Squoosh→sharp 교체와 On-The-Fly(CDN + Lambda@Edge) 방식을 비교해 해결 방향을 찾은 기록."],
    tags: ["Next.js", "이미지 최적화", "CDN"],
    read: "8 min",
    href: "/posts/nextjs-image-optimization",
  },
  {
    slug: "github-actions-docker-deploy",
    date: "2024-06-01",
    cat: "Infra",
    title: "Github Actions으로 Docker 배포 오답노트",
    excerpt:
      ["scp-action source 경로 오류, Job 간 checkout 누락, .env 숨김 파일 문제, Nginx 502·host.docker.internal Linux 미지원까지. 처음 배포 파이프라인을 구축하며 삽질한 것들의 기록."],
    tags: ["GitHub Actions", "Docker", "CI/CD"],
    read: "7 min",
    href: "/posts/github-actions-docker-deploy",
  },
  {
    slug: "theo-sprint-17th",
    date: "2024-04-01",
    cat: "Retrospective",
    title: "테오의 스프린트 17기 퍼실리테이터 후기",
    excerpt:
      ["테오의 스프린트 17기 퍼실리테이터 경험기. 참여자에서 운영진으로 역할이 바뀌며 배운 협업과 공감의 방식."],
    tags: ["회고", "커뮤니티", "테오"],
    read: "8 min",
    href: "/posts/theo-sprint-17th",
  },
  {
    slug: "promise-with-resolver",
    date: "2024-04-01",
    cat: "Frontend",
    title: "Promise.withResolvers 라는 친구가 새로 나왔다",
    excerpt:
      ["2024년에 새롭게 등장한 Promise.withResolvers(). 기존 Promise 생성자의 한계와 비교해 어떤 상황에서 유용한지 살펴봤다."],
    tags: ["JavaScript", "Promise", "ES2024"],
    read: "4 min",
    href: "/posts/promise-with-resolver",
  },
  {
    slug: "useeffect-after-paint",
    date: "2024-03-01",
    cat: "Frontend",
    title: "useEffect는 어떻게 Paint 이후에 정확히 실행될 수 있을까?",
    excerpt:
      ["MessageChannel API를 통해 useEffect가 Paint 이후에 실행되는 원리를 파헤쳤다. 스케줄러 내부 코드를 통해 Passive Effect가 언제 큐에 쌓이는지 직접 추적한 기록."],
    tags: ["React", "useEffect", "브라우저"],
    read: "7 min",
    href: "/posts/useeffect-after-paint",
  },
  {
    slug: "react-error-boundary",
    date: "2024-02-01",
    cat: "Frontend",
    title: "ErrorBoundary 의 구조를 파헤쳐보자",
    excerpt:
      ["React 공식 문서에서 ErrorBoundary 구현체를 직접 살펴보며 componentDidCatch·getDerivedStateFromError의 역할과 Suspense와의 조합을 정리했다."],
    tags: ["React", "ErrorBoundary", "에러 처리"],
    read: "8 min",
    href: "/posts/react-error-boundary",
  },
  {
    slug: "edge-runtime-internals",
    date: "2024-02-01",
    cat: "Frontend",
    title: "Edge Runtime 내부 동작 분석",
    excerpt:
      ["Next.js 미들웨어가 항상 Edge Runtime으로 실행되는 이유를 Node.js vm 모듈과 @edge-runtime/vm 소스코드를 통해 파악했다. Context 생성, Web API 주입, 코드 실행 흐름까지 정리한 내용."],
    tags: ["Next.js", "Edge Runtime", "Node.js"],
    read: "10 min",
    href: "/posts/edge-runtime-internals",
  },
  {
    slug: "custom-event-observer",
    date: "2024-02-01",
    cat: "Frontend",
    title: "CustomEvent로 Observer Pattern 구현하기",
    excerpt:
      ["Class 내부 변화를 컴포넌트에 전달할 방법이 없어 CustomEvent를 사용했다. dispatchEvent로 이벤트를 발행하고, TypeScript에서 WindowEventMap을 확장해 타입 안전하게 구독하는 방법을 정리했다."],
    tags: ["CustomEvent", "Observer Pattern", "TypeScript"],
    read: "5 min",
    href: "/posts/custom-event-observer",
  },
  {
    slug: "zero-runtime-vanilla-extract",
    date: "2024-03-01",
    cat: "Frontend",
    title: "Zero Runtime CSS-in-JS (with Vanilla Extract)",
    excerpt:
      ["런타임에 스타일을 생성하는 Emotion/styled-components의 성능 비용과, Vanilla Extract가 빌드 타임 CSS 변환으로 이를 해결하는 방식. sprinkles와 recipe를 활용한 실제 사용법까지."],
    tags: ["CSS-in-JS", "Vanilla Extract", "Zero Runtime"],
    read: "8 min",
    href: "/posts/zero-runtime-vanilla-extract",
  },
  // ── 2024.01 ───────────────────────────────────────────────────────────────
  {
    slug: "retrospective-2023",
    date: "2024-01-01",
    cat: "Retrospective",
    title: "2023년 회고록",
    excerpt:
      ["Nexters 24기 활동, 데브말싸미 사이드 프로젝트, goorm 입사. 개발자로 본격적으로 자리를 잡아가던 2023년을 돌아본 기록."],
    tags: ["회고", "2023", "성장"],
    read: "16 min",
    href: "/posts/retrospective-2023",
  },
  // ── 2023 ──────────────────────────────────────────────────────────────────
  {
    slug: "how-bundler-works",
    date: "2023-10-01",
    cat: "Frontend",
    title: "번들러란 무엇이며, 어떻게 동작하는 걸까?",
    excerpt:
      ["직접 번들러를 만들어보며 파악한 동작 원리. AST 의존성 트리 구축부터 Webpack과 Rollup의 번들링 방식 차이까지."],
    tags: ["Webpack", "Rollup", "esbuild", "번들러"],
    read: "10 min",
    href: "/posts/how-bundler-works",
  },
  {
    slug: "nexters-24th",
    date: "2023-07-01",
    cat: "Retrospective",
    title: "Nexters 24기 FE 합격 후기",
    excerpt:
      ["IT 창업 동아리 Nexters 24기 FE 합격 후기. 포트폴리오 준비부터 면접까지 거친 과정과 합격 후 느낀 기대감."],
    tags: ["회고", "Nexters", "동아리"],
    read: "8 min",
    href: "/posts/nexters-24th",
  },
  {
    slug: "retrospective-2023-1h",
    date: "2023-07-01",
    cat: "Retrospective",
    title: "2023년 상반기 회고록",
    excerpt:
      ["ICT 학점연계 인턴십, 첫 사이드 프로젝트 경험, 성장에 대한 갈망. 개발자로서 첫 반년을 정리한 2023년 상반기 회고."],
    tags: ["회고", "2023", "성장"],
    read: "12 min",
    href: "/posts/retrospective-2023-1h",
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
  {
    slug: "joining-company-4months",
    date: "2023-06-01",
    cat: "Retrospective",
    title: "입사한 지 4개월이 지난 지금",
    excerpt:
      ["ICT 학점연계 인턴십 4개월째, 6월 30일 종료를 앞두고 회사에서 무엇을 배웠고 무엇이 부족했는지 되짚은 글."],
    tags: ["회고", "인턴십", "성장"],
    read: "8 min",
    href: "/posts/joining-company-4months",
  },
  {
    slug: "http-cookie-samesite",
    date: "2023-05-01",
    cat: "Architecture",
    title: "HTTP Cookie 와 SameSite 정책에 대해서",
    excerpt:
      ["Set-Cookie 속성과 SameSite 정책(None·Strict·Lax)을 실제 사이드 프로젝트에서 겪은 CSRF 문제와 함께 정리했다. 서드 파티 쿠키가 차단되는 흐름도 설명한다."],
    tags: ["HTTP", "Cookie", "SameSite", "CSRF"],
    read: "8 min",
    href: "/posts/http-cookie-samesite",
  },
  {
    slug: "cors-deep-dive",
    date: "2023-05-01",
    cat: "Architecture",
    title: "이번에야말로 CORS를 좀 확실하게 알아보자",
    excerpt:
      ["Origin 개념부터 Preflight·Simple Request·Credentialed Request 세 시나리오까지, CORS가 작동하는 원리와 브라우저에서만 체크되는 이유를 설명했다."],
    tags: ["CORS", "HTTP", "보안"],
    read: "10 min",
    href: "/posts/cors-deep-dive",
  },
  {
    slug: "theo-sprint-15th",
    date: "2023-04-01",
    cat: "Retrospective",
    title: "테오의 스프린트 15기 후기",
    excerpt:
      ["테오의 스프린트 15기 참여 후기. 낯선 사람들과 단기 프로젝트를 완성하며 협업과 방향성의 중요성을 다시 배운 과정."],
    tags: ["회고", "커뮤니티", "테오"],
    read: "7 min",
    href: "/posts/theo-sprint-15th",
  },
  {
    slug: "react-key-props",
    date: "2023-05-01",
    cat: "Frontend",
    title: "React Key Props 를 제대로 이해해보자",
    excerpt:
      ["재조정 알고리즘이 O(n)으로 동작하는 두 가지 가정 중 하나가 key props 다. key 없이 index를 쓸 때 React.memo가 왜 무효화되는지, State Leakage 버그가 왜 생기는지 코드로 짚어봤다."],
    tags: ["React", "Key Props", "재조정", "성능"],
    read: "6 min",
    href: "/posts/react-key-props",
  },
  {
    slug: "react-windowing",
    date: "2023-05-01",
    cat: "Frontend",
    title: "windowing 기법이란 무엇이고, 어떻게 최적화를 하는 걸까?",
    excerpt:
      ["무한 스크롤로 쌓인 DOM 노드가 TBT·INP를 어떻게 망치는지 수치로 확인하고, react-virtualized가 뷰포트 밖 요소를 렌더링하지 않는 원리를 정리했다."],
    tags: ["React", "Windowing", "성능 최적화", "Virtual Scroll"],
    read: "9 min",
    href: "/posts/react-windowing",
  },
  {
    slug: "react-state-usestate",
    date: "2023-04-01",
    cat: "Frontend",
    title: "React의 state, 그리고 useState에 대해 더 알고 싶어졌다",
    excerpt:
      ["useState의 setter가 렌더링을 어떻게 예약하는지, 클로저와 stale state 문제, batch update가 작동하는 원리를 파헤쳤다."],
    tags: ["React", "useState", "렌더링"],
    read: "9 min",
    href: "/posts/react-state-usestate",
  },
  {
    slug: "react-18-auto-batching",
    date: "2023-04-01",
    cat: "Frontend",
    title: "React 18에서 추가된 Auto Batching 은 무엇인가?",
    excerpt:
      ["React 18 이전에는 이벤트 핸들러 안에서만 배치됐던 상태 업데이트가, 이제는 Promise·setTimeout 안에서도 자동 배치된다. 무엇이 바뀌었는지 정리했다."],
    tags: ["React", "React 18", "Batching", "성능"],
    read: "6 min",
    href: "/posts/react-18-auto-batching",
  },
  {
    slug: "event-bubbling-capturing-delegation",
    date: "2023-04-01",
    cat: "Frontend",
    title: "이벤트 버블링, 캡처링, 위임을 알아보자",
    excerpt:
      ["이벤트 흐름의 세 단계(캡처링 → 타깃 → 버블링)와 stopPropagation·stopImmediatePropagation의 차이, 그리고 이벤트 위임 패턴을 정리했다."],
    tags: ["JavaScript", "이벤트", "DOM"],
    read: "7 min",
    href: "/posts/event-bubbling-capturing-delegation",
  },
  {
    slug: "kb-software-competition",
    date: "2023-03-01",
    cat: "Retrospective",
    title: "제 5회 KB 국민은행 소프트웨어 경진대회",
    excerpt:
      ["제 5회 KB 국민은행 소프트웨어 경진대회 참가 후기. 팀 프로젝트를 준비하며 겪은 시행착오와 아쉬웠던 결과, 그리고 다음 도전의 다짐."],
    tags: ["회고", "대회", "프로젝트"],
    read: "6 min",
    href: "/posts/kb-software-competition",
  },
  {
    slug: "theo-sprint-14th",
    date: "2023-03-01",
    cat: "Retrospective",
    title: "테오의 스프린트 14기 후기",
    excerpt:
      ["처음 참여한 테오의 스프린트 14기 후기. 48시간 안에 아이디어를 프로덕트로 만드는 경험과 팀원들에게서 받은 자극."],
    tags: ["회고", "커뮤니티", "테오"],
    read: "7 min",
    href: "/posts/theo-sprint-14th",
  },
  {
    slug: "ict-internship-2023",
    date: "2023-03-01",
    cat: "Retrospective",
    title: "2023 상반기 ICT 학점연계 인턴십 합격 후기",
    excerpt:
      ["2023 상반기 ICT 학점연계 인턴십 합격 후기. 지원 동기부터 서류와 면접 준비 과정, 그리고 최종 합격까지."],
    tags: ["회고", "인턴십", "ICT"],
    read: "7 min",
    href: "/posts/ict-internship-2023",
  },
  {
    slug: "joining-company-2weeks",
    date: "2023-03-01",
    cat: "Retrospective",
    title: "입사한 후 2주가 지난 지금",
    excerpt:
      ["goorm 입사 2주 후 느낀 첫 인상과 적응기. 실무와 학교 공부의 차이, 코드 리뷰를 처음 받으며 느낀 것들을 정리했다."],
    tags: ["회고", "인턴십", "성장"],
    read: "6 min",
    href: "/posts/joining-company-2weeks",
  },
  {
    slug: "glob-pattern",
    date: "2023-02-01",
    cat: "Architecture",
    title: "Glob Pattern을 완벽하게 정리해보자",
    excerpt:
      ["*.js·**/*.ts·{a,b}·[!abc] 같은 Glob 패턴의 와일드카드와 대괄호 문법을 실제 파일 매칭 예시와 함께 완벽하게 정리했다."],
    tags: ["Glob", "파일 시스템", "CLI"],
    read: "6 min",
    href: "/posts/glob-pattern",
  },
  {
    slug: "for-loop-let-var",
    date: "2023-02-01",
    cat: "Frontend",
    title: "for 문 안에 let 과 var를 넣으면 뭐가 달라지나?",
    excerpt:
      ["for 루프 안에 var를 쓰면 클로저가 예상대로 작동하지 않는 이유, let이 블록 스코프로 이 문제를 해결하는 방식을 코드와 함께 설명했다."],
    tags: ["JavaScript", "let", "var", "클로저"],
    read: "5 min",
    href: "/posts/for-loop-let-var",
  },
  {
    slug: "javascript-event-loop",
    date: "2023-02-01",
    cat: "Frontend",
    title: "이벤트 루프란 무엇이며, 어떻게 진행되는 건가?",
    excerpt:
      ["JS 엔진은 단일 스레드지만 브라우저는 그렇지 않다. Task Queue와 Microtask Queue의 처리 순서, requestAnimationFrame과의 관계까지 이벤트 루프를 정확하게 정리했다."],
    tags: ["JavaScript", "이벤트 루프", "비동기"],
    read: "10 min",
    href: "/posts/javascript-event-loop",
  },
  {
    slug: "javascript-object-deep-dive",
    date: "2023-02-01",
    cat: "Frontend",
    title: "JS의 Object를 조금 더 깊게 파헤쳐보자",
    excerpt:
      ["JS 객체의 프로퍼티 플래그(writable, enumerable, configurable), 참조 타입과 힙 메모리 구조, 얕은/깊은 복사의 함정까지 객체를 깊게 파헤쳤다."],
    tags: ["JavaScript", "Object", "메모리"],
    read: "9 min",
    href: "/posts/javascript-object-deep-dive",
  },
  {
    slug: "useeffect-vs-uselayouteffect",
    date: "2023-02-01",
    cat: "Frontend",
    title: "useEffect는 가끔 Paint 작업 이전에 실행된다고?",
    excerpt:
      ["useEffect와 useLayoutEffect의 실행 시점 차이를 React 렌더링 파이프라인 관점에서 정리했다. useLayoutEffect에서 setState를 호출하면 Passive Effect가 Paint 이전에 실행되는 이유도 다룬다."],
    tags: ["React", "useEffect", "useLayoutEffect"],
    read: "9 min",
    href: "/posts/useeffect-vs-uselayouteffect",
  },
  {
    slug: "javascript-execution-context",
    date: "2023-02-01",
    cat: "Frontend",
    title: "실행 컨텍스트란 무엇인가?",
    excerpt:
      ["JS 코드가 실행되기 전 엔진이 수집하는 환경 정보 객체, 실행 컨텍스트. VariableEnvironment·LexicalEnvironment·ThisBinding의 구조와 호이스팅이 일어나는 원리를 Call Stack 흐름으로 정리했다."],
    tags: ["JavaScript", "실행 컨텍스트", "호이스팅", "스코프"],
    read: "9 min",
    href: "/posts/javascript-execution-context",
  },
  {
    slug: "javascript-equality-comparison",
    date: "2023-01-01",
    cat: "Frontend",
    title: "JS에서는 동등 비교 연산을 어떻게 수행할까?",
    excerpt:
      ["JS의 ===·==·Object.is 세 가지 동등 비교 방식의 차이와 NaN·+0/-0 처리 방식, Map과 Set에 쓰이는 SameValueZero 알고리즘을 정리했다."],
    tags: ["JavaScript", "동등 비교", "NaN"],
    read: "7 min",
    href: "/posts/javascript-equality-comparison",
  },
  {
    slug: "react-rendering",
    date: "2023-01-01",
    cat: "Frontend",
    title: "React 에서 렌더링이란 대체 무엇일까?",
    excerpt:
      ["React에서 렌더링은 DOM 업데이트가 아니다. Render Phase·Commit Phase·Passive Effect 단계를 구분하고, 불필요한 렌더링이 발생하는 원인과 Concurrent Mode까지 정리했다."],
    tags: ["React", "렌더링", "Virtual DOM"],
    read: "10 min",
    href: "/posts/react-rendering",
  },
  {
    slug: "tdd-introduction",
    date: "2023-01-01",
    cat: "Architecture",
    title: "TDD 는 무엇이며 대체 왜 도입하는 걸까?",
    excerpt:
      ["TDD가 무엇인지, Red-Green 사이클이 왜 중요한지, Unit Test·Integration Test·Functional Test·E2E Test의 차이와 BDD와의 관계를 정리했다."],
    tags: ["TDD", "테스트", "BDD"],
    read: "10 min",
    href: "/posts/tdd-introduction",
  },
  {
    slug: "jest-functional-test",
    date: "2023-01-01",
    cat: "Architecture",
    title: "Jest 직접 Functional Test Code를 작성해보자",
    excerpt:
      ["버튼 색상 토글 기능을 예시로 TDD 사이클을 직접 따라가며 React Testing Library로 Functional Test Code를 작성하는 과정을 기록했다."],
    tags: ["Jest", "Testing Library", "TDD"],
    read: "7 min",
    href: "/posts/jest-functional-test",
  },
  {
    slug: "javascript-iterable",
    date: "2023-01-01",
    cat: "Frontend",
    title: "Iterable한 객체, 너가 대체 뭔지 알고 싶다",
    excerpt:
      ["ES6 Iteration Protocol을 정리하고, Python의 range 함수를 JS로 구현하는 과정에서 Iterable·Iterator·Well-formed Iterable·Generator의 관계를 명확히 했다."],
    tags: ["JavaScript", "Iterable", "Iterator", "Generator"],
    read: "8 min",
    href: "/posts/javascript-iterable",
  },
  {
    slug: "browser-parsing",
    date: "2023-01-01",
    cat: "Frontend",
    title: "브라우저 파싱 원리에 대한 고찰",
    excerpt:
      ["브라우저가 HTML을 DOM 트리로 변환하는 Tokenizer·Tree Constructor 단계와 에러 허용(Error Tolerance) 파싱의 동작 방식을 정리했다. how-browser-works와 달리 파싱 과정 자체에 집중한다."],
    tags: ["브라우저", "파싱", "DOM", "HTML"],
    read: "7 min",
    href: "/posts/browser-parsing",
  },
  {
    slug: "how-browser-works",
    date: "2023-01-01",
    cat: "Frontend",
    title: "브라우저는 어떻게 동작하는 걸까?",
    excerpt:
      ["URL 입력부터 화면에 픽셀이 찍히기까지. DOM·CSSOM 생성, 렌더 트리 구성, Layout·Paint, Reflow·Repaint, 하드웨어 가속(Graphic Layer)을 순서대로 정리했다."],
    tags: ["브라우저", "CRP", "렌더링"],
    read: "12 min",
    href: "/posts/how-browser-works",
  },
  {
    slug: "server-state-react-query",
    date: "2023-01-01",
    cat: "Frontend",
    title: "Server State는 뭐고, React Query는 왜 쓰는가?",
    excerpt:
      ["서버 상태가 클라이언트 상태와 다른 이유, Redux로는 왜 부족한지, React Query가 stale/fresh/inactive 상태와 캐시를 어떻게 관리하는지 기초부터 정리했다."],
    tags: ["React Query", "Server State", "캐싱"],
    read: "10 min",
    href: "/posts/server-state-react-query",
  },
  {
    slug: "csr-ssr-spa-mpa",
    date: "2023-01-01",
    cat: "Frontend",
    title: "CSR? SSR? SPA? MPA? 이것들은 뭘까?",
    excerpt:
      ["CSR·SSR·SSG·Universal Rendering의 차이와 각 렌더링 전략이 적합한 상황, SPA와 MPA의 구분까지 프론트엔드 렌더링 전략 전반을 정리했다."],
    tags: ["CSR", "SSR", "SPA", "MPA"],
    read: "9 min",
    href: "/posts/csr-ssr-spa-mpa",
  },
  {
    slug: "retrospective-2022",
    date: "2023-01-01",
    cat: "Retrospective",
    title: "2022년 회고록",
    excerpt:
      ["프론트엔드 개발을 시작하고 첫 해를 마치며 정리한 기록. 스터디, 프로젝트, KB 공모전, 그리고 앞으로의 방향."],
    tags: ["회고", "2022", "성장"],
    read: "12 min",
    href: "/posts/retrospective-2022",
  },
  // ── 2022 ──────────────────────────────────────────────────────────────────
  {
    slug: "web-server-vs-was",
    date: "2023-01-01",
    cat: "Architecture",
    title: "Web Server 와 Web Application Server 간의 차이",
    excerpt:
      ["웹 서버와 WAS의 역할 분리, CGI의 한계, fail over·fail back으로 무중단 운영을 구현하는 이유까지. 왜 둘을 함께 써야 하는지 구조적으로 정리했다."],
    tags: ["Web", "WAS", "Nginx", "아키텍처"],
    read: "6 min",
    href: "/posts/web-server-vs-was",
  },
  {
    slug: "mime-content-type",
    date: "2022-12-01",
    cat: "Architecture",
    title: "MIME type은 뭐고, Content-type은 뭔데?",
    excerpt:
      ["Content-Type 헤더가 왜 필요한지, MIME Type의 구조와 대표적인 미디어 타입, Base64 인코딩과의 관계까지 정리했다."],
    tags: ["HTTP", "MIME", "Content-Type"],
    read: "6 min",
    href: "/posts/mime-content-type",
  },
  {
    slug: "git-hook-husky",
    date: "2022-12-01",
    cat: "Architecture",
    title: "Git Hook은 무엇이고, Husky는 왜 쓰는걸까?",
    excerpt:
      ["Git Hook이 무엇인지, pre-commit·commit-msg 훅으로 코드 품질을 자동으로 지키는 방법, Husky와 lint-staged를 조합하는 설정까지 정리했다."],
    tags: ["Git", "Husky", "lint-staged"],
    read: "7 min",
    href: "/posts/git-hook-husky",
  },
  {
    slug: "eslint-prettier",
    date: "2022-12-01",
    cat: "Architecture",
    title: "ESLint, Prettier를 왜 써야 할까?",
    excerpt:
      ["ESLint의 정적 분석 원리(AST 기반), Prettier와의 역할 분리, 두 도구를 함께 쓸 때 충돌을 피하는 설정 방법을 정리했다."],
    tags: ["ESLint", "Prettier", "DX"],
    read: "7 min",
    href: "/posts/eslint-prettier",
  },
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
