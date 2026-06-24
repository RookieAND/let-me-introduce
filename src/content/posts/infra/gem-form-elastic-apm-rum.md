## 0. 도입 배경

GEM Form 앱은 서버 측 APM은 연동되어 있었지만, **브라우저에서 실제 사용자가 경험하는 성능 데이터**가 전혀 없었다.  
페이지 이동이 얼마나 걸리는지, 어떤 API 호출이 병목인지, 어떤 에러가 잡혔는지, Core Web Vitals 지표는 어떤지 등..  
기존의 Site 환경에서는 이 모든 지표를 측정하고 수집하는 프로세스 자체가 없었다.

그렇기에 매번 에러가 발생했다는 CS 를 받을 때마다 개발 환경을 키고, 이를 재현해보고, 콘솔 창을 보기만 했다.  
하지만 이게 개발 경험이 그리 좋지 않다는 것은 누구라도 다 아는 사실이다.

그래서 이번 기회에 Elastic APM RUM (Real User Monitoring) JS Agent 를 도입해 이 공백을 채우기로 했다.

---

## 1. Sentry 를 선택하지 않은 이유

GEM Form 에 브라우저 모니터링을 도입하기로 결정했을 때, 가장 먼저 고려한 선택지 중 하나는 **Sentry** 였다.  
Sentry 는 프론트엔드 에러 추적 도구로 널리 알려져 있고, 자체적인 RUM 기능도 함께 제공한다.  
하지만 팀 내부에서는 이미 ES APM 을 서버 모니터링에 사용 중이었기에, 두 도구를 비교해보는 PoC 가 진행된 바 있었다.

### PoC 과정에서 나온 의견들

당시 논의에서 나온 주요 의견들을 항목별로 정리하면 아래와 같다.

| 항목 | ES APM | Sentry |
|---|---|---|
| 서비스맵 | 자동으로 생성. 모든 트레이스·에러에 디펜던시 정보 포함 | 대시보드를 직접 만들어야 하며, 다이어그램 수준은 제공하지 않음 |
| 기본 대시보드 | 기본 설정이 잘 갖춰져 있어 바로 정보 파악 가능 | 커스텀할수록 진가 발휘. 기본 상태에서는 원하는 정보 파악이 어려움 |
| 로그 스트림 | 실시간 로그 스트림 확인 기능 제공 | pino logger 연동 시 원하는 로그를 Sentry 로 전송 가능 |
| 이슈 트래킹 | 제한적 | GitHub·Jira 연동, 담당자 어사인, 해결 과정 로그 등 워크플로우가 강함 |
| 릴리즈 비교 | 시간 기반 비교만 지원. 버전별 비교 없음 (2025년 기준도 동일) | 릴리즈 버전별로 문제 파악 및 롤백 비교가 용이 |
| 에러 알람 연동 | Slack 기본 지원 | 타 앱 연동 선택지가 훨씬 다양함. 담당자 태그·알람도 잘 되어있음 |
| 팀 / 프로젝트 그룹 | 2025년 기준에도 데모에서 확인 어려움 | 프로젝트 단위로 세분화·커스텀 가능 |
| 퍼포먼스 | 디펜던시·서비스맵으로 한 단계 높은 수준의 정보 제공 | 기본 기능은 동일한 수준 |

두 도구 모두 서비스 오버뷰, 트레이스, 대시보드 등 핵심 기능은 유사한 수준을 제공한다.  
다만 한 가지 차이점을 꼽자면 Sentry 는 에러를 이슈로 연결하고 담당자가 해결하는 커뮤니티 서비스가 강하다.

그러나 ES APM 은 강력한 내부 생태계를 바탕으로 인프라 전반을 통합해서 보는 관점이 강하다고 판단했다.  
Distributed Trace 기능을 활용하면 서버까지 흐름이 이어짐으로서 병목 지점을 파악하기도 용이했다.

### 그래서 ES APM RUM 을 선택한 이유

1. **인프라 중복 문제**
   - 이미 Elasticsearch APM 을 Managed Service 로 운영 중인 상황이었다.
   - 이 와중에 Sentry 를 추가 도입하면 비용뿐 아니라 리소스 측면에서도 부담이 된다는 의견이 나왔다.
