## Catalog란?

pnpm workspac (모노레포 시스템) 에서 지원하는 기능이다.  
**각 라이브러리별 버전을 재사용 가능한 상수로 정의**한 것으로, 정의된 상수는 각 패키지별 `package.json`에서 사용할 수 있다.  

모노레포 규모가 커질수록 의존성 버전 관리는 은근히 피곤해진다. (사실 은근히가 아니라 그냥 대놓고 피곤해진다. 버전 불일치 이슈가 참 힘들다)  
`react@18`을 `react@19`로 올리려면 모든 패키지의 `package.json`을 일일이 수정해야 하는데, 패키지가 열 개를 넘어가면 그때부터 조금 두려워진다.  

하지만 pnpm 에서 제공하는 Catalog 기능을 활용한다면 이러한 문제를 한 곳에서 해결할 수 있다.  

---

## 사용 방법

Catalog는 내부적으로 `catalog:` 프로토콜을 사용하며, `pnpm-workspace.yaml`에서 정의한다.  

```yaml
packages:
  - packages/*
  - apps/*

catalog:
  react: ^18.3.1
  redux: ^5.0.1
```

각 패키지의 `package.json`에서 `catalog:` 프로토콜로 버전을 대체한다.  

```json
{
  "name": "@example/app",
  "dependencies": {
    "react": "catalog:",
    "redux": "catalog:"
  }
}
```

`devDependencies`, `dependencies`, `peerDependencies`, `optionalDependencies` 모두 사용 가능하다.  
`pnpm.overrides` 속성 내에서도 사용할 수 있다.  

---

## Named Catalog

여러 Catalog를 이름으로 구분해서 사용할 수 있다.  
`catalog:` 뒤에 이름을 붙이면 특정 Catalog를 지정한다.  
이름이 생략되면 자동으로 Default Catalog가 선택된다.  

```yaml
catalogs:
  default:
    "@types/node": 24
    "typescript": 5.6.0
  nestjs:
    "@nestjs/common": 10.4.5
    "@nestjs/config": 3.2.3
    "@nestjs/core": 10.0.0
    "@nestjs/swagger": 7.3.1
  eslint:
    "@typescript-eslint/eslint-plugin": 7.0.0
    "@typescript-eslint/parser": 7.0.0
    "eslint": 8.42.0
```

```json
{
  "dependencies": {
    "@nestjs/common": "catalog:nestjs",
    "@nestjs/config": "catalog:nestjs"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "eslint": "catalog:eslint"
  }
}
```

---

## 내부 동작 원리: resolver는 catalog:를 모른다

쓰다 보니 궁금해졌다.  
`catalog:react` 를 쓰면 설치할 때 pnpm 이 어떻게 실제 버전을 찾아오는 걸까.  
레지스트리를 두 번 조회하는 건 아닐까, 아니면 별도의 resolution 경로가 있는 건 아닐까.  

소스를 파고들어보니 생각보다 훨씬 단순했다.  

**resolver 는 `catalog:` 를 전혀 모른다.**  
resolver 에 진입하기 전에 이미 semver 로 치환이 끝난다.  

### 프로토콜 파싱

전체 코드베이스에서 `catalog:` 를 파싱하는 곳은 딱 하나다.  
`catalogs/protocol-parser/src/parseCatalogProtocol.ts` 의 `parseCatalogProtocol` 함수다.  

```ts
// catalogs/protocol-parser/src/parseCatalogProtocol.ts
function parseCatalogProtocol(bareSpecifier: string): string | 'default' | null {
  if (!bareSpecifier.startsWith('catalog:')) return null
  const name = bareSpecifier.slice('catalog:'.length).trim()
  return name === '' ? 'default' : name
}
```

`catalog:` 가 아니면 `null`, 뒤에 이름이 없으면 `'default'`, `catalog:nestjs` 면 `'nestjs'` 를 반환한다.  
모든 패키지가 이 함수 하나만 import 한다.  

### 설치 시 메모리 치환

`pnpm-workspace.yaml` 에서 읽은 Catalogs 객체는 설치 시작 시점에 CatalogResolver 함수로 감싼다.  

```ts
// installing/deps-resolver/src/resolveDependencyTree.ts
catalogResolver: resolveFromCatalog.bind(null, opts.catalogs ?? {})
```

그리고 `resolveDependencies.ts` 에서 각 dependency 를 처리할 때, resolver 에 넘기기 전에 이 함수를 먼저 호출한다.  

```ts
// installing/deps-resolver/src/resolveDependencies.ts (간략화)
const catalogLookup = ctx.catalogResolver(extendedWantedDep.wantedDependency)

if (catalogLookup.type === 'found') {
  // "catalog:react" 를 "^18.3.1" 로 그냥 덮어씀
  extendedWantedDep.wantedDependency.bareSpecifier = catalogLookup.specifier
}
```

이게 전부다.  
`catalog:react` 는 `^18.3.1` 로 덮어써지고, 이후 resolver 는 평범한 semver 스펙을 처리하는 것뿐이다.  
`catalog:` 를 위한 특수 분기가 resolver 안에 없다.  

`resolveFromCatalog` 자체는 단순한 Map lookup 이다.  
`catalogs[catalogName][alias]` 에서 semver 범위를 꺼내오는 것뿐이다.  
재귀 `catalog:`, `workspace:`, `link:`, `file:` 참조는 이 시점에 에러를 던진다.  

### lockfile 의 catalogs 섹션

