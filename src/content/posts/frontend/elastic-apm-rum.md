## 들어가며

사내에서 진행 중인 프로젝트를 개발하는 과정에서 **에러를 모니터링하는 도구를 추가하자는 의견**이 나왔다.  
그동안은 CS 가 인입되거나 에러가 발생하면 개발자가 이를 재현한 이후에 직접 에러 로그를 보고 고쳤기 때문에,  
CS 처리에 상당히 많은 시간이 소요되기 일쑤였고, 문제가 재현되지 않으면 더 골치 아픈 상황이 만들어지곤 했다.

그래서 이번에 사내에서 주로 사용하는 Elastic 서비스에서 제공하는 APM 과 RUM 에 대해 조사를 한 후에,  
이를 실질적으로 도입하는 과정에서 겪은 트러블 슈팅까지 총 두 편에 걸쳐 글을 작성할 예정이다.

- **이 글 (1편)**: Elastic APM 데이터 모델의 핵심 개념 + RUM JS Agent API 사용 방법
- **다음 글 (2편)**: GEM Form 에 ES APM RUM 을 실제 도입하는 과정에서 내린 설계 결정과 트러블슈팅

이번 글에서는 APM 이 수집하는 데이터 모델의 구성 요소가 무엇인지 먼저 살펴보고,  
이후 RUM JS Agent 를 통해 브라우저에서 이를 어떻게 수집하고 활용하는지 정리한다.

---

## Elastic APM 핵심 개념

먼저 Elastic 에서 제공하는 APM, RUM 이라는 키워드에 대해 짚고 넘어가자.  
참고로 APM, RUM 은 Elastic 뿐만 아니라 Datadog 같은 타사에서도 사용하는 개념이다.

### APM (Application Performance Management)

- 서버와 브라우저를 아우르는 **애플리케이션 성능 데이터를 수집하고, 분석한 후 시각화하는 시스템**이다.
- 서비스에 문제가 발생한 경우 에러의 정보와 발생 원인을 제공하고, 성능 병목 지점 또한 안내해준다.

### RUM (Real User Monitoring)

- APM 의 브라우저 계층으로, 실제 사용자의 기기와 네트워크 환경에서 수집한 데이터를 다룬다.
- 개발자 환경에서 측정하는 Synthetic Monitoring 과 달리, 다양한 사용자 조건을 그대로 반영한다.

이 두 개념이 Elastic 생태계에서 어떻게 구현되는지 살펴보자.  
Elastic APM 은 Elasticsearch + Kibana 기반 APM 솔루션이다.  
RUM JS Agent 가 브라우저에서 실행되어 데이터를 수집하고 ES 로 전송하면, Kibana APM 탭에서 이를 시각화한다.

---

## Part 1 — APM 데이터 모델

APM 이 수집하는 데이터는 몇 가지 핵심 구성 요소로 이루어진다.  
Span, Transaction, Trace, Error, Metadata — 이 개념들은 RUM 뿐만 아니라 서버 측 APM Agent 에서도 동일하게 사용된다.

### Span — 단일 이벤트의 소요 시간 측정

**Span** 은 서비스 내부에서 일어나는 단일 작업의 소요 시간을 측정하는 기본 단위이다.  
조금 더 쉽게 풀어내자면, "특정 코드가 실행되는데 얼마나 걸렸는가?" 에 대한 기록이다.

Span 은 아래의 특징을 가진다.

- DB Query 실행, 외부 API 호출 등 서비스 안에서 발생하는 모든 개별 동작이 Span 이 된다.
- 아래에서 설명할 Transaction 을 구성하는 하위 요소이며, ID 로 관계를 참조한다
- 모든 Span 은 관리 및 분석을 위해 `name`, `type`, `subtype`, `action` 으로 분류된다.
- Span 내부에 또 다른 Span 이 존재할 수 있어, 복잡한 코드 흐름을 트리 구조로 시각화할 수 있다.
- APM Agent 가 수집하는 Span 외에도 개발자가 Custom Span 으로 직접 지정할 수 있다.

아래는 유저 정보를 가져오기 위해 API를 호출했으나, 인증 오류로 인해 실패한 상황을 기록한 `Span` 의 구조다.

```json
{
  "span": {
    "id": "0823237890274ed6",
    "transaction_id": "06ac07afaf032939",
    "parent_id": "06ac07afaf032939",
    "trace_id": "beec38c8ec726c375518fa28823289f0",
    "name": "GET https://api.example.com/v1/users/me",
    "type": "external",
    "subtype": "http",
    "start": 1044,
    "duration": 14,
    "outcome": "failure",
    "context": {
      "http": {
        "method": "GET",
        "url": "https://api.example.com/v1/users/me",
        "status_code": 401
      }
    }
  }
}
```

- **`id`**: 이 세부 작업 (`Span`) 자체의 고유 식별자이다.
- **`parent_id`** & **`transaction_id`**: 자신이 어떤 부모(`Transaction`) 아래에서 실행되었는지 상위 객체의 ID를 참조하여 계층 관계를 맺는다.
- **`start`** & **`duration`**: 최상위 `Transaction`이 시작된 지 1044ms 뒤에 이 작업을 시작했으며, 완료까지 14ms가 소요되었음을 나타낸다.

