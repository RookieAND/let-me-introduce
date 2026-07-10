## 들어가며

어느 날 `useEffect` 안에서 DOM 의 크기를 읽어야 하는 상황이 생겼다.
`useRef` 로 대상 요소를 붙잡고 `ref.current.getBoundingClientRect()` 를 실행하면 끝날 문제라고 생각했다.

그런데 `ref.current` 는 `null` 이었다.

의존성 배열을 빈 배열로 두면 마운트 시점에 실행되니까 당연히 DOM 이 붙어있을 거라 생각했는데, 막상 꺼내보면 `null` 이 나왔다.
그래서 `[ref.current]` 를 의존성 배열에 넣어봤다.
ref 가 바뀌면 이펙트가 다시 실행될 테니 이번엔 되겠지 싶었다.

아무 일도 일어나지 않았다.

> `useEffect` 와 `ref.current` 의 조합이 왜 타이밍 문제를 일으키는가?

그 원인을 파고들다 보니 React 가 화면을 그리는 내부 파이프라인, Render Phase 와 Commit Phase 의 차이까지 닿게 됐다.
이 글은 그 탐구의 기록이다.

---

## React 가 화면을 그리는 두 단계: Render 와 Commit

React 는 상태가 바뀌면 화면을 업데이트하기까지 내부적으로 두 단계를 거친다.

첫 번째는 **Render Phase** 다.
컴포넌트 함수를 다시 실행해 새로운 JSX 트리를 만들고, 이전 트리와 비교해 어디가 바뀌었는지를 계산하는 단계다.
이 단계에서 `useEffect` 의 의존성 배열을 검사한다.
"이전 값과 지금 값이 같은가?" 를 `Object.is` 로 비교해, 다르면 이펙트를 실행 예약하고 같으면 이펙트를 탈락시킨다.

두 번째는 **Commit Phase** 다.
Render Phase 에서 계산한 변경 사항을 실제 브라우저 DOM 에 반영하는 단계다.
이 시점에 React 는 `ref` 속성에 연결된 DOM 노드를 `ref.current` 에 부착한다.

순서를 정리하면 이렇다.

```
[Render Phase]
  1. 컴포넌트 함수 재실행
  2. useEffect 의존성 검사 (Object.is 비교)
  3. JSX 반환 — 아직 DOM 미생성

[Commit Phase]
  4. 브라우저 DOM 에 실제 태그 배치
  5. ref.current 에 DOM 노드 부착
  6. 예약된 이펙트 실행
```

이 두 단계 사이의 순서가 `[ref.current]` 의존성 배열이 실패하는 원인이다.

---

## 왜 의존성 배열의 ref.current 는 항상 null 인가

### Object.is(null, null) 이 이펙트를 죽이는 순간

상태가 바뀌어 컴포넌트가 리렌더링될 때 타임라인을 따라가보자.

Render Phase 가 시작되면 React 는 `useEffect` 의 의존성을 검사한다.
이때 이전 렌더의 `ref.current` 와 이번 렌더의 `ref.current` 를 `Object.is` 로 비교한다.

그런데 이 시점은 아직 JSX 도 반환하기 전이다.
DOM 은 커밋 전이므로 `ref.current` 는 `null` 이다.
이전 렌더에서 이미 `null` 이었고, 지금도 `null` 이다.

```
Object.is(null, null) === true  →  이펙트 탈락
```

그래서 이펙트가 실행 예약에서 제외된다.
이후 Commit Phase 에서 `ref.current` 에 실제 DOM 이 부착되지만, 이미 Render Phase 에서 이펙트는 죽었다.

`[ref.current]` 를 의존성 배열에 넣어도 아무 일도 일어나지 않는 이유가 바로 이것이다.
의존성을 검사하는 시점에는 항상 `null` 이기 때문에, React 는 "변한 게 없다" 고 판단하고 이펙트를 실행하지 않는다.

---

## useRef 는 왜 리렌더를 유발하지 못하는가

`useState` 라면 어땠을까.

`useState` 로 만든 상태는 Render Phase 가 시작되는 순간 이미 최신 값을 들고 있다.
상태를 업데이트하면 React 가 컴포넌트를 리렌더링하고, 이번 렌더의 의존성 값이 이미 바뀐 상태이므로 `Object.is` 검사를 통과한다.
이펙트가 실행된다.