2. **Distributed Tracing 연속성**
   - ES RUM 이 수집한 fetch span 의 `traceparent` 헤더가 백엔드 트랜잭션과 자동으로 연결된다.
   - 이 덕에 Kibana 하나의 뷰에서 브라우저 → API 서버 → DB 전체 경로를 볼 수 있다는 장점이 있다.
   - 하지만 만약 Sentry 로 프론트를 분리하면 이 연결이 끊어진다. (Backend 는 ES APM 을 쓰니까)

사실 Sentry 의 강력한 리플레이 기능을 한번 써보고는 싶었다.  
하지만 이번에는 ES APM RUM 이 더 적합하다는 결론을 내렸고 바로 환경 세팅을 시작하였다.

---

## 2. GEM Form APM 구현 구조

GEM Form 에서는 `@gem-site/apm-rum` 패키지에서 Elastic APM RUM JS Agent 를 래핑해 사용한다.

```
브라우저 첫 요청
  └── [자동] page-load 트랜잭션
        ├── Core Web Vitals (FCP, LCP, INP, FID, TBT, CLS)
        ├── fetch 자동 span들
        └── setInitialPageLoadName(routePattern) → 이름 커스텀

SPA 경로 이동
  └── [수동] route-change 트랜잭션  (managed: true)
        ├── fetch 자동 span들
        └── afterFrame → transaction.end()

사용자 인터랙션 (data-transaction-name 있는 버튼만)
  └── [자동] user-interaction 트랜잭션
        └── "Click - Submission - Final Submit"
```

### RumAgent — Singleton 구조

`@elastic/apm-rum` 의 `init()` 은 **전역 단일 Agent 인스턴스**를 반환하는 함수다.  
같은 환경에서 두 번 이상 호출하면 이미 초기화된 인스턴스를 그대로 반환한다.

하지만 이를 코드 레벨에서 보장하지 않으면, 호출 지점이 늘어날수록 초기화가 언제 이루어졌는지 추적이 어려워진다.  
그래서 GEM Form 에서는 `RumAgent` 라는 별도의 Class 를 만들어 이 인스턴스를 중앙에서 관리한다.

```typescript
// @gem-site/apm-rum/RumAgent.ts
import { init as initApm, type Agent } from '@elastic/apm-rum';

class RumAgentClass {
  private static _instance: RumAgentClass | null = null;
  readonly apm: Agent;

  private constructor(config: RumAgentConfig) {
    this.apm = initApm(config);
  }

  static initialize(config: RumAgentConfig): RumAgentClass {
    if (!RumAgentClass._instance) {
      RumAgentClass._instance = new RumAgentClass(config);
    }
    return RumAgentClass._instance;
  }

  static getInstance(): RumAgentClass {
    if (!RumAgentClass._instance) {
      throw new Error('RumAgent 가 초기화되지 않았습니다.');
    }
    return RumAgentClass._instance;
  }
}

export const RumAgent = {
  get apm() {
    return RumAgentClass.getInstance().apm;
  },
};
```

이 구조가 가져다주는 이점은 세 가지다.

- **단일 초기화 보장** — `initialize()` 는 최초 1회만 실제로 Agent 를 생성한다. 이후 호출은 이미 생성된 인스턴스를 반환하는 것으로 대체된다.
- **초기화 전 접근 차단** — `getInstance()` 는 `initialize()` 가 호출되기 전에 접근하면 명시적 에러를 던진다. 초기화 이전에 인스턴스에 접근하여 에러가 발생하는 상황을 미연에 방지한다.
- **전역 단일 접근 지점** — 앱 전체에서 `RumAgent.apm` 으로 동일한 Agent 인스턴스에 접근한다. 별도 context 나 Props drilling 없이 어디서든 동일한 참조를 사용할 수 있다.

### 2-1. Agent 초기화

`main.tsx` 에서 React 렌더링 이전에 `initializeRumAgent()` 를 호출한다.  
`initializeRumAgent()` 는 이 Singleton 을 초기화하고 필터를 등록하는 진입 함수다.

```typescript
// @gem-site/apm-rum/initializeRumAgent.ts
export function initializeRumAgent() {
  RumAgentClass.initialize({
    serviceName: 'gem-form',
    serverUrl: import.meta.env.VITE_APM_SERVER_URL,
    environment: import.meta.env.MODE,
    // ... 나머지 설정
  });

  // 필터 등록 (등록 순서대로 실행됨)
  RumAgent.apm.addFilter(userInteractionFilter);
  RumAgent.apm.addFilter(httpRequestFilter);
  RumAgent.apm.addFilter(errorFilter);
}
```

