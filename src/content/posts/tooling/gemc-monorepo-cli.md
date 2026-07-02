## 매일 치던 명령어들

gem-server는 NestJS 앱 여러 개가 공존하는 pnpm workspace 기반 모노레포다.
앱을 빌드하거나 실행하는 방식이 팀 내에서 두 갈래로 나뉘었다.

루트에서 turbo filter를 붙여 실행하거나, 앱 디렉토리로 직접 이동해 pnpm run 으로 실행하거나.
통일된 방식이 없었고, 실제로 매일 치던 명령어는 이랬다.

```bash
turbo watch start:dev -F="@gem-server/accumulation..." --continue
turbo run build:type -F="@gem-server/database" -F="@gem-server/configuration" --force
turbo run format:fix -F="@gem-site/form" -F={"./packages/{ky|msw|ui}"} --only
cd /apps/form; pnpm run build:prod
```

세 가지 문제가 있었다.

**첫째, 두 앱 이상을 동시에 실행하려면 터미널 창을 여러 개 열어야 했다.**

각 앱마다 별도의 터미널에서 실행해야 했고, 서로 의존하는 앱이 있으면 순서도 챙겨야 했다.

**둘째, filter 문법을 외워야 했다.**

`-F="@gem-server/accumulation..."` 처럼 패키지 스코프와 `...` 의 의미까지 알아야 했다.
두 패키지를 함께 지정하려면 `-F` 를 두 번 써야 한다는 것도 별도로 기억해야 했다.

**셋째, 새 팀원이 어떤 명령어가 있는지 알기 어려웠다.**

사용 가능한 커맨드와 옵션을 파악하려면 직접 물어봐야 했다.

---

## 설계 방향: turbo 위의 얇은 래퍼

> turbo를 대체하는 게 아니라, 자주 쓰는 패턴을 짧은 이름으로 감싸는 CLI를 만든다.

위 네 줄을 이렇게 바꾸는 게 목표였다.

```bash
gemc start:dev accumulation --watch --continue
gemc build:type --package=database,configuration --force
gemc format --app=form --package=ky,msw,ui --fix --only
gemc build:prod form
```

이렇게 만든 것이 `gemc` (`@gem-server/cli` 패키지)다.
Commander.js 기반으로 7개 커맨드를 제공하고, 내부적으로는 turbo를 그대로 호출한다.

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

gemc는 결국 turbo의 얇은 래퍼다.
복잡한 filter 조합과 플래그를 외울 필요 없이, gemc가 대신 조합해서 실행한다.

---

## gemc 가 제공하는 커맨드

gemc 가 지원하는 커맨드는 총 7개다.

| 커맨드 | 설명 |
|---|---|
| `start:dev <app>` | 개발 서버 실행 |
| `build:dev <app>` | 개발 모드 빌드 |
| `build:prod <app>` | 운영 모드 빌드 |
| `build:type` | 패키지 타입 모듈 생성 |
| `lint` | ESLint 검사 |
| `format` | Prettier 포맷팅 |
| `test` | 테스트 코드 실행 (`@gem-server` 전용) |

앱 단위 커맨드(`start:dev`, `build:dev`, `build:prod`)는 `<application>` 을 위치 인자로 받는다.
패키지 단위 커맨드(`lint`, `format`, `build:type`, `test`)는 `--app`, `--package` 옵션으로 대상을 지정한다.
어느 쪽도 지정하지 않으면 모든 앱·패키지를 대상으로 실행된다.

공통 옵션으로 `-f/--force` (turbo 캐시 무효화), `-c/--continue` (하위 작업 실패 무시), `-o/--only` (지정 패키지만 한정) 를 지원한다.
`start:dev` 에는 `-w/--watch` 옵션이 추가로 있어 하위 패키지 변경을 감지하면 자동으로 재시작한다.

---

## 만들고 쓰다 보니 나온 문제 세 가지

