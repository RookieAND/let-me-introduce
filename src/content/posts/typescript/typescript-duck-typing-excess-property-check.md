## 들어가며

TypeScript 를 쓰다 보면 이런 상황을 한 번쯤 마주친다.
분명히 같은 객체를 함수의 인자로 주입하는데 왜 첫 번째는 되고 두 번째는 타입 에러를 뱉는 걸까?

```typescript
interface Options {
  host: string;
  port: number;
}

function connect(options: Options) { /* ... */ }

const opts = { host: 'localhost', port: 3000, timeout: 5000 };
connect(opts); // ✅ 에러 없음

connect({ host: 'localhost', port: 3000, timeout: 5000 }); // ❌ 에러!
// Object literal may only specify known properties,
// and 'timeout' does not exist in type 'Options'.
```

엄밀히 말해서 두 코드가 하는 일은 똑같다. `timeout` 이 포함된 객체를 `connect` 에 넘기는 것이 전부다.
그런데 객체를 변수에 담아서 넘기면 아무 문제가 없고, 객체 리터럴을 그대로 넘기면 에러가 터진다.

처음 이 에러를 만났을 때는 이해가 잘 되지 않았다.
TypeScript 가 구조적 타입 시스템을 쓴다는 건 알고 있었는데, 이 동작은 그와 다르게 모순처럼 느껴졌다.

이번 글에서는 이 모순이 왜 생기는지를 두 가지 개념으로 나눠 파고들었다.

---

## Duck Typing 이란 무엇인가?

TypeScript 의 타입 호환성은 **구조(structure)** 를 기반으로 판단한다.
이를 구조적 타이핑(Structural Typing) 또는 덕 타이핑(Duck Typing) 이라 부른다.

> "오리처럼 걷고, 오리처럼 꽥꽥거린다면, 그건 오리다."

타입의 이름이 무엇인지보다 **어떤 프로퍼티를 가지고 있는가가** 중요하다.
Java 나 C# 같은 명목적 타입 시스템(Nominal Typing) 에서는 타입 선언 자체가 호환성의 기준이 된다.
하지만 TypeScript 는 그렇지 않다. 그냥 프로퍼티를 가지고 있다면 타입을 충족한다고 본다.

```typescript
interface Duck {
  quack: () => void;
  walk: () => void;
}

function makeNoise(duck: Duck) {
  duck.quack();
}
```

`makeNoise` 는 `Duck` 타입을 요구한다.
하지만 보다 엄밀히 말하자면 정확히 `Duck` 인터페이스로 선언된 값만 받는 게 아니다.
Duck 인터페이스에 정의된 `quack` 과 `walk` 를 가진 값이라면 무엇이든 전달할 수 있다.

```typescript
class RubberDuck {
  quack() { console.log('squeak!'); }
  walk() { console.log('wobble'); }
  color = 'yellow'; // Duck 에 없는 프로퍼티
}

const rubberDuck = new RubberDuck();
makeNoise(rubberDuck); // ✅ 에러 없음
```

`RubberDuck` 은 `Duck` 을 `implements` 하지 않았다.
그럼에도 `quack`, `walk` 를 모두 갖추고 있으니 TypeScript 는 이를 `Duck` 과 호환된다고 본다.
심지어 `color` 라는 `Duck` 에 없는 프로퍼티가 있어도 아무 문제가 없다. 이게 덕 타이핑이다.

변수를 통해 값을 전달하는 경우도 마찬가지다.

```typescript
const rubberDuck = { quack: () => {}, walk: () => {}, color: 'yellow' };
makeNoise(rubberDuck); // ✅ 에러 없음
```

코드를 보다시피 인터페이스 형식에는 없는 `color` 가 있어도 통과한다.
`Duck` 이 요구하는 `quack` 과 `walk` 를 갖추고 있으니 구조적으로 호환되기 때문이다.

---

## 근데 왜 객체 리터럴에는 이게 통하지 않을까?

방금 변수에 담아서 넘기면 잉여 프로퍼티가 있어도 괜찮다고 했다.
그렇다면 객체 리터럴을 직접 넘기는 것도 같아야 하는 거 아닐까?

```typescript
makeNoise({ quack: () => {}, walk: () => {}, color: 'yellow' });
// ❌ Object literal may only specify known properties,
//    and 'color' does not exist in type 'Duck'.
```

동일하게 잉여 프로퍼티 `color` 가 포함된 객체인데, 이번엔 에러가 터진다.

들어가며에서 본 `connect` 예제와 정확히 같은 상황이다.
변수에 담으면 되고, 리터럴로 직접 쓰면 안 된다. 두 경우가 왜 다르게 취급되는지가 이번 글의 핵심이다.

---

## 잉여 속성 검사에 대하여

TypeScript 는 **신선한 객체 리터럴 (Fresh Object Literal)** 에 한해 추가적인 검사를 수행한다.
이러한 검사를 **잉여 속성 검사 (Excess Property Check)** 라 부른다.
즉, 대상 타입에 없는 프로퍼티가 **객체 리터럴에 존재하면** 에러를 발생시킨다.

여기서 "신선하다(Fresh)" 는 건 TypeScript 내부에서 쓰는 개념이다.
방금 막 작성된 객체 리터럴에는 내부적으로 신선함(Freshness) 이라는 상태가 부여된다.
이 상태는 객체 리터럴이 변수나 파라미터에 한 번 할당되는 순간 사라진다.

