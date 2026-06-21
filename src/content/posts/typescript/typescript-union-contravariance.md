## 문제: 타입은 맞는데 에러가 난다

이벤트 시스템을 만들다가 이상한 타입 에러를 만났다. 이벤트 타입별로 Payload 타입을 제네릭으로 연결해뒀는데, 핸들러를 호출하는 순간 TypeScript가 교차 타입(A & B)을 요구하기 시작했다.  

```typescript
const EVENT = {
  RECOMMEND_RESULT_CREATED: "recommend-result-created",
  PARTICIPANT_COUNT: "participant-count",
} as const;

type EventType = (typeof EVENT)[keyof typeof EVENT];

type EventPayload = {
  [EVENT.RECOMMEND_RESULT_CREATED]: { accessKey: string; peopleCount: number };
  [EVENT.PARTICIPANT_COUNT]: { maxCount: number; currentCount: number };
};

type EventHandler<TEvent extends EventType = EventType> =
  (payload: EventPayload[TEvent]) => void;
```

`EventRegistry` 클래스에서 `emit`을 구현하다가 문제가 터졌다.  

```typescript
class EventRegistry {
  private handlers = new Map<EventType, Set<EventHandler>>();

  emit<TEvent extends EventType>(type: TEvent, payload: EventPayload[TEvent]) {
    const handlerList = this.getHandler(type);
    handlerList.forEach((eventHandler) => {
      eventHandler(data); // 🚨 여기서 TS Error 발생!
    });
  }
}
```

에러 메시지는 이랬다.  

```
Property 'maxCount' is missing in type
'{ accessKey: string; peopleCount: number; }'
but required in type '{ maxCount: number; currentCount: number; }'
```

PayloadA는 만족하는데 왜 PayloadB까지 요구하는 걸까? 유니온 타입이어야 하는데 왜 교차 타입이 나타나는가?  

---

## 원인: 함수 매개변수의 반공변성

이 현상은 **함수의 반공변성(Contravariance)** 때문이다.  

배열이나 객체 속성은 공변적(Covariant)이다. 타입 상속 관계가 그대로 유지된다.  

```typescript
class Animal { name: string; }
class Dog extends Animal { bark() {} }

const dogs: Dog[] = [new Dog()];
const animals: Animal[] = dogs; // ✅ Dog[]는 Animal[]의 하위 타입
```

반면 **함수의 매개변수는 반공변적**이다. 타입 관계가 역전된다.  

```typescript
type AnimalHandler = (animal: Animal) => void;
type DogHandler = (dog: Dog) => void;

const handleAnimal: AnimalHandler = (animal) => {
  console.log(animal.name);
};

// ✅ 더 넓은 타입을 받는 함수를 더 좁은 타입 자리에 할당 가능
const handleDog: DogHandler = handleAnimal;
handleDog(new Dog()); // 안전함: handleAnimal은 Dog도 처리 가능

// ❌ 반대는 불가능 — 런타임 에러 발생
const handleOnlyDog: DogHandler = (dog) => { dog.bark(); };
const brokenHandler: AnimalHandler = handleOnlyDog;
brokenHandler(new Cat()); // Cat에는 bark()가 없음!
```

이걸 이벤트 시스템에 대입하면 이해가 된다.  

```typescript
// handlers는 유니온 함수 타입
type EventHandler =
  | ((p: PayloadA) => void)
  | ((p: PayloadB) => void);

handlers.forEach(handler => {
  handler(???); // 무엇을 넣어야 안전한가?
});
```

TypeScript 입장에서 `handler`가 실제로 어떤 함수인지 컴파일 타임에 알 수 없다. PayloadA를 받는 함수일 수도 있고, PayloadB를 받는 함수일 수도 있다. 둘 다 안전하게 처리하려면 **두 타입을 모두 만족하는 교차 타입** `PayloadA & PayloadB`만이 답이다.  

```typescript
// ❌ PayloadA만 전달 → handler가 PayloadB 함수면 런타임 에러
handler({ accessKey: "key", peopleCount: 10 });

// ❌ PayloadB만 전달 → handler가 PayloadA 함수면 런타임 에러
handler({ maxCount: 100, currentCount: 50 });

// ✅ 교차 타입 → 어떤 함수 타입이든 필요한 속성을 모두 충족
handler({ accessKey: "key", peopleCount: 10, maxCount: 100, currentCount: 50 });
```

