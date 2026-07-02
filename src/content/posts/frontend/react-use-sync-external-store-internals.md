## 들어가며

React 를 쓰다 보면 한 번쯤은 useSyncExternalStore 의 존재를 알게 된다. React 18 에서도 강조했던 훅이기도 하고..
Zustand 나 React Query 같은 라이브러리의 소스코드를 파고들면 `useSyncExternalStore` 가 어딘가에 반드시 등장한다.
"외부 스토어를 React 에 연결하는 훅" 이라는 설명을 어렴풋이 알고 있었지만, 부끄럽게도 정작 이 친구가 어떻게 동작하는지는 알지 못했다.

그런데 직접 이 훅을 써서 복잡한 트리 상태를 설계할 일이 생겼다.
그때 당시에는 기능 구현에 급급해 일단 이걸 쓰긴 했는데 작업이 끝나고 나서 찜찜한 기분이 계속 들었다.

`subscribe` 에 함수를 넘기는데 그게 뭔지 명확하게 설명할 수가 없었고,
`getSnapshot` 이 `Object.is` 로 비교한다는 건 알면서도 그게 내부에서 어떻게 트리거되는지는 몰랐다.

그래서 React 팀이 배포한 `use-sync-external-store` 패키지의 Shim 코드를 직접 뜯어봤다.
이 글에서는 Shim 코드를 먼저 분석하고, 그 과정에서 자연스럽게 생겨나는 의문들을 하나씩 따라가며 정리한다.

---

## useSyncExternalStore 란 무엇인가

> React 외부에서 관리되는 상태(External Store)의 변경을 React 렌더 사이클에 동기화(Sync)하는 훅이다.

React 18 에서 새롭게 도입되었으며, 기존에는 라이브러리마다 제각각이던 외부 스토어 연동 방식을 표준화하기 위해 만들어졌다.

```typescript
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

위 Hook 은 총 세 가지 인수를 받고, 스냅샷 값 하나를 반환한다.

| 인수 | 타입 | 역할 |
|---|---|---|
| `subscribe` | `(listener: () => void) => () => void` | 스토어에 리스너를 등록하고, cleanup 함수를 반환 |
| `getSnapshot` | `() => Snapshot` | 현재 스토어 상태를 반환 (클라이언트 렌더) |
| `getServerSnapshot` | `() => Snapshot` (선택) | SSR 환경에서 사용할 스냅샷 반환 |

반환값은 `getSnapshot()` 을 호출해 얻은 현재 스냅샷이다.
React 는 스토어에 변경이 생길 때마다 `getSnapshot()` 을 재호출하고, 이전 반환값과 `Object.is` 로 비교해서 달라졌을 때만 리렌더를 트리거한다.

---

## Shim 으로 뜯어보는 내부 설계

React 팀이 배포한 `use-sync-external-store` 패키지에는 동기 모드용 Shim 구현이 들어있다.
전체 흐름을 표로 먼저 정리하면 아래와 같다.

| 시점 | 실행 내용 | 핵심 동작 |
|---|---|---|
| 렌더 | `getSnapshot()` 호출 | 현재 스냅샷 값 획득 |
| useState | `inst` 객체 초기화 | `value` 와 `getSnapshot` 참조를 보관하는 mutable 컨테이너 |
| useLayoutEffect | `inst` 갱신 + 변경 감지 | Paint 전에 stale UI 방지 |
| useEffect | 리스너 등록 (`subscribe`) | Store 변경을 이 컴포넌트에 연결 |
| Store 변경 시 | `handleStoreChange` 실행 | 값이 달라졌을 때만 `forceUpdate` |

전체 Shim 코드는 이렇다.

```typescript
// use-sync-external-store/shim
export function useSyncExternalStore(subscribe, getSnapshot) {
  const value = getSnapshot();

  const [{inst}, forceUpdate] = useState({inst: {value, getSnapshot}});

  useLayoutEffect(() => {
    inst.value = value;
    inst.getSnapshot = getSnapshot;

    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({inst});
    }
  }, [subscribe, value, getSnapshot]);

  useEffect(() => {
    if (checkIfSnapshotChanged(inst)) {
      forceUpdate({inst});
    }
    const handleStoreChange = () => {
      if (checkIfSnapshotChanged(inst)) {
        forceUpdate({inst});
      }
    };
    return subscribe(handleStoreChange);
  }, [subscribe]);

  return value;
}

