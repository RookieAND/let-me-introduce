## 65개 suite가 전부 실패했다

어느 날 `pnpm test`를 실행했더니 unit test suite 65개가 전부 실패했다.
코드를 바꾼 게 없었는데.

에러 메시지는 이랬다.

```
error TS5011: rootDir is expected to contain all source files.
  The following source file is not under 'rootDir':
  'test/setup/jest.setup.ts'
```

테스트 코드 문제가 아니었다.
컴파일러 설정 문제였다.

---

## 원인: isolatedModules 없이 ts-jest를 쓰면 일어나는 일

`isolatedModules` 옵션을 설정하지 않은 상태에서는 ts-jest가 프로젝트 전체를 **한 번에** 컴파일한다.

모노레포라면 여러 `tsconfig.json`이 존재하고, 각각의 `rootDir`가 서로 다르다.
ts-jest가 전체를 한 번에 처리하려다 보니 `rootDir` 충돌이 발생했다.

해결은 간단했다.

```typescript
// jest.config.ts
export default {
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,  // ← 이것 하나
    }],
  },
};
```

`isolatedModules: true`를 설정하면 ts-jest가 파일을 **개별적으로** 트랜스파일한다.
`rootDir` 충돌이 사라진다. 0 / 65 → 79 / 79로 바뀌었다.

단, 주의할 점이 있다.
`isolatedModules: true`는 전체 타입 체크를 건너뛴다.
타입 오류가 있어도 테스트가 통과할 수 있다.
그래서 CI에 `tsc --noEmit` 단계를 별도로 두는 게 맞다.

```yaml
# GitHub Actions
- name: Type Check
  run: pnpm tsc --noEmit

- name: Unit Test
  run: pnpm test
```

테스트 실행과 타입 체크를 분리하는 것이다.

---

## ts-jest가 느리다는 걸 그제서야 봤다

테스트가 다시 돌아가고 나서, 속도를 측정해봤다.

520개 테스트 기준으로 **5.97초**가 걸렸다.
크게 느린 건 아니었는데, Rust 기반의 `@swc/jest`로 교체하면 어떻게 되나 궁금했다.

```bash
pnpm add -D @swc/jest @swc/core
```

```typescript
// jest.config.ts
export default {
  transform: {
    '^.+\\.ts$': ['@swc/jest'],
  },
};
```

결과는 **4.27초**였다. 같은 520개 테스트에서 약 28% 단축됐다.

| 설정 | 실행 시간 |
|---|---|
| ts-jest (isolatedModules: true) | 5.97s |
| @swc/jest | 4.27s |

---

## 바로 교체하지 않은 이유

수치만 보면 당장 교체해야 할 것 같은데, 확인해야 할 게 두 가지 있었다.

**첫 번째 — @swc/jest는 타입 체크를 하지 않는다.**

SWC는 TypeScript를 타입 없이 트랜스파일만 한다.
타입 오류가 있는 코드도 테스트는 통과한다.
`isolatedModules: true`와 같은 문제다.

```typescript
// 이 코드가 있어도 @swc/jest는 통과시킨다
const value: number = "이건 문자열인데";
```

이 문제는 앞서 말한 방식으로 해결할 수 있다.
CI에 `tsc --noEmit` 단계를 분리해서 넣으면, 타입 안전성은 유지하면서 속도 이점을 가져갈 수 있다.

NestJS 환경에서는 한 가지 더 챙겨야 했다.
NestJS의 DI 시스템은 데코레이터 메타데이터에 의존한다.
`@swc/jest`를 쓸 때는 `.swcrc`에 `decoratorMetadata: true`가 반드시 있어야 한다.

```json
{
  "$schema": "https://json.schemastore.org/swcrc",
  "jsc": {
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true  // ← 없으면 DI가 깨진다
    }
  }
}
```

이걸 빠뜨리면 `TestBed.solitary()` 같은 @suites API가 의존성 메타데이터를 읽지 못해 auto-mock 생성에 실패한다.

**두 번째 — coverage 수치가 달라졌는데, 이게 합리적인 변화인가.**

`@swc/jest`로 이전하면서 coverage provider도 V8으로 설정했다.
그런데 같은 테스트인데 statement, branch, function 수치가 전부 달라졌다.

단순히 "수치가 바뀌었으니 OK"라고 넘어갈 수 없었다.
수치가 올라갔다면 — coverage가 실제로 좋아진 건지, 아니면 측정 대상 자체가 줄어든 건지 구분해야 했다.
수치가 내려갔다면 — 진짜로 테스트가 부족한 영역이 드러난 건지, 측정 방식이 달라진 건지 판단이 필요했다.

그 변화가 합리적인지를 먼저 파악해야 했다.

---

## coverage provider를 V8으로 바꿨더니 수치가 달라졌다

