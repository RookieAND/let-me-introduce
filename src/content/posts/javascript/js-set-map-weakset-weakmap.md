# [#JS] Set, Map, WeakSet, WeakMap

## Set

중복 없는 값의 집합이다.  
삽입 순서를 유지한다.  

```javascript
const set = new Set([1, 2, 2, 3, 3]);
set.size;         // 3
set.has(2);       // true
set.add(4);
set.delete(1);

for (const val of set) {
  console.log(val);
}

// 배열 중복 제거
const arr = [...new Set([1, 2, 2, 3])]; // [1, 2, 3]
```

## Map

키-값 쌍 저장소다.  
객체와 달리 키로 모든 타입을 쓸 수 있고, 삽입 순서를 유지한다.  

```javascript
const map = new Map();
map.set('name', 'Baik');
map.set(42, '숫자 키도 가능');
map.set({ id: 1 }, '객체 키도 가능');

map.get('name');  // 'Baik'
map.has(42);      // true
map.size;         // 3
map.delete('name');

for (const [key, value] of map) {
  console.log(key, value);
}
```

잦은 추가/삭제에서 일반 객체보다 성능이 좋다.  

## WeakSet

객체만 저장할 수 있는 Set이다.  
약한 참조를 가져서 객체가 GC되면 자동으로 제거된다.  
이터러블이 아니다. `add`, `delete`, `has`만 제공한다.  

```javascript
const ws = new WeakSet();
let obj = { id: 1 };
ws.add(obj);
ws.has(obj); // true

obj = null; // GC 후 자동 제거
```

## WeakMap

키가 반드시 객체인 Map이다.  
WeakSet과 마찬가지로 약한 참조를 사용한다.  
`keys()`, `values()`, `entries()` 메서드가 없다.  

```javascript
const cache = new WeakMap();

function process(obj) {
  if (!cache.has(obj)) {
    cache.set(obj, heavyComputation(obj));
  }
  return cache.get(obj);
}
```

obj가 더 이상 참조되지 않으면 캐시 항목도 자동으로 사라진다.  
메모리 누수 걱정 없이 메모이제이션할 때 유용하다.  
