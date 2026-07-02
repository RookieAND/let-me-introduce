## 문제: 타입은 맞는데 에러가 난다

이벤트 시스템을 만들다가 이상한 타입 에러를 만났다. 이벤트 타입별로 Payload를 제네릭으로 연결해뒀고 구조도 딱히 복잡하지 않았는데, 핸들러를 `emit`으로 호출하는 순간 TypeScript가 갑자기 교차 타입(`A & B`)을 요구하기 시작했다.

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
      eventHandler(payload); // 🚨 여기서 TS Error 발생
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

PayloadA는 분명히 만족하는데 왜 PayloadB까지 요구하는 건지 당장 이해가 되지 않았다. 유니온 타입이어야 할 자리에 왜 교차 타입이 나타나는가?

---

## 원인: 함수 매개변수의 반공변성

이 현상은 함수 매개변수의 **반공변성(Contravariance)** 때문이다. 처음에는 TypeScript가 오탐을 하는 게 아닐까 싶었는데, 파고들수록 이건 의도된 동작이었다.

배열이나 객체 속성은 공변적(Covariant)이어서 타입 상속 관계가 그대로 유지된다.

```typescript
class Animal { name: string; }
class Dog extends Animal { bark() {} }

const dogs: Dog[] = [new Dog()];
const animals: Animal[] = dogs; // ✅ Dog[]는 Animal[]의 하위 타입
```

반면 함수의 매개변수는 반공변적(Contravariant)이어서 타입 관계가 역전된다.

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
brokenHandler(new Cat()); // Cat에는 bark()가 없음
```

이걸 이벤트 시스템에 대입하면 왜 교차 타입을 요구하는지가 보인다. `EventHandler<EventType>`은 TypeScript의 기본 분산(Distributive) 방식으로 계산되면 이렇게 펼쳐진다.

```typescript
type EventHandler =
  | ((p: PayloadA) => void)
  | ((p: PayloadB) => void);
```

`handler(payload)`를 호출하는 상황을 생각해보자. `handler`가 실제로 어떤 함수인지는 컴파일 타임에 알 수 없는데, PayloadA를 받는 함수일 수도 있고 PayloadB를 받는 함수일 수도 있다. TypeScript 입장에서 두 경우를 모두 안전하게 처리하려면 두 타입을 동시에 만족하는 교차 타입 `PayloadA & PayloadB`만이 유일한 답이 된다.

```typescript
// ❌ PayloadA만 전달 → handler가 PayloadB 함수면 런타임 에러
handler({ accessKey: "key", peopleCount: 10 });

// ❌ PayloadB만 전달 → handler가 PayloadA 함수면 런타임 에러
handler({ maxCount: 100, currentCount: 50 });

// ✅ 교차 타입 → 어떤 함수 타입이든 필요한 속성을 모두 충족
handler({ accessKey: "key", peopleCount: 10, maxCount: 100, currentCount: 50 });
```

결국 이건 TypeScript의 의도된 동작이었고, [GitHub Issue #30581](https://github.com/microsoft/TypeScript/issues/30581)에서 TypeScript 팀은 제네릭 상관관계 추론(correlated union)을 지원하지 않기로 결정했다고 밝혔다.

---

## 그런데 타입 가드는 왜 작동하는가

타입 가드로는 이 문제를 회피할 수 있다는 걸 알고 있었는데, 처음에는 그 이유를 정확히 설명하지 못했다.

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

`if (action.type === "SET_NAME")`은 런타임 분기다. TypeScript는 제어 흐름 분석(Control Flow Analysis)으로 각 분기에서 타입을 좁히는데, `type`과 `payload`가 같은 객체 안에 묶여 있기 때문에 `type`이 좁혀지는 순간 `payload`도 함께 좁혀진다.

제네릭은 이와 다르다. `emit<T>(type: T, payload: Payload[T])`에서 `T`가 특정 이벤트 타입으로 고정되더라도, TypeScript는 `type`과 `payload` 두 매개변수 사이의 상관관계를 추론하지 않는다. 런타임 분기가 없으니 제어 흐름 분석도 통하지 않고, 두 인자가 같은 객체에 묶인 것도 아니라서 타입이 함께 좁혀지지 않기 때문이다. 제네릭은 컴파일 타임 추상화일 뿐이고, TypeScript는 그 위에서 상관관계를 별도로 추론해주지 않는다.

---

## 해결: 비분산 조건부 타입

문제의 핵심은 `EventHandler` 타입이 유니온으로 분산되는 것이었다.

```typescript
// ❌ 기존 정의 — 제네릭이 분산됨
type EventHandler<TEvent extends EventType = EventType> =
  (payload: EventPayload[TEvent]) => void;

// EventHandler<"a" | "b">의 계산:
// = ((p: PayloadA) => void) | ((p: PayloadB) => void)
// → 유니온 함수 → 반공변성으로 인해 교차 타입 인자 요구
```

TypeScript에서 조건부 타입의 타입 변수를 대괄호(`[]`)로 감싸면 분산 동작을 막을 수 있다. TypeScript가 유니온을 개별 타입으로 쪼개 계산하는 대신, 전체를 하나의 덩어리로 처리하도록 강제하는 방식이다.

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

`infer E`의 역할도 빠뜨릴 수 없다. 대괄호로만 감싸도 분산은 막히지만, 조건부 타입 내부에서 `TEvent`가 여전히 원본 유니온 전체로 남아서 `EventPayload[TEvent]` 인덱싱이 위험해진다. `infer E`를 사용하면 TypeScript가 패턴 매칭으로 직접 추출한 변수를 쓰기 때문에 `EventPayload[E]` 인덱싱을 신뢰하게 된다.

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

## 마치며

사실 처음에는 TypeScript가 오탐을 하는 거라고 생각했다. `T`로 묶인 두 인자가 같은 타입을 가리킨다는 게 코드 위에서 이미 명확해 보였으니까. 그런데 결국 이건 TypeScript가 제네릭 인자들 사이의 상관관계를 추론하지 않는다는 근본적인 제약에서 비롯된 현상이었다.

타입 가드가 작동하는 이유와 제네릭이 작동하지 않는 이유를 나란히 놓고 보고 나서야, "같은 타입 변수로 묶었다"는 것이 TypeScript에게 아무런 단서도 되지 않는다는 걸 이해했다. TypeScript는 오직 제어 흐름 분석과 구조적 타이핑만으로 타입을 좁히는데, 제네릭은 그 흐름 바깥에 있다. 비분산 조건부 타입은 그 한계를 우회하는 방법이지, TypeScript가 상관관계를 이해하게 만드는 방법이 아니다.
