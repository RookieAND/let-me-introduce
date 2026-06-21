# 이펙티브 타입스크립트 7주차 스터디

## 공식 명칭에는 상표를 붙이기

TS의 구조적 타이핑은 때로 의도치 않은 타입 호환을 허용한다.  

```typescript
interface Vector2D {
  x: number;
  y: number;
}

function calculateNorm(p: Vector2D) {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

calculateNorm({ x: 3, y: 4, z: 1 }); // 정상 — z 필드가 있어도 통과
```

상표(brand)를 추가해 명목적 타이핑을 흉내낼 수 있다.  

```typescript
interface Vector2D {
  _brand: '2D';
  x: number;
  y: number;
}

function vec2D(x: number, y: number): Vector2D {
  return { x, y, _brand: '2D' };
}

function calculateNorm(p: Vector2D) {
  return Math.sqrt(p.x * p.x + p.y * p.y);
}

calculateNorm(vec2D(3, 4)); // 정상
calculateNorm({ x: 3, y: 4, z: 1, _brand: '2D' }); // 사용자가 의도적으로 추가하면 막을 수 없다
```

절대 경로에도 상표를 적용할 수 있다.  

```typescript
type AbsolutePath = string & { _brand: 'abs' };

function isAbsolutePath(path: string): path is AbsolutePath {
  return path.startsWith('/');
}

function listAbsolutePath(path: AbsolutePath) {
  // ...
}
```

`AbsolutePath`는 타입 시스템에서만 존재한다. 런타임에는 그냥 `string`이다.  

---

## any의 사용 범위를 최소로 좁히기

`any`를 넓게 사용하면 타입 안전성이 무너진다.  

```typescript
// 나쁜 패턴
const config: any = loadConfig();
config.timeout; // any

// 더 나은 패턴 — 필요한 지점에만
const config = loadConfig() as AppConfig;
```

함수 반환 타입에 `any`를 쓰면 그 `any`가 호출한 쪽으로 전파된다.  

```typescript
function getThing(): any { // 위험
  return 42;
}

const thing = getThing(); // any
thing.doSomething(); // 오류가 감지되지 않는다
```

강제로 `any`를 써야 한다면 타입 단언을 최소 범위에서 사용한다.  

```typescript
function processInput(value: string) {
  return (value as any).trim(); // any의 영향 범위를 한 줄로 한정
}
```

---

## any를 구체적으로 변형해서 사용하기

`any` 대신 더 구체적인 타입을 사용하면 타입 정보를 보존할 수 있다.  

```typescript
// 너무 광범위
function getFirstElement(arr: any) {
  return arr[0];
}

// 더 안전
function getFirstElement(arr: any[]) {
  return arr[0]; // 반환 타입이 any지만, arr 자체는 배열임을 보장
}
```

객체도 마찬가지다.  

```typescript
function hasTwelveLetterKey(o: { [key: string]: any }) {
  for (const key in o) {
    if (key.length === 12) return true;
  }
  return false;
}
```

---

## 타입 단언문보다 타입 안전 접근법 사용하기

`as unknown as T` 패턴은 `any`를 중간에 끼워 타입 체커를 우회한다.  

```typescript
function safeToString(val: unknown) {
  return (val as unknown as string).toUpperCase(); // 위험
}
```

더 안전한 방법은 타입 가드를 사용하는 것이다.  

```typescript
function safeToString(val: unknown): string {
  if (typeof val === 'string') {
    return val.toUpperCase();
  }
  return String(val);
}
```

---

## any의 진화를 이해하기

변수에 처음 `any`가 할당된 후 값을 추가하면 타입이 진화한다.  

```typescript
function range(start: number, limit: number) {
  const out = []; // any[]
  for (let i = start; i < limit; i++) {
    out.push(i); // any[]에서 number[]로 진화
  }
  return out; // number[]
}
```

`noImplicitAny` 옵션이 켜져 있으면 명시적 타입 어노테이션을 요구한다.  

```typescript
function range(start: number, limit: number): number[] {
  const out: number[] = [];
  for (let i = start; i < limit; i++) {
    out.push(i);
  }
  return out;
}
```

---

## 모르는 타입의 값에는 any 대신 unknown 사용하기

`any`는 양방향으로 할당 가능해 타입 안전성을 파괴한다.  
`unknown`은 모든 타입을 할당받지만, 사용하려면 반드시 타입을 좁혀야 한다.  

```typescript
function parseYAML(yaml: string): unknown {
  return yaml;
}

const book = parseYAML(`
  name: Effective TypeScript
  author: Dan Vanderkam
`);

book.title; // 오류 — unknown 타입
book as Book; // 단언으로 좁히기
```

제네릭보다 `unknown`이 더 안전한 경우도 있다.  

```typescript
function safeParseYAML<T>(yaml: string): T {
  return parseYAML(yaml) as T; // 호출자가 타입을 강제 지정 — 여전히 위험
}

function betterParseYAML(yaml: string): unknown {
  return parseYAML(yaml); // 호출자가 직접 좁혀야 함 — 더 안전
}
```

`unknown`은 `any`의 타입 안전 버전이다.  
