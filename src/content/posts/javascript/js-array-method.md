# [#JS] Array Method

ES6에서 추가된 배열 메서드들이다.

## Array.from()

이터러블 또는 유사 배열 객체를 실제 배열로 변환한다.
두 번째 인자로 매핑 함수를 넣을 수 있다.

```javascript
Array.from('hello'); // ['h', 'e', 'l', 'l', 'o']
Array.from({ length: 3 }, (_, i) => i + 1); // [1, 2, 3]
Array.from(new Set([1, 2, 2, 3])); // [1, 2, 3]
```

## Array.of()

인자를 그대로 배열의 요소로 만든다.
`Array(3)`은 빈 슬롯 3개짜리 배열이지만 `Array.of(3)`은 `[3]`이다.

```javascript
Array.of(1, 2, 3); // [1, 2, 3]
Array.of(7);       // [7]
Array(7);          // [ , , , , , , ] — 길이 7짜리 빈 배열
```

## find / findIndex

조건을 만족하는 첫 번째 요소 또는 인덱스를 반환한다.

```javascript
const nums = [1, 3, 5, 7, 9];
nums.find(n => n > 4);      // 5
nums.findIndex(n => n > 4); // 2
```

## fill

지정 범위를 특정 값으로 채운다.

```javascript
[1, 2, 3, 4, 5].fill(0, 1, 3); // [1, 0, 0, 4, 5]
new Array(5).fill(0);           // [0, 0, 0, 0, 0]
```

## some / every

```javascript
[1, 2, 3].some(n => n > 2);  // true — 하나라도 만족
[1, 2, 3].every(n => n > 0); // true — 모두 만족
[1, 2, 3].every(n => n > 1); // false
```

## copyWithin

배열 내부에서 요소를 복사해 덮어쓴다.

```javascript
[1, 2, 3, 4, 5].copyWithin(0, 3); // [4, 5, 3, 4, 5]
// index 3~끝을 복사해서 index 0부터 붙여넣기
```