### Transaction — 최상위 Span

Transaction 은 Span **의 특수한 형태**로, 서비스에 들어온 요청의 시작과 끝을 아우르는 **최상위 Span 이다**.  
일반 Span 과 비교했을 때 아래와 같이 크게 2개의 특징을 가진다.

```javascript
Transaction: "/spaces/:spaceId"  (type: route-change, 680ms)  ← 최상위 Span + 메타데이터
  ├── Span: GET /api/spaces/:id           220ms
  ├── Span: GET /api/courses?spaceId=...  310ms
  └── Span: Longtask (anonymous)           55ms
```

1. **서비스 안에서 가장 바깥에 위치하는 최상위 Span 이다.**
   - Transaction 은 모든 하위 Span 을 포함하는 최상위 부모로서 존재한다.
   - 따라서 Transaction 내 하위 Span 들은 모두 Transaction 에 귀속된다.
   - 만약 Transaction 이 종료되면 아직 완료되지 못한 Span 도 강제 종료된다.
2. **서비스, 호스트, 사용자 등 환경에 관한 메타데이터를 담는다.**
   - Span 에 존재하는 `name`, `type` 외에 요청 URL, 사용자 정보, 서비스 버전 등이 함께 기록된다.

아래는 사용자가 인증 페이지에 진입했을 때 전체 흐름의 시작점이 되는 최상위 `Transaction` 의 구조이다.

```json
{
  "transaction": {
    "id": "06ac07afaf032939",
    "trace_id": "beec38c8ec726c375518fa28823289f0",
    "name": "/auth/callback",
    "type": "page-load",
    "duration": 1267,
    "sampled": true,
    "span_count": { "started": 43 },
    "context": {
      "page": { "url": "https://service.example.com/dashboard" },
      "user": {
        "id": "user_99999999999999999999_google",
        "email": "test-user@example.com"
      }
    }
  }
}
```

- **`id`** & **`trace_id`**: 이 `Transaction` 고유의 ID와 함께, 하위의 모든 `Span`들이 공유하게 될 전체 흐름의 식별자 (`trace_id`) 를 발행한다.
- **`context.user`**: 요청을 보낸 사용자의 식별 정보 (`User Context`) 를 메타데이터로 명확하게 기록한다.

### Trace — 서비스를 가로지르는 요청의 전체 흐름

Trace는 하나의 공통 루트를 가지는 Transaction과 Span들의 집합이다.  
단일 요청이 여러 마이크로서비스를 거치며 이동하는 전체 여정을 하나의 단위로 묶어 추적하는 개념이다.

이때, 단일 요청이 여러 서비스를 거쳐서 가는 경우가 존재할 수 있다 (서버 - 사이트 간의 이동 등)  
이 전체 여정을 하나로 묶기 위해 ES APM 에서는 **Distributed Tracing (분산 추적)** 기술을 사용한다.

```javascript
[RUM] Transaction: /spaces/:spaceId  (route-change)
  └── Span: GET /api/spaces/abc  ──traceparent──▶  [APM] Transaction: GET /api/spaces/:id
                                                       └── Span: DB query  12ms
```

- 서비스 간의 연결은 클라이언트가 HTTP 요청을 보낼 때 헤더에 `traceparent`라는 고유한 식별자를 삽입하는 방식으로 이루어진다.
- 요청을 받은 수신 서비스는 이 헤더 값을 읽어 들여 자신이 생성한 Transaction 을 기존 Trace 의 자식으로 자연스럽게 연결한다.
- 이 모든 과정은 기술 표준인 W3C Trace Context 규격을 충족하며 동작한다.

#### traceparent 란?

`traceparent` 분산 추적 (Distributed Tracing) 에서 서로 다른 시스템이나 마이크로서비스 간에  
"우리는 지금 하나의 동일한 요청을 처리하고 있다"라는 것을 증명하는 식별자 헤더다.

W3C Trace Context 표준 규격을 따르며, 여러 서비스를 거치는 요청을 단일 Trace 로 묶는 역할을 한다.  
실제 `traceparent` 헤더는 아래와 같이 하이픈으로 구분된 4가지 Segment 문자열로 구성된다.

```
traceparent: 00-beec38c8ec726c375518fa28823289f0-06ac07afaf032939-01
             └─┘ └──────────────────────────────┘ └──────────────┘ └─┘
             버전              Trace ID               Parent ID    플래그
```

- **버전 (Version)**
  - 현재 사용 중인 추적 포맷의 버전을 의미한다.
  - 표준은 `00` 고정이다.
- **Trace ID**
  - 전체 요청 흐름을 관통하는 고유 식별자이다.
  - 아무리 많은 서비스를 거쳐도 이 값은 변하지 않고 유지된다.
- **Parent ID (Span ID)**
  - 이 요청을 보낸 바로 직전 상위 작업 (Span 또는 Transaction) 의 고유 ID이다.
  - 수신 측 서비스는 이 값을 보고 자신의 부모가 누구인지 정확히 인지한다.
- **추적 플래그 (Trace Flags)**
  - 현재 이 요청의 성능 데이터를 수집(샘플링)하고 있는지 여부를 나타낸다.
  - `01`은 수집 중(Sampled)임을 뜻하며 후속 서비스도 이 플래그를 보고 수집 여부를 결정한다.