```typescript
// 신선한 리터럴 — 잉여 속성 검사 적용됨
makeNoise({ quack: () => {}, walk: () => {}, color: 'yellow' }); // ❌

// 변수에 담는 순간 신선함이 사라짐 — 구조적 타이핑만 적용
const duck = { quack: () => {}, walk: () => {}, color: 'yellow' };
makeNoise(duck); // ✅
```

Typescript 에서 잉여 속성 검사가 적용되는 상황은 세 가지다.

- 타입이 명시된 변수에 객체 리터럴을 직접 할당할 때
- 함수 파라미터에 객체 리터럴을 직접 전달할 때
- 반환 타입이 명시된 함수에서 객체 리터럴을 직접 반환할 때

```typescript
// 변수 직접 할당
const opts: Options = { host: 'localhost', port: 3000, timeout: 5000 }; // ❌

// 함수 파라미터 직접 전달
connect({ host: 'localhost', port: 3000, timeout: 5000 }); // ❌

// 함수에서 직접 반환
function getOptions(): Options {
  return { host: 'localhost', port: 3000, timeout: 5000 }; // ❌
}
```

### 왜 이런 검사를 추가했을까?

객체 리터럴을 직접 쓴다는 것은 보통 그 타입을 위해 만든 값이라는 의미다.
그 상황에서 타입에 없는 프로퍼티가 있다면 대부분은 오타거나 실수긴 하다.

```typescript
interface Config {
  host: string;
  port: number;
}

const config: Config = {
  host: 'localhost',
  prot: 3000, // ❌ 'prot' — port 를 잘못 쓴 것
};
```

잉여 속성 검사가 없다면 이 코드는 조용히 통과되고, `config.port` 는 `undefined` 가 된다.
TypeScript 는 이런 실수를 리터럴 단계에서 잡아내기 위해 신선함 개념을 도입했다.

반면 변수에 담긴 객체는 다른 목적으로 만들어진 값이 재사용되는 경우가 많다.
그 값이 `Duck` 외에 다른 프로퍼티를 더 가지고 있다고 해서 반드시 실수라고 볼 수 없다.
따라서 변수를 통해 전달할 때는 추가 검사를 하지 않고 구조적 타이핑 규칙만 적용한다.

---

## 이를 어떻게 우회할 수 있는가?

하지만 우리가 Typescript 를 사용하다 보면 잉여 속성 검사가 의도와 맞지 않는 상황도 있다.
타입에 없는 프로퍼티를 포함한 리터럴을 그대로 넘겨야 하는 경우가 생길 수 있지 않은가?

이럴 때 우리가 사용할 수 있는 우회 방법은 크게 세 가지다.

### 중간 변수에 먼저 담기

사실 가장 단순한 방법이다. 객체 리터럴을 변수에 담는 순간 신선함이 사라지고 구조적 타이핑만 남는다.

```typescript
const opts = { host: 'localhost', port: 3000, timeout: 5000 };
connect(opts); // ✅
```

이렇게 코드를 작성하더라도 타입 안전성은 소실되지 않는다. 또한 의미 있는 이름을 붙일 수 있다는 부수 효과도 있다.

### 타입 단언(Type Assertion)

`as` 키워드로 타입을 강제 지정하면 잉여 속성 검사를 건너뛴다.

```typescript
connect({ host: 'localhost', port: 3000, timeout: 5000 } as Options); // ✅
```

단, 이 방법은 TypeScript 가 해당 값에 대한 추가 검사를 포기한다는 뜻이기도 하다.
`timeout` 이 실수로 `port` 를 가리고 있는 상황이라도 이 검사는 통과해버린다.
확신이 없는 상황에서 `as` 를 쓰는 것은 TypeScript 를 끄는 것과 다름없다. (개인적으로 추천하진 않는다)

### 인덱스 시그니처(Index Signature)

인터페이스에 인덱스 시그니처를 추가하면 어떤 추가 프로퍼티가 오더라도 이를 모두 허용한다.

```typescript
interface Options {
  host: string;
  port: number;
  [key: string]: unknown; // 추가 프로퍼티 허용
}

connect({ host: 'localhost', port: 3000, timeout: 5000 }); // ✅
```

위처럼 작성된 타입 정의 자체가 "**이 인터페이스는 추가 프로퍼티를 허용한다**" 고 선언하는 방식이다.
하지만 이는 인터페이스를 변경할 수 있는 권한이 있고, 실제로 그 의미가 맞을 때만 써야 한다.
임의의 추가 프로퍼티를 허용하는 인터페이스로 만드는 것은 타입 안전성을 희생하는 결정이다.

---

## 마치며

결국 잉여 속성 검사는 덕 타이핑의 유연함을 유지하면서 오타나 실수를 잡아내기 위한 장치다.
변수를 통해 전달하면 구조적 타이핑만 적용되고, 리터럴을 직접 넘기면 잉여 속성 검사가 추가된다.

처음에 모순처럼 느껴졌던 것이 결국엔 "언제 실수가 가장 많이 발생하는가" 를 기준으로 설계된 규칙이었다.
TypeScript 가 완전히 엄격하거나 완전히 느슨하지 않고, 상황에 따라 다르게 동작하는 이유가 여기에 있다.
