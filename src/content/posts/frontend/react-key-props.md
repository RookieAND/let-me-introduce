## 재조정 알고리즘 (Reconciliation)

React 는 상태나 props 가 바뀔 때마다 새로운 Virtual DOM 트리를 만든다.  
그리고 이전 트리와 비교해 실제로 변한 부분만 DOM 에 반영한다.  

이 비교 과정이 재조정 (Reconciliation) 이다.  

단순하게 구현한다면 두 트리를 재귀적으로 전부 비교해야 하는데, 이 때 시간 복잡도는 `O(n³)` 이 된다.  
노드가 1000개면 10억 번의 연산이 필요하다. 실용적이지 않다.  

React 는 두 가지 가정을 세워 휴리스틱 알고리즘으로 이를 `O(n)` 으로 줄였다.  

1. **다른 타입의 엘리먼트는 다른 트리를 만든다.** `<div>` 가 `<span>` 으로 바뀌면 하위 트리를 통째로 교체한다.
2. **`key` props 로 개발자가 변경·삭제된 요소를 명시할 수 있다.** 목록 렌더링에서 어떤 항목이 같은 항목인지 React 에게 알려주는 방법이다.

---

## Key Props 란?

React 공식 문서는 `key` 를 이렇게 설명한다.  

> If the "key" attribute is present, React uses it as a way to identify an element of the same type among its siblings during re-renders.  

같은 부모 아래 있는 자식 컴포넌트들 사이에서, 어떤 게 어떤 건지 식별하기 위한 식별자다.  
매 렌더링마다 React 는 새 트리와 이전 트리를 비교하고, 변화가 없는 컴포넌트를 찾아 재사용한다.  
`key` 가 이 식별의 기준이 된다.  

---

## 리렌더링 시 변화를 감지하는 방법

`key` 가 있을 때와 없을 때, React 의 동작이 달라진다.  

- **`key` 가 있으면** — 이전 트리의 `key` 와 새 트리의 `key` 가 같은지 비교한다.
- **`key` 가 없으면** — 자식 요소의 배열 인덱스를 기본 `key` 로 사용한다.

비교 이후 처리는 세 가지 경우로 나뉜다.  

- **unmount** — 이전 트리에는 있지만 새 트리에 없는 `key`: 해당 컴포넌트를 언마운트한다.
- **mount** — 이전 트리에는 없지만 새 트리에 생긴 `key`: 새롭게 마운트한다.
- **update (re-render)** — 이전·새 트리 모두에 존재하는 `key`: props 를 비교해 리렌더링한다.

---

## 랜덤 Key 의 문제점

`key` 에 `Math.random()` 같은 값을 넣으면 매 렌더링마다 다른 `key` 가 생성된다.  
React 입장에서는 이전에 본 적 없는 `key` 이므로, 매번 전체를 unmount 후 다시 mount 한다.  

DOM 을 직접 조작하는 것이기 때문에 비용이 크다.  
더불어 `React.memo` 로 메모이제이션한 컴포넌트도 전부 무효화된다.  
매 렌더링마다 `key` 가 달라지면 React 는 완전히 새로운 컴포넌트로 취급하기 때문이다.  

---

## 배열 index 를 Key 로 쓰면 안 되는 경우

배열의 길이가 고정된 **정적 목록**이라면 index 를 `key` 로 써도 괜찮다.  
unmount 없이 re-render 만 일어나기 때문이다.  

문제는 **동적으로 순서나 길이가 바뀌는 목록**이다.  

```typescript
const CountriesList = ({ countries }) => {
  const [sort, setSort] = useState('asc');
  const sortedCountries = orderBy(countries, 'name', sort);

  return (
    <div>
      <button onClick={() => setSort(sort === 'asc' ? 'desc' : 'asc')}>
        toggle sorting: {sort}
      </button>
      {sortedCountries.map((country, index) => (
        <ItemMemo country={country} key={index} />
      ))}
    </div>
  );
};

const ItemMemo = React.memo(Item);
```

정렬이 `asc` → `desc` 로 바뀌는 상황을 가정하자.  

```
asc  정렬: ['China', 'Japan', 'Korea'] → key: 0=China,  1=Japan, 2=Korea
desc 정렬: ['Korea', 'Japan', 'China'] → key: 0=Korea,  1=Japan, 2=China
```

React 는 `key` 가 같으면 동일한 컴포넌트로 인식한다.  
`key=0` 은 정렬 전후 모두 `0` 이기 때문에, React 는 DOM 을 다시 만들지 않고 props 만 교체한다.  

### React.memo 가 무효화되는 이유

`ItemMemo` 는 `React.memo` 로 감싸져 있어 props 가 같으면 re-render 를 건너뛰어야 한다.  
하지만 정렬 후 `key=0` 의 `country` props 가 `China → Korea` 로 바뀌었다.  
`React.memo` 의 비교 결과가 "다르다" 가 나와 매번 re-render 가 발생한다.  

최적화를 위해 `React.memo` 를 썼지만 index key 때문에 매 정렬마다 모든 아이템이 re-render 된다.  

### State Leakage 문제

컴포넌트 내부에 별도의 state (체크박스, 입력값 등) 가 있으면 더 심각한 문제가 생긴다.  

```
정렬 전: index=0 위치의 China 아이템이 체크된 상태
정렬 후: index=0 위치가 Korea 로 바뀌었지만
         React 는 같은 컴포넌트로 인식 → China 의 state 가 Korea 에 그대로 이어짐
```

잘못된 상태 유지, State Leakage 버그로 이어진다.  

---

## 올바른 해결 방법

```typescript
// ✅ 고유 식별자를 key 로 사용
{sortedCountries.map((country) => (
  <ItemMemo country={country} key={country.name} />
))}
```

`country.name` 처럼 고유한 값을 `key` 로 사용하면 세 가지를 한 번에 해결한다.  

- 정렬 후에도 `'China'` 는 항상 `key='China'` 를 유지한다. React 가 정렬 전후에 동일한 아이템임을 올바르게 인식한다.
- `{ country: China }` props 가 바뀌지 않았으므로 `React.memo` 가 re-render 를 정확히 건너뛴다.
- 내부 state 도 올바른 아이템에 묶여서 유지된다.

`key` 는 목록 내 항목의 **정체성**을 나타낸다.  
정체성이 바뀌지 않는다면 `key` 도 바뀌지 않아야 한다.  
