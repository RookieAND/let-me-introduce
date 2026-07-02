# 이펙티브 타입스크립트 2주차 스터디

## TS의 타입 시스템

### 편집기를 사용하여 타입 시스템 탐색하기

- 타입스크립트 설치 시 **타입스크립트 컴파일러**와 **타입스크립트 서버** 실행 가능
- 타입스크립트는 **언어 서비스** 제공: 코드 자동 완성, 도움말, 포맷팅, 검색 및 리팩터링

### Typescript 아키텍처

1. **컴파일러**: 파서 → 바인더 → 타입 체커 → 에미터
2. **언어 서비스**: 컴파일과 도움말, 포맷팅, 색상 지정 기능 제공
3. **독립된 서버(tsserver)**: IDE와 통합되어 언어 서비스 제공

```typescript
function sayHi(msg: string | null) {
  if (msg) {
    console.log(msg); // string으로 좁혀짐
  }
}
```

---

## 타입 대수 이해하기

### 타입은 값들의 집합

- **최상위 타입**: `unknown` (모든 값 포함)
- **최하위 타입**: `never` (어떤 값도 미포함)

### 집합 관점의 타입 체커

```typescript
type A = 'A';
type B = 'B';
type AB = A | B;

const a: AB = 'A'; // 정상
const c: AB = 'C'; // 오류
```

### 인터섹션 타입과 extends

```typescript
interface Person {
  name: string;
}

interface LifeSpan {
  birth: Date;
  death?: Date;
}

type PersonSpan = Person & LifeSpan; // 두 인터페이스의 교집합
```

### keyof 관련 교차 공식

```typescript
// keyof (A & B) = (keyof A) | (keyof B)
// keyof (A | B) = (keyof A) & (keyof B)

type K = keyof (Person | Human);   // "name"
type I = keyof (Person & Human);   // "name" | "birth" | "death"
```

---

## 타입 공간과 값 공간의 심벌 구분

### class, enum은 값과 타입 둘 다

```typescript
class Cyclinder {
  radius = 1;
  height = 1;
}

function caculateVolume(shape: unknown) {
  if (shape instanceof Cyclinder) {
    return shape.radius; // 정상
  }
}
```

### typeof 연산자

```typescript
const person: Person = { first: 'Baik', last: 'Gwangin' };

type T1 = typeof person;   // Person
const v1 = typeof person;  // "object"
```

- **타입 관점**: 값의 타입 반환
- **값 관점**: 런타임 타입 문자열 반환

### 두 공간의 다른 의미 패턴

| 키워드 | 값 공간 | 타입 공간 |
|---|---|---|
| `this` | JavaScript this | 다형성 this |
| `&`, `\|` | 비트 AND/OR | 인터섹션/유니온 |
| `const` | 변수 선언 | `as const` 리터럴 변환 |
| `extends` | 상속 | 제네릭 한정자 |

---

## 타입 단언보다는 타입 선언을 사용하기

```typescript
const alice: Person = { name: 'Alice' };    // 타입 선언 (권장)
const bob = { name: 'bob' } as Person;      // 타입 단언
```

- **타입 선언**: 타입 체커가 검증
- **타입 단언**: 사용자가 강제 지정, 잘못된 사용 가능

```typescript
const people = ['alice', 'bob', 'jan'].map((name): Person => ({
  name,
}));
```

---

## 객체 래퍼 타입 피하기

JS는 기본형에 메서드 사용 시 **Wrapper 객체**로 래핑합니다.

```typescript
'hello' === 'hello';                      // true
'hello' === new String('hello');          // false
new String('hello') === new String('hello'); // false
```

**기본형**과 **객체 래퍼 타입** 혼용을 피하세요.

---

## 잉여 속성 체크의 한계 인지하기

```typescript
interface Room {
  numDoors: number;
  celingHeightFt: number;
}

const r: Room = {
  numDoors: 1,
  celingHeightFt: 10,
  isBooked: true, // 오류 (잉여 속성 체크)
};

const r2: Room = r; // 정상 (임시 변수를 통해 우회됨)
```

잉여 속성 체크는 객체 리터럴 할당 시에만 동작하며, 임시 변수로 우회 가능합니다.

---

## 함수 표현식에 타입 적용하기

```typescript
type CalculateNumber = (a: number, b: number) => number;

const add: CalculateNumber = (a, b) => a + b;
const sum: CalculateNumber = (a, b) => a - b;
```

`typeof`로 기존 함수 타입을 재사용하면 매개변수와 반환값이 자동 추론됩니다:

```typescript
const checkFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Request failed : ${response.status}`);
  }
  return response;
};
```
