# [#JS] Variables and Data Types

## 변수 선언과 원시 타입

`let`으로 선언한 변수는 재할당과 재선언이 모두 가능하다.  
`const`는 둘 다 불가능해서 의도치 않은 수정을 막아준다.  

```javascript
let name = 'Baik';
name = 'Kim'; // 가능

const id = 42;
id = 0; // 오류
```

## 원시 타입과 참조 타입의 차이

원시 타입은 실제 값을 저장하고, 참조 타입은 메모리 주소를 저장한다.  

```javascript
let a = 1;
let b = a;
b = 2;
console.log(a); // 1 — 영향 없음

const arr1 = [1, 2, 3];
const arr2 = arr1;
arr2.push(4);
console.log(arr1); // [1, 2, 3, 4] — 같은 참조
```

## 원시값의 불변성

원시값이 바뀔 때 JS는 기존 메모리를 수정하지 않는다.  
새 메모리 공간을 할당하고 변수가 그쪽을 가리키게 바꾼다.  
더 이상 참조되지 않는 메모리는 GC가 자동으로 정리한다.  

## 7가지 원시 타입

| 타입 | 설명 |
|---|---|
| `number` | -(2^53 - 1) ~ (2^53 - 1), `NaN`, `Infinity` 포함 |
| `bigint` | Number 범위 초과 정수 |
| `string` | 문자열 |
| `boolean` | `true` / `false` |
| `undefined` | 초기화되지 않은 변수에 자동 할당 |
| `null` | 의도적인 빈 값 표시 |
| `symbol` | 항상 고유한 식별자 |

JS의 유연함이 오히려 버그를 만드는 이유다.  
TypeScript가 나온 배경이기도 하다.  
