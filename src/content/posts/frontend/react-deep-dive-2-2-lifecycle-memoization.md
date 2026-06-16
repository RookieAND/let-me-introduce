## 클래스 컴포넌트는 왜 지금도 알아야 하는가

함수형 컴포넌트만 쓰면서 클래스 컴포넌트는 몰라도 된다고 생각했다.
그런데 레거시 코드베이스나 ErrorBoundary를 직접 구현할 때는 클래스 컴포넌트를 피할 수 없다.
생명주기 메서드를 제대로 이해하지 못하면 코드를 읽는 것조차 어렵다.

---

## 클래스 컴포넌트의 생명주기 3단계

생명주기는 Mount, Update, Unmount로 나뉜다.

**Mount 단계**

```
constructor → getDerivedStateFromProps → render → componentDidMount
```

`constructor`에서 state 초기화와 이벤트 핸들러 바인딩을 처리한다.
`componentDidMount`는 DOM이 준비된 후 실행되므로, API 호출이나 이벤트 등록은 여기서 한다.

**Update 단계**

```
getDerivedStateFromProps → shouldComponentUpdate → render
→ getSnapshotBeforeUpdate → componentDidUpdate
```

`shouldComponentUpdate`를 false로 반환하면 리렌더링을 건너뛴다.
`PureComponent`는 이를 자동으로 처리한다(shallowEqual 비교).

**Unmount 단계**

```
componentWillUnmount
```

타이머 해제, 이벤트 핸들러 제거, WebSocket 연결 종료처럼 정리 작업을 여기서 한다.

---

## 함수형 컴포넌트와의 차이

**state와 props의 스냅샷 차이**

클래스 컴포넌트에서 state와 props는 `this`를 통해 접근한다.
`this`는 항상 최신 값을 가리키므로, 비동기 콜백 안에서도 현재 값을 읽을 수 있다.

함수형 컴포넌트에서 state와 props는 렌더링 시점의 스냅샷이다.
클로저로 캡처된 값은 해당 렌더링의 값을 유지한다.
이게 stale closure 문제가 생기는 이유다.

**useEffect는 생명주기 대체가 아니다**

```javascript
// 이렇게 생각하면 안 된다
useEffect(() => {
  // componentDidMount와 다르다
}, []);
```

`useEffect`는 생명주기 메서드를 대체하기 위한 게 아니라
"외부 시스템과 컴포넌트를 동기화하는" 용도다.
React 공식 문서도 이 점을 명확히 강조한다.

---

## 렌더링 3단계

### Trigger

초기 렌더링 또는 state·props 변화로 렌더링이 시작된다.
JSX가 `React.createElement`로 변환되어 ReactElement 객체를 반환한다.

### Render Phase

Virtual DOM을 조작하는 단계로, 화면에는 아직 반영되지 않는다.
ReactElement가 Fiber Node로 확장되어 VDOM 트리를 생성한다.
Fiber 덕분에 이 단계는 비동기로 동작하며 작업을 일시 중지하거나 재시작할 수 있다.

### Commit Phase

Virtual DOM을 실제 DOM에 적용하는 단계다.
이 단계는 동기적으로 실행된다.
Call Stack이 비어야 비로소 브라우저가 화면을 그린다.

---

## 메모이제이션이 항상 좋은 건 아니다

`useMemo`, `useCallback`, `React.memo`를 쓰면 무조건 성능이 좋아진다고 생각했다.
실제로는 그렇지 않다.

메모이제이션에는 두 가지 비용이 따른다.

- 이전 값을 메모리에 저장하는 비용
- deps 변경 여부를 비교하는 비용

리렌더링 비용이 이 두 비용보다 훨씬 낮다면 메모이제이션이 오히려 역효과다.

책에서 지적한 세 가지 함정을 정리하면 이렇다.

1. 참조형 값을 props로 넘기지 않으면 애초에 필요 없을 수 있다
2. 잘못된 deps 설정으로 의도치 않은 결과가 생길 수 있다
3. 필요한 리렌더링을 메모이제이션으로 막으면 그것도 버그다

성능 이슈가 실제로 있고 측정 가능한 경우에만 메모이제이션을 적용하는 것이 맞다.
"혹시 모르니까"는 좋은 이유가 아니다.
