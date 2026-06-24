## 들어가며

TypeScript 5.5 에서 `isolatedDeclarations` 라는 컴파일러 옵션이 새로 추가됐다.  
이름만 보면 `isolatedModules` 와 비슷한 것처럼 느껴지는데 어떤 녀석인지 파보니 사뭇 다르다.  

Typescript 를 써봤다면 알겠지만 `isolatedModules` 는 단일 파일만으로 트랜스파일이 가능한지 강제하는 옵션이다.  
`isolatedDeclarations` 도 비슷한 방향성이지만, 목적이 다르다.  

켜면 export 에 타입 주석이 없거나, 다른 파일의 정보를 봐야만 타입을 알 수 있는 경우에 에러를 뱉는다.  
TypeScript 가 타입 추론을 해주는 언어인데 왜 명시를 강제하는 걸까?  

왜 그런 제약을 만들었는지, 그게 어떤 문제를 해결하는지를 파고들었다.  

---

## .d.ts 생성은 왜 타입 체커 전체를 필요로 하는가?

일반적으로 TypeScript 로 라이브러리를 빌드하면 `.d.ts` 선언 파일이 생성된다.  
이 파일이 있어야 소비자 코드에서 타입 정보를 볼 수 있다.  

문제는 `.d.ts` 를 만들기 위해 TypeScript 가 **전체 타입 체커를 실행해야 한다**는 것이다.  
그 이유는 내부 함수의 반환 타입이 다른 파일의 정보에 의존하기 때문이다.  

```typescript
// lib.ts
import { getUser } from './user';

export function processUser() {
  return getUser(); // 반환 타입이 무엇인가?
}
```

`processUser` 의 반환 타입을 `.d.ts` 에 쓰려면 `getUser` 가 무엇을 반환하는지 알아야 한다.  
그러려면 `user.ts` 를 읽고, 그 안에서 또 참조하는 파일을 추적해야 한다.  
만약 모노레포 환경이라면 이 의존성 체인이 수십, 수백 파일까지 뻗어나간다.  

결과적으로 선언 파일 생성은 타입 체크와 마찬가지로 **순차적**으로 이루어진다.  
패키지 A 의 `.d.ts` 가 없으면 패키지 B 의 타입 체크를 시작할 수 없다.  
모노레포 규모가 커질수록 이 병목이 빌드 시간에 직접 영향을 준다.  

---

## isolatedDeclarations 가 해결하려는 것

이전 섹션에서 본 문제의 핵심은 "반환 타입을 결정하려면 다른 파일을 봐야 한다" 는 것이었다.  

> 각 파일의 export 타입이 그 파일 하나만 봐도 결정될 수 있어야 한다. 그러면 다른 파일을 보지 않고도 .d.ts 를 만들 수 있다.

단일 파일만으로 선언 파일을 생성할 수 있다면, 여러 파일을 **병렬**로 처리할 수 있다.  
이 덕에 타입 체크와 선언 파일 생성을 동시에 진행하는 것도 가능해진다.  

이를 위해 TypeScript 5.5 에 `transpileDeclaration()` API 도 함께 추가됐다.  
해당 옵션을 활성화 하면 타입 체커 없이 단일 파일에서 `.d.ts` 를 생성할 수 있게 된다.  
단 이는 `isolatedDeclarations` 를 켠 파일에서만 올바르게 동작한다.  

---

## isolatedModules 와는 무엇이 다른가?

이름이 비슷해서 혼동하기 쉬운데, 두 옵션이 다루는 단계 자체가 다르다.  

`isolatedModules` 는 **JS emit** 단계의 문제를 해결한다.  
Babel 이나 esbuild 같은 도구가 타입 체커 없이 단일 파일만으로 `.js` 를 만들 수 있도록 강제하는데, TypeScript 문법을 단순히 제거하면 되기 때문에 다른 파일의 타입 정보가 필요 없다.  

`isolatedDeclarations` 는 **d.ts emit** 단계의 문제를 해결한다.  
외부 도구가 타입 체커 없이 단일 파일만으로 `.d.ts` 를 만들 수 있도록 강제하는 것이다.  

| 옵션 | 대상 단계 | 목표 |
|---|---|---|
| `isolatedModules` | JS emit | Babel/esbuild 가 `.js` 를 타입 체커 없이 병렬 생성 |
| `isolatedDeclarations` | d.ts emit | 외부 도구가 `.d.ts` 를 타입 체커 없이 병렬 생성 |

