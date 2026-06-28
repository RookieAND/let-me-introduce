## 들어가며

Next.js App Router를 공부하면서 Partial Pre-rendering을 처음 접했을 때는 개념이 직관적으로 와닿지 않았다.  
HTML 소스를 직접 뒤져보면서 어떻게 동작하는지 파악해갔다.

---

## 기존의 Dynamic Page 렌더링 방식

사용자의 요청에 따라 동적으로 데이터를 fetch 하여 컴포넌트를 구성해야 하는 요소가 포함된 페이지를 **Dynamic Page** 라고 표현한다.

기존 Next.js 에서 Dynamic Page 를 렌더링하는 방식은 다음과 같은 흐름을 가진다.

- 사용자의 요청이 들어오면 서버는 **페이지 전체를 Request Time 에 렌더링**한다.
- 데이터 fetch 가 필요한 컴포넌트는 `<Suspense>` 로 감싸져 있으며, 초기에는 fallback 이 렌더링된다.
- 데이터 fetch 가 완료되면 **Streaming SSR** 을 통해 Suspense 내부의 실제 컴포넌트가 순차적으로 전달된다.

페이지 내부에 정적인 요소와 동적인 요소가 섞여 있더라도 **"페이지 전체를 요청 시점에 렌더링한다"** 는 점은 변하지 않는다.  
데이터 병렬 처리와 점진적 렌더링이라는 장점이 있지만, 정적으로 고정된 영역조차 매번 다시 렌더링해야 한다는 한계가 존재한다.

---

## Partial Pre-rendering

> 페이지 전체를 한 번에 렌더링하지 말고, **미리 확정 가능한 부분은 Build Time 에 렌더링하자.**

Partial Pre-rendering (PPR)은 이 문제를 해결하기 위해 등장한 개념이다.  
페이지에 동적인 요소가 포함되어 있더라도 역할을 분리한다.

- **정적인 영역**: Build Time 에 사전 렌더링, 사용자 요청 시 즉시 이를 전달
- **동적인 영역**: `<Suspense>` 로 감싸진 컴포넌트 내 요소, Request Time 에 Streaming SSR 로 렌더링

사용자에게 가장 먼저 전달되는 HTML 은 "완성된 전체 페이지"가 아니라 **"Partial First Page"** 이다.

이 Partial First Page 는 다음 특징을 가진다.

- 정적 영역은 이미 HTML 로 완성된 상태
- 동적 영역은 fallback + placeholder (`<template>`) 만 존재
- 이후 서버에서 데이터가 준비되는 대로 Streaming 으로 실제 콘텐츠가 주입됨

React Server Component 를 극한까지 활용한 방식이라고 볼 수 있다. (개인 의견이지만)  
클라이언트 컴포넌트가 들어갈 자리 또한 서버 시점에서는 **자리만 확보**해 둔다.

---

## Streaming 은 언제까지 계속될까?

브라우저는 HTML 을 위에서부터 순차적으로 파싱한다.  
이 과정에서 **모든 태그가 닫히지 않았다면**, 브라우저는 다음과 같이 인지한다.

> "아직 HTML 이 끝나지 않았다 → 아직 스트리밍 중이다."

태그를 닫지 않고 방치해둠으로써 브라우저에게 아직 전달해야 할 데이터가 남았음을 알린다.

- HTML 문서가 닫히지 않은 상태 : Streaming ON
- 모든 데이터가 도착하고 `</html>` 까지 닫힘 : Streaming OFF (수도꼭지 잠김)

이것이 Streaming SSR 이 브라우저 레벨에서 동작할 수 있는 전제 조건이다.

브라우저는 HTML 을 "완성된 문서"가 아니라 "끝이 정해진 바이트 스트림"으로 읽는다.  
**`</html>` 이 오지 않았다는 사실 자체가 "아직 데이터가 더 온다"는 신호**가 된다.

---

## Streaming 은 어떻게 가능한가?

여기서 중요한 전제가 하나 있다.

> 브라우저는 왜 "아직 HTML 이 끝나지 않았다"는 걸 알 수 있을까?

그 답이 바로 **`Transfer-Encoding: chunked`** 다.