### Error — 에러 이벤트

Error 는 Elastic APM 이 애플리케이션 실행 중 캡처하는 예외 및 에러 이벤트다.  
Span, Transaction 과 달리 독립적인 이벤트로 전송되지만, `transaction_id` 와 `trace_id` 를 통해 어느 트랜잭션 흐름에서 발생했는지 연결된다.

Error 에는 `exception` 정보, `stack_trace`, `culprit` (원인 코드 위치) 이 포함된다.  
이 덕분에 "어느 트랜잭션에서 어떤 에러가 발생했는가" 를 Kibana 에서 바로 추적할 수 있다.

아래는 API 호출 도중 예기치 않은 서버 에러가 발생하여 캡처된 `Error` 의 구조다.

```json
{
  "error": {
    "id": "c3f9e2a1d4b56789",
    "transaction_id": "06ac07afaf032939",
    "trace_id": "beec38c8ec726c375518fa28823289f0",
    "culprit": "submitAnswers (submission.ts:42)",
    "exception": {
      "message": "Network response was not ok: 500 Internal Server Error",
      "type": "Error",
      "handled": false
    }
  }
}
```

- **`transaction_id`** & **`trace_id`**: 에러가 발생한 시점의 트랜잭션과 전체 추적 흐름을 참조한다.
- **`culprit`**: 에러가 발생한 코드의 파일명과 라인 번호를 나타낸다.
- **`exception.handled`**: `false` 이면 `window.onerror` 를 통해 자동 캡처된 미처리 에러, `true` 이면 `captureError()` 로 직접 전송한 에러다.

### Metadata — 이벤트에 부착하는 부가 정보

Span, Transaction, Error 모두에 부가 정보를 붙일 수 있다. 세 가지 형태를 제공한다.

| 종류 | 설명 | 인덱싱 |
|---|---|---|
| **Labels** | `string \| number \| boolean` 값. 필터링·집계에 사용 | ✓ (검색·필터 가능) |
| **Custom Context** | 중첩 객체 가능. 디버깅용 자유 형식 정보 | ✕ (조회만 가능) |
| **User Context** | 사용자 id, email, username. 사용자별 추적에 사용 | ✓ (검색·필터 가능) |

---

## Part 2 — RUM Agent 실전 사용

Part 1 에서 정의한 Span, Transaction, Trace, Error, Metadata 를  
RUM JS Agent 가 브라우저에서 어떻게 수집하고 활용하는지 살펴본다.

### Agent 등록하기

ES APM RUM 을 사용하려면 먼저 **RUM JS Agent** 를 애플리케이션에 초기화해야 한다.  
`@elastic/apm-rum` 패키지를 설치한 후, `apm.init()` 으로 Agent 를 초기화하면 된다.

```javascript
import { init as initApm } from '@elastic/apm-rum';

const apm = initApm({
  serviceName: 'my-frontend-app',
  serverUrl: 'https://apm-server.example.com',
  serviceVersion: '1.0.0',
  environment: 'production',
});
```

`apm.init()` 은 Agent 를 초기화하면서 동시에 **자동 계측 (Auto-Instrumentation)** 을 시작한다.  
별도의 코드 작성 없이도 Agent 가 브라우저 이벤트와 API 를 Monkey Patching 하여 데이터를 자동 수집한다.

#### RUM 모듈은 반드시 가장 먼저 로드해야 한다

한 가지 주의할 점이 있다면, `RUM Agent`는 애플리케이션에서 가장 먼저 실행되어야 한다는 것이다.  
`React`, `Router`, 기타 라이브러리보다 앞서 초기화하지 않으면 계측이 정상적으로 동작하지 않는다.

왜 ES APM RUM 모듈을 먼저 평가하여 실행하지 않으면 계측이 안될까? 이유는 크게 세 가지다.

```typescript
// apm.ts — 별도 파일로 분리
import { init as initApm } from '@elastic/apm-rum';
export const apm = initApm({ ... });
```

```typescript
// main.tsx — 반드시 첫 번째 import
import './apm';       // APM Agent 먼저
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
```

**1. Monkey Patching 선점 — fetch / XHR / history**

- Agent 의 자동 계측은 `window.fetch`, `history.pushState` 등을 래퍼 함수로 교체하여 동작한다.  
  이 교체는 `apm.init()` 호출 시점에 일어난다.
- 만약 다른 모듈이 먼저 로드되면서 `const myFetch = window.fetch` 형태로 원본을 저장해두었다면,  
  Agent 가 나중에 `window.fetch` 를 교체해도 그 변수는 여전히 원본을 가리킨다.
- 해당 모듈의 HTTP 요청은 Agent 의 래퍼를 통과하지 않으므로 **Span 이 생성되지 않는다.**

**2. page-load 트랜잭션 타이밍 — Core Web Vitals 손실**

- FCP, LCP, CLS 같은 Core Web Vitals 는 브라우저가 페이지 로드 초반부터 기록하는 이벤트다.
- Agent 는 `PerformanceObserver` 를 등록해 이 이벤트를 구독하는데, **이미 발생한 이벤트는 소급 캡처할 수 없다.**
- 따라서 RUM Agent 가 늦게 초기화될수록 `page-load` 트랜잭션이 놓치는 지표가 생긴다.