이미 `isolatedModules` 를 켠 프로젝트라도 `isolatedDeclarations` 는 별도로 필요하다.  
두 문제는 독립적이기 때문이다.  

---

## 어떤 제약이 생기는가?

먼저 활성화 조건을 짚고 가자. `isolatedDeclarations` 를 켜려면 `declaration: true` 또는 `composite: true` 가 먼저 활성화되어 있어야 한다.  
선언 파일을 만들지 않는 프로젝트에서는 이 옵션 자체가 의미 없기 때문이다.  

```json
{
  "compilerOptions": {
    "declaration": true,
    "isolatedDeclarations": true
  }
}
```

이 제약은 **export 된 것에만** 적용된다는 점도 중요하다.  
파일 내부에서만 쓰는 변수나 함수는 아무리 복잡한 추론을 써도 상관없다.  

```typescript
// 내부에서만 쓰는 건 자유롭게
const users = getUsers(); // ✅ 타입 추론해도 무방

// export 되는 순간부터 단일 파일에서 타입이 결정되어야 한다
export const adminUsers = users.filter(u => u.role === 'admin'); // ❌
export const adminUsers: User[] = users.filter(u => u.role === 'admin'); // ✅
```

"내가 이 파일을 읽는 것만으로 네 export 가 무슨 타입인지 알 수 있어야 한다" — 이게 이 옵션이 거는 제약의 전부다.  

`isolatedDeclarations` 를 켜면 TypeScript 는 "이 export 의 타입을 외부 정보 없이 결정할 수 있는가" 를 검사한다.  
만약 타입을 자체적으로 결정할 수 없으면 에러를 발생시킨다.  

### 함수의 반환 타입

```typescript
// ❌ 반환 타입을 추론하려면 함수 본문을 평가해야 한다
export function getUser() {
  return { id: 1, name: 'Alice' };
}

// ✅ 명시적으로 적으면 해결
export function getUser(): { id: number; name: string } {
  return { id: 1, name: 'Alice' };
}
```

### 다른 변수를 참조하는 export

```typescript
const base = 'hello';

// ❌ base 의 타입을 알려면 위 선언을 봐야 한다
export const greeting = base;

// ✅
export const greeting: string = base;
```

### 외부 함수 호출 결과

```typescript
// ❌ Math.random() 이 무엇을 반환하는지 알려면 타입 체커가 필요하다
export const value = Math.random();

// ✅
export const value: number = Math.random();
```

### 허용되는 케이스

단일 파일 안에서 타입이 확정되는 경우는 통과한다.  

```typescript
// ✅ 리터럴은 타입이 바로 결정된다
export const version = 1;
export const name = 'TypeScript';

// ✅ as const 는 허용
export const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;

// ✅ 객체 리터럴도 허용
export const config = { host: 'localhost', port: 3000 };

// ✅ 파라미터와 반환 타입이 명시된 함수 표현식
export const fn = (x: number): string => String(x);
```

반면 아래는 통과하지 못한다.  

```typescript
// ❌ 스프레드 — 어떤 프로퍼티가 있는지 알려면 원본을 봐야 한다
export const next = { ...config };

// ❌ 뮤터블 배열 — 원소 타입 추론 필요
export const items = [1, 2, 3];

// ✅ as const 로 해결
export const items = [1, 2, 3] as const;
```

### 의외의 케이스: RegExp 와 산술 연산

처음에는 꽤 의외로 느껴지는 케이스들이 있다.  

```typescript
// ❌ RegExp 리터럴
export const pattern = /^[0-9]+$/;

// ❌ 산술 연산
export const BLOCK_SIZE = 512 / 8;
```

RegExp 의 경우 TypeScript 팀이 직접 설명했는데, `RegExp` 라는 이름이 파일 내에서 Shadowing 될 수 있기 때문이다.  

```typescript
type RegExp = 42; // 로컬에서 재정의됐다면?

export const pat = /foo/; // 이 경우 타입은 RegExp 가 아니라 42 가 된다
```

올바르게 표현하려면 `globalThis.RegExp` 로 써야 하는데, 생성된 선언 파일에 그 형태가 나오는 건 너무 못생겼다는 이유로 지원하지 않는다고 한다.  
앞서 나온 산술 연산도 결국 같은 이유다. `512 / 8` 의 결과가 `number` 임을 알려면 결국 계산이 필요하기 때문이다.  

---

## 그런데, 지금 켜도 빌드가 빨라지지 않는다

