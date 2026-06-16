# 이펙티브 타입스크립트 4주차 스터디

## 추론 가능한 타입을 사용하여 장황한 코드 방지하기

TS의 타입 추론이 가능하다면 명시적 타입 구문은 필요하지 않다.

```typescript
let x: number = 12; // 불필요
let x = 12;         // 더 간결
```

객체와 배열도 자동으로 추론된다.

```typescript
const person = {
  name: 'Baik',
  born: { where: 'Seoul', when: '1996' },
};
// { name: string; born: { where: string; when: string } }
```

**타입 어노테이션이 유효한 경우:**

- 함수 매개변수와 반환 타입
- 추론이 불명확한 경우

```typescript
interface Product {
  id: number;
  name: string;
  price: number;
}

function logProduct(product: Product) {
  const { id, name, price } = product; // 각각 추론됨
  console.log(id, name, price);
}
```

---

## 다른 타입에는 다른 변수 사용하기

변수의 값은 바뀔 수 있지만 타입은 일반적으로 바뀌지 않는다.

```typescript
let id = '12-34-56';
id = 123456; // 오류 — string에 number 할당 불가
```

유니온으로 해결할 수 있지만 더 복잡해진다.

```typescript
let id: string | number = '12-34-56';
id = 123456; // 정상이지만 다루기 까다롭다
```

별도 변수를 쓰는 게 낫다.

```typescript
const serialId = '12-34-56';
const numericId = 123456;
```

타입이 다르면 변수도 분리하는 것이 의도를 더 명확히 전달한다.

---

## 타입 넓히기

`const`로 선언하면 리터럴 타입으로, `let`으로 선언하면 더 넓은 타입으로 추론된다.

```typescript
const x = 'x'; // type: 'x'
let y = 'x';   // type: string
```

배열과 객체는 `const`여도 내부 값이 변할 수 있으므로 넓게 추론된다.

```typescript
const v = { x: 1 }; // { x: number }
v.x = 3; // 허용
```

더 좁은 타입이 필요하면 `as const`를 사용한다.

```typescript
const v = { x: 1, y: 2 } as const;
// { readonly x: 1; readonly y: 2 }
```

---

## 타입 좁히기

TS는 조건문과 타입 가드로 타입을 좁혀나간다.

```typescript
function contains(text: string, terms: string | string[]) {
  const termList = Array.isArray(terms) ? terms : [terms];
  // termList: string[]
}
```

### instanceof와 typeof

```typescript
function processInput(input: HTMLElement | null) {
  if (input instanceof HTMLInputElement) {
    input.value; // HTMLInputElement
  }
}
```

### 사용자 정의 타입 가드

```typescript
function isInputElement(el: HTMLElement): el is HTMLInputElement {
  return 'value' in el;
}
```

`el is HTMLInputElement`처럼 반환 타입을 명시하면 함수 밖에서도 타입이 좁혀진다.

---

## 한꺼번에 객체 생성하기

객체는 한 번에 생성하는 것이 타입 추론에 유리하다.

```typescript
// 이렇게 하면 안 된다
const pt = {};
pt.x = 3; // 오류 — {} 타입에 x 없음
pt.y = 4; // 오류
```

```typescript
// 한 번에 생성
const pt = { x: 3, y: 4 }; // 정상

interface Point {
  x: number;
  y: number;
}

const pt: Point = { x: 3, y: 4 };
```

나중에 속성을 추가해야 한다면 스프레드 연산자로 새 객체를 만든다.

```typescript
const pt = { x: 3, y: 4 };
const id = { name: 'Pythagoras' };
const namedPoint = { ...pt, ...id };
// { x: number; y: number; name: string }
```
