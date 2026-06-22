## gem-server 에서 반복 코드를 날려버리고 싶었다

`gem-server` 를 세팅하다 보면 패턴이 반복되는 코드를 생성해야 하는 케이스가 꽤 많았다.
새 컬렉션을 만들 때마다 Schema, Repository, index 파일을 하나씩 만들고, 임포트 경로를 수동으로 추가하는 과정이 번거로웠다.

명령어 하나로 "딸깍" 하면 이 작업이 끝난다면 DX 가 훨씬 나아질 것 같았다.
그래서 Code Generator 도입을 결정했다.

---

## hygen 을 먼저 봤는데, 결국 PlopJS 를 선택했다

처음에는 hygen 을 기반으로 만들려 했다.
그런데 조사를 하면 할수록 PlopJS 가 더 맞겠다는 생각이 들었다.

**다운로드 및 업데이트 빈도**가 먼저 눈에 띄었다.
PlopJS 는 hygen 에 비해 약 3배 많은 다운로드 수를 기록하고 있었고, hygen 은 마지막 업데이트가 2년 전이었다.
조용히 묻히고 있는 느낌이었다.

**코드 수정 유연성** 차이도 컸다.
hygen 은 Append 와 Prepend 만 지원하고, 전체 수정(Modify) 은 불가능하다.
PlopJS 는 Custom Action 을 JavaScript 로 자유롭게 작성할 수 있어서 훨씬 유연했다.

**Action 실패 시 중단 여부**도 PlopJS 가 우위였다.
`abortOnFail` 옵션으로 특정 Action 이 실패하면 이후 작업을 중단할 수 있고, Custom Action 에 Fallback 을 별도로 지정할 수도 있다.

**조건부 Action Skip** 방식도 달랐다.
hygen 은 정규식이나 EJS 기반으로 Skip 조건을 작성하는데, PlopJS 는 JavaScript 함수로 더 유연하게 쓸 수 있다.

**선언적 프롬프트 및 액션 관리** 측면에서도 차이가 났다.
hygen 은 EJS 템플릿 내부에 변수와 코드를 함께 작성해서 재사용성이 낮다.
PlopJS 는 Template 코드와 별도로 Prompt 및 Action 을 관리하기 때문에 동일한 템플릿을 여러 Generator 에 재사용할 수 있다.

솔직히 말하면, 루키의 EJS 미숙으로 인한 선택이기도 했다.
PlopJS 는 Handlebar 템플릿 엔진을 쓰는데, 과거 Python 에서 사용한 Jinja2 와 문법이 매우 유사해서 러닝커브가 거의 없었다.
반면 hygen 의 EJS 는 edu-core 에서 본 적은 있어도 직접 써본 적이 없었다.

---

## PlopJS 설치와 TypeScript 세팅

`@gem-server/code-generator` 라는 전용 패키지를 만들고 아래 라이브러리를 설치했다.

```shell
pnpm i plop typescript --filter="@gem-server/code-generator"
pnpm i -D node-plop handlebarjs cross-env tsx --filter="@gem-server/code-generator"
```

패키지 구조는 역할별로 분리했다.

```plain text
code-generator/
└── libs/
    ├── actions/
    │   └── run-command.action.ts
    ├── generators/
    │   ├── generate-package.ts
    │   └── generate-collection.ts
    ├── templates/
    │   ├── generate-package/
    │   │   ├── index.hbs
    │   │   └── eslintrc.hbs
    │   └── generate-collection/
    │       ├── index.hbs
    │       └── repository.hbs
    ├── helpers/
    │   └── is-equal.helper.ts
    └── index.ts
```

`index.ts` 는 plop 객체를 받아 Generator 를 초기화하는 진입점이다.

```typescript
import type { NodePlopAPI } from 'plop';
import { generatePackageGenerator } from '#/generator/generate-package';

const generator = (plop: NodePlopAPI) => {
    plop.setGenerator('generate-package', generatePackageGenerator);
};

export default generator;
```