**3. 전역 에러 핸들러 등록 — 초기 에러 손실**

- Agent 는 `window.onerror` 와 `window.onunhandledrejection` 에 전역 에러 핸들러를 등록한다.
- 따라서 초기화 이전에 발생한 에러는 이 핸들러가 아직 없는 상태이므로 **APM 서버로 전송되지 않는다.**

### 자동 계측 — Agent 가 수집하는 Transaction Type

Agent 를 초기화하는 것만으로 아래 유형의 Transaction 이 자동으로 수집된다.

| type | 트리거 | 설명 |
|---|---|---|
| `page-load` | 최초 페이지 진입 | Core Web Vitals 전체가 귀속됨. 페이지 당 1회 생성 |
| `route-change` | `history.pushState` 감지 | SPA 경로 이동 시 자동 생성 |
| `user-interaction` | 클릭 등 사용자 인터랙션 | 클릭 이벤트 발생 시 자동 생성 |
| `http-request` | 활성 트랜잭션이 없는 상태의 fetch/XHR | `fetch` 또는 `XHR` 자동 계측 코드가 현재 점유 중인 활성 트랜잭션을 찾지 못할 때 생성된다. |

#### page-load

해당 트랜잭션은 페이지 최초 진입 시 자동으로 생성된다.

JS, CSS, 이미지 등 리소스를 로딩하는 과정을 Span 으로 측정하며, Navigation Timing API 기반의 마일스톤 Span 이 Waterfall 형태로 기록된다.

측정 기간은 `fetchStart` 를 기준으로 시작하며, 브라우저 load 이벤트 이후에도 실행 중 추가로 발생된 리소스 요청까지 포착하기 위해 트랜잭션이 연장될 수 있다.

`page-load` 트랜잭션은 단순한 페이지 로드 시간 측정 이상의 역할을 한다.  
이때 페이지 내 측정되는 **Core Web Vitals 전체가 이 트랜잭션에 귀속**된다.

| 지표 | 설명 | Google 권장 기준 |
|---|---|---|
| **FCP** | First Contentful Paint — 첫 콘텐츠 화면 표시 | - |
| **LCP** ⭐ | Largest Contentful Paint — 핵심 요소 렌더 완료 | 2.5초 이내 |
| **INP** ⭐ | Interaction to Next Paint — 인터랙션 응답성 | 200ms 이내 |
| **FID** | First Input Delay — 첫 인터랙션 응답 지연 | 100ms 이내 |
| **TBT** | Total Blocking Time — Long Task 블로킹 누적 | - |
| **CLS** ⭐ | Cumulative Layout Shift — 레이아웃 흔들림 | 0.1 이하 |
| **TTFB** | Time to First Byte — 첫 바이트 수신까지 | - |

> [!WARNING]
> `disableInstrumentations: ['page-load']` 을 설정하면 위 지표 전체가 수집되지 않는다.

수동으로 `startTransaction('...', 'page-load', { managed: true })` 를 만들어도 Core Web Vitals 는 자동 트랜잭션에만 귀속되므로 복구되지 않는다.

#### route-change

SPA 에서 클릭 이벤트가 라우트 전환으로 이어질 때 생성된다.  
`user-interaction` 대신 이 타입이 우선 생성되며, 프레임워크 통합 모듈이 컴포넌트 라이프사이클에 훅인하여 전환 완료 시점까지 정확한 duration 을 측정한다.

##### 동적 파라미터와 이름 문제

Agent 는 `pushState` 이벤트를 감지하는 즉시 `route-change` 트랜잭션을 자동으로 생성한다.  
하지만 자동 생성된 트랜잭션 이름은 실제 URL 이 그대로 기록되기 때문에, 동적 파라미터가 포함된 경우 문제가 된다.

`/spaces/abc123` 와 `/spaces/def456` 는 같은 라우트 패턴임에도 각각 다른 트랜잭션으로 기록되어,  
APM 대시보드에서 동일 페이지로 집계할 수 없게 된다.

이를 해결하기 위해 React Router 의 라우트 변경을 감지하는 훅 (예: `useLayoutEffect`) 에서 `startTransaction` 을 직접 호출하여 라우트 패턴을 트랜잭션 이름으로 지정한다.

```typescript
// 경로 변경 시마다 실행
transactionRef.current = apm.startTransaction(
  routePattern,    // '/spaces/:spaceId' 형태의 패턴
  'route-change',
  { managed: true }
);
```

`managed: true` 로 활성 트랜잭션을 점유하면, 전환 중 발생하는 API 호출들이 모두 이 트랜잭션의 자식 Span 으로 귀속된다.  
덕분에 특정 라우트 전환에서 발생한 네트워크 요청 전체를 하나의 흐름으로 추적할 수 있다.

#### user-interaction

앱에서 등록한 클릭 이벤트 리스너가 실행될 때 자동으로 생성된다.

다만 클릭 후 네트워크 요청 등 하위 Span 이 없으면 자동으로 폐기된다.  
이는 서버로 전송되는 불필요한 Transaction 수를 줄이기 위한 동작이다.

