## 배경: Docker 빌드에서 이상한 숫자를 발견했다

CI 파이프라인이 점점 느려지고 있었다.
단계별로 프로파일링해 보니 아래와 같은 수치가 나왔다.

| 단계 | 소요 시간 |
| --- | --- |
| `pnpm deploy --legacy` | **121.4s** |
| `pnpm install` | 43.8s |
| `COPY node_modules` | 28.0s |
| `pnpm build:prod` | 22.0s |

`pnpm deploy` 하나가 전체 빌드 시간의 절반 이상을 잡아먹고 있었다.
처음에는 패키지가 많아서 그러려니 하고 넘겼다.

그런데 로그를 꼼꼼히 뜯어보다가 이상한 숫자가 눈에 들어왔다.

```
Packages: +1036
Progress: resolved 1036, reused 0, downloaded 0, added 1036, done
```

`reused 0`.

Cache Mount를 분명히 달아뒀는데, 1036개 패키지를 매 빌드마다 처음부터 전부 재설치하고 있었다.

---

## 원인 분석: --legacy가 pnpm store를 무시한다

`--legacy` 플래그는 pnpm v10으로 넘어오면서 달게 됐다.

pnpm v10에서 native `pnpm deploy`는 workspace lockfile을 요구하도록 동작이 변경됐다.
문제는 `turbo prune --docker`로 추출한 하위 모노레포에 루트 lockfile이 포함되지 않는다는 점이었다.
native deploy를 그대로 쓰면 에러가 났고, `--legacy` 플래그를 임시방편으로 붙였다.

당시에는 `--legacy`가 정확히 무슨 역할을 하는지 확인하지 않았다.
그런데 알고 보니, `--legacy` 모드는 pnpm store를 완전히 무시하고 npm처럼 패키지를 처음부터 재설치하는 방식이었다.

Cache Mount가 `/var/pnpm/store`를 아무리 잘 보존해도, `--legacy`가 그 store를 참조하지 않으니 아무 의미가 없었다.
결국 `reused 0`이 계속 찍히는 건 당연한 결과였다.

---

## 해결 방향: pnpm v11 native deploy

pnpm v11 릴리즈 노트를 보면 native deploy 관련 개선이 포함되어 있다.
v10에서 요구하던 workspace lockfile 없이도 native deploy가 정상 동작하도록 변경됐다.

즉, `--legacy` 없이 native deploy를 그대로 쓸 수 있다는 뜻이다.

다만 v11에는 Breaking Changes가 여럿 있어서, 그냥 버전만 올렸다가는 빌드가 여러 곳에서 깨졌다.
그래서 업그레이드 전에 변경 사항을 먼저 확인해야 했다.

---

## v11 Breaking Changes 대응

### `allowBuilds` — list에서 map으로

v10에서는 빌드 허용/차단 패키지를 두 개의 설정으로 분리해서 관리했다.

```yaml
# v10 (pnpm-workspace.yaml)
onlyBuiltDependencies:
  - '@swc/core'
  - better-sqlite3
ignoredBuiltDependencies:
  - '@nestjs/core'
```

v11은 이 둘을 `allowBuilds` 단일 맵으로 통합했다.

```yaml
# v11
allowBuilds:
  '@swc/core': true
  better-sqlite3: true
  '@nestjs/core': false
```

여기서 한 가지 주의할 점이 있다.

v10은 `onlyBuiltDependencies` 목록에 없는 패키지 빌드를 암묵적으로 skip했다.
그러나 v11은 다르다. 빌드 스크립트가 있는 패키지가 `allowBuilds`에 없으면 `ERR_PNPM_IGNORED_BUILDS` 에러를 발생시킨다.
그러니 빌드를 막고 싶은 패키지도 `false`로 명시해야 한다. 그냥 빠뜨리면 에러다.

처음에 이걸 모르고 v10 설정을 `allowBuilds` 목록 형태로 변환했다가 빌드가 깨졌다.
사실 `allowBuilds`의 타입은 list가 아니라 **map**이다. list로 쓰면 YAML 스키마 오류가 발생한다.

```yaml
# 이렇게 쓰면 안 됨
allowBuilds:
  - '@swc/core'
```