`Transfer-Encoding` 은 HTTP 응답 방식을 선언하는 헤더다.  
값을 `chunked` 로 설정했다면 **HTTP 응답 바디를 한 번에 다 보내지 않고, 여러 조각으로 나눠서 전송하겠다는 선언**이다.

서버는 브라우저에게 이렇게 말하는 셈이다.

> "응답 전체 크기는 아직 모르겠고, 준비되는 대로 조금씩 보내겠다."

이 헤더가 붙는 순간부터 아래가 달라진다.

- `Content-Length` 는 사용되지 않는다
- 서버는 응답을 끝내지 않은 채 연결을 유지한다
- 브라우저는 **도착하는 chunk 단위로 바로 파싱**한다

이 메커니즘이 없다면 서버는 HTML 전체를 완성한 뒤에야 데이터를 전송할 수 있어 Streaming SSR 자체가 불가능하다.  
Streaming SSR 과 Partial Pre-rendering 은 모두 `chunked` 모드에서만 성립한다.

HTTP/2 에서는 기본 요청을 모두 프레임 단위로 전송하기에 이 헤더는 더 이상 사용되지 않는다. 기본 값이 스트리밍이다.

---

## 브라우저는 Streaming 상태를 어떻게 인지할까?

브라우저는 HTML 을 위에서부터 순차적으로 읽는다.  
모든 태그가 닫히지 않았거나 네트워크 스트림이 아직 종료되지 않았다면, 렌더링이 종료되지 않았다고 판단한다.

브라우저가 점진적인 DOM 구축을 완료하는 흐름은 아래와 같다.

1. 도착한 HTML chunk 를 즉시 파싱
2. DOM 을 점진적으로 구성
3. `<script>` 가 도착하면 즉시 실행
4. 이후 도착한 chunk 로 DOM 을 계속 수정

모든 데이터가 전송되고 `</html>` 까지 닫히는 순간에야 Streaming 은 종료된다.

---

## 그럼 이 이상한 태그들은 뭐지?

Partial Pre-rendering 이 적용된 HTML 을 보면 처음에는 굉장히 낯선 태그들이 등장한다.

`<template>` 태그를 기준으로 id 에 `B:4` 라는 값이 적용된 모습이 보인다. 자식 요소는 비어 있다.

이것들은 모두 **Placeholder(자리표시자)** 다.  
서버가 **지금 당장 확정적으로 줄 수 없는 영역**을 위해 임시로 비워 둔 자리이며, 이후 Streaming 으로 도착한 데이터와 **id 기준으로 치환**된다.

콜론 (`:`) 을 기준으로 앞의 알파벳은 B, S, P 로 이루어지며 뒤에는 정수가 붙는다.

---

## B / S / P 의 의미

- **B:x (Block)**: 특정 블록이 들어갈 자리. 이후 도착하는 S 와 치환됨
- **S:x (Streamed Content)**: 서버에서 Streaming 으로 전달된 실제 HTML. B 와 1:1 대응
- **P:x (Client Placeholder)**: S 내부에서 클라이언트 컴포넌트가 로드될 위치. JS 모듈 인입 시 치환

정적인 컴포넌트에는 이런 placeholder 가 붙지 않는다.  
**Suspense 로 감싸진 비동기 컴포넌트와 Client Component 에만 등장**한다.

---

## 실제 동작 흐름

**1단계 — Partial First Page 전송**

사용자의 요청이 들어오면 서버는 가장 먼저 **Partial First Page**를 전송한다.  
이때 전달되는 HTML 은 하나의 완성된 페이지가 아니라, 첫 번째 chunk 에 해당하는 응답이다.  
서버에서 미리 확정 가능한 **정적 HTML** 이 포함되어 있고,  
동적으로 렌더링되어야 하는 영역은 `<Suspense>` 의 **fallback** 과 함께 `<template>` 형태의 **placeholder** 로 남겨진다.

이 시점의 DOM 은 아직 완성되지 않은 상태이며, 동적 영역에 대해서는 "여기에 무언가 들어올 예정이다"라는 자리만 확보된 상태다.

**2단계 — Streaming 데이터 도착**

