## 기존의 Dynamic Page 렌더링 방식

Next.js에서 데이터 fetch가 필요한 Dynamic Page를 렌더링하면 이런 흐름을 따른다.  

- 사용자의 요청이 들어오면 서버는 **페이지 전체를 Request Time에 렌더링**한다
- 데이터 fetch가 필요한 컴포넌트는 `<Suspense>`로 감싸져 초기에는 fallback이 렌더링된다
- 이후 데이터 fetch가 완료되면 Streaming SSR로 실제 컴포넌트가 순차적으로 전달된다

페이지 내부에 정적인 요소와 동적인 요소가 섞여 있어도 **"페이지 전체를 요청 시점에 렌더링한다"**는 점은 변하지 않는다. 정적으로 고정된 영역조차 매번 다시 렌더링해야 한다는 한계가 있다.  

---

## Partial Pre-rendering

> 페이지 전체를 한 번에 렌더링하지 말고, **미리 확정 가능한 부분은 Build Time에 렌더링하자.**  

PPR은 페이지에 동적인 요소가 포함되어도 역할을 분리한다.  

- **정적인 영역**: Build Time에 사전 렌더링, 요청 시 즉시 전달
- **동적인 영역**: `<Suspense>`로 감싼 컴포넌트, Request Time에 Streaming SSR로 렌더링

사용자에게 가장 먼저 전달되는 HTML은 완성된 전체 페이지가 아니라 **Partial First Page**다.  

- 정적 영역은 이미 HTML로 완성된 상태
- 동적 영역은 fallback + placeholder(`<template>`)만 존재
- 이후 서버에서 데이터가 준비되는 대로 Streaming으로 실제 콘텐츠가 주입됨

---

## Streaming은 어떻게 가능한가

브라우저는 HTML을 위에서부터 순차적으로 파싱한다. 모든 태그가 닫히지 않았다면 "아직 HTML이 끝나지 않았다 → 아직 스트리밍 중이다"라고 인지한다.  

이 메커니즘의 핵심이 **`Transfer-Encoding: chunked`** 헤더다. 서버가 브라우저에게 "응답 전체 크기는 아직 모르겠고, 준비되는 대로 조금씩 보내겠다"고 선언하는 것이다.  

- `Content-Length`는 사용되지 않는다
- 서버는 응답을 끝내지 않은 채 연결을 유지한다
- 브라우저는 **도착하는 chunk 단위로 바로 파싱**한다

이 메커니즘이 없다면 서버는 HTML 전체를 완성한 뒤에야 전송할 수 있어 Streaming SSR 자체가 불가능하다. HTTP/2에서는 기본 요청을 모두 프레임 단위로 전송하기 때문에 이 헤더를 따로 설정할 필요가 없다.  

---

## B / S / P placeholder

PPR이 적용된 HTML에는 낯선 태그들이 등장한다.  

```html
<template id="B:4"></template>  <!-- 동적 영역이 들어갈 자리 -->
```

이것들은 모두 **Placeholder(자리표시자)**다. 서버가 지금 당장 확정적으로 줄 수 없는 영역을 위해 임시로 비워 둔 자리이며, Streaming으로 도착한 데이터와 id 기준으로 치환된다.  

- **B:x (Block)**: 특정 블록이 들어갈 자리. 이후 도착하는 S와 치환됨
- **S:x (Streamed Content)**: 서버에서 Streaming으로 전달된 실제 HTML. B와 1:1 대응
- **P:x (Client Placeholder)**: 클라이언트 컴포넌트가 로드될 위치. JS 모듈 인입 시 치환

정적인 컴포넌트에는 placeholder가 붙지 않는다. **Suspense로 감싸진 비동기 컴포넌트와 Client Component에만 등장**한다.  

---

## 실제 동작 흐름

**1단계 — Partial First Page 전송**  

요청이 들어오면 서버는 정적 HTML이 포함된 첫 번째 chunk를 전송한다. 동적 영역은 Suspense의 fallback과 함께 `<template>` placeholder로 남겨진다.  

**2단계 — Streaming 데이터 도착**  

비동기 데이터 처리가 완료되면 `S:x` 블록 형태의 HTML 조각이 스트리밍으로 도착한다. 이와 함께 `$RS` 같은 치환 함수가 `<script>`에서 실행된다.  

```javascript
// $RS 함수: a 요소의 자식 노드를 b 요소 앞에 삽입하고 둘 다 제거
function $RS(a, b) {
  a = document.getElementById(a);
  b = document.getElementById(b);
  a.parentNode.removeChild(a);
  while (a.firstChild) b.parentNode.insertBefore(a.firstChild, b);
  b.parentNode.removeChild(b);
}
```

**3단계 — 반복**  

스트리밍 대상이 여러 개면 데이터가 준비될 때마다 반복된다. 각 단계는 독립적으로 실행되며 이전 결과에 영향을 주지 않는다.  

**4단계 — Streaming 종료**  

모든 데이터가 전송되면 서버는 `0\r\n`을 보내고 `</html>`까지 닫힌다. 브라우저는 이를 기준으로 스트리밍이 종료됐음을 인지한다. fallback, `<template>`, placeholder 같은 임시 요소는 남지 않으며 순수한 렌더링 결과만 유지된다.  

---

## Streaming SSR vs PPR 차이

**Streaming SSR + Suspense**는 페이지 전체를 **요청 시점(Request Time)**에 렌더링한다. Suspense를 통해 데이터 fetch는 병렬로 처리할 수 있지만, 렌더링 자체는 전부 요청 이후에 시작된다.  

**Partial Pre-rendering**은 페이지를 **Build Time 영역과 Request Time 영역으로 분리**한다. Build Time에 확정 가능한 영역은 미리 렌더링하고, 동적 영역만 요청 시점에 Streaming SSR로 처리한다. 결과적으로 "Partial First Page"가 Build Time에 생성된다.  

사용자 관점에서 변하지 않는 UI가 먼저 빠르게 보이고 동적인 영역이 이후 자연스럽게 채워진다. 전체 소요 시간이 같더라도 첫 화면이 빠르게 보이는 쪽이 더 빠르다고 느껴진다.  