APM 이 `window.fetch` Monkey Patching 과 필터 등록을 이 시점에 수행하므로 가장 먼저 실행되어야 한다.  
아래와 같이 App 을 Dynamic Import 하여 `initializeRumAgent` 가 가장 먼저 평가되도록 유도한다.

```typescript
// main.tsx
initializeRumAgent(); // fetch 래핑 + 필터 등록 (React 렌더링 전)

enableMocking().then(() => {
    import('./App').then(({ default: App }) => {
        createRoot(rootElement).render(<App />);
    });
});
```

| 주요 옵션 | 값 / 설명 |
|---|---|
| `serviceName` | APM 대시보드 서비스 식별자 (`gem-form`) |
| `environment` | `development` / `production` |
| `transactionSampleRate` | dev: `0.2` (20%), prod: `1.0` (100%) |
| `breakdownMetrics` | dev: `true`, prod: `false` — 타입별 타이밍이 세분화되어 payload 크기 증가로 프로덕션 비활성화 |
| `disableInstrumentations` | `['history']` — SPA 경로 이동은 `useRouteTransaction` 이 직접 관리 |
| `distributedTracing` | 백엔드와 `traceparent` 헤더로 trace 연결 |

### 2-2. useRouteTransaction — 수동 Route 전환 트레이싱

Agent 초기화 단계에서 `disableInstrumentations: ['history']` 로 **history 자동 계측만 비활성화**한다.  
`page-load` 트랜잭션은 자동 계측을 유지하며, `useRouteTransaction` 훅은 `route-change` 트랜잭션 생성·종료를 직접 관리한다.

```typescript
export const useRouteTransaction = () => {
    const location = useLocation();
    const routePattern = useExtractRoutePattern();

    const transactionRef = useRef<Transaction>();
    const isInitialMount = useRef(true);

    useLayoutEffect(() => {
        if (isInitialMount.current) {
            // 자동 page-load 트랜잭션의 이름을 라우트 패턴으로 덮어씀
            RumAgent.apm.setInitialPageLoadName(routePattern);
            isInitialMount.current = false;
            return;
        }

        transactionRef.current = RumAgent.apm.startTransaction(
            routePattern,
            'route-change',
            { managed: true },
        );

        return () => {
            transactionRef.current?.end();
            transactionRef.current = undefined;
        };
    }, [location.pathname, routePattern]);

    useEffect(() => {
        const transaction = transactionRef.current; // 클로저로 고정 (경쟁 조건 방지)
        afterFrame(() => {
            if (transaction && !transaction.isFinished()) {
                transaction.end();
                transactionRef.current = undefined;
            }
        });
    }, [location.pathname]);
};
```

#### `useLayoutEffect` 안에서 트랜잭션을 여는 이유

현재 우리가 생성한 `route-change` 트랜잭션은 `useLayoutEffect` 안에서 시작한다.  
해당 Hook 은 브라우저 Paint 이전에 실행되므로, fetch Span 이 자동 귀속되어야 할 트랜잭션이 해당 요청보다 **나중에 시작되는 상황을 방지**한다.

#### `afterFrame` 으로 뒤이어 종료하는 이유

트랜잭션 종료는 `useEffect` 안에서 `afterFrame()` 를 거쳐 실행된다.  
`afterFrame` 는 `requestAnimationFrame` 과 `setTimeout` 을 조합해 브라우저가 **다음 프레임을 그린 이후**에 콜백을 실행한다.

```typescript
export function afterFrame(callback: () => void) {
    const handler = () => {
        clearTimeout(timeout);
        cancelAnimationFrame(rafId);
        setTimeout(callback); // Paint 후 콜백 실행
    };

    const timeout = setTimeout(handler, 100); // rAF 버퍼 100ms
    const rafId = requestAnimationFrame(handler);
}
```

이 덕분에 트랜잭션은 렌더 시작부터 첫 페인트 완료까지의 전 구간을 담는다. (rAF 로 이를 보장하기 위함도 있음)

#### `transactionRef` 클로저 고정으로 경쟁 조건 방지

`useEffect` 안에서 `afterFrame` 예약 시점에 `transactionRef.current` 를 변수로 캡처한다.  
빠른 연속 경로 이동 시 `afterFrame` 콜백이 늦게 실행되더라도, ref 에 **새 트랜잭션이 들어와 있으면 이전 트랜잭션만 종료**하도록 보장한다.

