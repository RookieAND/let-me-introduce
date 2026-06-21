# [#JS] Symbol

## Symbol이란?

항상 고유한 값을 만드는 원시 타입이다.  
주로 객체 프로퍼티의 식별자로 쓴다.  

```javascript
const s1 = Symbol('description');
const s2 = Symbol('description');

s1 === s2; // false — 설명이 같아도 항상 다르다
```

## 프로퍼티 키 충돌 방지

외부 라이브러리나 다른 모듈의 객체에 프로퍼티를 추가할 때 기존 키와 충돌을 막는다.  

```javascript
const id = Symbol('id');
const user = { name: 'Baik' };

user[id] = 12345;
console.log(user[id]); // 12345
console.log(user);     // { name: 'Baik' } — 심볼 키는 보이지 않음
```

## Symbol의 비열거성

`for...in`, `Object.keys()`, `JSON.stringify()`에서 제외된다.  

```javascript
const obj = { a: 1, [Symbol('b')]: 2 };
Object.keys(obj); // ['a'] — 심볼 키 미포함
JSON.stringify(obj); // '{"a":1}' — 심볼 키 제외

// 심볼 키만 가져오려면
Object.getOwnPropertySymbols(obj); // [Symbol(b)]
```

## Symbol.for() — 전역 레지스트리

같은 키로 생성하면 동일한 심볼을 반환한다.  
모듈 간 공유에 사용한다.  

```javascript
const s1 = Symbol.for('shared');
const s2 = Symbol.for('shared');

s1 === s2; // true

Symbol.keyFor(s1); // 'shared'
Symbol.keyFor(Symbol('unregistered')); // undefined
```

`Symbol()`은 전역 레지스트리에 등록되지 않는다.  
`Symbol.for()`은 등록된다.  
