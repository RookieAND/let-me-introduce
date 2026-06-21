## Code Splitting에서 중요하게 바라본 관점

Code Splitting을 평가할 때 흔히 **"총 번들 크기를 줄이는 것"**이 목표라고 생각하기 쉽다. 하지만 이 작업의 핵심 기준은 달랐다.  

- **초기 로드 크기(InitJS)** 최소화를 최우선으로 삼는다. lazy chunk는 실제 라우트 방문 시에만 fetch되므로 초기 비용이 아니다
- **HTTP 요청 수**를 함께 고려한다. HTTP/2 환경에서도 각 요청마다 헤더 오버헤드와 스케줄링 비용이 존재한다
- **총 번들 크기(TotalJS)**는 재방문/캐시 히트 이후의 비용이므로 우선순위를 낮게 둔다

---

## 기존 문제 (Baseline: maxSize 500KB, minSize 없음)

세 가지 구조적 문제가 있었다.  

**vendor-vapor 과잉 분할** (12개 청크, 628KB). `maxSize: 500KB` 설정으로 628KB인 vapor가 반복적으로 쪼개졌다. 결과적으로 4~8KB짜리 tiny chunk가 다수 생성되어 HTTP 요청 수만 증가했다.  

**vendor-editor 과잉 분할** (5개 청크, 333KB). tiptap/prosemirror가 불필요하게 분산됐다.  

**tiny chunk 43개 (≤10KB)**. minSize 미설정으로 라우트 단위 page chunk들이 1~3KB 수준으로 생성됐다. HTTP 헤더 오버헤드(수백 바이트)가 chunk 크기보다 큰 경우도 발생했다.  

초기 로드 시 JS 요청 수: **21개**  

---

## Score 산정 기준

```javascript
Score = InitJS(KB) + JS requests × 5
```

요청 1개를 5KB 다운로드와 동등하게 취급했다. HTTP/2를 쓰더라도 요청 1개당 실질 비용은 0이 아니다. HPACK 압축 이후에도 HEADERS 프레임 자체가 50~200 bytes 정도 존재하고, 브라우저의 resource scheduler 오버헤드가 누적된다.  

TotalJS는 Score에 포함하지 않는다. lazy chunk는 초기 로드 비용이 아니기 때문이다.  

---

## 시나리오별 실측 결과

7가지 시나리오를 Playwright로 실제 빌드 + 네트워크 측정을 비교했다.  

- **min 30 + max 800 KB**: 초기 JS 1,234KB / 요청 14개 / **Score 1,304** ← 최적
- min 50 + max 500 KB: 초기 JS 1,235KB / 요청 16개 / Score 1,315
- min 30 + max 500 KB: 초기 JS 1,236KB / 요청 17개 / Score 1,321
- max 800 KB only: 초기 JS 1,232KB / 요청 18개 / Score 1,322
- Baseline (max 500): 초기 JS 1,234KB / 요청 21개 / Score 1,339
- **min 50, no maxSize**: 초기 JS **1,871KB** / 요청 27개 / **Score 2,006** ← 최악

---

## maxSize를 없애면 왜 최악인가

```
no maxSize → vendor-vapor가 단일 623KB 청크로 합쳐짐
           → entry chunk의 modulepreload manifest에 통째로 포함됨
           → 첫 페이지 진입 시 623KB 전부 즉시 fetch됨
```

Vite는 entry chunk에 **modulepreload manifest**를 포함시킨다. 브라우저가 페이지 진입 시 manifest에 등록된 청크를 미리 fetch한다. `maxSize`가 없으면 `vendor-vapor`가 단일 623KB 청크가 되어 preload 목록에 통째로 포함된다. 첫 페이지에서 vapor의 일부만 필요해도 623KB 전부를 즉시 받아야 한다.  

`maxSize: 800KB`로 5개로 나누면 첫 페이지에 필요한 일부 청크만 preload 목록에 포함된다. 총 번들 크기는 약간 더 크지만, 초기 로드는 크게 줄어든다.  

---

## modulepreload manifest 동작 원리

Vite가 빌드 시 entry chunk에 자동으로 삽입하는 **청크 의존성 맵**이다. dynamic import 실행 전에 필요한 청크들을 미리 병렬로 fetch하게 만든다.  

```javascript
const __vite__mapDeps = (i, m = __vite__mapDeps, d = (m.f || (m.f = [
  "assets/vendor-react-U38zKVGV.js",  // 인덱스 1
  "assets/vendor-vapor-CV0FskJ2.js",  // 인덱스 2
  // ...
]))) => i.map(i => d[i]);
```

배열 전체는 빌드 타임에 정적으로 결정된다. 브라우저가 entry chunk를 로드하면 `__vite__mapDeps` 배열 전체가 메모리에 올라온다. App 컴포넌트가 lazy import를 만날 때마다 `__vite__preload`가 의존 청크들을 modulepreload로 삽입하고, 브라우저가 병렬로 미리 fetch한다.  

---

## Vendor 분할 전략

vendor chunk를 분리하면 앱 코드는 매 배포마다 변경되지만, `node_modules` 라이브러리는 버전이 올라갈 때만 변경된다. 재방문 사용자는 이미 캐시된 vendor chunk를 받지 않아 실질적인 JS 다운로드 비용이 줄어든다.  

그룹핑 기준은 두 가지다. **변경 주기가 같은 것끼리** — `react + react-dom + scheduler`는 항상 함께 업그레이드된다. **특정 기능 도메인에만 쓰이는 것끼리** — `tiptap/prosemirror`는 에디터 페이지에서만 로드되어야 한다.  

- `vendor-react`: react, react-dom, scheduler
- `vendor-editor`: @tiptap/*, prosemirror-* (에디터 전용, lazy 로드)
- `vendor-vapor`: @vapor-ui/*, @goorm-dev/* (디자인 시스템)
- `vendor-query`: @tanstack/* (서버 상태 관리)
- `vendor-router`: react-router, @remix-run
- `vendor-others`: 나머지 node_modules (fallback)

하나의 모듈이 여러 그룹의 패턴에 동시 매칭될 경우 `priority` 값이 높은 그룹이 이긴다. 구체적인 패턴일수록 높은 priority를 부여하고, `vendor-others`는 가장 낮은 값으로 최종 fallback 역할을 맡는다.  

---

## 최적 설정

```typescript
// vite.config.ts
codeSplitting: {
  minSize: 30 * 1024,  // tiny chunk 병합 → 요청 수 21 → 14
  maxSize: 800 * 1024, // 적당한 분할 유지 → on-demand preload 가능
  groups: [...]
}
```

- `minSize: 30KB`: 4~8KB짜리 tiny chunk들이 인접 chunk와 병합되어 요청 수가 줄어든다
- `maxSize: 800KB`: vapor를 12개 → 5개로 줄이되, 단일 덩어리가 되는 것을 방지한다

총 번들 크기(disk 위의 파일 크기)와 초기 로드 크기(브라우저가 실제로 받는 크기)는 다른 지표다.  

`maxSize`를 제거하면 전자는 줄지만 후자는 악화된다.  

`minSize: 30 + maxSize: 800` 조합이 HTTP 요청 수 감소와 on-demand preload 효율을 함께 달성하는 최적점이다.  
