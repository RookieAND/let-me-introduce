# [#JS] Spread, Rest Operator

같은 `...` 문법이지만 쓰이는 위치에 따라 역할이 다르다.

## Spread 연산자 — 펼치기

이터러블 객체를 개별 요소로 펼친다.

### 배열 복사와 합치기

```javascript
const origin = [1, 2, 3];
const copy = [...origin]; // 얕은 복사
const merged = [...origin, 4, 5]; // [1, 2, 3, 4, 5]
```

### 함수 인자 전달

```javascript
const nums = [1, 2, 3];
Math.max(...nums); // 3
// ES5: Math.max.apply(null, nums)
```

### 객체 합치기

```javascript
const defaults = { color: 'red', size: 'M' };
const custom = { size: 'L', weight: 100 };
const merged = { ...defaults, ...custom };
// { color: 'red', size: 'L', weight: 100 }
// 나중에 나온 키가 우선
```

## Rest 연산자 — 모으기

여러 요소를 하나로 압축한다.

### 배열 구조 분해

```javascript
const [first, ...rest] = [1, 2, 3, 4, 5];
console.log(first); // 1
console.log(rest);  // [2, 3, 4, 5]
```

### 함수 가변 인자

```javascript
function sum(first, second, ...others) {
  const total = others.reduce((acc, n) => acc + n, 0);
  return first + second + total;
}

sum(1, 2, 3, 4, 5); // 15
```

## 제약

Rest 연산자는 마지막 위치에만 올 수 있고, 하나만 쓸 수 있다.

```javascript
const [...rest, last] = [1, 2, 3]; // SyntaxError
```