### 2-3. useExtractRoutePattern — 페이지 라우트 Grouping

APM 대시보드에서 의미 있는 그룹으로 집계되려면 트랜잭션 이름이 라우트 패턴 형태여야 한다.  
그렇지 않으면 자체 휴리스틱 알고리즘으로 인해 서로 다른 페이지 트랜잭션이 하나로 묶이기 때문이다.

따라서 이번에는 자체적인 Route Match Pattern 을 사용하여 각 페이지 별 고유한 이름을 지정해주었다.

```typescript
const ROOT_PATH = '/';

export function useExtractRoutePattern() {
    const matches = useMatches();

    if (matches.length === 0) return ROOT_PATH;

    const lastMatch = matches.at(-1);
    if (!lastMatch) return ROOT_PATH;

    const questionMarkIndex = lastMatch.pathname.indexOf('?');
    let pattern =
        questionMarkIndex !== -1
            ? lastMatch.pathname.slice(0, questionMarkIndex)
            : lastMatch.pathname;

    matches.forEach((match) => {
        Object.entries(match.params).forEach(([key, value]) => {
            if (key !== '*' && value) {
                pattern = pattern.replace(value, `:${key}`);
            }
        });
    });

    return pattern.endsWith('/') && pattern !== ROOT_PATH
        ? pattern.slice(0, -1)
        : pattern;
}
// /spaces/abc123/courses/xyz789 → /spaces/:spaceId/courses/:courseId
```

`useMatches()` 로 현재 활성화된 전체 라우트 계층을 읽고,  
가장 깊은 경로의 실제 `pathname` 에서 동적 파라미터를 치환하여 라우트 패턴을 반환한다.

#### `useLocation()` 을 사용하지 않는 이유는?

단순히 `useLocation().pathname` 을 사용하지 않는 이유가 있다.

- `useLocation()` 은 실제 URL 값만 반환하므로 어떤 세그먼트가 동적 파라미터인지 알 수 없다.
- 반면 `useMatches()` 는 라우트가 보유한 `params` 를 함께 제공하므로, 실제 값을 파라미터 이름으로 역치환할 수 있다.

#### 구현 과정에서의 핵심 포인트

1. **`lastMatch.pathname`** — `useMatches()` 는 루트부터 현재까지 중첩된 전체 라우트를 배열로 반환한다. 마지막 요소(`at(-1)`)의 `pathname` 이 현재 페이지의 완전한 URL 경로이므로, 이를 기준 패턴으로 삼아 치환을 시작한다.
2. **모든 매칭 라우트를 순회하여 중첩 params 완전 수집** — `:spaceId` 는 상위 라우트, `:courseId` 는 하위 라우트에 각각 정의된다. 마지막 라우트의 `params` 만으로는 상위 파라미터가 누락되므로 전체 라우트를 순회해야 한다.
3. **`key !== '*'` 가드로 wildcard 제외** — catch-all 라우트(`/*`)는 나머지 경로 전체를 `params['*']` 로 전달한다. 이 값을 그대로 치환하면 의도치 않은 세그먼트가 대체되므로 명시적으로 제외한다.
4. **trailing slash 정규화** — `/a/:id/` 와 `/a/:id` 는 같은 페이지이지만 APM 에서는 다른 트랜잭션으로 집계된다. 따라서 루트 경로를 제외하고 끝 슬래시를 제거해 동일 트랜잭션으로 묶이도록 보장한다.

### 2-4. normalizeTransactionName — HTTP 요청 트랜잭션 Grouping

`http-request` 타입 트랜잭션의 URL 세그먼트를 패턴 인식으로 정규화한다.

```typescript
const DYNAMIC_SEGMENT_PATTERN_LIST = [
    /^[a-f0-9]{24}$/i,               // MongoDB ObjectId
    /^[a-z]+_[a-f0-9]{24}$/i,        // Prefixed ObjectId (unit_abc123...)
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
    /^\d+$/,                         // 순수 숫자
];

export function normalizeTransactionName(transactionName: string): string {
    const spaceIndex = transactionName.indexOf(' ');
    if (spaceIndex === -1) return transactionName;

    const method = transactionName.slice(0, spaceIndex);
    const urlString = transactionName.slice(spaceIndex + 1);

    let pathname: string;
    try {
        pathname = new URL(urlString).pathname;
    } catch {
        pathname = urlString;
    }

    const segmentList = pathname.split('/');
    const normalizedSegmentList = segmentList.map((segment, index) => {
        if (!segment || !isDynamicSegment(segment)) return segment;
        const previousSegment = index > 0 ? segmentList[index - 1] : '';
        if (!previousSegment) return ':id';
        return `:${toParamName(previousSegment)}`;
    });

    return `${method} ${normalizedSegmentList.join('/')}`;
}
```

