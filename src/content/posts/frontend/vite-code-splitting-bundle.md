## 배포 후에도 뭔가 찜찜했다

블로그를 배포하고 나서 빌드 결과물을 살펴봤을 때 청크 파일이 유독 많다는 게 눈에 걸렸다.  
4KB짜리 파일이 수십 개씩 나열되어 있는 걸 보면서 "이게 맞나?" 싶었다.

초기에 Code Splitting을 설정했으니 번들이 잘 나뉜 것처럼 보였지만, 정작 어떤 기준으로 나뉘었는지, 이게 실제로 성능에 좋은 건지는 확신이 없었다.  
수정 자체는 간단했지만 이대로 넘어가자니 찜찜한 기분이 들어서 처음부터 이를 다시 짚어봤다.

---

## Code Splitting에서 뭘 기준으로 봐야 하나

Code Splitting을 평가할 때 흔히 **"총 번들 크기를 줄이는 것"**이 목표라고 생각하기 쉽다.  
그런데 이 작업의 핵심 기준은 달랐다. (이건 나도 몰랐던 사실이다..)

- **초기 로드 크기(InitJS)**: 브라우저가 첫 페이지 진입 시 실제로 받아야 하는 JS 양. lazy chunk는 라우트 방문 시에만 fetch되므로 초기 비용에 포함되지 않는다.
- **HTTP 요청 수**: 청크 개수만큼 요청이 늘어난다. HTTP/2 환경이라도 요청 1개당 비용이 0은 아니다.
- **총 번들 크기(TotalJS)**: 재방문/캐시 히트 이후의 비용이므로 우선순위를 낮게 둔다.

따라서 빌드 효율성을 측정하는 Score 기준은 아래와 같이 잡았다.

```javascript
Score = InitJS(KB) + JS requests × 5
```

수식을 보면 알겠지만 HTTP Request 1개를 5KB 다운로드와 동등하게 취급했다.  
HTTP/2를 쓰더라도 HPACK 압축 이후에도 HEADERS 프레임 자체가 50~200 bytes 정도 존재하고, 브라우저의 resource scheduler 오버헤드가 누적된다.  
다만 위에서 설명한 TotalJS는 Score에 포함하지 않는다. lazy chunk는 초기 로드 비용이 아니기 때문이다.

---

## 청크가 자동으로 나뉘는 원리

일반적으로 Code Splitting은 두 가지 방식으로 이루어진다. 먼저 자동으로 이루어지는 부분부터 짚고 가자.

Rolldown(Vite 6의 번들러)은 정적 분석을 통해 모듈 그래프를 그리고, 그 결과에 따라 청크를 자동으로 나눈다.

청크 유형은 크게 두 가지다.

**Entry Chunk** — 정적 `import`로 연결된 모듈들을 하나로 묶은 청크다.  
"정적 연결"이란 `import` 구문이나 `require()` 호출처럼, 빌드 타임에 의존성이 확정되는 연결을 말한다.  

Entry Chunk는 다시 아래에서 서술한 두 가지 청크 기준으로 나뉜다.

- **Initial Chunk**: 여러 input 파일을 설정했을 때, 각 input에서 시작하는 정적 의존성 트리가 하나의 청크가 된다.
- **Dynamic Chunk**: `import()` 같은 dynamic import에서 비롯된 청크다. 실제로 해당 경로에 진입할 때만 fetch된다.

**Common Chunk** — 두 개 이상의 entry에서 공통으로 정적 import하는 모듈이 있으면, 그 모듈을 별도 청크로 분리한다.  
같은 코드가 여러 번들에 중복 포함되는 것을 막기 위해서다. 어떤 entry 조합이 공유하느냐에 따라 common chunk가 여러 개로 나뉠 수 있다.

그런데 번들러에서 제시한 자동 분리만으로는 코드 분리 전략이 충분치 않기에, 여기서 본격적으로 우리가 해결하고자 하는 문제가 시작된다.

---

