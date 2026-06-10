> 어느 디렉토리에서 실행해도 되어야 하는데, 루트에서만 돌아가는 CLI는 절반짜리다.

## gemc 가 뭔가

gem-server는 여러 NestJS 애플리케이션이 공존하는 모노레포다.

각 앱을 빌드하거나 실행하려면 `turbo run build:prod --filter=@gem-server/api` 같은 명령어를 매번 타이핑해야 한다. 앱 이름이나 플래그를 틀리기 쉽고, 새로 합류한 팀원은 어떤 명령어가 있는지부터 파악해야 한다.

이 불편함을 줄이기 위해 만든 내부 CLI가 `gemc` (`@gem-server/cli` 패키지)다.

```bash
gemc build:prod api          # API 앱 프로덕션 빌드
gemc start:dev api --watch   # 하위 패키지 변경 감지 포함 개발 서버
gemc test api                # 테스트 실행
```

---

## 제공하는 커맨드

[Commander.js](https://github.com/tj/commander.js) 기반으로 7개 커맨드를 제공한다.

| 커맨드 | 설명 | 주요 옵션 |
|--------|------|-----------|
| `build:prod <app>` | 프로덕션 빌드 | `--force`, `--continue` |
| `build:dev <app>` | 개발 빌드 | `--force`, `--continue` |
| `build:type <app>` | 타입 체크 빌드 | `--force`, `--continue` |
| `start:dev <app>` | 개발 서버 실행 | `--watch`, `--debug`, `--force` |
| `lint <app>` | ESLint 실행 | `--force` |
| `format <app>` | 포맷 실행 | `--force` |
| `test <app>` | 테스트 실행 | `--force` |

`<app>` 자리에는 `APPLICATION_LIST`로 수집한 실제 앱 이름만 올 수 있어 Commander의 `.choices()` 검증을 통과해야 한다. 존재하지 않는 앱 이름을 입력하면 바로 에러 메시지가 출력된다.

내부적으로는 turbo를 그대로 호출한다.

```javascript
const executeCommand = [
  'turbo', 'run', 'build:prod',
  `--filter=@gem-server/${application}`,
  '--output-logs=new-only',
  continueMode, forceMode,
].filter(Boolean).join(' ');

execSync(executeCommand, {
  cwd: MONOREPO_ROOT,
  env: EXEC_ENV,
  stdio: 'inherit',
});
```

gemc는 결국 turbo의 얇은 래퍼다. turbo 명령어를 외울 필요 없이 gemc가 대신 조합해준다.

---

## 처음에 있었던 문제들

처음 만들 때는 잘 돌아가는 것처럼 보였지만, 실제로 쓰다 보니 세 가지 문제가 쌓였다.

### 1. 루트 밖에서 실행하면 바로 죽는다

초기 `get-directory.js`는 `process.cwd()`를 기준으로 앱 목록을 탐색했다.

```javascript
// 초기 코드 — process.cwd() 기준
const appsDir = join(process.cwd(), 'apps');
```

모노레포 루트에서 실행하면 잘 된다. 하지만 `packages/cli/` 안에서 실행하거나, 다른 프로젝트 디렉토리에서 실행하면 `ENOENT: apps 폴더 없음`으로 즉시 실패한다.

### 2. NVM 환경에서 turbo를 못 찾는다

`execSync`를 옵션 없이 호출하면 현재 쉘 환경을 그대로 상속하지 않는다.

NVM으로 node를 설치한 환경에서는 `~/.nvm/versions/node/{version}/bin`이 PATH에 있어야 turbo를 찾을 수 있다. 그런데 자식 프로세스에서는 이 PATH가 누락되는 경우가 있어 `turbo: command not found` 오류가 발생했다.

### 3. exit code가 항상 1로 고정

`handleCommandError`가 `error.status`를 무시하고 항상 `process.exit(1)`을 호출했다.

CI/CD 파이프라인에서는 exit code로 실패 유형을 구분하는데, 1로 고정되니 빌드 실패인지, 테스트 실패인지 구분할 수 없었다.

---

## 세 가지를 한 번에 해결한 방법

### 모노레포 루트 자동 탐색

`pnpm-workspace.yaml`이 있는 디렉토리를 루트로 간주하고, 현재 경로에서 상위로 재귀 탐색한다.

```javascript
// packages/cli/libs/utils/monorepo-root.js
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const findMonorepoRoot = (dir) => {
  if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
  const parent = join(dir, '..');
  if (parent === dir)
    throw new Error('모노레포 루트를 찾을 수 없습니다.');
  return findMonorepoRoot(parent);
};

export const MONOREPO_ROOT = findMonorepoRoot(process.cwd());
```

어느 디렉토리에서 실행해도 루트를 찾는다. 찾지 못하면 명확한 에러를 던진다.

### NVM PATH 자동 주입

`.nvmrc`를 읽어 해당 버전의 node bin 경로를 구성하고, PATH 앞에 추가한다.

```javascript
// packages/cli/libs/utils/exec-env.js
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { MONOREPO_ROOT } from './monorepo-root.js';

const resolveNvmNodeBin = () => {
  const nvmrcPath = join(MONOREPO_ROOT, '.nvmrc');
  if (!existsSync(nvmrcPath)) return null;
  const version = readFileSync(nvmrcPath, 'utf-8').trim();
  const nvmNodeBin = join(homedir(), '.nvm', 'versions', 'node', version, 'bin');
  return existsSync(nvmNodeBin) ? nvmNodeBin : null;
};

export const EXEC_ENV = {
  ...process.env,
  PATH: [
    resolveNvmNodeBin(),
    join(MONOREPO_ROOT, 'node_modules/.bin'),
    process.env.PATH,
  ].filter(Boolean).join(':'),
};
```

`.nvmrc`가 없거나 해당 node 버전이 설치되어 있지 않으면 그냥 null을 반환해 기존 PATH를 유지한다.

이 `EXEC_ENV`를 모든 커맨드의 `execSync`에 전달한다.

```javascript
execSync(executeCommand, {
  cwd: MONOREPO_ROOT,  // 루트 자동 탐색
  env: EXEC_ENV,       // NVM PATH 주입
  stdio: 'inherit',
});
```

### exit code 투과

`error.status`가 있으면 그대로 전달한다.

```javascript
const handleCommandError = (error) => {
  if (error.status != null) {
    process.exit(error.status);  // 자식 프로세스의 실제 exit code
  }
  // 예상치 못한 오류만 스택 트레이스 출력
  console.error(error);
  process.exit(1);
};
```

---

## chalk 를 걷어낸 이유

초기에는 CLI 출력에 `chalk`를 써서 색상을 입혔다. Node.js 20부터 `util.styleText`가 안정화되면서 외부 의존성 없이 같은 걸 할 수 있게 됐다.

```javascript
// Before
import chalk from 'chalk';
console.log(chalk.blue.bold('[GEM Server CLI]'));

// After
import { styleText } from 'node:util';
console.log(styleText(['blue', 'bold'], '[GEM Server CLI]'));
```

`chalk`는 `package.json`의 `dependencies`에서 제거했다. 패키지 하나가 줄었다는 것보다, **런타임에 의존성 하나가 사라졌다**는 게 더 의미 있다.

---

## `process.cwd()` vs 스크립트 파일 위치

이번 개선에서 핵심 원칙을 하나 정리했다.

> **`process.cwd()`는 실행 위치에 따라 달라진다. 스크립트 내부 경로 참조에는 파일 위치 기반 절대 경로를 써야 한다.**

`import.meta.url` (ESM) 또는 `__dirname` (CJS) 기반으로 스크립트가 어디 있는지를 기준으로 삼으면 실행 위치와 무관하게 동작한다.

gemc의 경우는 `process.cwd()`를 그대로 쓰되, 그 기준에서 루트를 **탐색**하는 방식으로 해결했다. 실행 위치에 의존하되, 거기서 위로 올라가며 정답을 찾는 구조다.

모노레포 내부의 어떤 경로에서 실행해도 결국 루트를 찾기 때문에 실용적인 해법이었다.