function checkIfSnapshotChanged(inst) {
  const prevValue = inst.value;
  try {
    const nextValue = inst.getSnapshot();
    return !Object.is(prevValue, nextValue);
  } catch (error) {
    return true;
  }
}
```

위 설계에서 개인적으로는 세 가지 포인트가 눈에 띄어서 이를 정리해보았다.

### 왜 스냅샷 값 대신 `inst` 객체를 state 에 저장하는가

```typescript
const [{inst}, forceUpdate] = useState({inst: {value, getSnapshot}});
```

왜냐하면 `value` 를 state 에 직접 담으면 리렌더링 제어가 어렵기 때문이다.
대신 **가변 `inst` 객체**를 state 슬롯에 두고, 리렌더링이 필요한 시점에 `forceUpdate({inst})` 로 새 객체를 전달한다.

- `inst.value` — 마지막 렌더에서 읽은 스냅샷
- `inst.getSnapshot` — 최신 `getSnapshot` 함수 참조

`inst` 자체는 `useLayoutEffect` 에서 `inst.value = value` 로 직접 변경한다.
이는 state 를 경유하지 않고 최신 값을 들고 있는 mutable 컨테이너 역할을 한다고 보여진다.
리렌더링이 필요할 때는 `forceUpdate({inst})` 로 매번 새 객체를 넘겨 React 동등성 비교를 통과시킨다.

### `useLayoutEffect` 가 막는 건 Tearing 이 아니다

Shim 코드에는 "updates are always synchronous" 라는 주석이 달려있는데, 이 Shim 이 **동기 모드 전용**임을 명시적으로 나타낸다.

Tearing 은 Concurrent Mode 에서 발생하는 현상으로, 같은 렌더 트리 안에서 서로 다른 컴포넌트가 같은 외부 Store 를 서로 다른 시점의 값으로 읽어 화면이 찢어지는 문제다.
동기 모드에서는 렌더가 중단 없이 한 번에 끝나기 때문에 이 현상 자체가 발생하지 않고, 따라서 이 Shim 의 관심사도 아니다.

`useLayoutEffect` 가 실제로 하는 일은 두 가지다.

**첫째, stale UI 방지.**

`useEffect` 는 브라우저 Paint 이후 비동기로 실행되기 때문에, 렌더와 Paint 사이에 Store 가 바뀌면 `useEffect` 가 실행되기 전까지 사용자는 오래된 값을 보게 된다.
`useLayoutEffect` 는 DOM 변경 직후, Paint 이전에 동기적으로 실행되므로 이 타이밍에 `checkIfSnapshotChanged` 를 한 번 더 체크하고, 변경이 감지되면 Paint 전에 `forceUpdate` 를 호출한다.

**둘째, `inst.getSnapshot` 최신화.**

이후 `handleStoreChange` 가 `inst.getSnapshot()` 을 호출할 때, 현재 렌더에서 사용한 함수와 동일한 참조를 쓰도록 `inst.getSnapshot = getSnapshot` 으로 최신화한다.

```typescript
useLayoutEffect(() => {
  inst.value = value;            // 최신 스냅샷 반영
  inst.getSnapshot = getSnapshot; // 최신 함수 참조 반영

  if (checkIfSnapshotChanged(inst)) {
    forceUpdate({inst}); // Paint 전에 불일치 발견 → 즉시 리렌더
  }
}, [subscribe, value, getSnapshot]);
```

### 변경 알림을 받아도 무조건 리렌더하지 않는다

Store 에서 변경 알림이 와도 즉시 리렌더를 트리거하지 않고, `checkIfSnapshotChanged` 로 실제 값이 달라졌는지 먼저 확인한다.

```typescript
function checkIfSnapshotChanged(inst) {
  const prevValue = inst.value;
  try {
    const nextValue = inst.getSnapshot();
    return !Object.is(prevValue, nextValue); // 실제로 달라졌을 때만 true
  } catch (error) {
    return true; // getSnapshot 이 throw 하면 변경으로 간주
  }
}
```

`getSnapshot` 이 예외를 던지는 경우도 변경으로 취급하는데, 스냅샷을 읽지 못하는 상황이라면 안전하게 리렌더를 유발하는 편이 낫다는 판단이다.

---

## subscribe 과정: listener 의 실체와 Store 내 관리

Shim 코드를 따라가다 보면 `useEffect` 마지막 줄에서 눈에 띄는 구문이 하나 있다.

```typescript
return subscribe(handleStoreChange);
```

그런데 여기서 한 가지 의문이 생긴다.
`handleStoreChange` 는 React 가 내부에서 만든 함수인데, `subscribe` 는 내가 직접 구현해야 하는 함수다.
그렇다면 `subscribe` 는 이 `handleStoreChange` 를 받아서 어떻게 처리해야 하고, Store 내부에서는 이 listener 들을 어떻게 관리해야 React 와 연동이 되는 걸까?

### handleStoreChange 의 실체

`handleStoreChange` 가 하는 일은 두 가지다.

1. `inst.getSnapshot()` 을 호출해 Store 의 현재 값을 읽는다.
2. 이전에 저장해둔 `inst.value` 와 `Object.is` 로 비교하고, 달라졌을 때만 `forceUpdate({inst})` 를 호출한다.

`forceUpdate` 는 `useState` 의 setter 함수로, 매번 새 객체를 전달하기 때문에 React 동등성 비교에서 항상 `false` 가 나와 리렌더링이 보장된다.

즉 `handleStoreChange` 는 "Store 에 변경이 생겼을 때 이 컴포넌트를 다시 렌더링하라"는 신호를 React 에 보내는 함수다.
그리고 이 함수를 `subscribe` 를 통해 Store 에 전달함으로써, Store 는 "이 컴포넌트에게 변경을 알려야 할 때 이 함수를 호출하면 된다"는 것을 알게 된다.

### Store 에서 listener 를 관리하는 방법

`subscribe` 의 역할은 단순하다.
React 가 넘겨준 `handleStoreChange` 를 받아서 Store 내부에 보관하고 unmount 시 cleanup 함수를 반환하는 것이다.

```typescript
// Store 클래스 내부
private listeners: Set<() => void>;

