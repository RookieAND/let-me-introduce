## 리액트 Deep Dive 스터디를 시작하며

2023년 하반기에 팀 내에서 리액트 딥 다이브 스터디를 시작했다.  
책에서 1강은 React를 제대로 쓰기 위해 반드시 알아야 할 JavaScript 개념을 다룬다.  
처음엔 "이미 아는 내용 아닐까" 싶었는데, 막상 정리해보니 놓치고 있던 부분이 꽤 있었다.  

---

## Object.is — React가 비교에 쓰는 함수

React는 상태나 props 변경을 감지할 때 `Object.is`로 비교한다.  

```javascript
// Object.is의 폴리필 구현
function is(x, y) {
  return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
}
```

`===`와 거의 동일하지만, 두 가지 예외가 있다.  

- `+0`과 `-0`을 서로 다르다고 판단한다
- `NaN === NaN`은 false지만 `Object.is(NaN, NaN)`은 true다

React는 ES5 호환성 때문에 이 폴리필을 직접 구현해서 쓴다.  
useEffect 의존성 배열 비교, props 변경 감지, `React.memo`의 shallowEqual 모두 이 함수를 기반으로 한다.  

---

## ShallowEqual — 1 depth까지만 비교한다

React의 `shallowEqual`은 `Object.is`에 한 겹 더 추가된 비교 함수다.  

핵심은 "1 Depth만 체크"한다는 점이다.  
`props`로 중첩 객체를 넘기면 메모이제이션이 제대로 작동하지 않는다.  
`React.memo`가 있어도 매번 새 객체가 들어오면 리렌더링이 발생한다.  

---

## 클로저 — React 상태가 살아있는 이유

클로저는 함수가 선언된 위치의 어휘적 환경을 참조한다.  
외부 컨텍스트가 콜 스택에서 제거되어도 클로저가 참조하는 **자유 변수**는 메모리에 남는다.  

React의 state가 바로 이 클로저로 관리된다.  
컴포넌트가 리렌더링된 후에도 이전 상태에 접근할 수 있는 이유가 여기에 있다.  

단, 불필요한 변수가 클로저 안에 갇히면 메모리 누수가 생길 수 있다.  
useEffect 클린업이 없는 이벤트 핸들러가 대표적인 사례다.  

---

## 이벤트 루프 — 비동기가 단일 스레드에서 동작하는 방식

JavaScript는 단일 스레드이지만 비동기 작업을 처리할 수 있다.  
브라우저의 Web API가 비동기 작업을 별도로 처리하고 콜백을 큐에 넣는다.  

실행 순서는 이렇다.  

1. Call Stack이 비워진다
2. Microtask Queue 처리 (Promise, MutationObserver)
3. 브라우저 렌더링
4. Task Queue 처리 (setTimeout, setInterval)

Microtask가 Task보다 먼저 처리된다는 점이 중요하다.  
Microtask 안에서 새 Microtask를 계속 생성하면 브라우저 렌더링이 지연된다.  

```javascript
// Task Queue
setTimeout(() => console.log('setTimeout'), 0);

// Microtask Queue
Promise.resolve().then(() => console.log('Promise'));

// 출력 순서: Promise → setTimeout
```

---

## 함수 선언 방식과 this 바인딩

**함수 선언문**은 호이스팅되어 선언 이전에도 호출 가능하다.  
**함수 표현식**은 변수 할당 전에 사용하면 에러가 난다.  
**화살표 함수**는 `arguments`가 없고, `this`를 렉시컬 스코프로 바인딩한다.  

React 컴포넌트 안에서 이벤트 핸들러를 화살표 함수로 쓰는 게 일반적인 이유가 여기에 있다.  
클래스 컴포넌트에서 `this.handleClick = this.handleClick.bind(this)`를 썼던 것도 같은 이유다.  

---

## TypeScript 활용

JS 개념 정리와 함께 책에서 강조한 TypeScript 권장 사항도 함께 메모했다.  

- `any` 대신 `unknown` — unknown은 타입 좁히기를 강제하므로 더 안전하다
- Type Guard와 Narrowing — instanceof, typeof, in 연산자로 타입을 좁힌다
- Generic — 타입 유연성을 확보하면서 any를 피하는 방법
- Index Signature보다 Mapped Type — 키 집합을 정확히 제한할 수 있다

부끄럽게도 `unknown`을 `any`의 더 엄격한 버전 정도로만 생각했는데,  
정확히는 "사용 전 반드시 타입을 좁혀야 하는 타입"이라는 점이 달랐다.  
