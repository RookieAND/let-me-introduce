# [#JS] var, const, let

## 세 키워드 비교

| | var | let | const |
|---|---|---|---|
| 스코프 | 함수 | 블록 | 블록 |
| 재선언 | 가능 | 불가 | 불가 |
| 재할당 | 가능 | 가능 | 불가 |
| 호이스팅 초기화 | undefined | TDZ | TDZ |

## var의 문제점

함수 스코프라 블록을 무시한다.  

```javascript
for (var i = 0; i < 3; i++) {}
console.log(i); // 3 — 루프 밖에서 접근 가능
```

같은 이름으로 재선언해도 에러가 없다.  

```javascript
var x = 1;
var x = 2; // 정상
```

## const와 객체

`const`는 변수가 가리키는 메모리 주소를 고정한다.  
객체 내부 프로퍼티는 여전히 변경 가능하다.  

```javascript
const obj = { name: 'Baik' };
obj.name = 'Kim'; // 가능

const arr = [1, 2, 3];
arr.push(4); // 가능
```

진짜 불변이 필요하면 `Object.freeze()`를 쓴다.  

## Temporal Dead Zone (TDZ)

`let`과 `const`는 선언 전에 접근하면 `ReferenceError`가 발생한다.  

```javascript
console.log(x); // ReferenceError
let x = 1;
```

`var`는 같은 상황에서 `undefined`를 반환한다.  
이 차이가 버그를 만드는 이유다.  

**결론:** `var`는 버리고 `const`를 기본으로, 재할당이 필요할 때만 `let`을 쓴다.  
