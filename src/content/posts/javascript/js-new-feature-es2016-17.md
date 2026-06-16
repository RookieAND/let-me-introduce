# [#JS] New Feature in ES2016-17

## ES2016

### Array.prototype.includes()

`indexOf()` 대신 쓸 수 있다.
`NaN` 검사도 된다.

```javascript
const arr = [1, 2, 3, NaN];

arr.indexOf(NaN);   // -1 — 동작 안 함
arr.includes(NaN);  // true

arr.includes(2);    // true
arr.includes(2, 2); // false — index 2 이후에서 탐색
```

### 지수 연산자 (`**`)

`Math.pow()` 대신 쓸 수 있는 더 간결한 문법이다.

```javascript
2 ** 10;          // 1024
Math.pow(2, 10);  // 1024 — 기존 방식
```

---

## ES2017

### padStart / padEnd

문자열 앞뒤를 패딩해서 목표 길이로 만든다.

```javascript
'5'.padStart(3, '0'); // "005"
'hi'.padEnd(5, '.');  // "hi..."
```

### Object 메서드

```javascript
const obj = { a: 1, b: 2 };

Object.entries(obj); // [['a', 1], ['b', 2]]
Object.values(obj);  // [1, 2]
```

### 후행 쉼표 (Trailing Commas)

함수 매개변수, 객체, 배열의 마지막 항목 뒤에 쉼표를 허용한다.

```javascript
function greet(
  name,
  greeting, // trailing comma
) {}

const arr = [1, 2, 3,]; // OK
```

git diff에서 마지막 항목 추가 시 이전 줄 변경이 없어진다는 장점이 있다.

### Atomics

`SharedArrayBuffer`와 함께 쓰는 원자적 연산이다.
멀티스레드 환경(Web Workers)에서 경쟁 조건을 방지한다.

```javascript
const buffer = new SharedArrayBuffer(4);
const view = new Int32Array(buffer);

Atomics.add(view, 0, 5);
Atomics.load(view, 0); // 5
```
