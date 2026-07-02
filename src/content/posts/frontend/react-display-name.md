## displayName이란?

`displayName`은 React 컴포넌트에 **디버깅용 이름을 명시적으로 부여하는 정적 프로퍼티**다.
React DevTools와 에러 메시지에서 컴포넌트를 식별하는 데 사용되며, 런타임 동작에는 전혀 영향을 주지 않는다.

```typescript
const MyComponent = () => <div>Hello</div>;
MyComponent.displayName = 'MyComponent';
```

React DevTools는 컴포넌트 이름을 표시할 때 `displayName` → `Function.name` 순서로 확인한다.

---

## React는 컴포넌트 이름을 어떻게 추론하는가

1. `displayName` 프로퍼티가 설정되어 있으면 해당 값을 사용한다
2. 없으면 JS 엔진이 자동으로 채워주는 `Function.name`을 읽는다
3. 둘 다 없으면 `Anonymous`로 표시한다

**`Function.name`**은 JavaScript 명세에 정의된 함수 객체의 내장 프로퍼티다.
ES6 이전에는 변수에 할당해도 이름이 추론되지 않았지만, ES6부터는 좌변 식별자에서 이름을 자동으로 추론한다.

```javascript
// ES6 이후 — 변수에 직접 할당 시 추론 가능
const MyComponent = () => <div />;
console.log(MyComponent.name); // "MyComponent"

// 인자로 직접 전달 — 추론 불가
const HeavyComponent = React.memo(() => <div />);
console.log(HeavyComponent.type.name); // "" ← Anonymous
```

함수가 다른 함수의 인자로 바로 전달되면 좌변이 없으므로 이름 추론이 불가하다.

---

## 이름 추론이 실패하는 상황들

### HOC (Higher-Order Component)

```typescript
// ❌ DevTools에 "Anonymous" 또는 "Component"로 표시됨
const withAuth = (WrappedComponent) => {
  return (props) => {
    if (!isAuthenticated) return <Redirect to="/login" />;
    return <WrappedComponent {...props} />;
  };
};

// ✅ DevTools에 "withAuth(UserProfile)"로 표시됨
const withAuth = (WrappedComponent) => {
  const displayName =
    WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component';
  const Component = (props) => {
    if (!isAuthenticated) return <Redirect to="/login" />;
    return <WrappedComponent {...props} />;
  };
  Component.displayName = `withAuth(${displayName})`;
  return Component;
};
```

### React.memo

```typescript
// ❌ DevTools에 "Anonymous memo"로 표시됨
const HeavyComponent = React.memo(() => {
  return <div>Heavy Content</div>;
});

// ✅ 방법 1 — displayName 직접 설정
HeavyComponent.displayName = 'HeavyComponent';

// ✅ 방법 2 — named function 사용
const HeavyComponent = React.memo(function HeavyComponent() {
  return <div>Heavy Content</div>;
});
```

익명 함수를 `React.memo`로 감싸면 안쪽 함수의 `Function.name`이 `""`라 이름 추론이 불가하다.
named function을 사용하면 `Function.name`이 자동으로 채워지므로 `displayName` 설정을 생략할 수 있다.

### forwardRef (React 18 이하)

```typescript
// ❌ DevTools에 "ForwardRef(Anonymous)"로 표시됨
const Input = React.forwardRef((props, ref) => {
  return <input {...props} ref={ref} />;
});

// ✅ displayName 설정
Input.displayName = 'Input';
```

`forwardRef`는 내부적으로 `{ $$typeof, render }` 구조의 객체를 반환하며, DevTools는 이 `render` 함수의 `Function.name`을 읽는다.

### Context Provider / Consumer

```typescript
// ❌ DevTools에 "Context.Provider"로 표시됨
const ThemeContext = React.createContext(null);

// ✅ DevTools에 "ThemeContext.Provider"로 표시됨
ThemeContext.displayName = 'ThemeContext';
```

Context.Provider가 여러 개 중첩될 경우 어떤 Context인지 구분이 어렵다. `displayName`을 설정하면 의미 있는 이름으로 표시된다.

---

## React 19에서의 변화

React 19에서 `ref`가 일반 prop으로 통합되면서 `forwardRef`가 불필요해졌다.

```typescript
// ✅ React 19 — ref를 일반 prop으로 직접 받음
const TextInput = ({ label, ref, ...props }: TextInputProps & { ref?: React.Ref<HTMLInputElement> }) => {
  return <input ref={ref} {...props} />;
};
// named function이므로 Function.name으로 이름이 자동 추론됨
```

`forwardRef`가 사라지므로 기존에 관련 `displayName` 패턴도 불필요해졌다.
그렇다고 `displayName` 자체가 불필요해진 건 아니다.

- **HOC**: React 19에서도 HOC 패턴은 유지되므로 여전히 필요하다
- **React.memo 내 익명 함수**: `React.memo` 자체는 유지되므로 익명 함수 사용 시 여전히 `Anonymous`로 표시된다
- **Context**: 중첩 Provider 환경에서 식별을 위해 여전히 유효하다

---

## 결론

`displayName`은 디버깅 전용 프로퍼티로, `Function.name`보다 우선 적용되어 DevTools, 에러 스택 트레이스, 프로파일러에서 컴포넌트 이름을 표시하는 데 쓰인다.

JS 엔진의 `Function.name` 추론은 ES6부터 가능해졌지만, 함수가 다른 함수의 인자로 직접 전달되는 경우엔 여전히 추론이 불가하다. HOC, memo, forwardRef, Context가 모두 이 경우에 해당한다. `displayName`이 없으면 `Anonymous`로 표시되어 컴포넌트 트리 파악과 에러 추적이 어려워진다. 특히 라이브러리 개발이나 대규모 코드베이스에서 영향이 크다.
