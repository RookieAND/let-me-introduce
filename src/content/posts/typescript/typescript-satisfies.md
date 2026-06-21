## satisfies를 사용하는 목적

> 객체 타입을 안전하게 검증하되, 그 검증이 값의 **실제 타입 추론을 망치지 않도록** 하기 위해 도입됐다.  

`satisfies`는 기존의 `: Type` 지정 방식과 `as` 단언이 가진 문제를 해결한다.  

---

## 기존 방식들의 문제

### 타입을 직접 지정하는 방식 (`: Type`)

```typescript
const obj: { grade: string } = { grade: 'a', score: 90 }; // ❌
```

사용자의 의도는 "객체 내부에 `string` 타입의 `grade` 필드가 존재하는지만 검사"하는 것이었다. 하지만 타입을 변수에 먼저 지정하는 순간, TypeScript는 **초과 프로퍼티 검사(Excess Property Check)**를 적용한다. 의도와 달리 "grade만 있어야 한다"는 지나치게 빡빡한 검증이 이루어진다.  

중첩 객체에서는 모든 field를 전부 정의해야 하기 때문에 타입 선언이 커지고 관리 비용도 증가한다.  

### `as` 키워드 (타입 단언)

```typescript
const obj = { grade: 'a', score: 90 } as { grade: string }; // ✅ 컴파일은 통과

const obj2 = { grade: 'a', score: 90 } as {
  grade: string;
  score: number;
  attribute: object; // 실제로는 없는 속성
};

// ❌ 런타임 에러
console.log(obj2.attribute.toString());
```

`as`는 타입을 "검증"하는 문법이 아니라 타입 체커에게 **"이 타입이 맞다고 가정하라"**고 지시하는 문법이다. 실제 객체와 단언한 타입이 달라도 컴파일 단계에서는 에러가 없다. 결과적으로 타입 안전성이 무너지고 런타임 에러가 발생할 가능성이 크게 높아진다.  

---

## `satisfies`는 뭐가 다른가

```typescript
// ❌ grade 프로퍼티는 만족하지만 score는 검증 조건에 없음 → Error
const obj = { grade: 'a', score: 90 } satisfies { grade: string };
```

`satisfies`는 세 가지 면에서 기존 방식과 다르다.  

**타입을 바꾸지 않는다.** `obj`의 실제 타입은 여전히 `{ grade: string; score: number }`이다. `: Type` 처럼 타입이 고정되지 않는다.  

**조건만 검사한다.** 최소한 `{ grade: string }`을 만족하는지만 검증한다. 이때 초과 프로퍼티(`score`)는 허용한다.  

**안 맞으면 컴파일 에러를 낸다.** 필수 프로퍼티가 누락된 경우 `as`와 달리 반드시 컴파일 에러가 발생한다.  

```typescript
const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255],
} satisfies Record<string, string | number[]>;

// satisfies를 쓰면 각 값의 실제 타입이 보존된다
palette.red.at(0);     // ✅ number — 배열임을 TypeScript가 알고 있음
palette.green.toUpperCase(); // ✅ string — 문자열임을 TypeScript가 알고 있음

// : Record<string, string | number[]>로 지정했다면?
// palette.red는 string | number[]로 넓혀져서 .at()을 쓸 수 없음
```

---

## 실무에서 유용한 패턴

### Pattern 1: config 객체의 타입 검증

```typescript
type AppConfig = {
  apiUrl: string;
  timeout: number;
  maxRetries: number;
};

// ✅ 필수 필드 누락 시 컴파일 에러 + 실제 추론 유지
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  maxRetries: 3,
} satisfies AppConfig;

config.apiUrl;  // string (추론 유지)
config.timeout; // number (추론 유지)

// ❌ 필드 누락 시 컴파일 에러
const badConfig = { apiUrl: '...' } satisfies AppConfig; // Error: 'timeout' is missing
```

### Pattern 2: 유니온 타입을 가진 객체에서 타입 좁히기

```typescript
type Color = { hex: string } | { rgb: [number, number, number] };

const colors = {
  red: { rgb: [255, 0, 0] },
  green: { hex: '#00ff00' },
} satisfies Record<string, Color>;

colors.red.rgb[0];  // ✅ number — 정확한 추론
colors.green.hex;   // ✅ string — 정확한 추론

// ❌ ': Record<string, Color>' 어노테이션이었다면?
// colors.red → Color (타입 좁히기 실패)
```

### Pattern 3: as const satisfies 조합

```typescript
// 리터럴 타입 유지 + 타입 조건 검증을 동시에
const ROUTE_MAP = {
  home: '/',
  about: '/about',
  profile: '/profile',
} as const satisfies Record<string, string>;

ROUTE_MAP.home; // '/' (리터럴 타입, not string)
// string이 아닌 값을 추가하면 컴파일 에러
```

---

## 언제 satisfies를 쓸까

- **`as`를 쓰고 싶어질 때 먼저 고려한다.** `as`는 타입 체커를 우회하지만 `satisfies`는 컴파일 에러를 보장한다.
- **타입 어노테이션으로 추론이 너무 넓어질 때.** `: Type`으로 선언하면 개별 속성의 좁은 타입 정보를 잃어버린다. `satisfies`는 검증만 하고 추론을 유지한다.
- **`as const`와 함께 상수 객체를 정의할 때.** `as const satisfies Record<...>` 조합으로 리터럴 타입 유지와 타입 검증을 동시에 달성한다.

---

## 결론

`satisfies`는 특정 값이 개발자가 의도한 타입을 만족하는지를 컴파일 타임에 검사할 뿐, 해당 값의 **실제 타입 추론에는 개입하지 않는다.** Upcasting과 유사한 검증 효과를 제공하면서도 타입이 넓어지는 문제를 피할 수 있다.  

향후 특정 값이 의도한 타입을 만족하는지 검증하고 싶을 때는 `as` 대신 `satisfies`를 쓰자.  

- **`: Type`** → 타입이 고정되어 초과 프로퍼티가 차단됨
- **`as Type`** → 타입 단언으로 실제 불일치도 컴파일러가 눈감음
- **`satisfies Type`** → 조건을 충족하는지만 검증하고, 실제 타입 추론은 그대로 유지