## 청크를 너무 잘게 쪼개면 왜 문제인가

`minSize` 설정 없이 자동 분리에 맡겨두면, 작은 모듈 하나하나가 모두 별도 청크로 떨어진다.  
정말 사소한 사이즈라고도 볼 수 있는데 예를 들어 4KB, 1KB, 심지어 800 byte짜리 청크가 수십 개 만들어지는 것이다.

이게 왜 문제인지는 HTTP 요청 흐름을 보면 명확해진다.

대부분 HTTP/2 환경이라면 요청에 대한 부담이 크게 적어진다고 생각하지만 아쉽게도 HTTP/2 또한 요청 1개당 비용이 0이 아니다.  
왜냐하면 HPACK 압축 이후에도 HEADERS 프레임은 50~200 bytes 정도 남기 때문이다.  
청크 크기가 1KB라면 헤더 오버헤드가 청크 크기의 10~20%를 차지하는 셈이다.

브라우저의 resource scheduler는 병렬 요청을 관리하는 데도 CPU 사이클을 쓰기 때문에, 청크가 40개를 넘어가면 스케줄링 비용이 실질적으로 체감된다.  
JS 엔진 또한 마찬가지다. 청크 파일 하나하나가 별도 모듈로 파싱·평가되고, 모듈 그래프 연결에도 런타임 오버헤드가 붙는다.

작은 청크를 100개 받는 것보다 적당히 묶인 청크 10개를 받는 편이 실제로 빠를 수 있다.

---

## Baseline: maxSize 500KB, minSize 없음

자, 이제 처음 프로젝트의 빌드 상태를 기록해두자.

기존 상태에서는 크게 세 가지 구조적 문제가 있었다.

**vendor-vapor 과잉 분할** (12개 청크, 628KB).  
`maxSize: 500KB` 설정으로 628KB인 vapor가 반복적으로 쪼개졌다.  
결과적으로 4~8KB짜리 tiny chunk가 다수 생성되어 HTTP 요청 수만 증가했다.

**vendor-editor 과잉 분할** (5개 청크, 333KB).  
tiptap/prosemirror가 불필요하게 분산됐다.

**tiny chunk 43개 (≤10KB)**.  
minSize 미설정으로 라우트 단위 page chunk들이 1~3KB 수준으로 생성됐다.  
HTTP 헤더 오버헤드(수백 바이트)가 chunk 크기보다 큰 경우도 발생했다.

초기 로드 시 JS 요청 수: **21개**

---

## modulepreload manifest가 초기 로드 크기를 결정한다

여기서 한 가지 더 짚고 넘어가야 할 게 있다.  
`maxSize`를 없애면 총 번들 크기는 오히려 줄어드는 것처럼 보인다.  
그런데 왜 초기 로드 크기(InitJS)가 오히려 올라가는 걸까?

비밀은 Vite가 entry chunk에 자동으로 삽입하는 **modulepreload manifest**에 있다.

```javascript
const __vite__mapDeps = (i, m = __vite__mapDeps, d = (m.f || (m.f = [
  "assets/vendor-react-U38zKVGV.js",
  "assets/vendor-vapor-CV0FskJ2.js",
  // ...
]))) => i.map(i => d[i]);
```

배열 전체는 빌드 타임에 정적으로 결정된다.  
브라우저가 entry chunk를 로드하면 `__vite__mapDeps` 배열 전체가 메모리에 올라온다.  
App 컴포넌트가 lazy import를 만날 때마다 `__vite__preload`가 의존 청크들을 modulepreload로 삽입하고, 브라우저가 병렬로 미리 fetch한다.

```
no maxSize → vendor-vapor가 단일 623KB 청크로 합쳐짐
           → entry chunk의 modulepreload manifest에 통째로 포함됨
           → 첫 페이지 진입 시 623KB 전부 즉시 fetch됨
```

`maxSize: 800KB`로 5개로 나누면 첫 페이지에 필요한 일부 청크만 preload 목록에 포함된다.  
총 번들 크기는 약간 더 크지만, 초기 로드는 크게 줄어든다.