각 URL 세그먼트가 동적 ID 값인지를 정규식으로 판별하는 작업을 먼저 거친다.  
이후 각각의 값들이 동적인 값 (ID 등) 으로 판별되면 직전 세그먼트 이름을 기반으로 파라미터 이름을 결정한다.

#### 파라미터 이름은 어떻게 결정되는가?

동적 세그먼트를 `:id` 처럼 범용 이름 대신, 직전 리소스 세그먼트에서 파라미터 이름을 유도한다.

```typescript
function toParamName(resourceSegment: string): string {
    // 1. kebab-case → camelCase
    const camelCase = resourceSegment.replace(/-([a-z])/g, (_, char) =>
        char.toUpperCase(),
    );
    // 2. 복수형 → 단수형 (끝 's' 제거)
    const singular =
        camelCase.endsWith('s') && camelCase.length > 1
            ? camelCase.slice(0, -1)
            : camelCase;
    // 3. 'Id' 접미사
    return `${singular}Id`;
}
// courses → courseId
// course-items → courseItemId
// users → userId
```

`courses` 같은 복수형 리소스 세그먼트에서 단수형 변환 후 `Id` 를 붙여 의미 있는 파라미터 이름을 만든다.

#### 구현 과정에서의 핵심 포인트

1. **첫 공백 기준으로 메서드와 URL 분리** — APM 의 `http-request` 트랜잭션 이름은 `"GET /api/..."` 형태로 HTTP 메서드가 앞에 붙는다. `indexOf(' ')` 로 첫 공백을 찾아 메서드와 URL 을 분리하고, 정규화 후 `"${method} ${pathname}"` 으로 재조합한다.
2. **`new URL()` try-catch 방어 처리** — httpRequestFilter 에서 전달되는 URL 이 절대 URL 과 상대 경로 모두 혼재할 수 있다. `new URL()` 이 실패하면 catch 에서 urlString 을 pathname 으로 그대로 사용하여 방어적으로 처리한다.
3. **직전 세그먼트 이름 기반 파라미터 네이밍** — `GET /api/courses/:courseId` 처럼, 동적 세그먼트 직전의 리소스 이름에서 파라미터 이름을 결정한다. 직전 세그먼트가 없는 엣지 케이스(`/507f...` 처럼 최상위에 ID 가 오는 경우)에는 `:id` 로 폴백한다.
4. **단수형 변환은 끝 `s` 단순 제거** — `courses` → `course`, `units` → `unit` 처럼 단순 규칙으로 처리한다. GEM 의 API 경로는 규칙적이므로 복잡한 불규칙 변형(`children`, `people` 등)은 고려하지 않는다.

### 2-5. 필터 체계

APM 서버 전송 직전 payload 를 정제하는 필터가 `initializeRumAgent()` 안에서 등록 순서대로 실행된다.  
불필요한 수집을 막으면서 데이터 필터링에 용이하도록 트랜잭션 명을 수정하는 것을 주요 목적으로 삼았다.

#### httpRequestFilter

- **목적**
  - gem-server 에 대한 Fetch Transaction 만을 유지하고 나머지는 걸러냄
  - gem-server 에 보낸 Request URL 를 Grouping 하기 위해 별도로 정규화해야 함
- **구현**
  - `VITE_SERVER_HOST` 에 해당하지 않는 `http-request` 타입 트랜잭션을 제거한다.
  - gem-server 에 보낸 요청은 URL 의 동적 세그먼트를 `:paramId` 형태로 정규화한다.
    ```
    GET /api/courses/507f1f77bcf86cd799439011/units/123
    → GET /api/courses/:courseId/units/:unitId
    ```