resolution 이 끝나면 `getCatalogSnapshots()` 가 lockfile 에 `catalogs` 섹션을 기록한다.  

```yaml
# pnpm-lock.yaml

catalogs:
  default:
    react:
      specifier: ^18.3.1   # pnpm-workspace.yaml 에 적힌 값
      version: 18.2.0      # 실제 resolve 된 버전

importers:
  packages/app:
    dependencies:
      react:
        specifier: catalog:   # 원본 프로토콜은 그대로 보존
        version: 18.2.0
```

importer 쪽에는 `catalog:` 가 그대로 남는다.  
`catalogs` 섹션에만 실제 버전이 기록된다.  

이 구조가 캐시 역할도 한다.  
다음 설치 시 `getCatalogExistingVersionFromSnapshot()` 이 lockfile 의 `specifier` 와 현재 workspace.yaml 값을 비교한다.  
일치하면 기록된 `version` 을 그대로 재사용하고, 달라졌을 때만 레지스트리에 fresh resolution 을 요청한다.  

---

## 배포 시 동작 방식

`catalog:` 프로토콜은 `pnpm publish` 또는 `pnpm pack` 실행 시 실제 semver 범위로 자동 치환된다.  
`workspace:` 프로토콜과 동일한 방식이다.  

아래처럼 작성된 패키지를 배포하면,  

```json
{
  "name": "@example/components",
  "dependencies": {
    "react": "catalog:react18"
  }
}
```

배포된 패키지에는 이렇게 실제 버전이 들어간다.  

```json
{
  "name": "@example/components",
  "dependencies": {
    "react": "^18.3.1"
  }
}
```

`releasing/exportable-manifest/src/index.ts` 의 `createExportableManifest()` 가 컨버터 파이프라인을 구성해서 처리한다.  

```ts
// releasing/exportable-manifest/src/index.ts (간략화)
const convertDependencyForPublish = combineConverters(
  replaceWorkspaceProtocol,
  replaceCatalogProtocol,  // catalog: → ^18.3.1
  replaceJsrProtocol
)
```

`workspace:`, `catalog:`, `jsr:` 세 프로토콜을 순서대로 치환한다.  
`catalog:` 컨버터는 `resolveFromCatalog` 를 호출해서 semver 범위로 교체한 새 manifest 객체를 만들어 tarball 에 넣는다.  
원본 `package.json` 은 건드리지 않는다.  
외부 패키지 매니저에서도 아무 문제 없이 설치된다.  

---

## 설정 옵션

`pnpm-workspace.yaml`에 추가로 설정할 수 있는 옵션이 두 가지 있다.  

### catalogMode

`pnpm add`로 의존성을 추가할 때 Catalog와의 관계를 어떻게 처리할지 결정한다.  

```yaml
catalogMode: strict
```

세 가지 모드를 지원한다.  

1. `manual` (기본값)
   - Catalog와 무관하게 평소처럼 동작한다.
   - `pnpm add`로 패키지를 추가해도 `catalog:` 프로토콜로 자동 변환되지 않는다.
   - 직접 `package.json`을 수정하거나 Catalog를 명시적으로 지정해야 한다.

2. `prefer`
   - Catalog에 호환되는 버전이 있으면 자동으로 `catalog:` 프로토콜을 사용한다.
   - Catalog에 없는 패키지라면 일반 버전 범위로 폴백한다.
   - Catalog 도입 초기에 점진적으로 마이그레이션할 때 유용하다.

3. `strict`
   - Catalog에 등록되지 않은 패키지는 `pnpm add` 자체가 실패한다.
   - 모든 의존성을 반드시 Catalog를 통해서만 추가할 수 있도록 강제한다.
   - 팀 전체의 버전 통일을 규칙으로 관리하고 싶을 때 적합하다.

### cleanupUnusedCatalogs

```yaml
cleanupUnusedCatalogs: true
```

`true`로 설정하면 설치 시 사용하지 않는 Catalog 항목을 자동으로 제거한다.  
기본값은 `false`이므로 특별히 설정하지 않으면 수동으로 정리해야 한다.  

---

## Catalog의 이점

1. 버전을 한 곳에서만 관리한다.
   - `pnpm-workspace.yaml`의 Catalog 항목 하나만 수정하면 참조하는 모든 패키지에 자동으로 반영된다.
   - 패키지가 수십 개여도 버전 업그레이드는 한 줄 수정으로 끝난다.
   - 사내 라이브러리처럼 패키지 간 버전 호환이 중요한 경우에 특히 유용하다. 버전을 올릴 때 어느 패키지가 뒤처지는 일 없이 한 번에 맞출 수 있다.

2. Git 충돌이 줄어든다.
   - 버전 업그레이드할 때 각 패키지의 `package.json`을 건드리지 않아도 된다.
   - 여러 사람이 동시에 작업하더라도 버전 관련 충돌이 발생할 여지 자체가 없어진다.

3. Named Catalog로 도메인별 관리가 가능하다.
   - NestJS 관련, ESLint 관련처럼 성격별로 Catalog를 나눌 수 있다.
   - 어떤 패키지가 어떤 도메인의 의존성인지 한눈에 파악하기 좋다.

---

## 기존 프로젝트 마이그레이션

이미 쓰고 있는 모노레포에 Catalog를 도입하려면 공식 codemod가 있다.  

```bash
pnpx codemod pnpm/catalog
```

직접 `package.json`을 하나씩 수정하지 않아도 된다.  
패키지 수가 많다면 먼저 이걸 돌려보는 게 낫다.  
