# 이펙티브 타입스크립트 3주차 스터디

## 타입과 인터페이스의 차이

### 공통점과 차이점

- `type`과 `interface` 모두 명명된 타입을 정의할 수 있다
- 인터페이스는 유니온 타입을 표현할 수 없다
- `type`은 유니온, 매핑된 타입, 조건부 타입까지 지원해 더 넓은 활용 범위를 가진다

```typescript
type StringOrNumber = string | number; // 가능
// interface StringOrNumber = string | number; // 불가능

interface Person {
  name: string;
}

type PersonType = {
  name: string;
};
```

### 선언 병합

인터페이스는 선언 병합이 가능하다.  

```typescript
interface State {
  name: string;
}

interface State {
  population: number;
}

const wyoming: State = {
  name: 'Wyoming',
  population: 500_000,
}; // 정상
```

타입은 중복 선언이 불가능하므로, 외부 라이브러리 타입 보강에는 인터페이스가 적합하다.  

---

## 타입 연산과 제네릭으로 반복 줄이기

DRY 원칙은 타입에도 적용된다.  

### keyof와 typeof 활용

```typescript
interface State {
  userId: string;
  pageTitle: string;
  recentFiles: string[];
  pageContents: string;
}

type TopNavState = {
  userId: State['userId'];
  pageTitle: State['pageTitle'];
  recentFiles: State['recentFiles'];
};
```

`Pick`으로 더 간결하게 작성할 수 있다.  

```typescript
type TopNavState = Pick<State, 'userId' | 'pageTitle' | 'recentFiles'>;
```

### ReturnType 활용

```typescript
function getUserInfo(userId: string) {
  return { userId, name: 'Baik' };
}

type UserInfo = ReturnType<typeof getUserInfo>;
// { userId: string; name: string }
```

---

## 인덱스 시그니처

동적 데이터를 표현할 때 인덱스 시그니처를 사용한다.  

```typescript
type Rocket = { [property: string]: string };
const rocket: Rocket = {
  name: 'Falcon 9',
  variant: 'v1.0',
  thrust: '4,940 kN',
};
```

인덱스 시그니처는 모든 키를 허용하므로 너무 광범위하다.  
키가 정해진 경우 `Record`나 매핑된 타입이 더 적합하다.  

```typescript
type Vec3D = Record<'x' | 'y' | 'z', number>;
// { x: number; y: number; z: number }
```

---

## Number 인덱스 시그니처

JS에서 모든 객체 키는 내부적으로 문자열로 변환된다.  

```typescript
const xs = [1, 2, 3];
const x0 = xs[0]; // number 인덱스
const x1 = xs['1']; // string도 동작 (JS 런타임)
```

숫자 인덱스 대신 `Array`, `Tuple`, `ArrayLike<T>`를 사용하는 것이 혼란을 줄인다.  

```typescript
function checkedAccess<T>(xs: ArrayLike<T>, i: number): T {
  if (i < xs.length) {
    return xs[i];
  }
  throw new Error(`Attempt to access ${i} past end of array`);
}
```

---

## readonly로 안전성 확보하기

`readonly`는 배열 요소 수정, `length` 변경, 변이 메서드 호출을 모두 막는다.  

```typescript
function arraySum(arr: readonly number[]) {
  let sum = 0;
  for (const num of arr) {
    sum += num;
  }
  return sum;
}
```

`readonly`는 **얕게** 동작한다.  
객체의 참조는 막지만 객체 내부 속성은 여전히 변경 가능하다.  

```typescript
const dates: readonly Date[] = [new Date()];
dates.push(new Date()); // 오류
dates[0].setFullYear(2037); // 허용
```

---

## 매핑된 타입으로 동기화하기

매핑된 타입은 관련 값들을 동기화하고 새 속성 추가 시 강제로 반영하게 만든다.  

```typescript
interface ScatterProps {
  xs: number[];
  ys: number[];
  xRange: [number, number];
  yRange: [number, number];
  color: string;
  onClick: (x: number, y: number, index: number) => void;
}

const REQUIRES_UPDATE: { [k in keyof ScatterProps]: boolean } = {
  xs: true,
  ys: true,
  xRange: true,
  yRange: true,
  color: true,
  onClick: false,
};
```

`ScatterProps`에 새 속성이 추가되면 `REQUIRES_UPDATE`도 함께 업데이트해야 한다.  
타입이 구현을 이끌어내는 패턴이다.  
