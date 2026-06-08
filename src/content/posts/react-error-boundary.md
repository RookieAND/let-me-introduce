> ErrorBoundary 는 어떻게 하위 컴포넌트의 에러를 Catch 할 수 있는 걸까?

## 📖 Introduction

사내 프로젝트와 개인 프로젝트에서 요즘 내가 잘 사용하려고 하는 친구가 바로 Suspense 와 ErrorBoundary 다, API 통신이 아직 마무리 되지 않았거나 중간에 문제가 생겼을 경우 사용자에게 이를 즉각적으로 알릴 수 있는 좋은 수단이라고 생각하기 때문이다.

하지만 정작 이 ErrorBoundary 가 어떤 목적과 구조를 가지고 동작하는지 잘 몰랐기 때문에, 이번 사내 개발자 스크럼에서 에러 바운더리의 구조와 설계를 분석하고 이를 공유하기 위해 해당 포스트를 작성하게 되었다.

## ✒️ ErrorBoundary 란?

- Errorboundary 컴포넌트는 하위 컴포넌트에서 throw 된 Error 를 일괄적으로 catch 하여 fallback UI를 렌더링 해준다.
- 즉, 하위 컴포넌트에서 에러가 발생했을 경우 이를 지역적으로 각각 처리하는 로직을 작성하지 않고, 가장 근접한 Errorboundary 에게 이를 인계하여 선언적으로 에러를 처리하도록 하는 방식이다.
- 단순 Axios 요청을 보내는 케이스도 있고, React Query 를 사용하여 Server State 를 인계 받는 케이스도 있으므로 두 개의 케이스에서 발생하는 에러를 모두 정상적으로 처리할 수 있어야 한다.

## ✒️ ErrorBoundary 구조 파악하기

1. state
    - **ErrorBoundary** 컴포넌트는 didCatch, error 속성을 가진 객체를 state 로 담고 있다.
    - `didCatch`  는 현재 ErrorBoundary 의 자식 컴포넌트에 에러가 발생하여 catch 한 상태인지를 나타낸다.
    - `error` 는 자식 컴포넌트에 어떤 에러가 발생했는지에 대한 정보를 담은 Error 객체이다.
    
```jsx
type ErrorBoundaryState = { didCatch: boolean; error: any };

const initialState: ErrorBoundaryState = {
  didCatch: false,
  error: null,
};
```
    

2. ui props
    - `fallback` 은 단순히 에러가 발생했을 때 보여줄 "UI", 즉 컴포넌트를 인자로 받는다.
    - 만약 `fallback` 이 유효한 ReactElement 가 아니라면 ErrorBoundary 는 다음으로 `fallbackRender` 의 유효성 검사를 진행한다.
    - `fallbackRender` 의 경우 함수형 컴포넌트만을 받으며, 발생한 에러 객체와 ErrorBoundary 내의 state 를 초기화할 함수인 resetErrorBoundary 함수를 props로 넘겨준다.
    - `fallbackComponent` 의 경우 클래스형 컴포넌트, 함수형 컴포넌트 두 개를 모두 받을 수 있으며, 여기서는 클래스형 컴포넌트를 고려하여 추가한 것으로 보인다.
        
```jsx
        const { didCatch, error } = this.state;
        
        // 일단 렌더링할 대상을 자식 컴포넌트로 둔다.
        let childToRender = children;
        
        // 만약 didCatch 가 true 라면, 자식 컴포넌트에서 에러가 발생했으므로 fallback UI를 띄운다.
        // fallback => fallbackRender => fallbackComponent 순으로 체크하며, 셋 다 유효하지 않다면 에러를 띄운다.
        if (didCatch) {
              const props: FallbackProps = {
                error,
                resetErrorBoundary: this.resetErrorBoundary,
              };
        
        			// fallback Props 가 유효한 React Element 라면, 이를 보여준다.
              if (isValidElement(fallback)) {
                childToRender = fallback;
        
        		  // fallbackRender 가 함수형 컴포넌트일 경우 fallbackProps 를 인계하여 보여준다.
              } else if (typeof fallbackRender === "function") {
                childToRender = fallbackRender(props);
        
        			// fallbackComponent 가 존재한다면, 새로운 Element 를 생성하고 fallbackProps 를 인계한다. 
              } else if (FallbackComponent) {
                childToRender = createElement(FallbackComponent, props); // fallbackProps 인계
              } else {
                throw new Error(
                  "react-error-boundary requires either a fallback, fallbackRender, or FallbackComponent prop"
                );
              }
            }
        
        // 이후 ErrorBoundary 컴포넌트를 렌더링 한다, 이때 하위 컴포넌트에 Provider 를 주입한다.
        // 주입된 Context 에는 didCatch, error, resetErrorBoundary 가 담긴 객체가 존재한다.
        return createElement(
              ErrorBoundaryContext.Provider,
              {
                value: {
                  didCatch,
                  error,
                  resetErrorBoundary: this.resetErrorBoundary,
                },
              },
              childToRender // 자식 컴포넌트를 렌더링
            );
```

