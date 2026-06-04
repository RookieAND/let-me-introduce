export const STATS = [
  {
    prefix: "$",
    target: 1000,
    unit: "",
    label: "월 고정 비용 절감\n외부 서비스 내재화",
  },
  {
    prefix: "",
    target: 83,
    unit: "%↓",
    label: "Docker 배포 시간\n멀티스테이지 빌드 최적화",
  },
  {
    prefix: "",
    target: 52,
    unit: "%↓",
    label: "출결 관련 CS 문의\n전체 CS의 74% 차지하던 영역",
  },
  {
    prefix: "",
    target: 79,
    unit: "/79",
    label: "유닛 테스트 통과\n0건에서 안전망 구축",
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
    desc: "구름 EDU의 핵심 기능을 풀스택으로 개발하는 셀입니다. 수동 DB 제어에 의존하던 권한 관리를 역할·리소스 기반 모델로 다시 설계했고, 파편화돼 있던 모노레포 빌드 환경을 정리해 팀 생산성을 높였습니다. 테스트가 없던 핵심 로직에는 유닛 테스트를 도입해 변경에 강한 안전망을 만들었습니다.",
  },
  {
    when: "2024.12 — 2026.02",
    title: "GEM SQD",
    badge: "스쿼드 리더",
    desc: "모집부터 운영까지 담당하는 자체 플랫폼 GEM을 만들고, 6~7명 스쿼드를 이끌었습니다. 외부 서비스에 흔어져 있던 지원자 데이터를 한곳으로 모으고, 운영팀이 직접 폼을 만들고 데이터를 추출할 수 있는 도구를 개발했습니다. 팀의 비전과 로드맵을 세우고, 개발자 스크럼을 열어 함께 성장하는 문화를 만들었습니다.",
  },
  {
    when: "2023.03 — 2024.11",
    title: "EDU Public SQD",
    badge: null,
    desc: "교육 사업 운영에 필요한 관리 시스템을 개발·운영했습니다. 학습시간 관리 API는 기획부터 배포까지 단독으로 맡았고, 레거시로 남아 있던 주요 페이지를 사내 디자인 시스템 기준으로 다시 구현했습니다. 프론트엔드와 백엔드를 오가며 제품의 전 과정을 처음 경험한 시기입니다.",
  },
] as const;

export const WORK_ITEMS = [
  {
    name: "모집 플랫폼 내재화",
    kind: "Platform",
    desc: "외부 서비스에 의존하던 모집·운영 구조를 자체 시스템(GEM)으로 옮기고, 반복 운영을 자동화했습니다.",
  },
  {
    name: "ABAC 권한 관리 체계",
    kind: "Architecture",
    desc: "역할·리소스·액션 기반 권한 모델을 설계해, 어디서든 일관되게 권한을 검사하는 구조를 만들었습니다.",
  },
  {
    name: "GEM Form Builder",
    kind: "Frontend",
    desc: "기수마다 달라지는 지원서를 직접 구성하는 계층형 폼 빌더를 만들어 운영팀의 자립 운영을 도왔습니다.",
  },
] as const;

export const AWARDS = [
  { name: "제5회 KB국민은행 SW 경진대회", prize: "대상", year: "2022" },
  { name: "충청북도 대학생 프로그래밍 경진대회", prize: "우수상", year: "2022" },
] as const;

export const CERTS = [
  { name: "MongoDB Associate Developer (Node.js)", year: "2025" },
  { name: "OPIc IH · ACTFL", year: "2024" },
  { name: "건국대학교 컴퓨터공학부 학사", year: "2025" },
] as const;

export const PRINCIPLES = [
  {
    num: "01",
    title: "개발로 풀 문제인가",
    desc: "순수하게 코드로 해결해야 할 문제인지 먼저 가린다.",
  },
  {
    num: "02",
    title: "협업으로 줄일 수 있나",
    desc: "혼자 끌어안기보다 협업으로 공수를 줄일 여지를 본다.",
  },
  {
    num: "03",
    title: "목적을 다시 정의할까",
    desc: "때로는 업무 목적 자체를 재정의하는 게 더 나은 방향이다.",
  },
] as const;
