## Catalog란?

pnpm workspace(모노레포 시스템)에서 지원하는 기능이다.
**각 라이브러리별 버전을 재사용 가능한 상수로 정의**한 것으로, 정의된 상수는 각 패키지별 `package.json`에서 사용할 수 있다.

모노레포 규모가 커질수록 의존성 버전 관리는 은근히 피곤해진다.
`react@18`을 `react@19`로 올리려면 모든 패키지의 `package.json`을 일일이 수정해야 하는데, 패키지가 열 개를 넘어가면 그때부터 조금 두려워진다.
Catalog를 쓰면 이 문제를 한 곳에서 해결할 수 있다.

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

내부에서는 Catalog로 관리하되, 외부에 배포될 때는 표준 semver로 변환된다.
외부 패키지 매니저에서도 아무 문제 없이 설치된다.

---

## 설정 옵션

`pnpm-workspace.yaml`에 추가로 설정할 수 있는 옵션이 두 가지 있다.

### catalogMode

`pnpm add`로 의존성을 추가할 때 Catalog와의 관계를 어떻게 처리할지 결정한다.

```yaml
catalogMode: strict
```

기본값은 `manual`이다.
Catalog와 무관하게 평소처럼 동작하고, `catalog:` 프로토콜을 자동으로 쓰지 않는다.

`prefer` 모드는 Catalog에 호환 버전이 있으면 `catalog:` 프로토콜을 쓰고, 없으면 일반 버전 범위로 폴백한다.

`strict` 모드는 Catalog에 없는 버전은 아예 추가할 수 없다.
팀 전체가 Catalog를 강제로 써야 하는 상황에서 꽤 유용하다.

### cleanupUnusedCatalogs

```yaml
cleanupUnusedCatalogs: true
```

`true`로 설정하면 설치 시 사용하지 않는 Catalog 항목을 자동으로 제거한다.
기본값은 `false`이므로 특별히 설정하지 않으면 수동으로 정리해야 한다.

---

## Catalog의 이점

버전을 한 곳에서만 관리한다.
`pnpm-workspace.yaml`의 Catalog 항목 하나만 수정하면 그 Catalog를 참조하는 모든 패키지에 자동으로 반영된다.
패키지가 수십 개여도 버전 업그레이드는 한 줄 수정으로 끝난다.

Git 충돌도 줄어든다.
버전 업그레이드할 때 각 패키지의 `package.json`을 건드리지 않으니, 여러 사람이 동시에 작업할 때 충돌 가능성이 낮아진다.

Named Catalog를 쓰면 도메인별로 의존성을 분리할 수 있다.
NestJS 관련, ESLint 관련처럼 성격별로 나누면 한눈에 파악하기 좋다.

---

## 기존 프로젝트 마이그레이션

이미 쓰고 있는 모노레포에 Catalog를 도입하려면 공식 codemod가 있다.

```bash
pnpx codemod pnpm/catalog
```

직접 `package.json`을 하나씩 수정하지 않아도 된다.
패키지 수가 많다면 먼저 이걸 돌려보는 게 낫다.