이후 서버에서 비동기 데이터 처리가 완료되면, 해당 결과가 **S:x 블록 형태의 HTML 조각**으로 스트리밍되어 도착한다.  
이 데이터와 함께 `$RS` 또는 `$RC` 와 같은 **치환 함수**가 `<script>` 에서 실행된다.

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

이 함수는 기존에 자리만 차지하고 있던 `B:x` 위치에 `S:x` 블록을 삽입하고,  
fallback 으로 렌더링되어 있던 요소와 사용이 끝난 `<template>` 를 함께 정리한다.  
S 블록 내부에 포함된 클라이언트 컴포넌트 위치(`P:x`) 또한 동일한 방식으로 치환된다.

**3단계 — 앞선 과정의 반복**

페이지 내에 스트리밍 대상이 여러 개 존재하는 경우, 이 과정은 데이터가 준비될 때마다 반복된다.  
각 스트리밍 단계는 이전 결과에 영향을 주지 않고 독립적으로 실행되어 DOM 을 완성시켜 나간다.

**4단계 — Streaming 종료**

모든 스트리밍 대상 데이터가 전송되면, 서버는 더 이상 보낼 chunk 가 없음을 의미하는 `0\r\n` 을 전송한다.  
HTML 문서는 `</html>` 태그까지 모두 닫히고, 브라우저는 **스트리밍이 종료되었음**을 인지한다.  
DOM 에는 fallback, `<template>`, placeholder 와 같은 임시 요소는 남지 않으며, **순수한 렌더링 결과만** 유지된다.

---

## Streaming SSR vs PPR 차이

**Streaming SSR + Suspense** 는 페이지 전체를 **요청 시점(Request Time)** 에 렌더링한다.  
Suspense 를 통해 데이터 fetch 는 병렬로 처리할 수 있지만, 렌더링 자체는 전부 요청 이후에 시작된다.  
데이터가 준비되는 대로 스트리밍을 통해 부분적으로 화면이 교체되는 방식이다.

**Partial Pre-rendering** 은 페이지를 **Build Time 렌더링 영역과 Request Time 렌더링 영역으로 분리**한다.  
Build Time 에 확정 가능한 영역은 미리 렌더링하고, 동적 영역만 요청 시점에 Streaming SSR 로 처리한다.  
그 결과, **"Partial First Page"** 가 Build Time 에 생성된다.

페이지 전체를 요청 시점에 렌더링할 필요도 없고, 전체를 정적으로 빌드할 필요도 없는 **중간 지점의 전략**이다.

사용자 관점에서는 변하지 않는 UI 가 먼저 빠르게 보이고 동적인 영역이 이후 자연스럽게 채워진다.  
전체 소요 시간이 같더라도, **첫 화면이 빠르게 보이는 쪽이 더 빠르다고 느껴진다.**  
미리 빌드 해둔 영역이 많으면 많을수록 체감이 더욱 커질 것이라 생각한다.

---

## Conclusion

Streaming SSR 과 Partial Pre-rendering 은 HTML 을 "한 번에 완성하는 문서"가 아니라  
**점진적으로 완성되는 스트림**으로 다루는 방식이라고 이해할 수 있다. (마치 큰 파일을 스트림으로 보내는 것처럼)

FCP 및 FPP 같이 initial rendering 과 연관 있는 웹 바이탈 지표 향상과 함께,  
빌드 타임에 페이지 일부가 사전 렌더링되어 동적으로 렌더링하는 비용이 감소할 것이라는 예상이다.

데이터를 동적으로 불러와서 보여주는 구조의 페이지에서도, 기존에는 정적 요소들이 Runtime 에 매번 렌더링 되었으나 이제는 그럴 필요가 없어진다.  
이전과 이후 요청에 대해 데이터의 변화가 없다면 (캐싱된 데이터를 그대로 사용할 수 있다면) 사용자는 기존보다 더 빠르게 렌더링 된 페이지를 볼 수 있다.

---

### Ref.

- [next.js app router, 서버 컴포넌트 작동원리를 아주 기초부터 들어갑니다.](https://blog.kmong.com/react-server-component%EB%A1%9C-%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-%EA%B0%9C%EB%B0%9C-%ED%98%81%EC%8B%A0%ED%95%98%EA%B8%B0-part-2-5cf0bf4416b0)
