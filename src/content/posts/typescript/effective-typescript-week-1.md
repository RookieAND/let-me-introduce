# 이펙티브 타입스크립트 1주차 스터디

## TS와 JS 간의 관계

### Typescript is superset of Javascript

- TypeScript는 JavaScript의 상위 호환(superset)입니다. 문법적으로도 적용되어 JS로 작성된 오류 없는 코드는 유효한 TS 코드입니다.
- JS 코드의 이슈는 문법 오류가 아니더라도 타입 체크 과정에서 발견될 수 있습니다. 다만 문법 유효성과 동작 이슈는 서로 다릅니다.
- TS 타입 체커의 오류에도 불구하고 TS는 코드를 JS로 파싱하고 실행할 수 있습니다.

### JS to TS is Ok, but TS to JS is...

모든 JS 프로그램은 TS 프로그램이지만, "모든 TS 프로그램은 JS 프로그램이 아닙니다." TS의 타입 지정 문법이 JS에 없기 때문입니다.  

```typescript
function greet(who: string): string {
  console.log(`Hello, ${who}!`);
}
```

TS는 타입 추론을 자동으로 수행합니다:  

```typescript
let city = 'new york city';
console.log(city.toUppercase()); // TypeError 발생
```

인터페이스를 활용하면 더욱 명확합니다:  

```typescript
interface Nation {
  name: string;
  capital: string;
}

const nations: Nation[] = [
  { name: 'Japan', capital: 'Tokyo' },
  { name: 'Korea', capitol: 'Seoul' }, // 오류: 형식이 맞지 않음
];
```

### 타입 체커 통과 유무에 따른 차이점

```typescript
const a = null + 7;  // TS 오류
const b = [] + 12;   // TS 오류

const b = [];        // any[] 로 추론
```

모든 JS 코드가 TS 타입 체커를 통과하는 것은 아닙니다.  

### TS의 타입 체커는 정확하지 않을 때가 있다

```typescript
const name = ['Baik', 'Kim'];
console.log(name[2].toUpperCase()); // 런타임 오류 발생
```

TS의 정적 타입이 항상 정확성을 보장하지는 않습니다.  

---

## TS 설정 이해하기

### noImplicitAny

```typescript
function add(a, b) {
  return a + b;
}
add(10, null);
```

`noImplicitAny` 옵션은 TS가 암시적으로 타입을 `any`로 추론하는 것을 방지합니다.  

### strictNullChecks

```typescript
const x: number = null; // 옵션이 꺼져 있으면 허용

const element = document.getElementById('status');
// 타입 가드 사용
if (element) {
  element.innerText = 'Done!';
}
```

---

## 코드 생성과 타입은 무관계하다

### 런타임 과정에서는 타입 체크가 불가능하다

TS의 타입은 컴파일 시 모두 제거되므로 런타임에서 역할을 할 수 없습니다.  

**태그 기법으로 해결:**  

```typescript
interface Square {
  kind: 'square';
  width: number;
}

interface Rectangle {
  kind: 'rectangle';
  width: number;
  height: number;
}

type Shape = Square | Rectangle;

function calculateArea(shape: Shape) {
  if (shape.kind === 'square') {
    return shape.width ** 2;
  }
  return shape.width * shape.height;
}
```

### 타입 연산은 런타임에 영향을 주지 않는다

```typescript
function asNumber(val: number | string): number {
  return typeof val === 'string' ? Number(val) : val;
}
```

TS 타입 체커는 오류를 지적하지만 값 자체를 정제하지 않습니다. 런타임 검증이 필요합니다.  

---

## 구조적 타이핑에 익숙해지기

### JS는 덕 타이핑 기반이다

**덕 타이핑(구조적 서브 타이핑)** 은 객체의 속성과 메소드 집합이 타입을 결정하는 방식입니다:  

```typescript
interface Vector2D {
  x: number;
  y: number;
}

interface NamedVector {
  name: string;
  x: number;
  y: number;
}

function calculateLength(v: Vector2D) {
  return Math.sqrt(v.x ** 2 + v.y ** 2);
}

const nv = { name: 'Test', x: 3, y: 4 };
const nvLength = calculateLength(nv); // 5
```

NamedVector는 Vector2D와 상속 관계가 없지만 필요한 속성을 가지고 있어 호환됩니다.  

**타입은 봉인되어 있지 않습니다:**  

```typescript
function calculateLengthL1(v: Vector3D) {
  let length = 0;
  for (const axis of Object.keys(v)) {
    const coord = v[axis]; // axis가 x, y, z 외 속성도 가질 수 있음
    length += Math.abs(coord);
  }
  return length;
}
```

---

## 만악의 근원, any 타입 피하기

### any는 타입 안전성이 없다

```typescript
let age: number;
age = '12' as any; // 허용되지만 좋지 않음
```

### any 타입에는 TS의 언어 서비스가 적용되지 않음

`any` 타입은 자동완성, 속성 목록 등 TS의 유용한 기능을 받지 못합니다. `any`는 타입 설계를 감추고 코드의 신뢰도를 떨어트립니다.  
