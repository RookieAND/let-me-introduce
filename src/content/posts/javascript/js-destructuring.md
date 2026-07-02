# [#JS] Destructuring

배열의 값 또는 객체의 프로퍼티를 풀어서 개별 변수에 할당하는 문법이다.

## 객체 구조 분해

```javascript
const person = { name: 'Baik', age: 27, city: 'Seoul' };

const { name, age } = person;
console.log(name, age); // "Baik" 27
```

### 이름 변경

```javascript
const { name: userName, age: userAge } = person;
console.log(userName); // "Baik"
```

### 기본값

```javascript
const { name, job = '개발자' } = person;
console.log(job); // "개발자" — person에 job이 없으므로
```

### 중첩 객체

```javascript
const { address: { city } } = { name: 'Baik', address: { city: 'Seoul' } };
console.log(city); // "Seoul"
```

## 배열 구조 분해

인덱스 순서 기반이다.

```javascript
const [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log(first); // 1
console.log(rest);  // [3, 4, 5]
```

### 건너뛰기

```javascript
const [, second, , fourth] = [1, 2, 3, 4];
console.log(second, fourth); // 2 4
```

### 변수 교환

```javascript
let a = 1, b = 2;
[a, b] = [b, a];
console.log(a, b); // 2 1
```

## 함수 매개변수 구조 분해

```javascript
function greet({ name, greeting = 'Hello' }) {
  return `${greeting}, ${name}!`;
}

greet({ name: 'Baik' }); // "Hello, Baik!"
```

rest 연산자는 마지막에만 쓸 수 있고 뒤에 쉼표를 붙이면 안 된다.