public subscribe = (listener: () => void) => {
  this.listeners.add(listener);    // handleStoreChange 를 보관
  return () => {
    this.listeners.delete(listener); // 언마운트 시 제거
  };
};
```

이때 `listeners` 를 `Set` 으로 관리하는 이유가 있다.
`Array` 를 쓰면 동일한 리스너가 중복 등록되어도 막을 방법이 없기 때문이다.
반면 `Set` 은 중복을 자동으로 걸러내고, `Set.prototype.delete()` 로 클로저에 캡처된 특정 리스너만 정확히 제거할 수 있다.

Store 상태가 바뀌면 `emitChange()` 로 보관된 모든 리스너를 순회 호출한다.

```typescript
private emitChange() {
  this.listeners.forEach((listener) => listener?.());
}
```

이 `emitChange()` 호출이 곧 `handleStoreChange()` 호출이고, `handleStoreChange` 가 `forceUpdate` 를 트리거하면서 해당 컴포넌트의 리렌더가 일어난다.

### 리스너가 등록되고 리렌더가 일어나기까지

여러 컴포넌트가 같은 Store 를 구독할 때 전체 흐름을 따라가 보자.

**1. 각 컴포넌트가 마운트되면 `subscribe` 를 통해 자신의 `handleStoreChange` 를 등록한다.**

```
컴포넌트 A 마운트
  → useSyncExternalStore 내부 useEffect 실행
  → subscribe(A 의 handleStoreChange)
  → listeners.add(A 의 handleStoreChange)

컴포넌트 B 마운트
  → subscribe(B 의 handleStoreChange)
  → listeners.add(B 의 handleStoreChange)
```

**2. Store 상태가 바뀌면 `emitChange()` 로 모든 리스너를 순회 호출한다.**

```
Store 변경 → emitChange()
  → A 의 handleStoreChange 실행
      → checkIfSnapshotChanged: getSnapshot() vs 이전 값 비교
      → 달라졌으면 forceUpdate → A 리렌더
  → B 의 handleStoreChange 실행
      → checkIfSnapshotChanged: getSnapshot() vs 이전 값 비교
      → 달라졌으면 forceUpdate → B 리렌더
