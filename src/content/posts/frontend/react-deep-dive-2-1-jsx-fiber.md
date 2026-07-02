## JSX는 JavaScript가 아니다

JSX를 쓰면서 그냥 HTML 같은 문법이라고 생각했다.
틀리지는 않지만, 정확히는 Meta가 만든 **JavaScript 문법 확장**이다.
ECMAScript 표준도, V8 엔진의 기능도 아니다.
그래서 Babel 같은 트랜스파일러 없이는 실행이 안 된다.

---

## JSX의 4가지 구성 요소

JSX는 네 가지 요소로 이루어진다.

**JSXElement**: `<div>`, `<Component />`, `<>...</>` 형태의 기본 단위
**JSXAttributes**: 요소에 부여하는 속성. key-value 쌍 또는 Spread 방식
**JSXChildren**: 0개 이상의 자식 요소
**JSXString**: HTML에서 사용하는 문자열. `{`, `}`, `<`, `>`는 별도 처리 필요

`JSXMemberExpression`을 쓰면 `.`으로 연결된 컴포넌트도 사용할 수 있다.

```jsx
// JSXMemberExpression
<Layout.Navbar.Item>메뉴</Layout.Navbar.Item>
```

---

## Babel이 JSX를 변환하는 방식

JSX는 빌드 시점에 `React.createElement` 호출로 변환된다.
React 17 이전과 이후의 변환 결과가 다르다.

```jsx
const Component = (
  <A option="a" key="b">
    Hello World
  </A>
);

// React 17 이전
var Component = React.createElement(
  A,
  { option: "a", key: "b" },
  "Hello World"
);

// React 17 이후
import { jsx as _jsx } from "react/jsx-runtime";

var Component = _jsx(
  A,
  {
    option: "a",
    children: "Hello World",
  },
  { key: "b" }
);
```

변경된 점이 세 가지다.

- Children이 가변 인자에서 props로 들어간다
- key가 props에서 분리돼 별도 인자로 전달된다
- `react/jsx-runtime`이 자동으로 import되어 명시적 `import React`가 불필요해진다

---

## Virtual DOM이 필요한 이유

DOM 조작은 비싸다.
특정 요소를 변경하면 Reflow가 발생하고, Reflow는 Repaint를 유발한다.
SPA처럼 화면에서 여러 요소를 빈번하게 변경하면 이 비용이 쌓인다.

React는 `react-dom`이 메모리에 Virtual DOM 트리를 유지하고,
변경 사항을 VDOM에 먼저 반영한 뒤 실제 DOM을 한 번에 업데이트하는 방식으로 이를 완화한다.

단, VDOM이 일반 DOM보다 항상 빠른 것은 아니다.
추가 레이어가 있는 만큼 단순한 정적 페이지에서는 오히려 느릴 수 있다.

---

## Reconciliation — 두 트리를 비교하는 방법

리렌더링 시 기존 VDOM 트리와 새 VDOM 트리를 비교하는 과정이 **재조정**이다.

이론상 두 트리 비교는 O(n³)이 필요하지만, React는 두 가지 가정으로 O(n)으로 낮췄다.

1. Element 타입이 다르면 서로 다른 트리로 간주한다
2. `key`가 다르면 서로 다른 트리로 간주한다

key를 인덱스로 쓰면 안 되는 이유가 여기에 있다.
리스트 순서가 바뀌면 key도 바뀌어서 React가 기존 요소를 재사용하지 못한다.

---

## React Fiber가 등장한 이유

기존 Stack Reconciler는 작업을 하나의 큰 동기 작업으로 묶어 처리했다.

- 작업을 도중에 취소할 수 없다
- 우선순위를 변경할 수 없다
- 작업이 오래 걸리면 브라우저 렌더링도 함께 막힌다

Input에 타이핑할 때 검색 목록 로딩이 겹치면 타이핑이 버벅이던 현상이 이 때문이었다.

React 16에서 Fiber 아키텍처로 전환하면서 이 문제를 해결했다.

---

## React Fiber 구조

Fiber는 각 컴포넌트를 나타내는 작업 단위다.

```javascript
function FiberNode(tag, pendingProps, key, mode) {
  this.tag = tag;           // Fiber 종류
  this.key = key;           // React key
  this.stateNode = null;    // 실제 DOM 노드 또는 컴포넌트 인스턴스

  this.return = null;       // 부모 Fiber
  this.child = null;        // 첫 번째 자식
  this.sibling = null;      // 다음 형제

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null; // Hook 리스트

  this.alternate = null;    // 반대편 트리 포인터
}
```

`return`, `child`, `sibling` 포인터로 트리를 순회한다.
`alternate`는 더블 버퍼링을 위한 반대편 트리를 가리킨다.

---

## 더블 버퍼링: current와 workInProgress

Fiber는 두 개의 트리를 유지한다.

- **current**: 현재 화면에 렌더링된 트리
- **workInProgress**: 변경 작업 중인 트리

작업이 완료되면 포인터를 교체해 workInProgress가 current가 된다.
이 덕분에 작업 중 오류가 생겨도 current 트리는 유효한 상태를 유지한다.

Fiber Reconciliation은 전부 비동기로 동작한다.
각 작업에 우선순위를 매겨 일시 정지·재가동·우선 처리가 가능해졌다.
이를 **incremental rendering(증분 렌더링)**이라고 부른다.
