export const STATS = [
  {
    prefix: "",
    target: 70,
    unit: "% ↓",
    label: "CI 빌드 시간 단축",
    method: "Turborepo Remote Cache 도입",
    context: "단독 · 모노레포",
  },
  {
    prefix: "",
    target: 83,
    unit: "% ↓",
    label: "Docker 배포 시간 단축",
    method: "멀티스테이지 빌드 최적화",
    context: "단독 · Docker",
  },
  {
    prefix: "",
    target: 52,
    unit: "% ↓",
    label: "출결 문의 감소 (전년 대비)",
    method: "이벤트 기반 출결 재설계",
    context: "GEM · 출결 시스템",
  },
  {
    prefix: "",
    target: 79,
    unit: "/79",
    label: "유닛 테스트 통과",
    method: "0건에서 안전망 구축",
    context: "단독 · 테스트 도입",
  },
] as const;

export const STACK_CARDS = [
  {
    category: "Language",
    chips: [
      { label: "TypeScript", key: true, icon: "siTypescript" },
      { label: "JavaScript", key: false, icon: "siJavascript" },
    ],
  },
  {
    category: "Frontend",
    chips: [
      { label: "React", key: true, icon: "siReact" },
      { label: "Next.js", key: true, icon: "siNextdotjs" },
      { label: "Vite", key: false, icon: "siVite" },
      { label: "TanStack Query", key: false, icon: "siReactquery" },
      { label: "Zustand", key: false, icon: null },
    ],
  },
  {
    category: "Backend",
    chips: [
      { label: "NestJS", key: true, icon: "siNestjs" },
      { label: "Node.js", key: false, icon: "siNodedotjs" },
      { label: "MongoDB", key: false, icon: "siMongodb" },
      { label: "Mongoose", key: false, icon: "siMongoose" },
    ],
  },
  {
    category: "Infra / DevOps",
    chips: [
      { label: "Docker", key: false, icon: "siDocker" },
      { label: "GitHub Actions", key: false, icon: "siGithubactions" },
      { label: "Turborepo", key: false, icon: "siTurborepo" },
      { label: "pnpm", key: false, icon: "siPnpm" },
    ],
  },
] as const;

export const CAREER_ITEMS = [
  {
    when: "2026.03 — 현재",
    title: "Exelearnce Tech Cell 2",
    badge: null,
    bullets: [
      "수동 DB 제어에 의존하던 권한 관리를 <b>역할·리소스 기반 모델</b>로 재설계",
      "파편화돼 있던 모노레포 빌드 환경을 정리해 팀 생산성 향상",
      "테스트가 없던 핵심 로직에 유닛 테스트를 도입해 변경에 강한 안전망 구축",
    ],
  },
  {
    when: "2024.12 — 2026.02",
    title: "GEM SQD",
    badge: "스쿼드 리더",
    bullets: [
      "모집부터 운영까지 담당하는 자체 플랫폼 <b>GEM</b>을 구축하고 6~7명 스쿼드를 리딩",
      "외부 서비스에 흩어져 있던 지원자 데이터를 한곳으로 통합",
      "운영팀이 직접 폼을 만들고 데이터를 추출하는 도구를 개발",
      "팀의 비전·로드맵을 세우고 개발자 스크럼을 열어 성장 문화 정착",
    ],
  },
  {
    when: "2024.06 — 2024.11",
    title: "AI/DT TF",
    badge: null,
    bullets: [
      "교육부 <b>AI 디지털 교과서(AIDT)</b> 사업 플랫폼 구축에 참여",
      "오답노트·학습맵 트리·AI 추천 콘텐츠 모달 등 핵심 학습 기능을 설계·개발",
    ],
  },
  {
    when: "2023.08 — 2024.11",
    title: "EDU Public SQD",
    badge: null,
    bullets: [
      "교육 사업 운영에 필요한 관리 시스템을 개발·운영",
      "<b>학습시간 관리 API</b>를 기획부터 배포까지 단독으로 담당",
      "레거시로 남아 있던 주요 페이지를 사내 디자인 시스템 기준으로 재구현",
      "프론트와 백엔드를 오가며 제품의 전 과정을 처음 경험한 시기",
    ],
  },
] as const;

export const WORK_ITEMS = [
  {
    name: "모노레포 빌드 환경 고도화",
    kind: "Infra / DevOps",
    lines: [
      "Turborepo Remote Cache와 Docker 멀티스테이지 빌드를 도입해 CI 빌드 70%, 배포 시간 83%를 줄였습니다.",
      "pnpm·Vite·ESLint를 순차 정리하며 팀이 올라설 빌드 바닥을 다졌습니다.",
    ],
  },
  {
    name: "ABAC 권한 관리 체계",
    kind: "Architecture",
    lines: [
      "수동 DB 제어에 기대던 권한 관리를 역할·리소스·액션 기반 모델로 재설계했습니다.",
      "PoC부터 프로덕션 적용까지 BE·FE를 단독으로 구현하고 선언형 <Can>으로 화면 노출을 제어했습니다.",
    ],
  },
  {
    name: "공통 Table 시스템",
    kind: "Frontend",
    lines: [
      "페이지마다 제각기 구현되던 테이블을 Headless 코어 위 공통 시스템으로 통합했습니다.",
      "Compound 패턴과 URL 동기화로 페이지별 요구사항과 북마크·공유를 한 시스템에서 수용했습니다.",
    ],
  },
] as const;

export const AWARDS = [
  { name: "제5회 KB국민은행 SW 경진대회", prize: "대상", year: "2022.09" },
  { name: "충청북도 대학생 프로그래밍 경진대회", prize: "우수상", year: "2022.07" },
] as const;

export const CERTS = [
  { name: "MongoDB Associate Developer (Node.js)", year: "2025.02" },
  { name: "OPIc IH · ACTFL", year: "2024.02" },
  { name: "건국대학교 글로컬캠퍼스 컴퓨터공학부 학사", year: "2017.03 ~ 2025.02" },
] as const;

export const PRINCIPLES = [
  {
    num: "01",
    title: "개발로 풀 문제인지 먼저 가린다",
    lines: [
      "코드를 짜기 전에, 정말 개발로 해결할 문제인지부터 정의한다.",
      "문제 정의가 곧 출발점이다.",
    ],
  },
  {
    num: "02",
    title: "협업으로 더 잘 풀 수 있는지 본다",
    lines: [
      "혼자 끌어안기보다, 협업·프로세스로 풀 여지가 있는지 함께 따져 더 나은 해법을 고른다.",
    ],
  },
  {
    num: "03",
    title: "목적 자체를 다시 정의한다",
    lines: [
      "때로는 업무의 목적을 재정의하는 게 정답이다.",
      "그래서 잘 정의된 문제를 푸는 개발자를 지향한다.",
    ],
  },
] as const;