반면 `useRef` 는 상태가 아니다.
`ref.current` 를 바꿔도 React 는 컴포넌트를 다시 깨우지 않는다.
값이 바뀌었다는 신호 자체가 React 에 전달되지 않는 것이다.

Commit Phase 에서 `ref.current` 에 DOM 이 부착될 때도 마찬가지다.
React 는 이 시점에 리렌더링을 트리거하지 않는다.
`ref.current` 가 `null` 에서 실제 DOM 으로 바뀌어도, 그 변화는 React 의 렌더 파이프라인 밖에서 일어난다.

> `useRef` 의 변화는 React 가 모른다.
> 그래서 `ref.current` 가 바뀌어도 이펙트가 실행될 기회 자체가 생기지 않는다.

---

## Callback Ref: DOM 이 붙는 순간을 낚아채다

`useEffect + [ref.current]` 조합이 실패하는 이유는 명확하다.
의존성 검사는 Render Phase 에서, DOM 부착은 Commit Phase 에서 일어나기 때문에 두 시점이 어긋난다.

Callback Ref 는 이 구조를 우회한다.
`ref` 속성에 객체 대신 함수를 넘기면, React 는 DOM 이 실제로 붙거나 떼이는 그 순간 그 함수를 직접 호출한다.

```jsx
const measuredRef = useCallback((node) => {
  if (node !== null) {
    const { width, height } = node.getBoundingClientRect();
    console.log("DOM 크기:", { width, height });
  }
}, []);

return <div ref={measuredRef}>대상 요소</div>;
```

`useEffect` 처럼 Render Phase 에서 예약되고 나중에 실행되는 구조가 아니다.
Commit Phase 에서 DOM 이 배치되는 바로 그 순간, React 가 함수에 DOM 노드를 인자로 넘겨 직접 호출한다.
의존성 검사도, 이전 값과의 비교도 없다.

React 공식 문서에서도 "DOM 노드가 attach/detach 될 때 반응적으로 처리가 필요하다면 Callback Ref 를 사용하라" 고 명시하고 있다.
`useEffect` 는 그 용도로 설계된 API 가 아니기 때문이다.

### 조건부 렌더링에서 Callback Ref 가 빛나는 이유

Callback Ref 의 진가는 조건부 렌더링에서 더 잘 드러난다.

`isOpen` 상태에 따라 모달이 나타났다 사라지는 상황을 생각해보자.

```jsx
{isOpen && <div ref={measuredRef}>모달 내용</div>}
```

`isOpen` 이 `false` 가 되면 `<div>` 가 DOM 에서 제거된다.
이 순간 React 는 Callback Ref 를 `null` 인자로 호출한다.
`isOpen` 이 다시 `true` 가 되면 `<div>` 가 다시 붙고, Callback Ref 를 새 DOM 노드로 호출한다.

DOM 이 사라질 때와 나타날 때마다 정확하게 감지된다.
`useRef` + `useEffect` 조합으로는 이 타이밍을 잡기 어렵다.
ref 는 상태가 아니어서 리렌더를 트리거하지 못하고, 이펙트는 Render Phase 의 의존성 검사에서 이미 탈락하기 때문이다.

> DOM 이 붙는 순간을 반응적으로 처리해야 할 때,
> `useEffect` 가 아니라 Callback Ref 가 정석인 이유가 여기에 있다.

---

## 마치며

처음에는 `useEffect` 안에서 `ref.current` 를 읽으면 될 거라 생각했다.
DOM 이 붙은 다음에 이펙트가 실행된다고 막연하게 알고 있었기 때문이다.

그런데 실제로는 Render Phase 에서 의존성을 검사하는 시점과, Commit Phase 에서 DOM 이 부착되는 시점이 완전히 다르다.
`[ref.current]` 를 의존성으로 넣어도 그 값이 바뀌어도 React 가 이를 알 수 없다는 점, 오늘 깨달았다.

Callback Ref 는 그 타이밍 문제를 "예약 후 실행" 이 아닌 "즉시 호출" 로 해결한다.
Render Phase 의 의존성 검사 바깥에서 동작하기 때문에 DOM 이 붙는 순간을 정확히 잡아낼 수 있다.