---

## 수동 청크 분리가 필요한 이유: cache invalidation

자동 분리만으로는 cache invalidation 문제를 해결할 수 없다.

앱 코드는 매 배포마다 변경되지만, `node_modules` 라이브러리는 버전이 올라갈 때만 변경된다.  
이 둘을 같은 청크에 묶어두면, 앱 코드 한 줄을 수정해도 수백 KB짜리 vendor 코드가 포함된 청크 전체의 해시가 바뀐다.  
재방문 사용자는 캐시된 vendor 청크를 쓸 수 없게 된다.

수동 분리로 vendor chunk를 별도로 만들어두면, 버전이 올라가지 않는 한 해시가 변경되지 않는다.  
재방문 사용자는 이미 캐시된 vendor chunk를 그대로 쓰고, 실질적인 JS 다운로드 비용이 줄어든다.

그리고 대형 라이브러리를 여러 청크로 쪼개면 브라우저가 병렬로 받을 수 있다는 이점도 있다.  
React, vapor, editor 라이브러리가 각각 별도 청크로 분리되면, 첫 진입 시 세 파일이 동시에 다운로드된다.

---

## Rolldown으로 넘어오면서 설정 방식이 달라졌다

Vite 6부터 번들러가 Rollup에서 Rolldown으로 전환됐다.  
Code Splitting 설정 방식도 달라졌는데, 기존 Rollup 방식과 비교하면 차이가 명확하다.

**기존 Rollup 방식** (Vite 5 이하)

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('@tiptap') || id.includes('prosemirror')) return 'vendor-editor';
          }
        }
      }
    }
  }
})
```

`manualChunks`는 함수로 모듈 ID를 받아 청크 이름을 반환하는 방식이었다.  
단순하지만, `minSize`/`maxSize` 같은 크기 제어나 `priority` 우선순위를 직접 다루기 어려웠다.  
따라서 여러 패턴이 겹칠 때 어떤 그룹이 이길지 명시적으로 선언할 방법도 없었다.

**Rolldown 방식** (Vite 6+)

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
          minSize: 30 * 1024,
          maxSize: 800 * 1024,
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|scheduler)/,
              priority: 20,
            },
            // ...
          ]
        }
      }
    }
  }
})
```

`codeSplitting.groups`는 배열로 선언하며, 각 그룹에 `test`(매칭 패턴), `name`(청크 이름), `priority`(우선순위), `minSize`/`maxSize`(크기 제어)를 함께 지정한다.  
하나의 모듈이 여러 그룹의 패턴에 동시 매칭될 경우 `priority` 값이 높은 그룹이 이긴다.  
구체적인 패턴일수록 높은 priority를 부여하고, `vendor-others`는 가장 낮은 값으로 최종 fallback 역할을 맡는다.

그리고 이 옵션을 사용할 때 한 가지 알아두어야 할 점이 있다.  
바로 `groups`를 설정하면 Rolldown은 강제로 `runtime.js`를 생성한다는 점이다.  
이는 수동으로 나뉜 청크들 사이의 circular import 문제를 런타임에서 해결하기 위해 런타임 헬퍼가 필요하기 때문이다.

