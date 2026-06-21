# [#JS] Logical Operations

## Boolean 타입

`true`와 `false` 두 가지 값만 가진다.  
Boolean 래퍼 객체를 조건문에 쓰면 안 된다. null이 아닌 객체는 무조건 truthy로 평가된다.  

```javascript
const b = new Boolean(false);
if (b) {
  console.log('실행됨'); // 실행된다
}
```

## 논리 연산자

- `!` — boolean 반전
- `&&` — 양쪽 모두 true일 때 true
- `||` — 하나라도 true면 true

## 동등 비교

`==`는 타입 강제 변환(coercion) 후 비교하고, `===`는 타입까지 일치해야 한다.  

```javascript
0 == false;  // true
0 === false; // false
```

실무에서는 `===`를 기본으로 쓰는 게 맞다.  

## 삼항 연산자

```javascript
const result = score >= 60 ? '합격' : '불합격';
```

## 단락 평가 (Short-circuit Evaluation)

`&&`는 첫 번째가 falsy면 바로 반환한다.  
`||`는 첫 번째가 truthy면 바로 반환한다.  

```javascript
const user = null;
const name = user && user.name; // null

const displayName = user || '익명';  // '익명'
```

null 체크나 기본값 설정에 자주 쓰인다.  
