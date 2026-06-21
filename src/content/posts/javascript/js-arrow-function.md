# [#JS] Arrow Function

## 화살표 함수 기본 문법

ES6에서 추가된 함수 선언 방식이다.  
단일 표현식이면 `{}` 없이 암묵적 반환이 가능하다.  

```javascript
const add = (a, b) => a + b;
const greet = name => `Hello, ${name}!`;
const getObj = () => ({ key: 'value' }); // 객체 반환 시 ()로 감싸야 함
```

## 화살표 함수를 쓰면 안 되는 상황

### 1. 객체 메서드

```javascript
const person = {
  name: 'Baik',
  greet: () => {
    console.log(this.name); // undefined — this가 전역 객체를 가리킴
  },
};
```

### 2. 이벤트 리스너

```javascript
button.addEventListener('click', () => {
  console.log(this); // Window — 의도와 다름
});
```

### 3. 생성자 함수

화살표 함수는 prototype이 없어서 `new`로 호출할 수 없다.  

```javascript
const Foo = () => {};
new Foo(); // TypeError: Foo is not a constructor
```

### 4. arguments 객체

화살표 함수는 `arguments`를 상속한다.  

```javascript
const fn = () => {
  console.log(arguments); // 외부 스코프의 arguments 또는 에러
};
```

`arguments` 대신 rest 파라미터를 쓴다.  

```javascript
const fn = (...args) => {
  console.log(args); // 의도한 동작
};
```

## 핵심 차이: this 바인딩

일반 함수는 호출 방식에 따라 `this`가 동적으로 결정된다.  
화살표 함수는 선언 시점의 상위 스코프 `this`를 렉시컬하게 캡처한다.  

```javascript
class Timer {
  constructor() {
    this.count = 0;
  }

  start() {
    setInterval(() => {
      this.count++; // this가 Timer 인스턴스를 가리킴
    }, 1000);
  }
}
```