Transaction 이름은 클릭된 HTML 요소의 속성에 따라 결정된다.  
`data-transaction-name` 이 없으면 `name` 속성이 사용되며, 둘 다 없으면 태그명만으로 이름이 구성된다.

```html
<button></button>                                   → "Click - button"
<button name="purchase"></button>                   → "Click - button[\"purchase\"]"
<button data-transaction-name="purchase"></button>  → "Click - purchase"
```

`name` 속성은 폼 제출 등 다른 목적으로도 사용되며 APM 과 무관한 값이 들어올 수 있다.  
만일 이름을 제어할 목적이라면 `data-transaction-name` 사용을 권장한다.

#### http-request

활성 트랜잭션이 없는 상태에서 `fetch` 또는 `XHR` 요청이 발생할 때 자동 생성된다.  
고아(orphan) 네트워크 요청이 데이터 손실 없이 수집되도록 하는 Fallback 메커니즘이다.

#### 자동 계측을 비활성화 하는 방법

특정 자동 계측을 비활성화하고 싶다면 `disableInstrumentations` 옵션으로 계측을 끌 수 있다.

```javascript
const apm = initApm({
  disableInstrumentations: ['user-interaction'], // 클릭 자동 계측 비활성화
});
```

### 수동 Transaction 생성 — startTransaction

Agent 가 자동 수집하는 트랜잭션 외에도 별도의 측정이 필요한 경우 직접 `Transaction`을 생성할 수 있다.

```typescript
const transaction = apm.startTransaction(
  'Submission - Final Submit', // name: APM 대시보드 레이블
  'custom',                   // type: 분류 기준 (자유롭게 지정 가능)
  { managed: true }           // options: 활성 트랜잭션으로 등록
);

// 작업 수행
await submitAnswers();

transaction?.end(); // 수동 종료 필수
```

> [!NOTE]
> `managed: true` 의 역할은 이후 "트랜잭션 컨텍스트와 활성 트랜잭션" 섹션에서 자세히 설명한다.

#### Transaction API

수동으로 생성한 혹은 현재 활성화된 `Transaction` 객체는 아래 메서드들을 사용할 수 있다.

**`transaction.mark(key)`**

- `Transaction` 진행 중 특정 시점을 기록한다.
- APM 대시보드의 타임라인 그래프 상에 시각적인 세로선(Mark)으로 표시된다.
- `performance.measure()` 가 구간 측정이라면, `mark` 는 **단일 시점 마킹**에 적합하다.

```typescript
const transaction = apm.getCurrentTransaction();
transaction?.mark('form-validated');   // 유효성 검사 완료 시점
transaction?.mark('api-request-sent'); // API 호출 시작 시점
```

**`transaction.addLabels(labels)`**

- 트랜잭션에 검색, 필터링, 대시보드 집계용 Key-Value 태그를 추가한다.

```typescript
transaction?.addLabels({ feature: 'submission-write', step: 'final' });
```

**`transaction.block(flag)`**

- 비동기 작업이 완료되기 전에 `Transaction`이 조기에 자동 종료되는 것을 명시적으로 방지한다.

**`transaction.end()`**

- 트랜잭션을 종료한다.
- 이 시점에 미처 완료되지 못한 하위 `Span`들도 함께 `truncated`(잘림) 상태로 강제 종료된다.

### 수동 Span 생성 — startSpan

특정 코드 블록이나 비즈니스 로직의 상세 소요 시간을 직접 세분화하여 측정하고 싶다면 `transaction.startSpan()` 메서드를 사용한다.

```typescript
const transaction = apm.startTransaction(
  'Submission - Final Submit', 'custom', { managed: true }
);

// 수동 Span — 유효성 검사 구간 측정
const validateSpan = transaction?.startSpan('Validate Answers', 'app');
runValidation();
validateSpan?.end();

// 이후 fetch 는 managed: true 덕분에 자동으로 Span 으로 귀속
await submitAnswers();
transaction?.end();
```

`startSpan(name, type, options)` 의 주요 옵션:

- `blocking`: `true` 로 설정하면 이 Span 이 종료될 때까지 부모 트랜잭션이 자동 종료되지 않는다.
- `parentId`: 중첩 구조의 Span 을 만들 때 부모가 될 다른 Span 의 ID 를 명시적으로 지정한다.
- `sync`: `true` 이면 동기 작업, `false` 이면 비동기 작업으로 표시된다.

### 트랜잭션 컨텍스트와 활성 트랜잭션

`managed: true` 옵션의 근본적인 메커니즘을 이해하려면 RUM Agent가 브라우저 환경에서 관리하는  
트랜잭션 컨텍스트 (Transaction Context) 와 활성 트랜잭션 (Active Transaction) 의 개념을 이해해야 한다.

1. **트랜잭션 컨텍스트** (Transaction Context)
   - 트랜잭션 컨텍스트는 APM Agent가 내부적으로 유지하는 일종의 전역 실행 상태이다.
   - 에이전트는 "지금 어느 트랜잭션 공간 안에서 코드가 실행되고 있는가?"를 실시간으로 추적하기 위해, 메모리 상에 단 하나의 전역 슬롯(`currentTransaction`)을 개설하여 관리한다.
   - 이 슬롯은 현재 실행 중인 코드 흐름을 비추는 일종의 **전역 돋보기** 역할을 수행한다.
