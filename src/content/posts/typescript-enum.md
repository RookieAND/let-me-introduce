## TypeScript Enum이란?

TypeScript의 `enum`은 관련된 상수들을 하나의 네임스페이스로 묶는 기능이다. `0`, `1`, `2` 같은 의미 없는 숫자 대신 `Draft`, `Approved`처럼 의미 있는 이름으로 상수를 관리하기 위한 목적으로 도입됐다.

하지만 이 구현 방식이 TypeScript의 철학과 맞지 않는 여러 문제를 낳았다. TypeScript의 enum은 세 가지 형태가 있다.

```typescript
// 1. Numeric enum — 값을 직접 숫자로 지정
enum PackStatus {
  Draft = 0,
  Approved = 1,
  Shipped = 2,
}

// 2. String enum — 값을 문자열로 지정
enum PackStatus {
  Draft = "Draft",
  Approved = "Approved",
  Shipped = "Shipped",
}

// 3. Inferred enum — 값 생략 시 0부터 자동 할당
enum PackStatus {
  Draft,    // 0
  Approved, // 1
  Shipped,  // 2
}
```

---

## Numeric Enum의 문제들

### 양방향 매핑으로 인한 예상치 못한 키 개수

```typescript
enum PackStatus {
  Draft = 0,
  Approved = 1,
  Shipped = 2,
}

// 예상: ["Draft", "Approved", "Shipped"] (3개)
// 실제: ["0", "1", "2", "Draft", "Approved", "Shipped"] (6개)
console.log(Object.keys(PackStatus));
```

Numeric enum은 `key → value`, `value → key` 양방향 매핑을 생성한다. TypeScript가 컴파일하면 이런 코드가 나온다.

```javascript
var PackStatus;
(function (PackStatus) {
  PackStatus[PackStatus["Draft"] = 0] = "Draft";
  PackStatus[PackStatus["Approved"] = 1] = "Approved";
  PackStatus[PackStatus["Shipped"] = 2] = "Shipped";
})(PackStatus || (PackStatus = {}));
```

결과적으로 객체에는 `{ 0: "Draft", 1: "Approved", 2: "Shipped", Draft: 0, Approved: 1, Shipped: 2 }` 형태로 6개의 키가 존재한다. `Object.keys()`, `Object.entries()`, `for...in`을 사용할 때 예상치 못한 결과를 낳는다.

### 타입 안전성 부재

```typescript
const logStatus = (status: PackStatus) => console.log(status);

logStatus(PackStatus.Draft); // OK
logStatus(0);                // No error — raw number가 그냥 통과됨
logStatus(999);              // No error — 존재하지 않는 값도 통과됨
```

Numeric enum이 기대되는 자리에 raw number를 넣어도 에러가 나지 않는다. enum을 쓰는 이유가 잘못된 값 사용을 막기 위함인데, 정작 그 역할을 하지 못한다.

---

## String Enum의 문제: 명목적 타이핑

TypeScript는 기본적으로 **구조적 타이핑(Structural Typing)**을 따른다. 두 타입의 구조가 같으면 상호 호환이 가능하다. 그런데 enum만 예외적으로 **명목적 타이핑(Nominal Typing)**을 적용한다.

```typescript
enum PackStatus {
  Draft = "Draft",
}

enum PackStatus2 {
  Draft = "Draft", // 값이 완전히 동일해도...
}

const logStatus = (status: PackStatus) => console.log(status);

logStatus(PackStatus2.Draft); // Error — 호환 불가!
logStatus("Draft");           // Error — 리터럴 문자열도 불가!
```

값이 동일해도, 심지어 원본 enum을 참조해서 만든 enum조차 호환이 불가하다. 외부 라이브러리와 연동하거나 API 응답값을 enum에 매핑할 때 불필요한 타입 단언(`as`)이 남발된다.

---

## 런타임 코드 생성과 트리쉐이킹 문제

TypeScript의 `type`, `interface`는 컴파일 후 JavaScript에서 완전히 제거된다. 하지만 **enum은 실제 JavaScript 객체 코드를 생성**하며, 이는 번들에 포함된다.

일반 enum은 IIFE 패턴으로 컴파일되어 번들러가 사이드 이펙트 없음을 판단하기 어렵다. 결과적으로 사용하지 않는 enum도 Tree-Shaking이 되지 않는 경우가 발생한다.

`const enum`이 이 문제를 부분적으로 해결하지만, `isolatedModules` 환경(Babel, esbuild, Vite 등)에서는 사용할 수 없다는 별도의 제약이 있다. 현대적인 빌드 도구 환경에서는 완전한 대안이 되지 못한다.

> [!CAUTION]
> `const enum`은 Vite, esbuild, Babel처럼 `isolatedModules`를 활성화한 환경에서 동작하지 않는다. 현대 프론트엔드 프로젝트 대부분이 해당하므로, `const enum`도 enum의 안전한 대안이 아니다.

---

## 결론: 대안을 쓰자

TypeScript 레포에 enum 관련 버그만 71개 이상이며, TS 팀도 구조적 문제로 인해 닫을 수 없는 버그들이 있다고 인정했다. 기존 코드에 있는 enum은 굳이 제거할 필요 없지만, **새 코드에는 추가하지 않는 것이 권장**된다.

대안으로는 다음 방식들이 있다.

**`as const` 객체** — 가장 추천되는 방식이다.

```typescript
const PackStatus = {
  Draft: "Draft",
  Approved: "Approved",
  Shipped: "Shipped",
} as const;

type PackStatus = (typeof PackStatus)[keyof typeof PackStatus];
// "Draft" | "Approved" | "Shipped"
```

**유니온 타입** — 단순한 경우에 적합하다.

```typescript
type PackStatus = "Draft" | "Approved" | "Shipped";
```

`as const` 패턴은 런타임 코드가 생성되지 않고, 구조적 타이핑이 정상 동작하며, 트리쉐이킹도 문제없다. enum이 의도했던 "의미 있는 상수 묶음"의 역할을 타입 안전하게 달성할 수 있다.
