## Turbo Prune이란?

`turbo prune`은 모노레포에서 특정 애플리케이션과 의존성을 가진 하위 패키지들을 추출해 별도의 모노레포로 구축하는 기능이다.

```bash
turbo prune --scope="@gem-server/accumulation"
```

실행하면 `/out` 디렉토리에 타겟과 관련된 패키지만 추출된다.

```
out/
├── apps/
│   └── accumulation
├── packages/
│   ├── apm-node
│   ├── configuration
│   ├── database
│   └── logger
├── package.json
├── pnpm-lock.json
└── pnpm-workspace.json
```

불필요한 패키지를 제거해 Docker 이미지 크기도 줄일 수 있다.

---

## 문제: 루트 package.json이 캐시를 깬다

Docker 빌드 시 문제가 생긴다. 루트 디렉토리의 `package.json`이 변경되면 타겟 애플리케이션과 무관한 의존성 변경도 포함된다. 이것이 Cache Miss를 유발하고, 불필요한 의존성 설치로 빌드 시간이 길어진다.

---

## 해결: --docker 옵션

`--docker` 옵션을 사용하면 `/out` 디렉토리 내에 `/full`과 `/json` 폴더를 별도로 생성한다.

```
out/
├── full/          ← 타겟 빌드에 필요한 내부 패키지들의 소스 코드 전체
│   ├── apps/
│   └── packages/
└── json/          ← 각 패키지의 package.json 파일만
    ├── apps/
    │   └── accumulation/
    │       └── package.json
    └── packages/
        ├── database/
        │   └── package.json
        └── logger/
            └── package.json
```

`/json`에는 `package.json`만 있기 때문에 의존성 설치에 필요한 최소한의 파일만 복사된다. 이로 인해 연관 없는 패키지들의 변경 사항을 고려하지 않고 효율적인 캐싱이 가능해진다.

---

## Dockerfile 구성

```docker
FROM node:22-alpine AS base
RUN npm i -g pnpm

ARG APPLICATION_NAME
ENV APPLICATION=${APPLICATION_NAME}

FROM base AS builder
WORKDIR /app
RUN npm i -g turbo@^2
COPY . .
RUN turbo prune --scope="@gem-server/${APPLICATION}" --docker

FROM base AS installer
WORKDIR /app
# package.json만 먼저 복사해 의존성 설치 (캐시 활용)
COPY --from=builder /app/out/json .

RUN --mount=type=cache,id=pnmcache,target=/var/pnpm/store \
    pnpm config set store-dir /var/pnpm/store && \
    pnpm config set package-import-method copy && \
    pnpm install --prefer-offline --ignore-scripts --frozen-lockfile

# 소스 코드 복사 후 빌드
COPY --from=builder /app/out/full/ .
RUN pnpm run build:prod --filter="@gem-server/${APPLICATION}..."

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 gem && \
    adduser --system --uid 1001 nestjs
USER nestjs
COPY --from=installer --chown=nestjs:gem /app/apps/${APPLICATION}/dist ./
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```

**세 단계로 나뉜다.**

**Builder**: `turbo prune --docker`로 타겟과 관련된 패키지를 `/out`에 추출한다.

**Installer**: `/json`의 `package.json`으로 의존성을 설치한다. `/var/pnpm/store`를 Cache Mount해 반복 설치를 최적화한다. 이후 소스 코드를 복사하고 빌드한다.

**Runner**: 빌드된 `/dist`만 가져와 실행한다.

---

## 개발 중 만난 문제들

### Production 빌드에서의 타입 빌드 제거

특정 애플리케이션의 Production 빌드에서 패키지의 타입 빌드는 필요 없다. Development와 Production 모드 간의 Task Flow를 다르게 가져갔다.

- **Development**: `lint` → `build:type` → `build:package` → `start:dev`
- **Production**: `build:package` → `build` → `start:prod`

### pnpm Store Cache Mount

`/var/pnpm/store`를 pnpm 저장소로 설정하고 Cache Mount를 적용했다. 이미 다운로드된 패키지는 다시 다운로드하지 않아 의존성 설치 시간을 크게 단축했다.

```docker
RUN --mount=type=cache,id=pnmcache,target=/var/pnpm/store \
    pnpm config set store-dir /var/pnpm/store && \
    pnpm config set package-import-method copy && \
    pnpm install --prefer-offline --ignore-scripts --frozen-lockfile
```

### Turbo Cache 문제

매 빌드마다 생성되는 turbo cache를 Docker 빌드 간에 재활용할 수 없어 매번 전체 빌드가 수행된다.
Remote Cache 사용을 고려하고 있으며, SRE 팀에서 자체적으로 캐싱 이미지를 구축하는 방향으로 진행 중이다.
