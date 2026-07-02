# [#JS] Default Function Parameter

## ES6 이전의 방식

인자가 없으면 `undefined`가 들어와서 조건문으로 처리해야 했다.

```javascript
function greet(name) {
  name = name || 'stranger';
  return `Hello, ${name}!`;
}
```

## 기본 매개변수 문법

ES6부터 함수 선언 시점에 기본값을 지정할 수 있다.

```javascript
function getLocation(city = 'Milan', country = 'Italy', continent = 'Europe') {
  return `${city}, ${country}, ${continent}`;
}

getLocation(); // "Milan, Italy, Europe"
getLocation('Seoul', 'Korea'); // "Seoul, Korea, Europe"
```

## 순서 규칙

기본값이 있는 매개변수는 반드시 기본값이 없는 매개변수 뒤에 와야 한다.

```javascript
function greet(greeting = 'Hello', name) { // 의도대로 동작하지 않을 수 있음
  return `${greeting}, ${name}!`;
}

function greet(name, greeting = 'Hello') { // 올바른 순서
  return `${greeting}, ${name}!`;
}
```

## arguments 객체

전달된 모든 인자에 접근할 수 있다.
가변 인자 함수를 만들 때 유용하다.

```javascript
function addNum() {
  let sum = 0;
  for (let i = 0; i < arguments.length; i++) {
    sum += arguments[i];
  }
  return sum;
}

addNum(1, 2, 3, 4, 5); // 15
```

화살표 함수에서는 쓸 수 없으므로, rest 파라미터(`...args`)를 대신 사용한다.