2. **활성 트랜잭션** (Active Transaction)
   - 전역 슬롯(`currentTransaction`)을 현재 점유하고 **있는 단 하나의 트랜잭션 주체**를 의미한다.
   - `fetch`나 `XHR` 자동 계측 코드는 네트워크 요청이 시작되는 바로 그 순간  
     이 슬롯을 조회하여 "내가 어느 트랜잭션의 하위 `Span`으로 기어가야 하는지"를 결정한다.

#### 왜 RUM 에서는 활성 트랜잭션이 유일한가?

멀티 스레드로 복잡한 컨텍스트 추적이 필요한 서버(Node.js 등) 환경과 달리,  
유저의 브라우저 (RUM) 환경은 철저하게 **싱글 스레드**로 동작한다.  
그렇기에 메모리 상에 여러 개의 트랜잭션 객체가 동시 생성되어 대기할 수는 있어도  
`currentTransaction` 슬롯을 차지하는 활성 트랜잭션은 언제나 **단 하나**만 존재한다.

#### managed: true 의 역할

`managed: true` 플래그는 생성한 트랜잭션을 전역 `currentTransaction` 슬롯에 즉시 등록하여  
활성 트랜잭션으로 상태를 격상시키는 역할을 한다.  
이 플래그가 켜져 있어야만 이후 발생하는 전역 네트워크 요청 (`fetch`) 들이 엉뚱한 곳으로 튀지 않고  
해당 트랜잭션의 자식 `Span`으로 일제히 귀속된다.

APM 은 앱 초기화 시점에 `window.fetch` 를 전역으로 래핑한다 (`instrument: true` 기본값).  
이때 모든 fetch 호출이 이 래퍼를 통과하면서 아래의 동작을 한다.

1. 요청 시작 시 Span 생성
2. 현재 활성 트랜잭션에 Span 귀속
3. 응답 완료 시 Span 종료 + duration 기록

> [!NOTE]
> **managed: true** 없이도 fetch 가 자동적으로 하위 Span 등록되지 않나?

결론부터 말하자면 아니다.  
`window.fetch` 자체는 앱 구동 초기에 이미 전역적으로 래핑되어 있다. 하지만 래핑이 되어 있다고 해서 무조건 원하는 트랜잭션의 Span 이 되는 건 아니다.

fetch 래퍼는 실행 시점에 활성 트랜잭션 슬롯을 조회해 "내가 어느 트랜잭션 아래에 Span 으로 귀속될지"를 결정한다.  
슬롯이 비어있으면 귀속될 부모가 없으므로, 해당 `fetch` 는 스스로 `http-request` 타입의 트랜잭션을 새로 만들어 자신을 그 안에 담아 전송한다.

결과적으로 `managed: true` 없이 여러 `fetch` 를 날리면, 각각이 별도의 `http-request` 트랜잭션으로 셸개져 APM 에 기록된다.

`managed: true` 는 이를 막기 위해 생성한 트랜잭션을 활성 슬롯에 즉시 등록한다.  
이후 발생하는 모든 `fetch` 가 슬롯을 조회했을 때 해당 트랜잭션을 부모로 인식하게 되어, 자동으로 셸개져 나갈 네트워크 전송들을 **하나의 비즈니스 트랜잭션 안으로 포섭**할 수 있게 된다.

즉, `managed: true`는 자동으로 쪼개져 나갈 네트워크 전송들을 **내가 원하는 하나의 큰 비즈니스 트랜잭션 안으로 강제 포섭하겠다**는 의미이다.

### fetch 래핑의 실제 동작 원리

`managed: true` 가 어떻게 fetch 를 Span 으로 만드는지 실제 소스 코드를 통해 확인해보았다.  
(`@elastic/apm-rum-core@5.25.2` 라이브러리 내 실제 구현 코드를 분석해보았다)

여기서 가장 큰 핵심은 원본 Fetch 함수를 런타임에 **Monkey Patching 하는 과정에 있다.**  
`window.fetch` 를 래퍼 함수로 교체하고, 원본 실행 전후에 Span 생성·종료를 삽입하는 구조였다.

```javascript
// fetch-patch.js — patchFetch(callback) 내부
var nativeFetch = window.fetch;          // 원본 저장
window.fetch = function (input, init) {
    var task = {
        source: 'fetch',
        data: { method, url, target: request, aborted: false }
    };
    scheduleTask(task);                  // fetch 시작 → 'schedule' 이벤트
    var promise = nativeFetch.apply(this, [request]); // 원본 실행
    promise.then(function (response) {
        task.data.response = response;
        invokeTask(task);                // fetch 완료 → 'invoke' 이벤트
    });
};
```

- **scheduleTask**: fetch 실행 직전에 호출된다. Span 을 생성하고 `task.data.span` 에 저장한다.
- **invokeTask**: 응답 수신 후에 호출된다. `task.data.span` 을 꺼내 Span 을 종료한다.
- 결국 두 함수가 실행되는 시점 사이의 시간이 곧 해당 Span 의 duration (소요 시간) 이 된다.

