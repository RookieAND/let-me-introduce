## 왜 Code Generator를 만들었나

모노레포 서버 프로젝트를 세팅하면서 반복되는 코드를 생성해야 하는 케이스가 여럿 생겼다.   
새 패키지를 추가할 때마다 `package.json`, `tsconfig.json`, `.eslintrc.js`, `.swcrc.json` 같은 파일들을 매번 직접 만들어야 했고,   
MongoDB Collection을 추가할 때도 Schema, Repository, Index 파일을 동일한 패턴으로 반복했다.  

명령어 하나로 이 모든 걸 자동 생성할 수 있다면 DX가 크게 향상될 거라 생각해 Code Generator를 직접 만들기로 했다.  

---

## PlopJS를 선택한 이유

**hygen**과 비교해 **PlopJS**를 선택했다. 주요 이유는 다음과 같다.  

- hygen은 Append/Prepend만 지원하고 전체 수정(Modify)은 불가능하다. PlopJS는 Custom Action을 JS로 더 유연하게 구현할 수 있다.
- PlopJS는 특정 액션 실패 시 이후 액션 중단 여부를 `abortOnFail`로 설정할 수 있다
- hygen은 EJS 템플릿에 코드와 변수를 함께 작성해 재사용성이 낮다. PlopJS는 Template 코드와 Prompt/Action을 분리해 동일한 템플릿을 여러 액션에 재사용할 수 있다
- PlopJS의 HandleBar 템플릿 엔진이 Python Jinja2와 유사해 러닝커브가 낮았다

---

## 설치 및 TypeScript 세팅

```bash
pnpm i plop typescript --filter="@gem-server/code-generator"
pnpm i -D node-plop handlebarjs cross-env tsx --filter="@gem-server/code-generator"
```

TypeScript로 작성된 Plopfile을 실행하기 위해 `cross-env`와 `tsx`를 사용한다.  

```json
{
  "scripts": {
    "plop": "cross-env NODE_OPTIONS='--import tsx' plop --plopfile=./libs/index.ts"
  }
}
```

---

## Generator 구조

PlopJS의 Generator는 **description**, **prompt**, **action** 세 부분으로 구성된다.  

- **Description**: Generator 설명. 목록 출력 시 함께 표시된다
- **Prompt**: 사용자에게서 필요한 값을 얻기 위한 프롬프트. 내부적으로 [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)를 사용한다
- **Action**: Generator 실행 시 진행할 태스크 목록. `add`, `modify`, `append` 액션이 있다

---

## Generator 제작 예시

Collection 생성 Generator의 Prompt 정의:  

```typescript
prompts: [
  {
    type: 'input',
    name: 'connection',
    message: 'DB 커넥션 명을 입력해주세요. (kdt, op, exp, gem)',
    validate: (connection: string) => {
      const isValid = VALID_CONNECTIONS.includes(connection);
      if (!isValid) throw new Error('kdt, op, exp, gem 중 하나를 입력해주세요.');
      return true;
    },
  },
  {
    type: 'input',
    name: 'collection',
    message: '생성할 컬렉션 명을 입력해주세요. (CamelCase로 입력)',
    validate: (name: string) => {
      if (!/^[a-zA-Z]+$/.test(name)) {
        throw new Error('컬렉션 명은 영문 조합으로만 가능합니다.');
      }
      return true;
    },
  },
],
```

Handlebar 템플릿 파일 (`.hbs`):  

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type {{pascalCase collection}}Document = HydratedDocument<{{pascalCase collection}}>;

@Schema()
export class {{pascalCase collection}} {}

export const {{pascalCase collection}}Schema = SchemaFactory.createForClass({{pascalCase collection}});
```

`{{}}` (이중 중괄호) 안에 변수를 기입하면 생성 시 주입된 값으로 대체된다. `pascalCase`, `kebabCase`, `lowerCase` 같은 문자열 변환 함수를 기본으로 제공한다.  

Action 정의:  

```typescript
actions: [
  {
    type: 'add',
    path: `${databaseCollectionDirectory}/{{connection}}/{{kebabCase collection}}/index.ts`,
    templateFile: './template/generate-collection/index.hbs',
    abortOnFail: true,
  },
  {
    type: 'append',
    path: `${databaseCollectionDirectory}/{{connection}}/index.ts`,
    template: `export * from './{{kebabCase collection}}';`,
  },
],
```

---

## Custom Action 제작

파일 생성 외에도 커스텀 로직을 실행해야 할 때 Custom Action을 만들 수 있다. Generator 실행 후 `pnpm i`를 자동으로 실행하는 `runCommandAction`을 만들었다.  

```typescript
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { CustomActionFunction } from 'plop';

const execAsync = promisify(exec);

export const runCommandAction: CustomActionFunction = async (answer, config) => {
  const { stdout, stderr } = await execAsync(config.command as string, {
    cwd: config.workingPath ?? process.cwd(),
  });

  if (stderr) throw new Error(stderr);
  return stdout;
};
```

`CustomActionFunction` 타입에 따라 구현하며, Error를 던지면 Action이 실패 처리되고, string을 return하면 터미널에 메시지로 출력된다.  

```typescript
const generator = (plop: NodePlopAPI) => {
  // Custom Action 등록 (Generator 등록 이전에 해야 함)
  plop.setActionType('runCommand', runCommandAction);
  plop.setGenerator('generate-collection', generateDatabaseCollection);
  plop.setGenerator('generate-package', generatePackageGenerator);
};
```

Generator의 actions 배열에서 사용할 때:  

```typescript
actions: [
  // ... 파일 생성 액션들
  {
    type: "runCommand",
    command: "pnpm i",
  } as CustomActionConfig<"runCommand">,
],
```

TypeScript에서는 사용자가 생성한 Action임을 명시하기 위해 `CustomActionConfig<K>` 타입을 명시해야 에러가 나지 않는다.  

---

## 결과

새 패키지를 추가할 때 `pnpm plop`을 실행하면 프롬프트에 값을 입력하는 것만으로 필요한 파일 전체와 `pnpm i`까지 자동으로 처리된다. MongoDB Collection 추가도 마찬가지다. 반복 작업에서 생기는 오타나 누락을 줄이고, 프로젝트 내 일관된 파일 구조를 강제할 수 있다.  
