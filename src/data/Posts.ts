export type Category = "Frontend" | "Backend" | "Architecture" | "Infra" | "회고";

export interface Post {
  date: string;
  year: string;
  cat: Category;
  title: string;
  excerpt: string;
  tags: string[];
  read: string;
  href: string;
}

export const FEATURED_POST = {
  cat: "Architecture" as Category,
  date: "2026.02",
  read: "12 min read",
  title: "수동 DB 제어를 걷어내고 CASL/ABAC로 권한을 선언형으로 다시 설계하기",
  excerpt:
    "CS가 반복되고 개발 의존도가 커지던 권한 관리를, 역할·리소스·액션 기반 ABAC 모델로 옮긴 과정. 미들웨어에서 만든 Ability 객체를 nestjs-cls로 요청 컨텍스트에 전파해, 어디서든 추가 의존성 주입 없이 권한을 검사하는 구조를 만든 이야기.",
  href: "https://velog.io/@rookieand/posts",
};

export const POSTS: Post[] = [
  {
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
    date: "2025.09",
    year: "2025",
    cat: "Frontend",
    title: "Zustand 슬라이스 패턴으로 계층형 폼 빌더 상태 관리하기",
    excerpt:
      "문항이 수십 개로 늘어도 전체 리렌더링 없이 개별 수정이 가능해야 했다. 슬라이스로 상태를 쪼개 독립적으로 다룬 설계 기록.",
    tags: ["React", "Zustand", "Form"],
    read: "10 min",
    href: "https://velog.io/@rookieand/posts",
  },
  {
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
    date: "2025.05",
    year: "2025",
    cat: "Infra",
    title: "Turborepo Remote Cache, 클라우드 대신 직접 구축한 이유",
    excerpt:
      "추가 비용 없이 CI 빌드 캐시를 쓰고 싶었다. AWS EFS + Jenkins로 원격 캐시 서버를 세워 팀 전체 빌드 속도를 끌어올린 과정.",
    tags: ["Turborepo", "pnpm", "CI"],
    read: "11 min",
    href: "https://velog.io/@rookieand/posts",
  },
  {
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
];

export const CATEGORIES: (Category | "all")[] = [
  "all",
  "Frontend",
  "Backend",
  "Architecture",
  "Infra",
  "회고",
];
