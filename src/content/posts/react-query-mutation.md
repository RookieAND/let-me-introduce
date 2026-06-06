## Mutation이란?

Mutation은 서버에 Side-Effect를 일으키도록 하는 함수다. 인계 받은 쿼리 값을 기반으로 새로운 결과를 도출해 서버에 변경 사항을 적용하도록 요청한다. 보통 POST, PUT, DELETE 같이 데이터를 수정하거나 추가하는 요청과 함께 사용된다.

---

## useQuery와의 차이

**useQuery**는 자동으로 실행된다. `refetchOnWindowFocus`, `refetchInterval` 등의 옵션으로 백그라운드에서 자동 갱신된다.

**useMutation**은 사용자가 직접 언제 실행할지를 결정해야 한다. 반환되는 `mutate` 함수를 호출해야 mutation이 시행된다.

```typescript
function AddComment({ id }) {
  const addComment = useMutation({
    mutationFn: (newComment) =>
      axios.post(`/posts/${id}/comments`, newComment),
  });

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      // mutate 함수를 호출해야 실행됨
      addComment.mutate(new FormData(event.currentTarget).get('comment'));
    }}>
      <textarea name="comment" />
      <button type="submit">Comment</button>
    </form>
  );
}
```

또한 useQuery는 하나의 queryCache를 구독하는 여러 queryObserver를 생성해 동일한 결과를 공유한다. useMutation은 호출할 때마다 1:1로 대응하는 mutationCache에 결과가 저장된다.

---

## useMutation 콜백

`onSuccess`, `onError`, `onSettled`, `onMutate` 옵션으로 작업 흐름을 제어할 수 있다.

```typescript
useMutation(addTodo, {
  onSuccess: (data, variables, context) => {
    // I will fire first
  },
  onError: (error, variables, context) => {
    // I will fire first
  },
});

mutate(todo, {
  onSuccess: (data, variables, context) => {
    // I will fire second!
  },
});
```

**useMutation**에 정의된 콜백이 먼저 실행되고, **mutate**에 정의된 콜백이 이후 실행된다. 컴포넌트가 중간에 unmount되면 callback이 더 이상 실행되지 않으므로 주의해야 한다.

- `variables`: mutate 함수 호출 시 넘긴 인자
- `data`: mutationFn이 실행된 결과 값 (onSuccess, onSettled)
- `context`: onMutate 콜백 함수가 반환한 값 (onError, onSettled)

---

## 결과를 업데이트하는 세 가지 방법

### Query Invalidation

```typescript
const mutation = useMutation({
  mutationFn: addTodo,
  onSuccess: () => {
    // ['todos'] 키를 가진 쿼리들을 stale로 만들어 refetch 유도
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

`invalidateQueries`는 특정 쿼리의 status를 즉시 stale로 변경하며 백그라운드 refetch를 유도한다. staleTime 설정을 무시하며, 렌더링 중인 쿼리도 백그라운드에서 refetch한다.

Query Filter로 더 정교하게 제어할 수 있다.

```typescript
// 1번 쿼리(key: ['todos'])와 2번 쿼리(key: ['todos', { page: 1 }]) 둘 다 invalid
queryClient.invalidateQueries({ queryKey: ['todos'] });

// 2번 쿼리만 invalid (exact)
queryClient.invalidateQueries({ queryKey: ['todos', { page: 1 }], exact: true });

// page 값이 1 이상인 쿼리만 invalid (predicate)
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' && query.queryKey[1]?.page >= 1,
});
```

### Updates from Mutation Responses

```typescript
const useMutateTodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editTodo,
    onSuccess: (data, variables) => {
      // mutate 결과를 직접 캐시에 반영 — 불필요한 refetch 없음
      queryClient.setQueryData(['todo', { id: variables.id }], data);
    },
  });
};
```

mutation 결과가 유효한 값임을 보장할 때는 굳이 refetch를 유도하지 않고 서버 반환값으로 즉시 캐시를 업데이트한다. 단, 불변성을 지켜서 새 객체나 배열로 업데이트해야 한다.

```typescript
// ❌ 직접 수정 — 버그 발생 가능
queryClient.setQueryData(['posts', { id }], (oldData) => {
  if (oldData) oldData.title = 'my new post title';
  return oldData;
});

// ✅ 불변성 유지
queryClient.setQueryData(['posts', { id }], (oldData) =>
  oldData ? { ...oldData, title: 'my new post title' } : oldData
);
```

### Optimistic Update

mutation이 성공할 것이라 가정하고 **미리 캐시 값을 업데이트**하는 기법이다. 실패하면 이전 값으로 롤백한다.

```typescript
useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // 다른 refetch가 수정을 덮어쓰지 않도록 취소
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    // 롤백을 위해 이전 값 저장
    const previousTodos = queryClient.getQueryData(['todos']);
    // 낙관적 업데이트
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
    return { previousTodos };
  },
  onError: (err, newTodo, context) => {
    // 실패 시 이전 값으로 롤백
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
  onSettled: () => {
    // 성공/실패 모두 최종 refetch로 서버와 동기화
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

`onMutate`에서 `cancelQueries`를 호출하는 이유는 Optimistic Update 진행 중 외부 refetch가 발생하면 데이터가 재수정될 수 있기 때문이다. 거의 확실하게 요청이 성공할 케이스에만 적용하자.
