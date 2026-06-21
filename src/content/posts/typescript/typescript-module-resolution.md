## moduleResolution이란?

TypeScript가 `import` 경로를 실제 파일로 변환하는 전략이다. 컴파일 결과가 아닌 **타입 체크 단계**의 파일 탐색 규칙으로, 실제 번들/컴파일 결과물과는 무관하다.  

TypeScript는 `import` 문을 보고 해당 모듈의 타입 정보를 찾아야 한다. 이때 어떤 방식으로 파일 경로를 해석할지를 결정하는 것이 `moduleResolution` 옵션이다.  

---

## 세 가지 전략 비교

### node (= node10) — 레거시 CJS 방식

Node.js가 CommonJS 시절부터 써온 모듈 탐색 방식을 모방한다.  

```typescript
import { foo } from './utils'
// TypeScript 탐색 순서:
// 1. ./utils.ts
// 2. ./utils/index.ts
```

- 확장자 없이 import 가능
- `index.ts` 자동 탐색
- `package.json`의 `exports` 필드 **미인식**

현대 패키지들이 `exports` 필드를 통해 CJS/ESM 버전을 분리 제공하는 경우가 많다. `node` 전략은 이를 인식하지 못해 타입 탐색 실패가 발생할 수 있다.  

### node16 / nodenext — 현대 Node.js ESM 방식

Node.js의 공식 ESM 스펙을 그대로 따르는 전략이다.  

```typescript
import { foo } from './utils.js'  // ✅
import { foo } from './utils'     // ❌ 에러
```

- `package.json`의 `exports`, `imports` 필드 완전 인식
- 확장자 필수 → 기존 코드베이스 대규모 수정 필요

### bundler — 번들러 모델링 방식

TypeScript 5.0에서 도입됐다. Vite, esbuild, webpack이 실제로 모듈을 해석하는 방식을 모델링한다.  

```typescript
import { foo } from './utils'            // ✅ 확장자 생략 OK
import { Button } from '@vapor-ui/core'  // ✅ exports 조건부 분기 인식
import { Space } from '#/Entities/Space' // ✅ tsconfig paths 별칭 정상 동작
```

`bundler`가 `node16`보다 나은 이유는 세 가지다.  

- **확장자 자유** — 번들러는 `.ts`/`.tsx`를 자동 탐색하므로 확장자 강제 불필요
- **exports 필드 완전 지원** — 라이브러리의 CJS/ESM 분기, 조건부 exports 인식
- **paths 별칭 자연스럽게 동작** — `#/Entities/...` 같은 tsconfig paths 완전 호환

> `"module": "CommonJS"`와 `bundler`는 조합 불가. `bundler`는 반드시 `"module": "ESNext"` 또는 `"module": "Preserve"`와 함께 사용해야 한다.  

---

## 연관 옵션들

### module — 컴파일 출력 포맷

`moduleResolution`이 타입 체크 시 파일 탐색 방식이라면, `module`은 **TypeScript가 출력할 JavaScript의 모듈 시스템**을 결정한다.  

두 옵션은 세트로 설정해야 하며, 잘못된 조합은 TypeScript가 에러로 알려준다.  

- `CommonJS` + `node` → 레거시 Node.js CJS
- `ESNext` + `bundler` → Vite, esbuild 등 번들러
- `NodeNext` + `nodenext` → Node.js ESM (최신)
- `Preserve` + `bundler` → 번들러 (import 구문 그대로 유지)

### verbatimModuleSyntax — import type 강제

```typescript
import { type Foo } from './foo'  // ✅ 타입만 import
import { Foo } from './foo'       // ❌ Foo가 타입이면 에러
```

런타임에 남지 않아야 할 타입 import가 실수로 값 import로 남는 것을 방지한다. `bundler` + `ESNext` 조합에서 권장된다.  

### allowImportingTsExtensions

```typescript
import { foo } from './utils.ts'  // ✅ (이 옵션 없으면 에러)
```

번들러가 `.ts` 확장자를 직접 처리할 때 사용한다. `noEmit: true` 또는 `emitDeclarationOnly: true`가 필요하다.  

### paths + baseUrl — 경로 별칭

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "#/*": ["./src/*"]
    }
  }
}
```

`paths` 별칭은 TypeScript 타입 체크에서만 동작한다. 실제 런타임 해석은 Vite의 `resolve.alias` 등 번들러 설정과 함께 맞춰야 한다.  

---

## 결론

`moduleResolution`은 TypeScript가 import 경로를 파일로 변환하는 **타입 체크 전용 전략**으로, 컴파일 출력과는 무관하다.  

Vite 기반 프로젝트에서는 **`"module": "ESNext"` + `"moduleResolution": "bundler"`** 조합이 사실상 표준이다. `bundler` 전략은 확장자 생략, `exports` 필드 인식, `paths` 별칭 모두를 자연스럽게 지원해 번들러와 TypeScript의 모듈 해석 방식을 일치시킨다.  