### 루트 밖에서 실행하면 바로 죽는다

초기에는 `process.cwd()` 를 기준으로 앱 목록을 탐색했다.

```javascript
const appsDir = join(process.cwd(), 'apps');
```

루트에서 실행하면 잘 된다.
하지만 `packages/cli/` 안에서 실행하거나 다른 경로에서 호출하면 `ENOENT: apps 폴더 없음` 으로 즉시 실패한다.
`process.cwd()` 가 실행 위치에 따라 달라진다는 걸 간과했다.

`pnpm-workspace.yaml` 이 있는 디렉토리를 루트로 간주하고, 현재 경로에서 상위로 재귀 탐색하는 방식으로 해결했다.

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

어느 디렉토리에서 실행해도 루트를 찾는다.
실행 위치에 의존하되, 거기서 위로 올라가며 정답을 찾는 구조다.

### NVM 환경에서 turbo를 못 찾는다

`execSync` 를 옵션 없이 호출하면 현재 셸 환경을 그대로 상속하지 않는다.
NVM으로 node를 관리하는 환경에서는 `~/.nvm/versions/node/{version}/bin` 이 PATH에 있어야 turbo를 찾을 수 있는데, 자식 프로세스에서 이 경로가 빠지는 경우가 있어 `turbo: command not found` 오류가 발생했다.

`.nvmrc` 를 읽어 해당 버전의 node bin 경로를 구성하고, PATH 앞에 추가해서 해결했다.

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

`.nvmrc` 가 없거나 해당 node 버전이 설치되지 않으면 null 을 반환해 기존 PATH를 그대로 유지한다.
이 `EXEC_ENV` 를 모든 커맨드의 `execSync` 에 전달한다.

```javascript
execSync(executeCommand, {
  cwd: MONOREPO_ROOT,
  env: EXEC_ENV,
  stdio: 'inherit',
});
```

### exit code가 항상 1로 고정된다

CI/CD 파이프라인에서는 exit code로 실패 유형을 구분한다.
그런데 `handleCommandError` 가 `error.status` 를 무시하고 항상 `process.exit(1)` 을 호출하고 있어서, 빌드 실패인지 테스트 실패인지를 코드만으로는 알 수가 없었다.

turbo가 종료할 때 `error.status` 에 실제 exit code를 담아 돌려준다.
그걸 그대로 전달하면 된다.

```javascript
const handleCommandError = (error) => {
  if (error.status != null) {
    process.exit(error.status);
  }
  console.error(error);
  process.exit(1);
};
```

---

## chalk 대신 util.styleText — 의존성 하나를 걷어낸 이유

초기에는 CLI 출력에 `chalk` 를 써서 색상을 입혔다.
Node.js 20에서 `util.styleText` 가 안정화되면서 외부 의존성 없이 같은 걸 할 수 있게 됐다.

```javascript
// Before
import chalk from 'chalk';
console.log(chalk.blue.bold('[GEM Server CLI]'));

// After
import { styleText } from 'node:util';
console.log(styleText(['blue', 'bold'], '[GEM Server CLI]'));
```

패키지 하나가 줄었다는 것보다, 런타임에 의존성 하나가 사라졌다는 게 더 의미 있다.

---

## 주의: process.cwd()는 실행 위치에 따라 달라진다

스크립트 내부에서 경로를 참조할 때 `process.cwd()` 를 그대로 쓰면 실행 위치에 따라 결과가 달라진다.
`import.meta.url` (ESM) 또는 `__dirname` (CJS) 처럼 파일 위치 기반 절대 경로를 쓰는 게 안전하다.

gemc 는 `process.cwd()` 를 쓰되, 거기서 위로 올라가며 루트를 탐색하는 방식을 택했다.
실행 위치에 의존하되, 거기서 정답을 찾아가는 구조다.
모노레포 어디서 실행해도 루트를 찾기 때문에 실용적인 해법이었다.