TypeScript 로 작성된 plopfile 을 실행하려면 `cross-env` 와 `tsx` 가 필요하다.
[공식 문서](https://plopjs.com/documentation/#typescript-support) 에 나와 있는 방법대로 `package.json` 에 스크립트를 추가한다.

```json
"scripts": {
    "plop": "cross-env NODE_OPTIONS='--import tsx' plop --plopfile=./libs/index.ts"
}
```

---

## Generator 는 세 가지로 구성된다

PlopJS 의 Generator 는 **description**, **prompt**, **action** 으로 나뉜다.

- **Description**: Generator 의 설명. 목록에서 같이 출력된다.
- **Prompt**: 실행에 필요한 값을 사용자에게 받는 단계. 내부 구현체는 [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) 다.
- **Action**: 실제로 수행할 태스크 목록. 파일 추가(add), 수정(modify), 코드 추가(append) 와 Custom Action 을 정의할 수 있다.

---

## Generator 제작: Prompt

`generate-collection` Generator 는 `connection` 과 `collection` 두 값이 필요하다.
각 input 에 `validate` 함수를 붙여서 잘못된 값이 들어오면 즉시 에러를 낸다.

```typescript
prompts: [
    {
        type: 'input',
        name: 'connection',
        message: 'DB 커넥션 명을 입력해주세요. (kdt, op, exp, gem)',
        validate: (connection: string) => {
            const isValidConnection = VALID_CONNECTIONS.includes(connection);
            if (!isValidConnection)
                throw new Error('kdt, op, exp, gem 중 하나를 입력해주세요.');
            return true;
        },
    },
    {
        type: 'input',
        name: 'collection',
        message: '생성할 컬렉션 명을 입력해주세요. (CamelCase 로 입력)',
        validate: (packageName: string) => {
            const isValidPackageName = /^[a-zA-Z]+$/.test(packageName);
            if (!isValidPackageName) {
                throw new Error('컬렉션 명은 영문 조합으로만 가능합니다.');
            }
            return true;
        },
    },
],
```

---

## Generator 제작: Template

파일 내용은 Handlebar (`.hbs`) 템플릿으로 정의한다.
`{{}}` 이중 중괄호 안에 변수를 넣으면 생성 시 주입된 값으로 대체된다.
`pascalCase`, `kebabCase`, `lowerCase` 같은 문자열 변환 함수를 기본으로 제공해서 별도 헬퍼 없이도 케이스 변환이 된다.

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type {{pascalCase collection}}Document = HydratedDocument<{{pascalCase collection}}>;

@Schema()
export class {{pascalCase collection}} {
}

export const {{pascalCase collection}}Schema = SchemaFactory.createForClass({{pascalCase collection}});
```

HandlebarsJS 문법에 대해서는 [공식 가이드](https://handlebarsjs.com/guide/) 를 참고하면 된다.

---

## Generator 제작: Action

Action 은 세 가지 종류가 있다.

**add** 는 템플릿을 기반으로 파일을 새로 생성한다.
`path` 에 경로를, `templateFile` 에 `.hbs` 파일 경로를 지정한다.
`abortOnFail: true` 를 설정하면 이 Action 이 실패할 경우 이후 작업이 중단된다.

```typescript
{
    type: 'add',
    path: `${databaseCollectionDirectory}/{{connection}}/{{kebabCase collection}}/index.ts`,
    templateFile: './template/generate-collection/index.hbs',
    abortOnFail: true,
},
{
    type: 'add',
    path: `${databaseCollectionDirectory}/{{connection}}/{{kebabCase collection}}/{{kebabCase collection}}.schema.ts`,
    templateFile: './template/generate-collection/schema.hbs',
    abortOnFail: true,
},
```

**append** 는 기존 파일의 특정 위치에 코드를 추가한다.
**modify** 는 기존 내용을 대체한다.
둘 다 `pattern` 필드로 삽입/수정 위치를 정규식 또는 문자열로 지정한다.

```typescript
{
    type: 'append',
    path: `${databaseCollectionDirectory}/{{connection}}/index.ts`,
    template: `export * from './{{kebabCase collection}}';`,
},
{
    type: 'append',
    path: `${databaseCollectionDirectory}/{{connection}}/{{connection}}-database-schemas.ts`,
    pattern: '/** COLLECTION IMPORT */',
    templateFile: './template/generate-collection/collection-import.hbs',
},
{
    type: 'append',
    path: `${databaseCollectionDirectory}/{{connection}}/{{connection}}-database-schemas.ts`,
    pattern: '/** COLLECTION REGISTER */',
    templateFile: './template/generate-collection/collection.hbs',
},
```

---

## Custom Action: 코드 생성 후 pnpm install 자동 실행

파일 생성만 하고 끝내면 안 됐다.
`gem-server` 에서는 코드 생성 후 `pnpm i` 명령어를 실행해서 의존성을 재설치해야 했다.

이를 위해 `runCommandAction` 이라는 Custom Action 을 만들었다.

```typescript
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { CustomActionFunction } from 'plop';

const execAsync = promisify(exec);

const createCwd = (
    answer: Parameters<CustomActionFunction>[0],
    config: Parameters<CustomActionFunction>[1],
) => {
    if (!config.workingPath) return process.cwd();
    return config.workingPath === 'function'
        ? config.workingPath(answer)
        : config.workingPath;
};

export const runCommandAction: CustomActionFunction = async (answer, config) => {
    const { stdout, stderr } = await execAsync(config.command as string, {
        cwd: createCwd(answer, config),
    });

    if (stderr) {
        throw new Error(stderr);
    }

    return stdout;
};
```

`CustomActionFunction` 은 Prompt 에서 받은 Answer 와 Action 블록의 Config 를 인자로 받는다.
Error 를 던지면 Action 실패로 처리되고, 성공 시 반환한 문자열이 터미널에 출력된다.

Custom Action 은 Generator 등록 이전에 `setActionType` 으로 먼저 등록해야 한다.
첫 번째 인자로 넘긴 문자열이 Action 블록의 `type` 을 구분하는 Key 가 된다.

```typescript
import type { NodePlopAPI } from 'plop';
import { runCommandAction } from '#/actions/run-command.action';
import { generateDatabaseCollection } from '#/generators/generate-collection';
import { generatePackageGenerator } from '#/generators/generate-package';

const generator = (plop: NodePlopAPI) => {
    plop.setActionType('runCommand', runCommandAction);
    plop.setGenerator('generate-collection', generateDatabaseCollection);
    plop.setGenerator('generate-package', generatePackageGenerator);
};

export default generator;
```

Action 블록에서 쓸 때는 등록한 Key 를 `type` 에 넣고, 필요한 Config 를 함께 넘긴다.
TypeScript 에서는 반드시 `CustomActionConfig<K>` 타입을 명시해야 에러가 나지 않는다.

```typescript
actions: [
    // ... 중략
    {
        type: 'add',
        path: `${packageDirectory}/{{kebabCase packageName}}/libs/index.ts`,
        template: '',
        abortOnFail: true,
    },
    {
        type: 'runCommand',
        command: 'pnpm i',
    } as CustomActionConfig<'runCommand'>,
],
```

---

## 완성된 generate-package Generator

```typescript
import type { CustomActionConfig } from 'node-plop';
import path from 'node:path';
import type { PlopGeneratorConfig } from 'plop';

const packageDirectory = path.join(process.cwd(), '..');
const VALID_TS_CONFIG_OPTIONS = ['nest', 'base'];

export const generatePackageGenerator: PlopGeneratorConfig = {
    description: '레포지토리에 사용할 새로운 package 를 생성하여 등록하는 Generator',
    prompts: [
        {
            type: 'input',
            name: 'tsConfigOption',
            message: '사용하고자 하는 typescript config 모드를 선택해주세요. (base, nest)',
            validate: (connection: string) => {
                const isValidConnection = VALID_TS_CONFIG_OPTIONS.includes(connection);
                if (!isValidConnection)
                    throw new Error('nest, base 중 하나를 입력해주세요.');
                return true;
            },
        },
        {
            type: 'input',
            name: 'packageName',
            message: '생성할 패키지 명을 입력해주세요. (CamelCase 로 입력)',
            validate: (packageName: string) => {
                const isValidPackageName = /^[a-zA-Z]+$/.test(packageName);
                if (!isValidPackageName) {
                    throw new Error('패키지 명은 영문 조합으로만 가능합니다.');
                }
                return true;
            },
        },
    ],
    actions: [
        {
            type: 'add',
            path: `${packageDirectory}/{{kebabCase packageName}}/.eslintrc.js`,
            templateFile: './templates/generate-package/eslintrc.hbs',
            abortOnFail: true,
        },
        {
            type: 'add',
            path: `${packageDirectory}/{{kebabCase packageName}}/package.json`,
            templateFile: './templates/generate-package/packageJson.hbs',
            abortOnFail: true,
        },
        {
            type: 'add',
            path: `${packageDirectory}/{{kebabCase packageName}}/README.md`,
            templateFile: './templates/generate-package/readme.hbs',
            abortOnFail: true,
        },
        {
            type: 'add',
            path: `${packageDirectory}/{{kebabCase packageName}}/.swcrc.json`,
            templateFile: './templates/generate-package/swcrc.hbs',
            abortOnFail: true,
        },
        {
            type: 'add',
            path: `${packageDirectory}/{{kebabCase packageName}}/tsconfig.json`,
            templateFile: './templates/generate-package/tsconfig.hbs',
            abortOnFail: true,
        },
        {
            type: 'add',
            path: `${packageDirectory}/{{kebabCase packageName}}/libs/index.ts`,
            template: '',
            abortOnFail: true,
        },
        {
            type: 'runCommand',
            command: 'pnpm i',
        } as CustomActionConfig<'runCommand'>,
    ],
};
```

---

## Ref.

- [PlopJS 공식 문서](https://plopjs.com/documentation/)
- [TypeScript 지원 가이드](https://plopjs.com/documentation/#typescript-support)
- [HandlebarsJS 문법](https://handlebarsjs.com/guide/)
- [node-plop GitHub](https://github.com/amwmedia/node-plop)