이 부분이 가장 중요하게 이해해야 할 점이다.  

솔직히 처음에는 켜면 뭔가 달라질 거라 기대했다. 그 기대가 틀렸다.  

PR 작성자인 Rob Palmer 가 GitHub 이슈에서 명확히 밝혔다.  

> "Please do not expect anything amazing to happen when you enable the flag. Your declaration emit won't change on enablement. Compilation won't magically go faster."

`isolatedDeclarations` 를 켠다고 해서 `.d.ts` 파일의 내용이 바뀌지 않는다.  
즉 컴파일 속도가 빨라지지도 않고, TypeScript 자체가 병렬 처리를 시작하지도 않는다.  

이 옵션은 **외부 빌드 도구가 병렬 처리를 구현할 수 있는 전제조건**을 만들어주는 것이다.  
따라서 실제 속도 향상은 이 옵션을 활용하는 외부 도구가 나와야 비로소 일어난다.  

TypeScript 팀은 이를 MVP 라고 직접 표현했다.  

> "Think of ID as being a Minimum Viable Product (MVP) for now."

그렇다면 지금 당장 이 옵션을 켜야 하는 이유는 무엇일까. TypeScript 팀이 제시한 현실적인 이유는 이렇다.  

- **Style** — export 에 명시적 타입을 강제하는 스타일 규칙으로 쓰고 싶을 때
- **API Access** — `transpileDeclaration()` API 를 직접 활용하는 도구를 만들 때
- **External Tooling** — 이미 이 기반 위에서 만들어진 도구(oxc, tsdown 등)를 활용할 때

---

## 한계: 추론에 의존하는 라이브러리와의 충돌

커뮤니티에서 가장 많이 거론된 문제는 Zod, Mongoose 같은 라이브러리와의 충돌이다.  

```typescript
import { z } from 'zod';

// ❌ UserObj 의 타입을 명시적으로 써야 한다
const UserObj = z.object({
  username: z.string(),
  age: z.number(),
});

export type User = z.infer<typeof UserObj>;
```

`z.object(...)` 의 반환 타입은 Zod 내부 제네릭 체인의 결과다.  
이를 명시적으로 쓰려면 끔찍하게 긴 타입 표현을 직접 작성해야 하고.. 그렇게 하면 Zod 를 쓰는 의미가 사라진다.  

TypeScript 팀의 답변은 "현재로서는 코드 생성이나 Quick Fix 로 타입을 먼저 써놓는 것 외에 좋은 방법이 없다" 는 것이었다.  

커뮤니티에서는 `auto` 타입 제안도 나왔는데, 언어 서버가 타입을 자동으로 채워주고 변경되면 알아서 갱신해주는 방식이다.  

```typescript
// 이런 문법을 원했다
export function test(): auto { ... }
```

하지만 TypeScript 팀은 버전이 바뀔 때마다 타입 표현 방식이 달라질 수 있어 업그레이드할 때마다 대규모 변경이 발생할 것이라는 이유로 채택하지 않았다.  

---

## 생태계의 움직임

`isolatedDeclarations` 가 MVP 라는 선언에 걸맞게, 생태계 도구들이 이를 기반으로 움직이기 시작했다.  

**oxc** 는 이미 자체 isolated declarations 구현체를 가지고 있다.  
타입 체커 없이 AST 변환만으로 `.d.ts` 를 생성하는데, TypeScript 의 고급 체커 기능을 사용하지 않는 케이스에서는 정확히 동일한 출력을 낸다.  

**tsdown** 번들러는 `tsconfig.json` 에서 `isolatedDeclarations` 를 켜지 않아도, 번들러 설정만으로 oxc 기반 빠른 선언 파일 생성을 활용할 수 있다.  

```typescript
// tsdown.config.ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: {
    oxc: true, // isolatedDeclarations 없이도 fast d.ts 생성
  },
});
```

---

## 마치며

`isolatedDeclarations` 는 지금 당장 빌드를 빠르게 만드는 옵션이 아니라, 생태계 도구들이 병렬 선언 파일 생성을 구현할 수 있도록 코드베이스를 미리 준비하는 것이다.  

이 옵션이 생긴 이유를 이해하고 나니, 역설적으로 TypeScript 의 타입 추론이 얼마나 깊게 파일 간 의존성에 기대고 있는지를 다시 보게 됐다.  
결국 추론의 편리함은 체커 전체를 돌려야 한다는 비용과 맞바꾼 것이었다.  