- 정규화 패턴은 아래와 같이 처리했다.
  - MongoDB ObjectId: `/^[a-f0-9]{24}$/i`
  - Prefixed ObjectId: `/^[a-z]+_[a-f0-9]{24}$/i` (예: `unit_abc123...`)
  - UUID: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}.../`
  - 순수 숫자: `/^\d+$/`

#### userInteractionFilter — data-transaction-name 컨벤션만 유지

- **목적** — `"Click - Domain - Action"` 패턴이 아닌 자동 생성 이름을 필터링한다.
- **구현** — `split(' - ')` 로 분리 시 파트가 3개 미만이면 제거한다.
  - `"button-click"` 류 → `' - '` 구분자 없음 → length 1 → 제거
  - `"Click - ul"`, `"Click - p"` 류 → length 2 → 제거
  - `"Click - Domain - Action"` 류 → length 3 → 통과

#### errorFilter — 의미 없는 에러 제거

- **목적** — 아래에 나열된 에러를 필터링하여 APM 이 불필요한 에러를 수집하지 않도록 한다.
- **구현** — 각 에러 별로 주요하게 삽입되는 키워드 혹은 문장을 에러 메세지에서 조회한다. 이후 조건에 부합하는 에러라면 Filter 를 통해 APM 으로 전송되지 않게 막는다.

| 분류 | 예시 |
|---|---|
| 청크 로드 | `ChunkLoadError`, `Failed to fetch dynamically imported module` |
| 네트워크 | `failed to fetch`, `networkerror when attempting to fetch resource.` |
| 사용자 취소 | `AbortError`, `The user aborted a request.` |
| ResizeObserver | `ResizeObserver loop completed` |
| 브라우저 확장 | `chrome-extension://`, `moz-extension://`, `safari-extension://` |
| Script 에러 | `Script error.` (cross-origin 에러로 내용 없음) |

### 2-6. Route 이름 정규화

APM 대시보드에서 의미 있는 그룹으로 집계되려면 트랜잭션 이름이 라우트 패턴 형태여야 한다.  
그렇지 않으면 자체 휴리스틱 알고리즘으로 인해 서로 다른 페이지 트랜잭션이 하나로 묶이기 때문이다.

GEM 에서는 자체적인 Route Match Pattern 을 사용하여 각 페이지 별 고유한 이름을 지정해주었다.

#### SPA 경로 이동 — `useExtractRoutePattern()`

React Router 의 `useMatches()` 로 현재 매칭된 라우트 패턴을 읽고, 동적 파라미터를 치환한다.  
자세한 구현은 위에서 설명했으니 참고하면 좋다.

```typescript
// 실제 URL: /spaces/abc123/courses/xyz789
// useMatches().params: { spaceId: 'abc123', courseId: 'xyz789' }
// → 정규화 결과: /spaces/:spaceId/courses/:courseId
```

#### HTTP 요청 트랜잭션 — `normalizeTransactionName()`

`http-request` 타입 트랜잭션의 URL Segment 를 패턴 인식으로 정규화한다.

```
GET /api/courses/507f1f77bcf86cd799439011  →  GET /api/courses/:courseId
GET /api/units/123                         →  GET /api/units/:unitId
```

### 2-7. data-transaction-name 컨벤션

`user-interaction` 트랜잭션 이름은 `data-transaction-name` HTML 어트리뷰트로 제어한다.  
APM 은 이 값 앞에 자동으로 `"Click - "` 등 상호작용한 이벤트 명을 붙여 트랜잭션을 생성한다.

```typescript
<Button data-transaction-name="Submission - Final Submit">
  제출하기
</Button>
// → APM 트랜잭션 이름: "Click - Submission - Final Submit"
```

### 2-8. useApmUserSync — 사용자 컨텍스트 동기화

APM 대시보드에서 에러나 트랜잭션을 **특정 사용자와 연결**하기 위해 인증된 사용자 정보를 Agent 에 주입한다.

```typescript
export const useApmUserSync = () => {
    const { data: userInfo } = useQuery({
        ...authQueries.myInfoOptions(),
        select: (response) => response.data,
        retry: false,
    });

    useLayoutEffect(() => {
        if (isNotNil(userInfo)) {
            const { id, email } = userInfo;
            RumAgent.apm.setUserContext({ id, email });
        }
    }, [userInfo]);
};
```

위에서 기술한 `useApmUserSync` Hook 은 `ApmProvider` 에서 `useRouteTransaction` 과 함께 실행된다.  
이때 사용자 정보가 수신되면 `setUserContext()` 로 이후 모든 트랜잭션과 에러에 `context.user` 가 자동으로 설정된다.

```typescript
// App/Ui/ApmProvider/ApmProvider.tsx
export const ApmProvider = ({ children }: ApmProviderProps) => {
    useRouteTransaction();
    useApmUserSync();
    return <>{children}</>;
};
```