```typescript
// jest.config.ts
export default {
  collectCoverage: true,
  coverageProvider: 'v8',  // Istanbul이 기본값
};
```

같은 테스트인데 statement, branch, function 수치가 전부 바뀌었다.
처음에는 테스트가 빠진 줄 알았다.

아니었다. Istanbul과 V8이 커버리지를 측정하는 방식 자체가 달랐다.

**Istanbul** — ts-jest/Babel이 코드를 변환할 때 각 statement, branch 분기점, function 진입부에 카운터 코드를 직접 심는다. TypeScript 소스 레벨에서 계측하기 때문에 `type`, `interface` 같은 타입 선언도 statement로 잡힐 수 있다. `&&`, `||`, `??`, `?.` 연산자도 각각 명시적 branch로 추적한다.

**V8** — Node.js 엔진의 내장 기능을 그대로 쓴다. 코드를 건드리지 않고, 엔진이 실제로 실행한 바이트 범위를 추적한다. 소스맵으로 TypeScript 소스 위치에 역매핑한다.

수치 차이가 생기는 이유는 세 가지다.

**① 타입 선언이 제외된다.**
V8은 컴파일된 JS를 추적하니, 런타임에 존재하지 않는 `type`, `interface` 선언은 처음부터 집계 대상이 아니다. Istanbul 대비 statement·function 수치가 올라가는 경향이 있다.

**② 암묵적 branch 처리가 다르다.**
Istanbul은 `&&`나 `?.` 같은 연산자를 명시적 branch로 계측한다. V8은 블록 커버리지(block coverage) 방식이라 이 중 일부를 branch로 인식하지 않는다.

**③ NestJS 데코레이터 확장 코드 처리가 다르다.**

```typescript
// @Injectable() 같은 데코레이터는 컴파일 시 이런 코드로 확장된다
let UserService = class UserService {
  constructor(repo) { this.repo = repo; }
};
UserService = __decorate([
  (0, common_1.Injectable)(),
  __metadata("design:paramtypes", [UserRepository])
], UserService);
```

Istanbul은 이 확장 코드 전체를 계측하지만, V8은 실행 경로 기준으로 집계한다. NestJS 코드베이스에서 특히 수치 차이가 크게 나는 이유다.

여기까지 파악하고 나서, 한 가지 의문이 남았다.

> 이게 합리적인 이유가 되는 건가? 변화가 자연스럽다고 해서 그냥 넘어가도 되는 걸까?

솔직히 처음에는 "측정 방식이 달라서 수치가 바뀐 것"이라는 게 변명처럼 느껴졌다.
coverage가 떨어졌는데 "원래 그런 거야"로 정당화하는 것과 다를 게 없지 않나.

그런데 생각해보면 V8 방식이 오히려 더 솔직한 측정이다.

Istanbul은 TypeScript 소스를 계측 대상으로 삼기 때문에, 런타임에 존재하지 않는 타입 선언도 "커버된 코드"로 잡힌다.
V8은 실제로 JS 엔진이 실행한 경로만 추적한다.
수치가 달라 보여도, V8이 측정하는 것이 "실제로 실행된 코드"에 더 가깝다.

다만 이게 "그냥 넘어가도 된다"는 뜻은 아니다.

V8 기준으로 branch coverage가 낮아 보이는 경우, `&&`나 `?.` 양쪽 경로를 모두 실행하는 테스트가 부족한 건 맞다.
Istanbul이 그 경로를 명시적으로 추적해줬을 때는 테스트 작성 가이드 역할도 했던 셈인데, V8은 그 신호가 약해진다.

결국 provider를 바꾼다는 건 "측정 기준을 바꾼다"는 뜻이다.
바뀐 기준 아래서 낮은 branch coverage는 여전히 확인하고 채워야 할 대상이다.

그래서 교체를 진행하면서 한 가지 원칙을 세웠다.

**provider가 다르면 수치를 비교할 수 없다.**

V8로 전환한 이후의 baseline이 새로운 기준이다.
이제 "같은 provider 기준에서 이전 커밋 대비 수치가 어떻게 변했는가"를 보는 게 의미 있다.
Istanbul 시절의 수치와 비교하는 건 의미가 없다.

---

## 정리

| 항목 | ts-jest | @swc/jest |
|---|---|---|
| 속도 | 느림 | **28% 빠름** |
| 타입 체크 | O | **X** |
| NestJS 호환 | 기본 지원 | `decoratorMetadata: true` 필요 |
| isolatedModules | 옵션 | 항상 isolated 방식 |

속도만 보고 `@swc/jest`로 바꾸는 건 반쪽짜리 결정이다.
타입 체크가 빠진다는 점을 인지하고, CI에 `tsc --noEmit` 단계를 반드시 분리해야 한다.
그 다음에야 속도 이점을 안전하게 가져갈 수 있다.