```

**3. 각 리렌더에서 `getSnapshot()` 이 재호출되어 새 스냅샷이 반환된다.**

이게 인과관계의 전체 고리다.
`emitChange()` 가 리스너를 순회 호출하고, 각 리스너가 자기 컴포넌트의 리렌더를 일으키고, 리렌더 시 `getSnapshot()` 이 재호출된다.
컴포넌트가 직접 Store 를 관찰하는 게 아니라, Store 가 리스너를 통해 컴포넌트에 신호를 보내는 구조다.

### cleanup 함수가 반드시 필요한 이유

`subscribe` 가 반환하는 cleanup 함수는 컴포넌트가 언마운트될 때 `useEffect` 가 자동으로 호출한다.
cleanup 없이 컴포넌트가 언마운트되면, 해당 컴포넌트의 `handleStoreChange` 가 `listeners Set` 에 남아 있게 된다.
이후 `emitChange()` 가 호출될 때 이미 사라진 컴포넌트에 `forceUpdate` 를 시도하면서 메모리 누수나 예기치 않은 동작이 발생한다.

---

## getSnapshot 과 getServerSnapshot 의 차이

두 함수는 이름이 비슷해 혼동하기 쉽지만, 호출되는 환경이 다르다.

| | `getSnapshot` | `getServerSnapshot` |
|---|---|---|
| 호출 환경 | 클라이언트 렌더 | SSR (서버 렌더) |
| 목적 | 현재 Store 상태 반환 | hydration 불일치 방지용 초기값 반환 |
| 제약 | — | `getSnapshot` 과 동일한 값이어야 hydration 성공 |

SSR 환경에서 `getServerSnapshot` 을 생략하면 에러가 발생한다.
서버 렌더 시점에는 외부 Store 가 초기화되지 않았을 수 있어, React 가 렌더링할 기준값을 알 방법이 없기 때문이다.

### 두 함수의 차이가 빛나는 예: useIsMounted

가장 간단하면서도 두 함수의 역할 차이를 잘 보여주는 예시가 `useIsMounted` 다.
기존에는 `useEffect` + `useState` 조합으로 구현했다. (이런 코드 아마 다들 많이 썼으리라 생각한다.)

```typescript
function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return isMounted; // 초기 렌더: false → Effect 이후: true (추가 리렌더 발생)
}
```

`useEffect` 는 브라우저 Paint 이후 비동기로 실행되기 때문에 초기 렌더에서 `false` 를 반환하고, Effect 이후 리렌더에서 `true` 로 바뀐다. 즉, 추가적인 리렌더가 반드시 발생한다.

하지만 이를 `useSyncExternalStore` 로 대체하면 아래처럼 깔끔하게 상태를 분리해서 나타낼 수 있다.

```typescript
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},  // subscribe: 변경 알림 없음 (단발성)
    () => true,      // getSnapshot: 클라이언트에서는 항상 마운트됨
    () => false,     // getServerSnapshot: 서버에서는 마운트 안 됨
  );
}
```

서버 렌더에서는 `getServerSnapshot` 이 호출되어 `false` 를 반환하고, 클라이언트 hydration 이후에는 `getSnapshot` 이 `true` 를 반환한다.
`useEffect` 패턴과 달리 **추가 리렌더 없이** 클라이언트 첫 렌더부터 `true` 가 확정된다.

---

## 마운트 ~ Store 변경까지 실행 흐름 요약

**마운트 시:**

```
렌더: getSnapshot() 호출 → value 획득
      ↓
useState: inst = { value, getSnapshot } 초기화
      ↓
[동기] useLayoutEffect: inst 갱신 (value, getSnapshot 최신화)
      checkIfSnapshotChanged → 렌더~커밋 사이 Store 변경 감지 시 즉시 forceUpdate
      ↓
[비동기] useEffect: 구독 직전 checkIfSnapshotChanged 한 번 더 확인
         subscribe(handleStoreChange) → listeners Set 에 등록
```

**Store 변경 시:**

```
Store 변경 → emitChange() 호출
      ↓
등록된 모든 handleStoreChange 순회 실행
      ↓
checkIfSnapshotChanged: inst.getSnapshot() vs inst.value → Object.is 비교
      ↓
값이 다를 때만 forceUpdate({inst}) → 리렌더 스케줄링
      ↓
리렌더: getSnapshot() 재호출 → 새 value 반환
      ↓
[동기] useLayoutEffect: inst.value 최신값으로 갱신
```

---

처음엔 "외부 Store 를 React 에 연결하는 훅" 이라는 설명 하나로 대충 이해하고 넘어갔다.
Shim 코드를 열어보고 나서야 `inst` 객체 패턴이나 `useLayoutEffect` 의 역할처럼, 설명 없이는 의도가 보이지 않는 결정들이 꽤 있다는 걸 알게 됐다.
특히 `subscribe` 에 넘기는 `listener` 가 React 가 직접 주입하는 `handleStoreChange` 라는 사실, 그리고 Store 내부에서 이 listener 들을 `Set` 으로 보관하고 `emitChange()` 로 순회 호출하는 구조는 파고들기 전까지는 전혀 감이 잡히지 않았다.

이 훅을 실제로 활용해 복잡한 트리 상태를 설계한 이야기는 다음 글에서 이어진다.
