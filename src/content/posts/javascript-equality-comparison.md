# 📖 Introduction

> JS를 처음 배울 때 나를 멘붕하게 했던 것, 바로 **==** 와 **===** ...

작년 5월 경에 JS를 처음 배웠을 때 느슨한 비교와 엄격한 비교 연산자를 처음 접하였다. 처음에는 대체 이것들을 왜 나누어서 비교하는 걸까 싶기도 했고, JS가 아무리 자유로운 언어라지만 이건 해도해도 너무하지 않나 싶을 정도로 나를 멘붕하게 만든 친구들이었다.

최근 JS 스터디를 진행하면서 Map이나 Set 자료구조의 경우 요소의 중복 여부를 SameValueZero 알고리즘으로 판별한다는 이야기를 들었는데.. 이게 대체 뭔지 알아야 글을 작성하던가 하지 원, 난생 처음 들어보는 말이라 이 또한 묶어서 오늘 정리를 하고자 한다.

# ✒️ Equality Calculation of JS

### ✏️ 엄격한 비교 (===)

- `===` 연산자의 경우 양 쪽의 값을 **형 변환 하지 않기에**, 타입이 다를 경우 `false` 를 반환한다.
- 엄격한 비교에서 `NaN` 은 어떤 것도 동일하지 않다고 판별한다. 따라서 `NaN === NaN` 은 `false` 이다.
- 하지만 `+0` 과 `-0` 의 경우에는 같다고 판단한다.

```javascript
const num = 0;
const obj = new String("0"); // String wrapper 객체
const str = "0";
const bool = false;

console.log(num === obj); // false
console.log(num === str); // false
console.log(obj === str); // false
console.log(null === undefined); // false
console.log(NaN === NaN); // false
console.log(+0 === -0); // true
```

### ✏️ 느슨한 비교 (==)

- `==` 연산자의 경우 양 쪽의 값을 정해진 규칙에 따라 **공통의 타입으로 형 변환**을 한다.
- 이후 양 쪽의 값을 엄격한 비교 `(===)` 를 통해 서로 같은지를 판별한다.
- `undefined` 와 `null` 은 서로 같다고 판별한다. 따라서 `undefined == null` 은 `true` 이다.

```javascript
const num = 0;
const obj = new String("0");
const str = "0";
const bool = false;

console.log(num == obj); // true
console.log(num == str); // true
console.log(obj == str); // true
console.log(null == undefined); // true
console.log(NaN == NaN); // true
console.log(+0 == -0); // true
```

### ✏️ SameValue

- `===` 연산자와 유사하게 동작하나 `NaN` 과 `NaN` 을 항상 같다고 판별한다.
- 또한 `+0` 과 `-0` 의 경우에는 서로 다르다고 판단한다.
- SameValue 동등 알고리즘의 경우 `Object.is` 메서드에서 사용된다.

```javascript
// SameValue 알고리즘 코드 (Object.is Polyfill 코드 참조)
if (x === y) {
	// 만약 엄격한 비교에서 값이 같다고 판별되었다면
	// x와 y가 각각 +0, -0 인지를 판별하기 위한 식
	return x !== 0 || 1 / x === 1 / y;
} else {
	// 만약 엄격한 비교에서 같지 않다고 판별되었다면,
	// x와 y가 둘 다 NaN 인지를 판별하기 위한 식
	return x !== x && y !== y;
}

Object.is(+0, -0); // false
Object.is(-0, -0); // true
Object.is(NaN, 0 / 0); // true
```

- 첫번째 식인 `x !== 0 || 1 / x === 1 / y` 은 아래의 조건을 판별한다.

  1. `x` 가 0이 아니라면 `y` 도 0이 아니며, `x === y` 이므로 `x` 와 `y` 가 `NaN` 일 경우는 고려하지 않아도 된다.
  2. `x` 가 `+0` 이라면 `1 / x` 는 `Infinity` 이고 `-0` 라면 `-Infinity` 이다. 따라서 `x` 와 `y` 의 부호가 다르면 `false` 를 반환한다.
  3. 그 외의 경우에는 엄격한 비교 연산을 통해 `x` 와 `y` 가 서로 같음이 보장되었으므로 무조건 `true` 를 반환한다.

- 두번째 식인 `x !== x && y !== y` 은 아래의 조건을 판별한다.

  1. 엄격한 비교 연산을 통해 자기 자신이 같지 않은 경우 `(x !== x)` 는 `NaN` 외에는 존재하지 않는다.
  2. 따라서 `x` 와 `y` 가 둘 다 `NaN` 인 경우에는 `x !== x` 와 `y !== y` 가 모두 `true` 를 반환하므로, 결과적으로 `true` 를 반환한다.
  3. 그 외의 경우에는 x와 y가 실질적으로 같지 않기 때문에 `false` 를 반환할 수밖에 없다.

### ✏️ SameValueZero

- `===` 연산자와 동일하지만 `NaN` 과 `NaN` 을 항상 같다고 판별한다.
- SameValue 와는 다르게 `+0` 과 `-0` 의 경우에도 서로 같다고 판별한다. (그래서 Zero 라는 말이 붙었나?)
- SameValueZero 알고리즘은 Map, Set에서 값이 같은지를 판별하는 알고리즘에 주로 쓰인다.

```javascript
// SameValueZero 알고리즘 코드 (SameValue에서 일부 수정)
if (x !== y) {
	// 만약 엄격한 비교에서 같지 않다고 판별되었다면,
	// x와 y가 둘 다 NaN 인지를 판별하기만 하면 된다.
	return x !== x && y !== y;
}
```