3. error props
    - `onReset` 함수는 `resetErrorBoundary` 함수가 실행되어 ErrorBoundary 내 state 가 변경되었을 때, 혹은 props 로 받은 resetKey 배열이 변경되었을 경우 실행된다.
        - 한마디로 ErrorBoundary 에서 담은 error state 를 초기화할 때 실행되는 콜백 함수이다.
    - `onError` 함수의 경우 ErrorBoundary 자식 컴포넌트가 렌더링 되는 중 **런타임 에러가 발생했을 경우** 이를 캐치하고 실행되는 함수이다. (**componentDidCatch** 메서드로 감지)
    - `resetKeys` 배열은 ErrorBoundary 내에 저장된 state 를 **강제로 초기화할 수 있는** Key 값이다. 만약 이전의 Key 배열과 현재의 Key 배열이 다르다면, ErrorBoundary 는 현재 저장된 error 정보를 초기화하고 `didCatch` 를 false로 변경시킨다. (에러 강제 초기화)

```tsx
  // 하위 컴포넌트에서 발생한 에러를 Catch 하는 getDerivedStateFromError
  static getDerivedStateFromError(error: Error) {
    return { didCatch: true, error };
  }

  // 명시적으로 에러를 초기화하기 위해 실행하는 함수 resetErrorBoundary
  resetErrorBoundary(...args: any[]) {
    const { error } = this.state;

    if (error !== null) {
      this.props.onReset?.({
        args,
        reason: "imperative-api",
      });

      this.setState(initialState);
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }
```

4. LifeCycle Method
    - **`static getDerivedStateFromError`** 메서드는 자식 컴포넌트에서 에러가 발생한 경우 호출되며, 인자로 error 를 받아 새롭게 갱신된 state 를 반환하는 메서드다.
    - 따라서 state 가 변경되어 리렌더링을 유발시키며, ErrorBoundary 의 경우 `didCatch` 를 true 로 변경시켜 fallback UI를 보이도록 한다.
    - 해당 메서드는 **render phase** 에서 호출된다.
        
```jsx
static getDerivedStateFromError(error: Error) {
  return { didCatch: true, error };
}
```
        
    - **`componentDidCatch`** 메서드는 자식 컴포넌트에서 에러가 발생한 경우 호출되며, 두 개의 매개변수를 전달 받는다.
    - 매개변수는 에러 객체인 `error` 와 어떤 컴포넌트에서 에러가 발생했는지에 대한 StackTrace 정보를 담은 `info` 객체다.
    - ErrorBoundary 에서는 두 인자를 `onError` 콜백 함수에게 넘긴다.
    - **commit phase 에서 실행**되므로 Error Logging 작업을 보통 여기서 처리한다. 따라서 `onError` props 에 에러를 로깅하는 로직을 넣는 것이 바람직하다.
        
```jsx
componentDidCatch(error: Error, info: ErrorInfo) {
  this.props.onError?.(error, info);
}
```
       
## ✒️ 현재 개인적으로 사용 중인 모습

```tsx
import {
    type ComponentProps,
    type PropsWithChildren,
    Suspense,
} from 'react';

import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

interface PropsType
    extends Omit<ComponentProps<typeof ErrorBoundary>, 'fallbackRender'> {
    pendingFallback?: ComponentProps<typeof Suspense>['fallback'];
    rejectedFallback?: ComponentProps<typeof ErrorBoundary>['fallbackRender'];
}

// FIXME : 추후 에러 Fallback UI 시안이 나올 경우 대체해야 함
const FallbackComponent = ({ error }: FallbackProps) => <p>{error.message}</p>;

// FIXME : 추후 Suspense Fallback UI 시안이 나올 경우 대체해야 함
const PendingComponent = () => <p>로딩 중..</p>;

/**
 * 컴포넌트 내부에서 발생한 에러나 Pending 상태의 비동기 요청이 존재할 경우 이를 대체하는 fallback Component를 보여주는 AsyncBoundary
 * 컴포넌트 내부에서 에러가 발생했을 경우에 대한 rejectedFallback, Pending 상태의 요청이 있을 경우에 대한 pendingFallback 으로 나뉜다.
 */
const AsyncBoundary = ({
    pendingFallback,
    rejectedFallback,
    children,
}: PropsWithChildren<PropsType>) => (
    <ErrorBoundary fallbackRender={rejectedFallback || FallbackComponent}>
        <Suspense fallback={pendingFallback || <PendingComponent />}>
            {children}
        </Suspense>
    </ErrorBoundary>
);

export default AsyncBoundary;

```

- Suspense 와 같이 묶어 Promise 가 Pending 상태일 때는 pendingFallback 을, 에러가 발생하거나 Rejected 되었을 때는 rejectedFallback 을 보여주도록 설계했다.
- 보통 API 통신을 하는 컴포넌트와 같이 사용하는 경우가 많기 때문에 이러한 구조를 채택하였다.