```javascript
// performance-monitoring.js — processAPICalls(event, task) 내부
if (event === SCHEDULE && task.data) {
    // 활성 트랜잭션이 없으면 http-request 타입 트랜잭션 자동 생성
    if (!transactionService.getCurrentTransaction()) {
        transactionService.startTransaction(spanName, HTTP_REQUEST_TYPE, { managed: true });
    }
    // 현재 활성 트랜잭션 안에 Span 생성
    const span = transactionService.startSpan(spanName, 'external.http', { blocking: true });
    // Distributed Tracing 헤더 주입 (same-origin 에만)
    if (isDtEnabled && isSameOrigin && target) {
        this.injectDtHeader(span, target);
    }
    data.span = span;
} else if (event === INVOKE) {
    const { span } = data;
    span.outcome = status >= 400 ? OUTCOME_FAILURE : OUTCOME_SUCCESS;
    transactionService.endSpan(span, data);
}
```

```javascript
// history-patch.js — patchHistory(callback) 내부
history.pushState = function (state, title, url) {
    const task = { source: HISTORY, data: { state, title, url } }
    callback(INVOKE, task)          // SCHEDULE 없이 바로 INVOKE
    nativePushState.apply(this, arguments)
}

// performance-monitoring.js — getHistorySub() 내부
return (event, task) => {
    if (task.source === HISTORY && event === INVOKE) {
        transactionService.startTransaction(task.data.title, 'route-change', {
            managed: true,
            canReuse: true   // 기존 트랜잭션 재사용 허용
        })
    }
}
```

위 두 파일의 소스 코드에서 확인할 수 있는 중요한 동작 세 가지가 있다.

1. **활성 트랜잭션이 없을 때 fetch 가 자체 `http-request` 트랜잭션을 만든다.**
   - `getCurrentTransaction()` 이 null 이면 `processAPICalls` 내부에서 자동으로 `http-request` 타입 트랜잭션을 생성한다.
2. **`history.pushState` 계측이 `route-change` 트랜잭션을 자동 생성한다.**
   - `patchHistory` 가 `pushState` 를 래핑하고, `getHistorySub()` 가 INVOKE 이벤트를 받아 `route-change` 트랜잭션을 시작한다.
   - 이때 `canReuse: true` 가 함께 전달되어, 이미 활성 트랜잭션이 존재하면 새로 만들지 않고 재사용한다.
3. **Distributed Tracing 헤더 (`traceparent`) 가 자동으로 주입된다.**
   - 같은 origin 의 요청에는 W3C TraceContext 헤더가 자동으로 붙는다.
   - 이 덕분에 프론트엔드 Span 과 백엔드 트랜잭션이 하나의 Trace 로 연결된다.

### 메타데이터 부착 — Context API

수집된 데이터들의 디버깅 가치를 극대화하기 위해 부가 컨텍스트 정보를 주입하는 인터페이스이다.  
Agent 초기 구동 시 전역적으로 이를 설정해두면 이후 발생하는 모든 이벤트에 탑재되어 APM 서버로 발송된다.

```typescript
// 사용자 실제 정보 — APM 대시보드 Users 탭에 보임
apm.setUserContext({
    id: '12345',
    email: 'user@example.com',
    username: 'rookie',
});

// 비즈니스 커스텀 정보 — 원하는 key-value 자유롭게 추가
apm.setCustomContext({
    spaceId: 'abc123',
    submissionId: 'xyz789',
    planType: 'enterprise',
});

// 레이블 — 필터링이나 집계에 사용되는 단순 문자열 key-value
apm.addLabels({
    environment: 'production',
    feature: 'submission-write',
});
```

| API | 용도 | 저장되는 속성 |
|---|---|---|
| `setUserContext` | 로그인 사용자 실제 정보 | `transaction.context.user` |
| `setCustomContext` | 비즈니스 도메인 메타데이터 (중첩 가능) | `transaction.custom` |
| `addLabels` | 필터링/집계용 단순 태그 | Labels 탭 |

#### `setCustomContext` vs `addLabels` 차이는?

- **`setCustomContext`**
  - 데이터의 깊은 중첩 객체나 유연하고 자유로운 JSON 트리 구조를 그대로 수용한다.
  - 단, 이 데이터들은 Elasticsearch 내부에서 개별 항목으로 인덱싱 (Indexing) 되지 않는다.
  - 따라서 디버깅을 하는 용도로만 쓸 수 있고 Kibana 검색창의 필터링 조건문으로는 활용할 수 없다.
- **`addLabels`**
  - 일부 타입 (`string | number | boolean`) 포맷만 지원한다.
  - 대신 완벽하게 인덱싱을 지원하므로, Kibana 대시보드에서 데이터를 정렬하거나 대량 집계를 돌릴 때 필터링 조건 키값으로 매우 강력하게 동작한다.

### 유틸리티 API

#### addFilter — 전송 전 payload 가공

`apm.addFilter(fn)` 으로 APM 서버로 **전송 직전의 payload 를 가로채어** 수정하거나 중단할 수 있다.  
각 Filter 에는 RUM 이 수집한 모든 payload 에 네트워크 요청, 트랜잭션, 에러가 함께 담겨 전송된다.