추가로 경로 구분자 패턴도 신경 써야 한다.  
`/node_modules/react/`처럼 `/`만 쓰면 Windows 환경에서 매칭이 실패한다. 그렇기에 반드시 `[\\/]`를 써야 `/`와 `\` 둘 다 커버된다.

---

## Vendor 분할 전략

vendor chunk를 분리하면 앱 코드는 매 배포마다 변경되지만, `node_modules` 라이브러리는 버전이 올라갈 때만 변경된다.  
따라서 대부분의 재방문 사용자는 이미 캐시된 vendor chunk를 받지 않아 실질적인 JS 다운로드 비용이 줄어든다.  

vender 그룹핑 기준은 크게 두 가지로 나눴다.

**변경 주기가 같은 것끼리** — `react + react-dom + scheduler`는 항상 함께 업그레이드된다.  
이 세 패키지를 하나의 청크로 묶으면 버전 업 시 해시가 하나만 바뀐다.

**특정 기능 도메인에만 쓰이는 것끼리** — `tiptap/prosemirror`는 에디터 페이지에서만 로드되어야 한다.  
이를 별도 청크로 분리하면, 에디터 페이지에 진입하지 않는 사용자는 이 코드를 전혀 받지 않는다.

- `vendor-react`: react, react-dom, scheduler
- `vendor-editor`: @tiptap/*, prosemirror-* (에디터 전용, lazy 로드)
- `vendor-vapor`: @vapor-ui/*, @goorm-dev/* (디자인 시스템)
- `vendor-query`: @tanstack/* (서버 상태 관리)
- `vendor-router`: react-router, @remix-run
- `vendor-others`: 나머지 node_modules (fallback)

---

## 7가지 시나리오 실측 결과

이제 Playwright 로 실제 빌드 및 네트워크 측정을 각각 진행하여 데이터를 비교했다.

- **min 30 + max 800 KB**: 초기 JS 1,234KB / 요청 14개 / **Score 1,304** ← 최적
- min 50 + max 500 KB: 초기 JS 1,235KB / 요청 16개 / Score 1,315
- min 30 + max 500 KB: 초기 JS 1,236KB / 요청 17개 / Score 1,321
- max 800 KB only: 초기 JS 1,232KB / 요청 18개 / Score 1,322
- Baseline (max 500): 초기 JS 1,234KB / 요청 21개 / Score 1,339
- **min 50, no maxSize**: 초기 JS **1,871KB** / 요청 27개 / **Score 2,006** ← 최악

`no maxSize` 시나리오가 왜 최악인지는 위에서 설명한 modulepreload manifest 동작 때문이다.  
vendor-vapor가 단일 623KB 청크로 합쳐지고, 첫 페이지에서 vapor의 일부만 필요해도 623KB 전부를 즉시 받아야 한다.

---

## 최적 설정: minSize 30 + maxSize 800

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
          minSize: 30 * 1024,  // tiny chunk 병합 → 요청 수 21 → 14
          maxSize: 800 * 1024, // 적당한 분할 유지 → on-demand preload 가능
          groups: [...],
        }
      }
    }
  }
})
```

- `minSize: 30KB`: 4~8KB짜리 tiny chunk들이 인접 chunk와 병합되어 요청 수가 줄어든다
- `maxSize: 800KB`: vapor를 12개 → 5개로 줄이되, 단일 덩어리가 되는 것을 방지한다

총 번들 크기(disk 위의 파일 크기)와 초기 로드 크기(브라우저가 실제로 받는 크기)는 다른 지표다.  
`maxSize`를 제거하면 전자는 줄지만 후자는 악화된다.

`minSize: 30 + maxSize: 800` 조합이 HTTP 요청 수 감소와 on-demand preload 효율을 함께 달성하는 최적점이다.

---

## 마치며

사실 처음엔 Code Splitting을 "번들을 쪼개서 총 크기를 줄이는 것"으로만 이해했다.  
그래서 `minSize` 없이 `maxSize`만 걸어두면 작은 청크들이 많이 생겨도 괜찮다고 생각했다.

파고들어보니 그 전제가 틀렸다.  
청크 개수 자체가 비용이고, modulepreload manifest를 통해 작은 청크 여러 개가 초기 로드에 모두 포함될 수 있다.  
"잘게 쪼갰으니 필요한 것만 받겠지"는 자동으로 보장되지 않는다.

Rolldown으로 넘어오면서 `manualChunks` 대신 `codeSplitting.groups`를 쓰게 된 것도 처음에는 그냥 API가 바뀐 정도로 이해했는데, `priority`와 `minSize`/`maxSize`를 그룹별로 선언할 수 있게 된 변화가 생각보다 편하다.  
번들 최적화는 여전히 어렵다.
