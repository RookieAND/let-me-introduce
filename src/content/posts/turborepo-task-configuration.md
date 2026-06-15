## turbo.json 의 Task 옵션들

gem-server 모노레포에서 CI 빌드 시간을 줄이려고 Turborepo를 파다 보니, 알아야 할 옵션이 생각보다 많았다.

처음에는 `dependsOn`이랑 `outputs` 두 개만 알면 된다고 생각했다.
그 전제가 틀렸다.

환경 변수 하나를 잘못 설정했다가 매 CI마다 캐시가 통째로 날아가는 경험을 했다.
v2에서 Strict Mode가 기본이 된 뒤로는 더 그렇다.
v2 기준으로 Task 옵션 전체를 정리한다.

---

## Task 의 기본 구조

`turbo.json`에서 `tasks` 키 아래에 작성된 각 항목이 하나의 Task다.

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "test": {
      "outputs": ["coverage/**"],
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`turbo run build`를 실행하면 Turborepo는 모든 패키지의 `package.json`을 뒤져 `build` 스크립트를 찾아 실행한다.
`turbo run start:dev`처럼 콜론이 포함된 이름도 그대로 Task 이름으로 쓸 수 있다.
결국 각 패키지의 `package.json`에 정의된 스크립트를 실행하는 것과 동일하다.

---

## dependsOn: 태스크 실행 순서를 정한다

### `^` 접두사: 의존 패키지를 먼저 실행

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

`^`가 붙으면 패키지 간 의존성 그래프를 따라 실행 순서를 결정한다.
Turborepo는 의존성을 재귀 탐색해 **말단 노드에서부터 태스크를 실행**한다.

`accumulation` 앱이 `configuration` 패키지에 의존한다면, `configuration` 빌드가 완료된 뒤에야 `accumulation` 빌드가 시작된다.
의존 관계가 없는 패키지끼리는 병렬로 실행된다.

### `^` 없음: 같은 패키지 안에서의 순서

```json
{
  "tasks": {
    "test": {
      "dependsOn": ["lint", "build"]
    }
  }
}
```

`^` 없이 태스크 이름만 쓰면 **같은 패키지 안에서의 실행 순서**를 의미한다.
여기서는 동일 패키지의 `lint`와 `build`가 모두 끝나야 `test`가 시작된다.

### 특정 패키지의 태스크를 지정

```json
{
  "tasks": {
    "web#lint": {
      "dependsOn": ["utils#build"]
    }
  }
}
```

`패키지명#태스크명` 형식으로 특정 패키지의 태스크가 완료되기를 기다릴 수 있다.
`web` 패키지의 `lint`는 `utils` 패키지의 `build`가 끝날 때까지 시작되지 않는다.

---

## env: 환경 변수를 캐시 해시에 포함한다

```json
{
  "tasks": {
    "build": {
      "env": ["DATABASE_URL"]
    },
    "web#build": {
      "env": ["API_SERVICE_KEY"]
    }
  }
}
```

`env`에 넣은 환경 변수는 캐시 해시 계산에 포함된다.
`DATABASE_URL`이 바뀌면 이전 `build` 캐시는 무효화된다.

**v2에서 Strict Mode가 기본이 됐다.**

`env`나 `globalEnv`에 명시되지 않은 환경 변수는 태스크에 전달되지 않는다.
v1에서 암묵적으로 환경 변수를 읽어오던 방식이 있었다면 꼭 확인해야 한다.

---

## passThroughEnv: 해시 없이 전달만 한다

v2에서 새로 생긴 옵션이다.

```json
{
  "tasks": {
    "build": {
      "env": ["DATABASE_URL"],
      "passThroughEnv": ["CI", "GITHUB_TOKEN"]
    }
  }
}
```

`CI`나 `GITHUB_TOKEN`은 빌드 결과물에 영향을 주지 않지만 실행 환경마다 값이 다르다.
이런 걸 `env`에 넣으면 CI마다 캐시 미스가 터진다. (겪어봤다)

`passThroughEnv`에 넣으면 태스크에는 전달되지만 해시 계산에는 포함되지 않는다.

| 옵션 | 태스크 전달 | 해시 영향 |
|---|---|---|
| `env` | O | O |
| `passThroughEnv` | O | X |

---

## globalEnv / globalPassThroughEnv: 루트 레벨 환경 변수

태스크마다 `env`를 반복하지 않고 전역에서 설정할 수 있다.

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalEnv": ["NODE_ENV", "APP_ENV"],
  "globalPassThroughEnv": ["CI", "GITHUB_TOKEN"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

`globalEnv`에 넣으면 모든 태스크의 해시 계산에 포함된다.
`globalPassThroughEnv`에 넣으면 모든 태스크에 전달되지만 해시에는 영향을 주지 않는다.

공통 환경 변수가 많을 때 태스크마다 중복 선언을 피할 수 있다.

---

## inputs: 감시할 파일 범위를 좁힌다

기본적으로 Turborepo는 패키지 내 모든 파일(`.gitignore` 제외)의 변경을 감지한다.
`inputs`를 쓰면 감시 범위를 좁힐 수 있다.

```json
{
  "tasks": {
    "rollup": {
      "dependsOn": ["ts"],
      "inputs": ["lib/**", "rollup.config.js"],
      "outputs": ["bundled/**"]
    },
    "ts": {
      "inputs": ["src/**", "tsconfig.json"],
      "outputs": ["lib/**"]
    }
  }
}
```

`ts` 태스크는 `src`와 `tsconfig.json`만 본다.
`rollup` 태스크는 `ts` 결과물인 `lib`과 `rollup.config.js`만 본다.

`inputs`를 쓰지 않으면 `rollup.config.js`만 바꿔도 `ts` 태스크 캐시까지 무효화된다.

### $TURBO_DEFAULT$로 특정 파일만 제외하기

기본 감시 전략을 유지하면서 특정 파일만 빼고 싶을 때 `$TURBO_DEFAULT$`를 쓴다.

```json
{
  "tasks": {
    "check-types": {
      "inputs": ["$TURBO_DEFAULT$", "!README.md"]
    }
  }
}
```

`README.md`가 바뀌어도 `check-types`는 다시 실행되지 않는다.

---

## outputs: 캐싱할 결과물 경로

태스크가 성공하면 `outputs`에 명시된 경로를 캐싱한다.
**이 필드가 없으면 아무것도 캐싱하지 않는다.**

```json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    }
  }
}
```

경로는 패키지의 `package.json` 위치 기준이다.

v2에서 Glob 동작이 바뀌었다.
`dist`와 `dist/`는 이제 둘 다 `dist/**`와 동일하게 처리된다.
디렉토리 이름만 써도 하위 파일 전체가 포함된다.

---

## cache / persistent / interactive

### cache

기본값은 `true`다.
`false`로 설정하면 매번 새로 실행하고 결과를 캐싱하지 않는다.

```json
{
  "tasks": {
    "dev": {
      "cache": false
    }
  }
}
```

### persistent

종료 없이 계속 실행되어야 하는 프로세스에 쓴다.

```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`persistent: true`인 태스크는 `turbo watch` 감시 대상에서도 제외된다.
이미 계속 실행 중이니까.

### interactive

```json
{
  "tasks": {
    "test:watch": {
      "cache": false,
      "persistent": true,
      "interactive": true
    }
  }
}
```

`persistent: true` 태스크에서 `stdin` 입력을 받을 때 사용한다.
Jest나 Vitest의 watch 모드처럼 실행 중에 키 입력으로 동작을 제어할 때 유용하다.
`persistent: true`면 자동으로 켜진다.

---

## outputLogs: 터미널 출력 방식

v1에서 `outputMode`였던 옵션이 v2에서 `outputLogs`로 이름이 바뀌었다.
`--output-logs` CLI 플래그와 이름을 맞추기 위한 변경이다.

```json
{
  "tasks": {
    "build": {
      "outputLogs": "new-only"
    }
  }
}
```

| 값 | 동작 |
|---|---|
| `full` | 모든 로그 출력 (기본값) |
| `hash-only` | 해시만 출력, 로그 생략 |
| `new-only` | 새로 실행된 태스크 로그만 출력 |
| `errors-only` | 오류 로그만 출력 |
| `none` | 아무것도 출력 안 함 |

CI에서는 `new-only`나 `errors-only`가 적합하다.
캐시 히트된 태스크 로그가 수백 줄씩 쏟아지면 정작 봐야 할 내용이 묻힌다.

---

## turbo watch: 파일 변경 감지 후 자동 재실행

v2에서 stable로 릴리즈됐다.

```bash
turbo watch build
```

파일이 바뀌면 의존성 그래프를 따라 연관 태스크가 자동 재실행된다.
`packages/configuration`을 수정하면 그것에 의존하는 `apps/accumulation` 태스크도 연쇄적으로 재실행된다.

`persistent: true` 태스크는 watch 대상에서 제외된다.

---

## turbo run --affected: 변경된 패키지만 골라 실행

v2.1에서 추가됐다.

```bash
# 변경된 패키지와 그 영향을 받는 패키지에서만 build를 실행
turbo run build --affected

# 영향을 받는 패키지 목록 확인
turbo ls --affected
```

Git 변경 이력 기반으로 수정된 패키지와 그 영향을 받는 패키지만 골라 실행한다.
PR 하나에 아무 관련 없는 패키지까지 전부 빌드하는 낭비를 없앨 수 있다.

v2.2부터는 GitHub Actions에서 `--affected`를 쓸 때 비교 브랜치를 따로 지정하지 않아도 자동으로 처리된다.

---

## 정리

옵션이 많아 보이지만 Turborepo가 하는 일은 결국 하나다.

> **"이 태스크를 언제, 어떤 조건에서 다시 실행할 것인가"**

`dependsOn`은 실행 순서를 정하고,
`env`·`inputs`·`outputs`는 캐시 무효화 조건을 결정하고,
나머지는 실행 방식과 출력을 제어한다.

v2에서 특히 주의할 점은 두 가지다.

Strict Mode가 기본이 됐다.
`env`나 `globalEnv`에 명시하지 않은 환경 변수는 태스크에 전달되지 않는다.

`passThroughEnv`가 생겼다.
CI 환경 변수처럼 해시에 영향을 주면 안 되지만 태스크에는 전달되어야 하는 변수가 있다면 꼭 써야 한다.
모르고 지나치면 캐시가 이유 없이 날아가는 것처럼 보인다.
