## 문제

`useQuery` 훅이 호출되었을 때 queryFunction에서 에러가 발생할 경우 이것이 컴포넌트 단으로 전파되는 문제가 발생했다.
원래라면 queryFunction에서 에러가 발생하던, 성공적으로 결과를 받아오던 이를 하나로 수렴하여 Result를 생성하고 반환해야 한다.
하지만 문제가 되었던 케이스는 `useQuery`에서 발생한 에러가 컴포넌트에 전파되어 렌더링이 차단되는 이슈가 발생했다.

---

## 탐구

`useQuery`에서 에러가 발생할 경우 당연히 이를 `throw` 하는 것이 아닐까 라고 생각했다.
하지만 그러면 `UseQueryResult` 인터페이스 내에 `isError` 플래그가 존재할 이유가 없다.
`queryObserver`에서는 이전과 현재 Query 값을 비교하고 에러인지, 성공인지에 따라 **flag**를 내부에서 지정한다.

```typescript
// queryObserver.ts#L412
if (this.#selectError) {
  error = this.#selectError as any
  data = this.#selectResult
  errorUpdatedAt = Date.now()
  status = 'error'
}

const isFetching = fetchStatus === 'fetching'
const isPending = status === 'pending'
const isError = status === 'error'

const isLoading = isPending && isFetching

const result: QueryObserverBaseResult<TData, TError> = {
  status,
  fetchStatus,
  isPending,
  isSuccess: status === 'success',
  isError,
  isInitialLoading: isLoading,
  isLoading,
  // 이하 중략...
}

return result as QueryObserverResult<TData, TError>
```

그렇다면 `useQuery`에서 특정 조건에 부합하는 경우 에러를 상위 컨텍스트로 던지는 로직이 있을까?
있었다. `useBaseQuery` 코드 내에 특정 조건을 만족하는 경우 에러 객체를 `throw`하는 로직이 존재했다.

```typescript
// useBaseQuery.ts#L106
if (
  getHasError({
    result,
    errorResetBoundary,
    throwOnError: defaultedOptions.throwOnError,
    query: client
      .getQueryCache()
      .get<TQueryFnData, TError, TQueryData, TQueryKey>(defaultedOptions.queryHash),
  })
) {
  throw result.error
}
```

에러 객체를 상위로 던질지 판별하는 `getHasError`의 경우 아래와 같은 로직을 거친다.

```typescript
if (
  getHasError({
    result,
    errorResetBoundary,
    useErrorBoundary: defaultedOptions.useErrorBoundary,
    query: observer.getCurrentQuery(),
  })
) {
  throw result.error
}
```

`useQuery`에서 에러를 던지는 케이스를 하나씩 조사해봤다.

현재 문제가 되는 상황은 우선 API 통신이 실패했기 때문에 `result.isError`는 **true**다.

`errorResetBoundary`의 경우 현재 해당 훅을 호출한 컴포넌트 상위에 `QueryErrorResetBoundary`가 없기 때문에 **true**다.

```typescript
// useBaseQuery.ts:L49
const errorResetBoundary = useQueryErrorResetBoundary()

// QueryErrorResetBoundary.ts:L31
export const useQueryErrorResetBoundary = () =>
  React.useContext(QueryErrorResetBoundaryContext)
```

`<QueryErrorResetBoundary>` 컴포넌트로 하위 요소를 감싸주었다면 `errorResetBoundary`는 `undefined`가 아닐 것이다.
하지만 현재 문제가 된 요소는 해당 컴포넌트를 감싸지 않았기 때문에 결국 `!errorResetBoundary.isReset()`은 **true**다.

`query`는 당연히 존재하므로 **true**다.

그렇다면 범인은… `useErrorBoundary` 옵션이었다.

### 해결

원인은 애플리케이션 최상단에서 정의한 `QueryClient`의 `useErrorBoundary` 옵션이 `true`로 세팅되었기 때문이다.
생각보다 허탈한 이슈였지만, 해당 `useQuery`의 `useErrorBoundary` 옵션을 `false`로 오버라이딩함으로써 문제를 해결했다.
전역 클라이언트에 옵션을 세팅할 때는 이런 상황들을 종합적으로 고려하여 신중하게 세팅하자. (특히 Suspense나 ErrorBoundary의 경우)

### Breaking Change

Tanstack Query v5에서는 `useErrorBoundary`가 `throwOnError`로 변경되었다.
그뿐만 아니라 `throwOnError`에 `boolean`이 아닌 에러를 인자로 받는 function을 넣어 특정 에러에 대해서만 throw하도록 설계할 수 있다.

```typescript
export function shouldThrowError<T extends (...args: Array<any>) => boolean>(
  throwError: boolean | T | undefined,
  params: Parameters<T>,
): boolean {
  if (typeof throwError === 'function') {
    return throwError(...params) // 여기서 사용자가 정의한 함수를 실행하여 결과를 인계 받는다.
  }
  return !!throwError
}
```