#### 구현 과정에서의 핵심 포인트

1. **`useLayoutEffect` 선택 이유** — 사용자 정보가 수신된 직후 Paint 이전에 컨텍스트를 설정해, 이후 수집되는 트랜잭션에 누락 없이 user 정보가 포함되도록 보장한다. `useEffect` 였다면 첫 렌더 시점에 발생하는 트랜잭션에는 user 정보가 빠질 수 있다.
2. **`retry: false` 설정** — 마인즈권 로그인 전 상태에서 `myInfo` 요청이 실패해도 반복 시도하지 않는다. 마인즈권 로그인 전에는 `userInfo` 가 null 인 것이 정상이기 때문이다.
3. **한 번 설정 후 세션 유지** — `setUserContext()` 는 Agent 내부 상태를 업데이트한다. 이후 페이지 이동이나 트랜잭션 생성 시에도 별도 재호출 없이 컨텍스트가 자동으로 세팅된다.

### 2-9. captureError — 수동 에러 캐치

Global Context 로 전파되지 않기에 자동 계측으로 잡히지 않는 에러를 APM 에 수동으로 전송한다.  
`RumAgent.captureError()` 는 `@elastic/apm-rum` 의 `captureError()` 를 래핑한 구조다.

```typescript
// @gem-site/apm-rum/RumAgent.ts
public captureError(error: Error): void {
    const normalized = this.normalizeError(error);
    this.apm.captureError(normalized);
}

private normalizeError(error: Error): Error {
    // "Uncaught TypeError" → "TypeError" 정규화
    if (error.message.startsWith('Uncaught ')) {
        error.message = error.message.replace(/^Uncaught\s+/, '');
    }
    return error;
}
```

GEM Form 에서는 `RootErrorBoundary` 에서 `captureError` 를 호출한다.

```typescript
// App/Ui/RootErrorBoundary/RootErrorBoundary.tsx
export function RootErrorBoundary({ children }: PropsWithChildren) {
    const handleError = (error: Error) => {
        RumAgent.apm.captureError(error);
    };

    return (
        <ErrorBoundary FallbackComponent={RootErrorFallback} onError={handleError}>
            <PromiseRejectGuard>{children}</PromiseRejectGuard>
        </ErrorBoundary>
    );
}
```

`RootErrorBoundary` 는 두 가지 에러 유형을 모두 APM 으로 전달한다.

- **React 렌더 에러** — `ErrorBoundary.onError` 에서 `captureError` 호출
- **미처리 Promise rejection** — `PromiseRejectGuard` 가 `unhandledrejection` 이벤트를 `showBoundary` 로 전달하여 `ErrorBoundary` 를 거쳐 `captureError` 까지 도달

#### 구현 과정에서의 핵심 포인트

1. **`PromiseRejectGuard` — Promise rejection 수집** — `window.addEventListener('unhandledrejection', ...)` 로 비동기 에러를 잡아 `showBoundary` 로 전달한다. `event.reason` 이 `Error` 인스턴스가 아닌 경우 `new Error(String(reason))` 으로 래핑하여 타입을 통일한다.
2. **`"Uncaught"` 접두사 정규화** — 브라우저가 자동으로 붙이는 `"Uncaught TypeError: ..."` 형태의 접두사를 제거하여, APM 대시보드에서 에러가 중복 그룹으로 분류되지 않도록 방지한다.
3. **자동 계측과의 구분** — `@elastic/apm-rum` 은 `window.onerror` 를 통해 전역 에러를 자동 수집한다. `captureError` 는 React 렌더 에러처럼 **ErrorBoundary 안에서 포획되어 전역 핸들러에 도달하지 않는 에러**를 수동으로 보내기 위한 용도다.

---

## 3. 구현 과정에서 발견한 문제들

### page-load 트랜잭션 이름 — 휴리스틱 알고리즘 문제

대시보드에서 `page-load` 트랜잭션을 열어보니, 서로 다른 경로의 페이지들이 하나의 트랜잭션으로 묶여 표시되고 있었다.

```
/spaces/abc123/courses   →  ┐
/spaces/def456/courses   →  ┤  동일한 트랜잭션 이름으로 집계됨 (/spaces/:id)
/spaces/ghi789/courses   →  ┘
```

이렇게 된 원인은 ES APM 에서 트랜잭션 이름을 지정하는 과정에서 쓰인 **휴리스틱 알고리즘** 이었다.

