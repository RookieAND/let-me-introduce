import caslAbacMd from "#/content/posts/casl-abac-declarative-permissions.md?raw";
import turborepoMd from "#/content/posts/turborepo-remote-cache-self-hosted.md?raw";
import zustandSliceMd from "#/content/posts/zustand-slice-form-builder.md?raw";

// TypeScript
import tsUnionContravarianceMd from "#/content/posts/typescript-union-contravariance.md?raw";
import tsEnumMd from "#/content/posts/typescript-enum.md?raw";
import tsSatisfiesMd from "#/content/posts/typescript-satisfies.md?raw";
import tsModuleResolutionMd from "#/content/posts/typescript-module-resolution.md?raw";

// FrontEnd
import sseReactMd from "#/content/posts/sse-react-event-registry.md?raw";
import reactDisplayNameMd from "#/content/posts/react-display-name.md?raw";
import reactQueryMutationMd from "#/content/posts/react-query-mutation.md?raw";
import nextjsImageMd from "#/content/posts/nextjs-image-optimization.md?raw";
import nextjsPprMd from "#/content/posts/nextjs-partial-pre-rendering.md?raw";
import frontendTestMd from "#/content/posts/frontend-test-thoughts.md?raw";
import zeroRuntimeMd from "#/content/posts/zero-runtime-vanilla-extract.md?raw";
import moduleFederationMd from "#/content/posts/module-federation.md?raw";
import edgeRuntimeMd from "#/content/posts/edge-runtime-internals.md?raw";
import customEventMd from "#/content/posts/custom-event-observer.md?raw";
import viteBundleMd from "#/content/posts/vite-code-splitting-bundle.md?raw";

// Infra / Monorepo
import pnpmDependencyMd from "#/content/posts/pnpm-dependency-deep-dive.md?raw";
import pnpmCatalogMd from "#/content/posts/pnpm-catalog.md?raw";
import turboPruneMd from "#/content/posts/turbo-prune-monorepo.md?raw";
import dockerComposeMd from "#/content/posts/docker-compose-basics.md?raw";
import githubActionsDockerMd from "#/content/posts/github-actions-docker-deploy.md?raw";

// Other
import plopMd from "#/content/posts/plop-code-generator.md?raw";
import suitesNestjsMd from "#/content/posts/suites-nestjs-auto-mock.md?raw";

export type Category = "Frontend" | "Backend" | "Architecture" | "Infra" | "회고";

export interface Post {
  slug: string;
  date: string;
  year: string;
  cat: Category;
  title: string;
  excerpt: string;
  tags: string[];
  read: string;
  href: string;
  content?: string;
}

export const FEATURED_POST: Post = {
  slug: "casl-abac-declarative-permissions",
  cat: "Architecture",
  date: "2026.02",
  year: "2026",
  read: "12 min",
  title: "수동 DB 제어를 걷어내고 CASL/ABAC로 권한을 선언형으로 다시 설계하기",
  excerpt:
    "CS가 반복되고 개발 의존도가 커지던 권한 관리를, 역할·리소스·액션 기반 ABAC 모델로 옮긴 과정. 미들웨어에서 만든 Ability 객체를 nestjs-cls로 요청 컨텍스트에 전파해, 어디서든 추가 의존성 주입 없이 권한을 검사하는 구조를 만든 이야기.",
  tags: ["CASL", "ABAC", "NestJS", "권한"],
  href: "https://velog.io/@rookieand/posts",
  content: caslAbacMd,
};