```typescript
apm.addFilter((payload) => {
    // payload.transactions — 트랜잭션 배열
    // payload.errors       — 에러 배열

    payload.transactions = payload.transactions?.filter(
        (t) => t.type !== 'user-interaction'
    );

    return payload; // 수정된 payload 반환 → 전송
    // return false;  // 반환하지 않으면 payload 전체 차단
});
```

- 필터는 무조건 등록 순서대로 실행된다.
- Payload 를 반환하면 ES APM 에 전송되지만, 그렇지 않을 경우 Agent 단에서 전송을 차단한다.
- 트랜잭션의 이름이나 타입, 그 외 다른 속성들 또한 필터에서 수정할 수 있다.

#### observe — 트랜잭션 라이프사이클 구독

`apm.observe(name, callback)` 으로 트랜잭션이 시작하거나 종료될 때 Callback 을 실행한다.  
`transaction:start` / `transaction:end` 두 이벤트를 지원한다.

주로 사내 로깅 커스텀 래퍼나 내부 진단 플러그인을 결합할 때 유용하다.

```typescript
apm.observe('transaction:end', (transaction) => {
    console.log(transaction.name, transaction.type);
});
```

#### captureError — 수동 에러 전송

```typescript
try {
    await riskyOperation();
} catch (error) {
    apm.captureError(error as Error);
}
```

React의 `Error Boundary`나 일반적인 `try-catch` 구문 안에서 흡수되어 버리는 에러들은  
`window.onerror`까지 전파되지 못하므로 APM 에이전트가 정상적인 방법으로는 인지할 수 없다.  
따라서 이러한 에러들은 `captureError` 메서드를 호출하여 직접 APM 서버로 전송해야 추적이 가능하다.

### Sampling — 수집량 조절

모든 트랜잭션을 빠짐없이 기록하는 것이 이상적이지만, 트래픽이 많은 서비스에서는 그에 따른 비용이 따른다.  
대역폭 증가, APM 서버 부하, ES 저장 비용이 모두 올라가기 때문에 모든 로그를 저장하는 것은 바람직하지 않다.

이때 Sampling 은 과도한 수집 비용을 줄이기 위해 **수집할 트랜잭션의 비율을 조절**하는 방법으로서 사용된다.

#### Head-based Sampling

Trace 가 **시작되는 시점**에 샘플링 여부를 결정한다.  
정확히는 시작 지점에서 난수를 돌려 성능 데이터를 끝까지 수집할 것인지 여부를 미리 정한다고 보면 된다.

이는 브라우저 단에서 제어권을 가지는 RUM Agent가 기본 채택한 기법이다.

```typescript
apm.init({ transactionSampleRate: 0.2 }); // 20%만 상세 기록
```

다만 샘플링에서 제외된 unsampled 트랜잭션은 완전히 버려지지 않는다.  
이 트랜잭션은 APM 서버에 전송은 되지만 **연관된 Span·context·labels 는 전송 전에 폐기**된다.

| 상태 | duration | result | span | context / labels |
|---|---|---|---|---|
| sampled (20%) | ✓ | ✓ | ✓ | ✓ |
| unsampled (80%) | ✓ | ✓ | ✕ | ✕ |

Head-based Sampling 의 한계는 폐기 처리되는 트랜잭션 선정 기준이 **무작위**라는 점이다.  
이 때문에 속도가 느리거나 에러가 발생한 트랜잭션도 운이 나쁘면 unsampled 에 걸릴 수 있다.

#### Tail-based Sampling

Trace 가 **완료된 이후**에 샘플링 여부를 결정한다.  
평균 소요 시간보다 눈에 띄게 느리거나 도중에 내부 에러를 내뱉은 트랙을 우선적으로 선정하여 보존 처리한다.

다만 Tail-based Sampling 은 APM 서버 측에서 설정하는 방식이며,  
RUM Agent 자체에는 해당 옵션이 없다. 따라서 이는 서버 APM 에서 주로 활용된다.

#### breakdownMetrics — 타입별 타이밍 세분화

트랜잭션이 어떤 종류의 작업 (app, http 등) 에 얼마나 시간을 썼는지 세분화해 분석한다.  
해당 옵션을 활성화하면 payload 크기가 증가하므로 운영 환경에서는 비활성화하는 것을 권장한다.

```typescript
// dev: 상세 분석 필요 → true
// prod: 대역폭 절약 → false
breakdownMetrics: isDevMode
```

---

## Ref.

- [Elastic APM RUM JS Agent 공식 문서](https://www.elastic.co/guide/en/apm/agent/rum-js/current/intro.html)
- [Spans](https://www.elastic.co/docs/solutions/observability/apm/spans)
- [Transactions](https://www.elastic.co/docs/solutions/observability/apm/transactions)
- [Traces](https://www.elastic.co/docs/solutions/observability/apm/traces)
- [Transaction Sampling](https://www.elastic.co/docs/solutions/observability/apm/transaction-sampling)
- [Errors](https://www.elastic.co/docs/solutions/observability/apm/errors)
- [Metadata](https://www.elastic.co/docs/solutions/observability/apm/metadata)
- [Custom Transactions API](https://www.elastic.co/guide/en/apm/agent/rum-js/current/custom-transactions.html)
- [Agent API Reference](https://www.elastic.co/docs/reference/apm/agents/rum-js/agent-api)