이것은 버그가 아니라 TypeScript의 의도된 동작이다. [GitHub Issue #30581](https://github.com/microsoft/TypeScript/issues/30581)에서 TypeScript 팀은 제네릭 상관관계 추론을 지원하지 않기로 결정했다고 밝혔다.  

---

## 왜 타입 가드는 작동하는가

타입 가드로는 이 문제를 해결할 수 있다.  

```typescript
type Action =
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_AGE"; payload: number };

function dispatch(action: Action) {
  if (action.type === "SET_NAME") {
    // ✅ action.payload가 string으로 자동 추론됨
    console.log(action.payload.toUpperCase());
  }
}
```

`if (action.type === "SET_NAME")`은 **런타임 분기**다. TypeScript는 제어 흐름 분석(Control Flow Analysis)으로 각 분기에서 타입을 좁힌다. `type`과 `payload`가 **같은 객체 안에 묶여 있기 때문에**, `type`이 좁혀지면 `payload`도 함께 좁혀진다.  

반면 제네릭은 컴파일 타임 추상화다. `T`가 특정 값으로 고정되어도 TypeScript는 다른 매개변수와의 상관관계를 추론하지 못한다.  

---

## 해결: 비분산 조건부 타입

핵심은 `EventHandler` 타입이 유니온으로 분산되는 것을 막는 것이다.  

```typescript
// ❌ 기존 정의 — 제네릭이 분산됨
type EventHandler<TEvent extends EventType = EventType> =
  (payload: EventPayload[TEvent]) => void;

// EventHandler<"a" | "b">의 계산:
// = ((p: PayloadA) => void) | ((p: PayloadB) => void)
// → 유니온 함수 → 반공변성으로 인해 교차 타입 인자 요구
```

대괄호(`[]`)로 감싸면 TypeScript가 이를 튜플로 인식해 분산을 막는다.  

```typescript
// ✅ 비분산 조건부 타입
type EventHandler<TEvent extends EventType = EventType> =
  [TEvent] extends [infer E extends EventType]
    ? (payload: EventPayload[E]) => void
    : never;

// EventHandler<"a" | "b">의 계산:
// = ["a" | "b"] extends [infer E] ? (payload: EventPayload[E]) => void : never
// = (payload: PayloadA | PayloadB) => void
// → 단일 함수 → 인자는 유니온 타입
```

`infer E`의 역할도 중요하다. 대괄호만 쓰면 조건부 타입 내부에서 `T`가 여전히 원본 유니온 전체로 남아 `EventPayload[T]` 인덱싱이 위험해진다. `infer E`를 사용하면 TypeScript가 패턴 매칭으로 직접 추출한 변수를 쓰기 때문에 `EventPayload[E]` 인덱싱을 신뢰한다.  

---

## 최종 코드

```typescript
// 1. 비분산 조건부 타입으로 EventHandler 개선
type EventHandler<TEvent extends EventType = EventType> =
  [TEvent] extends [infer E extends EventType]
    ? (payload: EventPayload[E]) => void
    : never;

// 2. EventRegistry에서 안전하게 사용
class EventRegistry {
  private handlers = new Map<EventType, Set<EventHandler>>();

  on<TEvent extends EventType>(type: TEvent, handler: EventHandler<TEvent>) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  emit<TEvent extends EventType>(type: TEvent, payload: EventPayload[TEvent]) {
    const schema = EVENT_SCHEMA[type];
    const { data, success } = schema.safeParse(payload);
    if (!success) return;

    this.handlers.get(type)?.forEach((handler) => {
      handler(data as EventPayload[TEvent]);
    });
  }
}
```

---

## 핵심 정리

**함수 매개변수는 반공변적이다.**  

배열이나 객체와 달리 함수의 매개변수 타입은 상속 관계가 역전된다.  

유니온 함수 `((p: A) => void) | ((p: B) => void)`는 안전하게 호출하기 위해 교차 타입 `A & B`를 요구한다.  

**TypeScript는 제네릭 상관관계를 추론하지 못한다.**  

`emit<T>(type: T, payload: Payload[T])`에서 `type`과 `payload`의 연결을 TypeScript가 이해하지 못한다.  

타입 가드(`if`문)와 달리 제네릭은 컴파일 타임 추상화이므로 제어 흐름 분석이 통하지 않는다.  

**비분산 조건부 타입으로 분산을 방지한다.** `[T] extends [infer E extends EventType]` 패턴을 사용하면 유니온 타입이 분산되지 않고, 인자 타입이 유니온으로 올바르게 추론된다.  
