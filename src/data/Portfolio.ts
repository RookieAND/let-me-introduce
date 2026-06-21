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
    label: "FE 빌드 시간 단축",
    method: "Vite v5→v8 청크 분리 전략",
    context: "단독 · Vite",
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
    target: 71,
    unit: "% ↓",
    label: "Docker 배포 시간 단축",
    method: "멀티스테이지 빌드 최적화",
    context: "단독 · Docker",
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
    title: "구름 EDU 모집·운영 플랫폼(Exelearnce) 개발",
    badge: null,
    bullets: [
      "수동 DB 제어에 의존하던 권한을 <b>역할·리소스 기반 ABAC 모델</b>로 재설계하고 BE·FE 구현",
      "<b>Turborepo 호환 Remote Cache</b>를 AWS EFS 위에 구성해 CI 빌드 시간 최대 70% 단축",
      "<b>Vitest</b> 커버리지 80%를 CI 게이트로 강제하고, E2E 중복 140건 제거·병렬화로 실행 시간 12분 → 4분 단축",
      "Vite v5 → v8 업그레이드 및 <b>청크 분리 전략</b> 도입으로 FE 빌드 시간 8.5s → 1.44s (83% 단축)",
      "<b>Dockerfile 멀티스테이지 빌드 최적화</b> 및 이미지 레이어 개선으로 Docker 배포 시간 163s → 48s (71% 단축)",
    ],
  },
  {
    when: "2024.12 — 2026.02",
    title: "교육 운영 플랫폼(GEM) 구축",
    badge: "스쿼드 리더",
    bullets: [
      "Tally·Google Form 에 흩어져 있던 모집 과정을 <b>GEM</b>으로 내재화해 외부 의존 비용 제거",
      "지원자 행동 데이터를 자체 트래킹해 모집 과정의 이탈 구간을 짚어내는 <b>데이터 기반 운영</b> 전환",
      "4~5명 스쿼드 구성원을 리딩하며 자체 비전·로드맵 제시와 개발자 스크럼 진행으로 성장 주도",
      "복잡한 지원서·강좌·유닛 테이블을 <b>Headless 기반 공통 UI 시스템</b>으로 통합 전환",
      "이벤트 기반 출결 처리를 재설계해 데이터 실시간 반영, 출결 문의 전년 대비 52% 감소",
    ],
  },
  {
    when: "2024.06 — 2024.11",
    title: "AI 디지털교과서(AIDT) 개발",
    badge: null,
    bullets: [
      "구름의 교육부 <b>AI 디지털 교과서 (AIDT)</b> 사업 플랫폼의 학생 대시보드 내 기능 UI 개발 전담",
      "오답노트·감정평가·학습목표·시험과제 <b>4종 대시보드</b>를 3개월 내 FE 전담 설계·구현",
      "5Depth 학습맵을 트리 클래스로 구현하고 <b>useSyncExternalStore</b>로 선택 노드 목록만 컴포넌트에 전파",
    ],
  },
  {
    when: "2023.03 — 2023.06",
    title: "구름 EDU B2C 플랫폼 (edu.goorm.io) 개발",
    badge: "인턴",
    bullets: [
      "기존의 Legacy 강의 페이지를 <b>React 18·사내 디자인 시스템</b> 기준으로 재구현하고 모바일 반응형까지 대응",
      "외부 플랫폼 강좌 <b>쿠폰 발급 도메인</b>을 신설하고 결제 시 선착순 발급 시스템을 설계",
    ],
  },
  {
    when: "2023.08 — 2024.05",
    title: "디지털새싹 PMS · KDT 개발",
    badge: null,
    bullets: [
      "누적 사용자 11만+ 규모의 교육 사업 <b>관리 시스템(PMS)</b>을 KoaJS 기반으로 개발·운영",
      "17개 시도교육청 계정별 <b>운영 통계 대시보드</b>를 구현해 10만 건의 지역 단위 현황 가시화",
      "KDT 사업 증빙용 누적·기간별 <b>학습시간 집계 API</b>를 NestJS로 설계하여 실 사용 진행",
    ],
  },
] as const;

export const WORK_ITEMS = [
  {
    name: "모노레포 빌드 환경 고도화",
    kind: "Infra / DevOps",
    lines: [
      "Turbo Remote Cache, Vite 청크 분리 전략, Docker 멀티스테이지 빌드로 CI 70%, FE 빌드 83%, Docker 배포 71%를 줄였습니다.",
      "pnpm·Vite·ESLint 버전 업데이트를 순차적으로 반영하며 팀이 사용할 개발 환경을 다졌습니다.",
    ],
  },
  {
    name: "ABAC 권한 관리 체계",
    kind: "Architecture",
    lines: [
      "수동 DB 제어에 기대던 권한 관리를 역할·리소스·액션 기반 모델로 재설계했습니다.",
      "PoC부터 프로덕션 적용까지 BE·FE를 단독으로 구현하고 선언형 <Can> 으로 화면 노출을 제어했습니다.",
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
  { name: "MongoDB Associate Developer (Node.js)", year: "2025.01" },
  { name: "OPIc IH · ACTFL", year: "2024.02" },
  { name: "건국대학교 글로컬캠퍼스 컴퓨터공학부 학사", year: "2017.03 ~ 2025.02" },
] as const;

export const PRINCIPLES = [
  {
    num: "01",
    title: "개발로 풀 문제인지 먼저 가린다",
    lines: [
      "코드를 짜기 전에 어떻게 이를 해결할지 정의한다.",
      "문제를 제대로 정의하는 순간 좋은 개발이 시작된다.",
    ],
  },
  {
    num: "02",
    title: "협업으로 더 잘 풀 수 있는지 본다",
    lines: [
      "혼자 끌어안기보다는 협업으로 풀 여지가 있는지",
      "함께 논의하여 더 나은 해답을 찾아 고른다.",
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
