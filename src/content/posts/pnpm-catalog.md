## Catalog란?

pnpm workspace(모노레포 시스템)에서 지원하는 기능이다. **각 라이브러리별 버전을 재사용 가능한 상수로 정의**한 것으로, 정의된 상수는 각 패키지별 `package.json`에서 사용할 수 있다.

모노레포에서 패키지가 많아질수록 라이브러리 버전 관리가 복잡해진다. `react@18`을 `react@19`로 올리려면 모든 패키지의 `package.json`을 일일이 수정해야 한다. Catalog를 사용하면 이 문제를 해결할 수 있다.

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

`devDependencies`, `dependencies`, `peerDependencies`, `optionalDependencies` 모두 사용 가능하다. `pnpm.overrides` 속성 내에서도 사용할 수 있다.

---

## Named Catalog

여러 Catalog를 이름으로 구분해서 사용할 수 있다. `catalog:` 뒤에 이름을 붙이면 특정 Catalog를 지정한다. 이름이 생략되면 자동으로 Default Catalog가 선택된다.

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

## Catalog의 이점

**버전 일원화.** 각 패키지에 널리 쓰이는 라이브러리의 버전을 개별 설정 없이 Catalog에서 한 곳에서 관리할 수 있다.

**한 번의 수정으로 전파.** 특정 라이브러리의 버전 업을 Catalog에서 한 번만 수정하면 이를 참조하는 모든 패키지에 자동으로 반영된다.

**Git Conflict 감소.** 여러 패키지의 `package.json`을 직접 수정하지 않아도 되므로 버전 업그레이드 과정에서의 충돌이 줄어든다.

**Named Catalog로 도메인 구분.** NestJS 관련, ESLint 관련처럼 성격별로 Catalog를 분리해 관리하면 가독성이 높아진다.
