## React 훅, 어떻게 동작하는가

훅을 쓰면서 동작 원리를 생각하지 않고 쓰는 경우가 많다.
이번 스터디에서 각 훅의 내부 동작을 정리하면서 놓쳤던 부분이 꽤 있었다.

---

## useState — 클로저로 관리되는 상태

useState는 함수 컴포넌트 내부에서 상태를 정의하고 관리한다.

```javascript
const [state, setState] = useState(0);

// state를 직접 변경해도 리렌더링이 발생하지 않는다
state = 'hi'; // ❌

// setState를 실행해야 비로소 리렌더링이 발생한다
setState('hi'); // ✅
```

state 값은 클로저로 관리된다.
setState에 새 값을 넘겨야 React가 리렌더링을 예약한다.

**lazy initialization**: 초기 값으로 함수를 넘기면 최초 렌더링에서만 실행된다.

```javascript
const [state, setState] = useState(() => {
  // 이 함수는 첫 렌더링에서만 실행된다
  return heavyComputation();
});
```

초기 값을 함수 표현식으로 넘기면 매 렌더링마다 실행되니 주의해야 한다.

---

## useEffect — 외부 시스템과의 동기화

useEffect는 생명주기 메서드 대체재가 아니라, 외부 시스템과 컴포넌트를 동기화하는 Hook이다.

```javascript
useEffect(() => {
  const connection = createConnection(serverUrl, roomId);
  connection.connect();

  return () => {
    connection.disconnect();
  };
}, [serverUrl, roomId]);
```

의존성 배열 내 값이 변경될 때마다 setup 함수가 실행된다.
클린업 함수는 다음 렌더링 전 또는 컴포넌트 언마운트 시 실행된다.

**비동기 함수를 직접 넣을 수 없는 이유**:

```javascript
// ❌ 이렇게 쓰면 안 된다
useEffect(async () => {
  const data = await fetchData();
}, []);

// ✅ 올바른 방식
useEffect(() => {
  async function fetch() {
    const data = await fetchData();
  }
  fetch();
}, []);
```

setup 함수가 Promise를 반환하면 React가 클린업 함수를 제대로 처리할 수 없다.
비동기 함수는 반드시 내부에서 정의하고 호출해야 한다.

`react-hooks/exhaustive-deps` 규칙을 무시하지 않는 것도 중요하다.
deps에 빠진 반응형 값이 있으면 stale closure 문제가 생긴다.

---

## useMemo와 useCallback

useMemo는 비용이 큰 연산 결과를 메모이제이션한다.

```javascript
const visibleTodos = useMemo(
  () => filterTodos(todos, tab),
  [todos, tab]
);
```

useCallback은 함수를 메모이제이션한다.

```javascript
function ProductPage({ productId, theme }) {
  const handleSubmit = useCallback((orderDetails) => {
    post('/product/' + productId + '/buy', orderDetails);
  }, [productId]);

  return <ShippingForm onSubmit={handleSubmit} />;
}
```

하위 컴포넌트에 함수를 props로 전달할 때, 매 렌더링마다 새 함수가 생성되면 리렌더링이 발생한다.
useCallback을 쓰면 deps가 바뀌지 않는 한 동일한 함수 참조를 유지한다.
단, 하위 컴포넌트가 `React.memo`로 감싸져 있어야 효과가 있다.

---

## useRef — 렌더링 없이 값을 유지하는 방법

useRef는 리렌더링을 발생시키지 않는 값을 컴포넌트 내부에 저장한다.

```javascript
const ref = useRef<HTMLDivElement | null>(null);
return <div ref={ref} />;
```

Callback Ref를 쓰면 DOM이 준비되는 시점에 맞춰 로직을 실행할 수 있다.

```javascript
const measuredRef = useCallback(node => {
  if (node !== null) {
    setHeight(node.getBoundingClientRect().height);
  }
}, []);
```

컴포넌트 외부에 변수를 두지 않고 useRef를 쓰는 이유는 두 가지다.
컴포넌트가 여러 인스턴스로 생성되어도 ref는 각각 독립적이고,
컴포넌트가 아직 마운트되지 않은 상태에서도 외부 변수는 메모리를 차지한다.

---

## useContext — 상태 주입 API

Context는 "상태 관리"가 아니라 "상태 주입"을 위한 API다.

```javascript
const PopOverContext = createContext<PopOverContextType | null>(null);

const PopOverRoot = ({ children }) => {
  const value = useMemo(
    () => ({ isPopOverOpen, openPopOver, closePopOver }),
    [isPopOverOpen, openPopOver, closePopOver],
  );

  return (
    <PopOverContext.Provider value={value}>
      {children}
    </PopOverContext.Provider>
  );
};
```

Provider에서 리렌더링이 발생하면 모든 Consumer 컴포넌트도 함께 리렌더링된다.
value를 useMemo로 감싸지 않으면 매 렌더링마다 새 객체가 생성되어 불필요한 리렌더링이 발생한다.

---

## useReducer — Action 기반 상태 변경

복잡한 상태 전환 로직을 컴포넌트 밖으로 분리할 때 유용하다.

```javascript
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      throw Error('Unknown action: ' + action.type);
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0 });
```

useState와 달리 상태 변경 로직을 Action 타입으로 명확하게 분리할 수 있다.
테스트하기도 쉽다. reducer 함수는 순수 함수이므로 독립적으로 테스트 가능하다.

---

## 훅 규칙

두 가지 규칙을 반드시 지켜야 한다.

1. 훅은 항상 컴포넌트 최상단에서 호출해야 한다
2. 훅을 호출할 수 있는 주체는 함수형 컴포넌트 또는 커스텀 훅이다

이 규칙이 있는 이유는 React가 훅의 순서에 의존하기 때문이다.
조건문이나 반복문 안에서 훅을 쓰면 렌더링마다 훅 호출 순서가 달라져 예측 불가능한 결과가 생긴다.

---

## 커스텀 훅 vs 고차 컴포넌트

**커스텀 훅**: 로직만 공유할 때 사용한다. 반드시 `use`로 시작해야 한다.

```javascript
export const useEventListener = (eventName, handler, options) => {
  useEffect(() => {
    window.addEventListener(eventName, handler, options);
    return () => window.removeEventListener(eventName, handler, options);
  }, [eventName, handler, options]);
};
```

**고차 컴포넌트(HOC)**: 컴포넌트 렌더링 자체에 로직을 추가할 때 사용한다. 관례적으로 `with`로 시작한다.

```javascript
export const withAuth = (Component) => (props) => {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      router.push("/main");
    }
  }, []);

  return <Component {...props} />;
};
```

로그인 상태 확인처럼 UI 렌더링 여부를 제어해야 할 때는 HOC가 더 자연스럽다.
반대로 이벤트 리스너 등록처럼 부수 효과만 필요할 때는 커스텀 훅이 적합하다.