export const POSTS: Post[] = [
  {
    slug: "vite-code-splitting-bundle",
    date: "2026.06",
    year: "2026",
    cat: "Frontend",
    title: "Vite codeSplitting 번들 최적화 전략",
    excerpt:
      "minSize·maxSize 7가지 시나리오를 Playwright 실측으로 비교했다. maxSize를 없애면 총 번들은 줄지만 초기 로드는 최악이 되는 이유와, modulepreload manifest가 초기 로드에 미치는 영향.",
    tags: ["Vite", "Bundle", "최적화"],
    read: "10 min",
    href: "/posts/vite-code-splitting-bundle",
    content: viteBundleMd,
  },
  {
    slug: "module-federation",
    date: "2026.05",
    year: "2026",
    cat: "Frontend",
    title: "Module Federation",
    excerpt:
      "하나의 빌드에서 다른 빌드의 코드를 런타임에 동적으로 로드하는 MF 아키텍처. Producer/Consumer 개념부터 Shared 의존성 전략, Bridge 패턴, 도입 시 고려할 CSS 격리·타입 안전성·운영 복잡도까지 정리한 내용.",
    tags: ["Module Federation", "Micro Frontend", "Webpack"],
    read: "8 min",
    href: "/posts/module-federation",
    content: moduleFederationMd,
  },
  {
    slug: "typescript-module-resolution",
    date: "2026.05",
    year: "2026",
    cat: "Frontend",
    title: "TypeScript Module Resolution 전략을 알아보자",
    excerpt:
      "node, node16, bundler 세 전략의 차이를 비교하고, Vite 기반 프로젝트에서 bundler가 사실상 표준인 이유를 exports 필드 인식·확장자 생략·paths 별칭 측면에서 정리한 내용.",
    tags: ["TypeScript", "Vite", "모듈"],
    read: "7 min",
    href: "/posts/typescript-module-resolution",
    content: tsModuleResolutionMd,
  },
  {
    slug: "suites-nestjs-auto-mock",
    date: "2026.06",
    year: "2026",
    cat: "Backend",
    title: "@suites로 NestJS 단위 테스트 Auto-Mock 적용하기",
    excerpt:
      "수동 jest.fn()과 as any 캐스팅으로 가득한 테스트 셋업을 줄이기 위해 도입한 @suites. NestJS DI 메타데이터를 읽어 의존성을 자동 Mock하는 원리와 solitary/sociable 두 전략을 정리했다.",
    tags: ["NestJS", "Testing", "Jest", "Auto-Mock"],
    read: "8 min",
    href: "/posts/suites-nestjs-auto-mock",
    content: suitesNestjsMd,
  },
  {
    slug: "typescript-union-contravariance",
    date: "2026.03",
    year: "2026",
    cat: "Frontend",
    title: "유니온이 함수 인자에서 교차 타입으로 변했다",
    excerpt:
      "이벤트 시스템에서 유니온 핸들러를 호출하자 교차 타입이 요구되는 현상을 맞닥뜨렸다. 함수 반공변성의 원리와 비분산 조건부 타입으로 as 없이 타입을 정확히 추론시킨 과정.",
    tags: ["TypeScript", "반공변성", "제네릭"],
    read: "12 min",
    href: "/posts/typescript-union-contravariance",
    content: tsUnionContravarianceMd,
  },
  {
    slug: "sse-react-event-registry",
    date: "2026.03",
    year: "2026",
    cat: "Frontend",
    title: "SSE in React, 유연하게 다루기",
    excerpt:
      "매 렌더마다 재연결되고 중복 EventSource가 생기는 기존 훅의 문제를, EventRegistry + Singleton Provider 구조로 재설계해 컴포넌트 어디서든 이벤트를 자유롭게 구독할 수 있게 만든 이야기.",
    tags: ["React", "SSE", "EventSource"],
    read: "12 min",
    href: "/posts/sse-react-event-registry",
    content: sseReactMd,
  },
  {
    slug: "react-display-name",
    date: "2026.02",
    year: "2026",
    cat: "Frontend",
    title: "React displayName 을 알아보자",
    excerpt:
      "HOC·memo·forwardRef·Context에서 DevTools가 Anonymous로 표시되는 이유와 displayName이 해결하는 방식. ES6 Function.name 추론의 한계와 React 19에서 forwardRef 제거로 달라지는 부분까지 정리했다.",
    tags: ["React", "DevTools", "디버깅"],
    read: "8 min",
    href: "/posts/react-display-name",
    content: reactDisplayNameMd,
  },
  {
    slug: "typescript-enum",
    date: "2026.02",
    year: "2026",
    cat: "Frontend",
    title: "TypeScript Enum 을 알아보자",
    excerpt:
      "Numeric enum의 양방향 매핑과 타입 안전성 부재, String enum의 명목적 타이핑 문제, IIFE 컴파일로 인한 트리쉐이킹 불가까지. TypeScript 팀도 닫지 못한 버그가 71개 이상인 enum을 피해야 하는 이유.",
    tags: ["TypeScript", "Enum", "as const"],
    read: "7 min",
    href: "/posts/typescript-enum",
    content: tsEnumMd,
  },
  {
    slug: "typescript-satisfies",
    date: "2026.02",
    year: "2026",
    cat: "Frontend",
    title: "TypeScript satisfies 를 알아보자",
    excerpt:
      ": Type 지정은 타입을 고정시키고, as는 타입을 무시한다. satisfies는 조건만 검사하고 실제 타입 추론을 건드리지 않는다. 세 가지 방식의 차이와 각각을 써야 할 상황을 정리했다.",
    tags: ["TypeScript", "satisfies"],
    read: "5 min",
    href: "/posts/typescript-satisfies",
    content: tsSatisfiesMd,
  },
  {
    slug: "partial-pre-rendering",
    date: "2026.01",
    year: "2026",
    cat: "Frontend",
    title: "Partial Pre-rendering",
    excerpt:
      "Streaming SSR과 달리 정적 영역을 Build Time에 분리하는 PPR의 Partial First Page 개념, B/S/P placeholder가 Transfer-Encoding: chunked 기반으로 교체되는 원리를 HTML 직접 분석하며 파악한 내용.",
    tags: ["Next.js", "PPR", "Streaming SSR"],
    read: "10 min",
    href: "/posts/partial-pre-rendering",
    content: nextjsPprMd,
  },
  {
    slug: "squad-leader-retrospective",
    date: "2026.01",
    year: "2026",
    cat: "회고",
    title: "스쿼드 리더로 보낸 1년 — 비전·OKR·회고를 직접 굴려본 기록",
    excerpt:
      "6~7명 팀의 방향을 세우고 격주 회고로 프로세스를 다듬으며, 개인의 기술력만큼 같은 방향을 보는 일이 중요하다는 걸 배운 과정.",
    tags: ["팀 운영", "OKR", "회고"],
    read: "9 min",
    href: "https://velog.io/@rookieand/posts",
  },
  {
    slug: "nestjs-cls-ability-context",
    date: "2025.11",
    year: "2025",
    cat: "Backend",
    title: "nestjs-cls로 요청 컨텍스트에 Ability 전파하기",
    excerpt:
      "컨트롤러·서비스 어디서든 의존성 주입 없이 권한을 검사하려면? AsyncLocalStorage 기반 CLS로 요청 단위 컨텍스트를 흘려보낸 방법.",
    tags: ["NestJS", "CLS", "ABAC"],
    read: "8 min",
    href: "https://velog.io/@rookieand/posts",
  },
  {
    slug: "frontend-test-thoughts",
    date: "2025.10",
    year: "2025",
    cat: "Frontend",
    title: "프론트엔드 테스트 코드에 대한 고찰",
    excerpt:
      "Human Driven Development를 반성하며 정리한 프론트엔드 테스트 도입 이유. 피드백 사이클 단축, 테스트 코드를 테크스펙으로 바라보는 관점, 의존성 분리가 곧 테스트 가능한 코드임을 설명한다.",
    tags: ["Testing", "프론트엔드", "TDD"],
    read: "12 min",
    href: "/posts/frontend-test-thoughts",
    content: frontendTestMd,
  },
  {
    slug: "zustand-slice-form-builder",
    date: "2025.09",
    year: "2025",
    cat: "Frontend",
    title: "Zustand 슬라이스 패턴으로 계층형 폼 빌더 상태 관리하기",
    excerpt:
      "문항이 수십 개로 늘어도 전체 리렌더링 없이 개별 수정이 가능해야 했다. 슬라이스로 상태를 쪼개 독립적으로 다룬 설계 기록.",
    tags: ["React", "Zustand", "Form"],
    read: "10 min",
    href: "https://velog.io/@rookieand/posts",
    content: zustandSliceMd,
  },
  {
    slug: "css-custom-properties-runtime-theme",
    date: "2025.07",
    year: "2025",
    cat: "Frontend",
    title: "CSS Custom Properties로 리렌더링 없는 런타임 테마 만들기",
    excerpt:
      "기수마다 바뀌는 랜딩 테마를, JS 상태가 아닌 CSS 변수로 즉시 전환하도록 구현해 운영팀이 직접 테마를 바꾸게 한 이야기.",
    tags: ["CSS", "Theme", "DX"],
    read: "7 min",
    href: "https://velog.io/@rookieand/posts",
  },
  {
    slug: "turborepo-remote-cache-self-hosted",
    date: "2025.05",
    year: "2025",
    cat: "Infra",
    title: "Turborepo Remote Cache, 클라우드 대신 직접 구축한 이유",
    excerpt:
      "추가 비용 없이 CI 빌드 캐시를 쓰고 싶었다. AWS EFS + Jenkins로 원격 캐시 서버를 세워 팀 전체 빌드 속도를 끌어올린 과정.",
    tags: ["Turborepo", "pnpm", "CI"],
    read: "11 min",
    href: "https://velog.io/@rookieand/posts",
    content: turborepoMd,
  },
  {
    slug: "docker-multistage-build-optimization",
    date: "2025.03",
    year: "2025",
    cat: "Infra",
    title: "Docker 멀티스테이지 빌드로 배포 시간 83% 줄이기",
    excerpt:
      "이미지 레이어 구조를 다시 짜고 멀티스테이지로 분리하니 배포가 눈에 띄게 빨라졌다. 무엇이 캐시를 깨고 있었는지 추적한 기록.",
    tags: ["Docker", "최적화"],
    read: "8 min",
    href: "https://velog.io/@rookieand/posts",
  },
  {
    slug: "google-oauth2-server-side-sheets",
    date: "2024.12",
    year: "2024",
    cat: "Backend",
    title: "서버 사이드 Google OAuth2로 안정적인 스프레드시트 연동",
    excerpt:
      "클라이언트 대신 서버에서 토큰을 갱신해 장기 세션에서도 끊기지 않는 연동을 만든 이유와, 시트 API를 추상화해 확장 여지를 남긴 설계.",
    tags: ["OAuth2", "Google API"],
    read: "9 min",
    href: "https://velog.io/@rookieand/posts",
  },
  {
    slug: "pnpm-dependency-deep-dive",
    date: "2024.12",
    year: "2024",
    cat: "Infra",
    title: "pnpm 의존성 파일을 관리 Deep Dive",
    excerpt:
      "CAS의 하드링크·심볼릭링크 구조부터 피어 의존성이 버전 조합별로 폴더를 분리하는 원리, workspace 심링크 동작, pnpm deploy까지. node_modules 안을 제대로 들여다본 기록.",
    tags: ["pnpm", "node_modules", "패키지 관리"],
    read: "15 min",
    href: "/posts/pnpm-dependency-deep-dive",
    content: pnpmDependencyMd,
  },
  {
    slug: "pnpm-catalog",
    date: "2024.12",
    year: "2024",
    cat: "Infra",
    title: "pnpm Catalog 로 버전 관리 쉽게 하기",
    excerpt:
      "모노레포에서 패키지가 많아질수록 복잡해지는 라이브러리 버전 관리를 pnpm Catalog로 해결한다. Named Catalog로 도메인별로 분리하고, 버전 업 시 단 한 곳만 수정하는 방법을 정리했다.",
    tags: ["pnpm", "Monorepo", "패키지 관리"],
    read: "5 min",
    href: "/posts/pnpm-catalog",
    content: pnpmCatalogMd,
  },
  {
    slug: "turbo-prune-monorepo",
    date: "2024.11",
    year: "2024",
    cat: "Infra",
    title: "Turbo prune 으로 모노레포 앱 빌드하기",
    excerpt:
      "--docker 옵션으로 /full과 /json을 분리해 관련 없는 패키지 변경이 Cache Miss를 유발하는 문제를 차단한 과정. pnpm store Cache Mount를 함께 적용한 멀티스테이지 Dockerfile 구성까지.",
    tags: ["Turborepo", "Docker", "Monorepo"],
    read: "8 min",
    href: "/posts/turbo-prune-monorepo",
    content: turboPruneMd,
  },
  {
    slug: "plop-code-generator",
    date: "2024.12",
    year: "2024",
    cat: "Architecture",
    title: "PlopJS 기반으로 Code Generator 제작하기",
    excerpt:
      "모노레포에서 패키지·MongoDB Collection 생성 시 반복되는 코드를 자동화하기 위해 PlopJS로 Code Generator를 만들었다. hygen과의 비교, Custom Action 구현, TypeScript 세팅까지 정리했다.",
    tags: ["PlopJS", "DX", "코드 자동화"],
    read: "10 min",
    href: "/posts/plop-code-generator",
    content: plopMd,
  },
  {
    slug: "vitest-legacy-test-coverage",
    date: "2024.10",
    year: "2024",
    cat: "Architecture",
    title: "Vitest로 0에서 79까지 — 레거시에 테스트 안전망 깔기",
    excerpt:
      "테스트가 한 줄도 없던 핵심 로직에 유닛 테스트를 도입하고, E2E 중복 시나리오 140곳을 걷어내 실행 시간과 유지보수 비용을 함께 줄인 과정.",
    tags: ["Vitest", "Testing", "TDD"],
    read: "10 min",
    href: "https://velog.io/@rookieand/posts",
  },
  {
    slug: "react-query-mutation",
    date: "2024.09",
    year: "2024",
    cat: "Frontend",
    title: "React Query Mutation",
    excerpt:
      "useMutation의 콜백 실행 순서, Query Invalidation·setQueryData·Optimistic Update 세 가지 결과 업데이트 전략을 코드 예시와 함께 정리했다.",
    tags: ["React Query", "TanStack Query", "Mutation"],
    read: "8 min",
    href: "/posts/react-query-mutation",
    content: reactQueryMutationMd,
  },
  {
    slug: "nextjs-image-optimization",
    date: "2024.06",
    year: "2024",
    cat: "Frontend",
    title: "next/Image 최적화 — 왜 느리고 어떻게 해결하나",
    excerpt:
      "캐시 MISS가 반복되는 next/image의 구조적 문제를 파악하고, Squoosh→sharp 교체와 On-The-Fly(CDN + Lambda@Edge) 방식을 비교해 해결 방향을 찾은 기록.",
    tags: ["Next.js", "이미지 최적화", "CDN"],
    read: "8 min",
    href: "/posts/nextjs-image-optimization",
    content: nextjsImageMd,
  },
  {
    slug: "zero-runtime-vanilla-extract",
    date: "2024.03",
    year: "2024",
    cat: "Frontend",
    title: "Zero Runtime CSS-in-JS (with Vanilla Extract)",
    excerpt:
      "런타임에 스타일을 생성하는 Emotion/styled-components의 성능 비용과, Vanilla Extract가 빌드 타임 CSS 변환으로 이를 해결하는 방식. sprinkles와 recipe를 활용한 실제 사용법까지.",
    tags: ["CSS-in-JS", "Vanilla Extract", "Zero Runtime"],
    read: "8 min",
    href: "/posts/zero-runtime-vanilla-extract",
    content: zeroRuntimeMd,
  },
  {
    slug: "edge-runtime-internals",
    date: "2024.02",
    year: "2024",
    cat: "Frontend",
    title: "Edge Runtime 내부 동작 분석",
    excerpt:
      "Next.js 미들웨어가 항상 Edge Runtime으로 실행되는 이유를 Node.js vm 모듈과 @edge-runtime/vm 소스코드를 통해 파악했다. Context 생성, Web API 주입, 코드 실행 흐름까지 정리한 내용.",
    tags: ["Next.js", "Edge Runtime", "Node.js"],
    read: "10 min",
    href: "/posts/edge-runtime-internals",
    content: edgeRuntimeMd,
  },
  {
    slug: "custom-event-observer",
    date: "2024.02",
    year: "2024",
    cat: "Frontend",
    title: "CustomEvent로 Observer Pattern 구현하기",
    excerpt:
      "Class 내부 변화를 컴포넌트에 전달할 방법이 없어 CustomEvent를 사용했다. dispatchEvent로 이벤트를 발행하고, TypeScript에서 WindowEventMap을 확장해 타입 안전하게 구독하는 방법을 정리했다.",
    tags: ["CustomEvent", "Observer Pattern", "TypeScript"],
    read: "5 min",
    href: "/posts/custom-event-observer",
    content: customEventMd,
  },
  {
    slug: "docker-compose-basics",
    date: "2024.10",
    year: "2024",
    cat: "Infra",
    title: "Docker Compose 찍먹하기",
    excerpt:
      "다수의 컨테이너를 일괄 실행·관리하기 위한 Docker Compose의 필요성과 compose 파일 작성 방법, 컨테이너 간 네트워크 구성, 주요 명령어를 정리했다.",
    tags: ["Docker", "Docker Compose", "Infra"],
    read: "6 min",
    href: "/posts/docker-compose-basics",
    content: dockerComposeMd,
  },
  {
    slug: "github-actions-docker-deploy",
    date: "2024.06",
    year: "2024",
    cat: "Infra",
    title: "Github Actions으로 Docker 배포 오답노트",
    excerpt:
      "scp-action source 경로 오류, Job 간 checkout 누락, .env 숨김 파일 문제, Nginx 502·host.docker.internal Linux 미지원까지. 처음 배포 파이프라인을 구축하며 삽질한 것들의 기록.",
    tags: ["GitHub Actions", "Docker", "CI/CD"],
    read: "7 min",
    href: "/posts/github-actions-docker-deploy",
    content: githubActionsDockerMd,
  },
];

export const ALL_POSTS: Post[] = [FEATURED_POST, ...POSTS];

export const CATEGORIES: (Category | "all")[] = [
  "all",
  "Frontend",
  "Backend",
  "Architecture",
  "Infra",
  "회고",
];
