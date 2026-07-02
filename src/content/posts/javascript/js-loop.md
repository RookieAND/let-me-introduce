# [#JS] Loop

## for 문

```javascript
for (let i = 0; i < 5; i++) {
  console.log(i);
}
```

## forEach

배열의 각 요소에 콜백을 실행한다.
`break`나 `return`으로 중단할 수 없다.

```javascript
[1, 2, 3].forEach((num, index) => {
  console.log(index, num);
});
```

## for...of

ES6에서 추가된 이터러블 순회 문법이다.
`[Symbol.iterator]` 프로퍼티가 있는 객체라면 모두 순회할 수 있다.

```javascript
const fruits = ['apple', 'banana', 'cherry'];
for (const fruit of fruits) {
  console.log(fruit);
}

// 문자열도 가능
for (const char of 'hello') {
  console.log(char);
}

// Map과 Set도 가능
const map = new Map([['a', 1], ['b', 2]]);
for (const [key, value] of map) {
  console.log(key, value);
}
```

## for...in

객체의 열거 가능한 프로퍼티 키를 순회한다.

```javascript
const obj = { a: 1, b: 2, c: 3 };
for (const key in obj) {
  console.log(key, obj[key]);
}
```

**주의:** 프로토타입 체인의 열거 가능한 속성까지 포함된다.
자신의 속성만 필요하면 `hasOwnProperty`로 걸러야 한다.

```javascript
for (const key in obj) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    console.log(key);
  }
}
```

배열 순회에는 `for...of`가 더 적합하다.
`for...in`은 인덱스를 문자열로 반환하고 순서 보장도 안 된다.