### `packageManager` 필드 업데이트

```json
{ "packageManager": "pnpm@11.1.3" }
```

---

## Dockerfile 수정

### `--legacy` 제거 + `injectWorkspacePackages`

v11 native deploy를 쓰려면 `injectWorkspacePackages=true`가 필요하다.
이 옵션이 있어야 workspace 패키지를 심볼릭 링크 대신 실제 파일로 inject해서, deploy 아티팩트가 workspace 구조 없이도 자급자족할 수 있다.

처음에는 `pnpm config set injectWorkspacePackages true`로 설정하려 했는데 곧바로 에러가 났다.

```
ERR_PNPM_CONFIG_SET_UNSUPPORTED_YAML_CONFIG_KEY
```

`pnpm config set`은 global `config.yaml`에만 기록된다.
그런데 Docker 빌드 환경에서는 이 global config가 없거나 별도 레이어로 격리되어 있어서 반영되지 않는다.
그렇다고 `pnpm-workspace.yaml`에 전역으로 설정하면 로컬 개발 시 workspace 패키지 변경이 즉시 반영되지 않는 문제가 생긴다.
HMR 이점을 유지하고 싶었기 때문에 Dockerfile에서만 적용해야 했다.

`--config.` CLI 플래그를 사용하면 해당 명령에만 옵션을 직접 주입할 수 있다.

```docker
# Before
RUN pnpm --filter="@gem-server/${APPLICATION_NAME}" --prod deploy --legacy out

# After
RUN --mount=type=cache,id=pnmcache,target=${PNPM_STORE_DIR} \
    pnpm --config.injectWorkspacePackages=true \
    --filter="@gem-server/${APPLICATION_NAME}" --prod deploy out
```

### `ENV CI=true` 추가

v11에서 supply chain 검증이 강화되면서 TTY 없는 빌드 환경에서 interactive 프롬프트가 뜨는 경우가 생겼다.
`CI=true`를 선언해두면 이런 확인 프롬프트를 자동으로 skip한다.

```docker
ENV CI=true
```

### `turbo prune` — deprecated `--scope` 플래그 제거

이 변경은 pnpm v11과 직접 연관은 없지만 같이 수정했다.
`--scope` 플래그가 deprecated됐으니, positional argument로 교체해야 한다.

```bash
# Before
turbo prune --scope="@gem-server/${APPLICATION_NAME}" --docker

# After
turbo prune "@gem-server/${APPLICATION_NAME}" --docker
```

---

## 트러블슈팅

마주친 에러들 대부분은 v11에서 동작이 바뀐 부분을 모르고 v10 방식 그대로 썼기 때문이었다.

| 에러 | 원인 | 해결 |
| --- | --- | --- |
| `ERR_PNPM_IGNORED_BUILDS` | `allowBuilds`에 없는 패키지가 빌드 스크립트 보유 | 해당 패키지를 `false`로 명시 |
| `ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE` | native deploy에서 `inject-workspace-packages` 미설정 | `--config.injectWorkspacePackages=true` CLI 플래그 추가 |
| `ERR_PNPM_CONFIG_SET_UNSUPPORTED_YAML_CONFIG_KEY` | `pnpm config set`은 global config.yaml 전용 | `--config.<key>=<value>` CLI 플래그 사용 |

---

## 결과

| 단계 | v10 (`--legacy`) | v11 (native) | 절감 |
| --- | --- | --- | --- |
| `pnpm deploy` | **121.4s** | **21.9s** | ▼ 82% |
| `COPY node_modules` | 28.0s | 6.5s | ▼ 77% |
| 병목 합계 | 163.2s | 28.4s | **▼ 83%** |

`reused 0, added 1036` → `reused 966, added 966`.
드디어 pnpm store 하드 링크 재활용이 시작됐다.

돌이켜보면 Cache Mount는 처음부터 제대로 달려 있었다.
문제는 `--legacy` 플래그 하나가 그 효과를 완전히 무력화하고 있었다는 점이다.

버전업과 플래그 하나를 바꿨더니 deploy 단계가 **121.4s에서 21.9s**로 떨어졌다.