#### 휴리스틱 알고리즘이란?

Agent 는 `page-load` 트랜잭션이 생성될 때 URL 경로를 그대로 이름으로 쓰는 대신,  
내부에서 설계된 자체 알고리즘으로 URL 을 변환하여 트랜잭션 이름을 결정한다.

알고리즘은 URL 경로 트리를 **최대 깊이 2** 까지 재귀적으로 순회한다.  
이후 각 세그먼트의 **자릿수, 특수문자 포함 여부, 대소문자 혼합 패턴** 을 분석해 동적 파라미터 여부를 판별한다.

```
/spaces/abc123/courses       →  /spaces/:id/courses
/spaces/def456               →  /spaces/:id           ← 다른 경로인데 같이 묶임
/spaces/abc123/courses/xyz   →  /spaces/:id           ← 깊이 2 이후는 무시
```

하지만 우리의 제품에서 위 알고리즘의 문제는 두 가지다.

- **오분류** — 동일한 경로의 페이지임에도 다르게 묶이거나, 다른 페이지에서 생성된 트랜잭션도 같이 묶인다.
- **패턴 소실** — 깊이 2 이후의 경로 세그먼트는 무시되므로, 페이지를 고유하게 식별하는 정보가 사라진다.

Elastic 공식 문서도 이 알고리즘에 대해 *"it might not correctly identify matches in some cases"* 라고 명시하고 있다.

#### 해결 — setInitialPageLoadName

`setInitialPageLoadName()` 은 생성된 `page-load` 트랜잭션의 이름을 개발자가 지정할 수 있는 API 다.  
자동 `page-load` 트랜잭션을 유지한 채 이름만 교체하므로 Core Web Vitals 수집에는 영향을 주지 않는다.

`disableInstrumentations: ['page-load']` 로 비활성화하면 `PerformanceObserver` 도 함께 등록되지 않아  
모든 Core Web Vitals 지표가 수집되지 않으므로, 이름 교체만 하는 방식이 유일한 선택지다.

따라서 `useExtractRoutePattern()` 으로 React Router 의 실제 라우트 패턴을 읽어 page-load 이름으로 지정한다.

```typescript
// useRouteTransaction.ts — useLayoutEffect 내부
if (isInitialMount.current) {
    RumAgent.apm.setInitialPageLoadName(routePattern);
    // routePattern: '/spaces/:spaceId/courses/:courseId' 형태
}
```

이 덕분에 URL 의 실제 동적 값이 아닌 **라우트 구조** 가 트랜잭션 이름이 되어, APM 에서 페이지 단위로 정확하게 집계된다.

```
이전: /spaces/:id, /spaces/:id, /spaces/:id  (세 페이지가 하나로 묶임)
이후: /spaces/:spaceId/courses, /spaces/:spaceId, /spaces/:spaceId/courses/:courseId  (각 페이지별로 정확히 집계)
```

---

## 마치며

Elastic APM RUM 을 실제 프론트엔드 애플리케이션에 도입하고 나서 에러 추적과 원인 파악이 눈에 띄게 빨라졌다.  
특히 분산 추적 덕분에 에러가 프론트엔드에서 발생한 건지, 서버나 다른 인프라에서 터진 건지를 한눈에 구분할 수 있게 됐다.

WebSocket 에도 커스텀 트랜잭션을 붙여 소켓 성공·실패 여부를 추적할 수 있도록 설계했는데,  
팀원들이 "원인 분석이 훨씬 편해졌다" 고 얘기해줬을 때가 가장 뿌듯했다. (이 맛에 기능 개선하는 거다 정말)

다만 현재 시점에서 우리가 ES RUM 을 정말 잘 쓰고 있는지는 솔직히 아직도 잘 모르겠다.  
모니터링을 더 잘하려면 어떻게 해야 하는지, 이건 앞으로도 계속 고민하고 조사해야 할 숙제다.  
Best Practice 가 무엇인지에 대해서도 더 열심히 조사해서 찾아봐야겠다.

---

## Ref.

- [Elastic APM RUM JS Agent 공식 문서](https://www.elastic.co/guide/en/apm/agent/rum-js/current/intro.html)
- [Supported Technologies — Page load metrics & User-centric Metrics](https://www.elastic.co/guide/en/apm/agent/rum-js/current/supported-technologies.html)
- [Custom Transactions API](https://www.elastic.co/guide/en/apm/agent/rum-js/current/custom-transactions.html)
