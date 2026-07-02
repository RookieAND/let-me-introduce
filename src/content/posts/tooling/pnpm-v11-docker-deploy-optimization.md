## 배경: Docker 빌드에서 이상한 숫자를 발견했다

우리 팀은 NestJS 백엔드 앱 여러 개를 하나의 모노레포에서 관리하고 있다.
그리고 각각 앱은 독립적으로 Docker 이미지를 빌드해서 배포되는 프로세스를 거쳤다.

다들 알겠지만 모노레포에서 특정 앱만 빌드하려면 불필요한 패키지를 최대한 걷어내야 한다.
그래서 `turbo prune --docker`로 해당 앱에 필요한 패키지만 추출하고, 그 결과물을 Docker 이미지 안에서 `pnpm deploy`로 설치하는 구조를 쓰고 있다.

여기에 더해 Docker 빌드 속도를 높이기 위해 BuildKit의 Cache Mount도 달아뒀다.
`/var/pnpm/store`를 빌드 간에 보존해서 한 번 다운로드한 패키지는 재사용하는 방식이다.

처음에는 이 구조가 잘 돌아가고 있다고 생각했다. 그런데 시간이 좀 지나고 나니 CI 파이프라인이 점점 느려지고 있었다.
왜 이러나 싶어 빌드 및 배포 프로세스를 단계별로 프로파일링해 보니 아래와 같은 수치가 나왔다.

| 단계 | 소요 시간 |
| --- | --- |
| `pnpm deploy --legacy` | **121.4s** |
| `pnpm install` | 43.8s |
| `COPY node_modules` | 28.0s |
| `pnpm build:prod` | 22.0s |

`pnpm deploy` 하나가 전체 빌드 시간의 절반 이상을 잡아먹고 있었다.
초기에 비해 실제 운영을 거치며 설치된 패키지 또한 많아졌기 때문에 처음에는 그러려니 하고 처음에는 넘겼다.

그런데 로그를 꼼꼼히 뜯어보다가 이상한 숫자가 눈에 들어왔다.

```
Packages: +1036
Progress: resolved 1036, reused 0, downloaded 0, added 1036, done
```

`reused 0`.

Cache Mount를 분명히 달아뒀는데, 1036개 패키지를 매 빌드마다 처음부터 전부 재설치하고 있었다. 이는 캐시가 아예 없는 것과 마찬가지인 상황이었다.
도대체 왜 이런 현상이 발생한 걸까?

---

## 원인 분석: pnpm v10이 만들어낸 딜레마

`--legacy` 플래그는 사실 pnpm v10으로 넘어오면서 이슈 해결을 위해 달게 됐다.
그런데 이 플래그가 정확히 무슨 역할을 하는지 그때는 확인하지 않았다. (부끄럽게도)

### pnpm v10은 왜 workspace lockfile을 요구하게 됐나

pnpm v10에서 `pnpm deploy` 동작이 크게 바뀌었다.
workspace의 특정 앱을 deploy할 때, workspace 루트의 `pnpm-lock.yaml`이 반드시 있어야 한다.

이유는 pnpm의 의존성 해석 방식에 있다.
pnpm은 dependency resolution 과정에서 lockfile을 기준으로 패키지 버전과 무결성을 검증한다.
workspace 전체의 의존성 트리가 담긴 루트 lockfile이 있어야 정확한 해석이 가능하다는 게 v10의 판단이었다.

문제는 `turbo prune --docker`와 궁합이 나쁘다는 점이다.
`turbo prune`은 특정 앱에 필요한 패키지만 추출해서 하위 모노레포 구조를 만들어낸다.
이 하위 구조에는 루트 lockfile이 포함되지 않는다. 앱에 필요한 패키지만 담긴 부분 lockfile만 생성된다.

당연히 native deploy는 에러가 났다.

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml
is not up to date with package.json
```

### `--legacy`가 store를 통째로 우회하는 이유

처음에는 당장의 문제를 해결하기 위해 에러를 없애려고 `--legacy` 플래그를 달았다.
"v10 이전 방식으로 동작하겠다"는 뜻이겠거니 하고 그냥 넘어갔지만 실제로는 완전히 다르게 동작한다는 점에서 차이가 있었다.

`--legacy` 모드는 pnpm store를 완전히 우회하고 npm처럼 패키지를 직접 설치한다.

pnpm의 핵심은 content-addressable store다.
한 번 다운로드한 패키지는 `/var/pnpm/store`에 버전별로 저장되고, 이후 설치 시에는 hard link로 연결된다.
store에 있는 패키지를 재사용할 때 파일을 복사하거나 다운로드하지 않는다.

`--legacy`는 이 메커니즘을 통째로 건너뛴다.
npm처럼 `node_modules`에 파일을 직접 복사하는 방식이라 store를 참조하지 않는다.

Cache Mount가 `/var/pnpm/store`를 아무리 잘 보존해도, `--legacy`가 그 store를 보지 않으니 아무 의미가 없었다.
`reused 0`이 계속 찍히는 건 당연한 결과였다.

Cache Mount가 문제가 아니었다.
처음부터 캐시 자체가 작동할 수 없는 구조였다.

---

## 해결 방향: pnpm v11 native deploy

pnpm v11 릴리즈 노트를 확인했다.

v11에서 native deploy 관련 제약이 풀렸다.
v10에서 요구하던 workspace 루트 lockfile 없이도, `turbo prune`이 만들어낸 부분 lockfile만으로 dependency resolution이 가능하다.
즉, `--legacy` 없이 native deploy를 그대로 쓸 수 있다는 뜻이다.

다만 v11에는 Breaking Changes가 여럿 있어서, 버전만 올렸다가는 빌드가 여러 곳에서 깨졌다.
업그레이드 전에 변경 사항을 먼저 파악해야 했다.

---

## v11 Breaking Changes 대응

### `allowBuilds`: 왜 list가 아닌 map으로 바뀌었나

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

여기서 짚고 넘어갈 점이 하나 있다.

v10은 `onlyBuiltDependencies` 목록에 없는 패키지 빌드를 암묵적으로 skip했다.
v11은 다르다. 빌드 스크립트가 있는 패키지가 `allowBuilds`에 없으면 `ERR_PNPM_IGNORED_BUILDS` 에러를 발생시킨다.
빌드를 막고 싶은 패키지도 `false`로 명시해야 한다. 그냥 빠뜨리면 에러다.

처음에 이걸 모르고 v10 설정을 `allowBuilds` 목록 형태로 변환했다가 빌드가 깨졌다.
`allowBuilds`의 타입은 list가 아니라 **map**이다. list로 쓰면 YAML 스키마 오류가 발생한다.

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

### `--legacy` 제거만으로는 충분하지 않은 이유

`--legacy`를 제거하면 native deploy가 동작한다.
그런데 여기서 한 가지 의문이 생긴다.

v11 native deploy는 workspace 패키지를 어떻게 처리할까?

모노레포 환경에서 workspace 패키지는 `node_modules/@gem-server/shared` 같은 형태로 연결된다.
로컬 개발 환경에서는 workspace 루트가 있으니 심볼릭 링크가 제대로 동작한다.
그런데 `pnpm deploy`로 생성된 아티팩트는 workspace 구조 없이 독립적으로 실행된다.
심볼릭 링크가 가리키는 원본 경로가 없다. 링크가 끊긴다.

이 문제를 해결하는 게 `injectWorkspacePackages` 옵션이다.
이 옵션을 활성화하면 심볼릭 링크 대신 실제 파일을 inject해서, deploy 아티팩트가 workspace 구조 없이도 자급자족할 수 있다.

### `pnpm config set`이 Docker 환경에서 먹히지 않는 이유

처음에는 `pnpm config set injectWorkspacePackages true`로 설정하려 했는데 곧바로 에러가 났다.

```
ERR_PNPM_CONFIG_SET_UNSUPPORTED_YAML_CONFIG_KEY
```

`pnpm config set`은 global `config.yaml`에만 기록된다.
Docker 빌드 환경에서는 이 global config가 없거나 별도 레이어로 격리되어 있어서 반영되지 않는다.

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

Cache Mount도 함께 달았다.
`--legacy`가 없어지면 native deploy가 store를 제대로 참조한다.
이제 Cache Mount가 실제로 효과를 낸다.

### `ENV CI=true` 추가

v11에서 supply chain 검증이 강화되면서 TTY 없는 빌드 환경에서 interactive 프롬프트가 뜨는 경우가 생겼다.
`CI=true`를 선언해두면 이런 확인 프롬프트를 자동으로 skip한다.

```docker
ENV CI=true
```

### `turbo prune` — deprecated `--scope` 플래그 제거

이 변경은 pnpm v11과 직접 연관은 없지만 같이 수정했다.
`--scope` 플래그가 deprecated됐으니, positional argument로 교체한다.

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
| `ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE` | native deploy에서 `injectWorkspacePackages` 미설정 | `--config.injectWorkspacePackages=true` CLI 플래그 추가 |
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
`--legacy` 플래그 하나가 그 효과를 완전히 무력화하고 있었고, 그 사실을 모르고 넘어갔다.

`--legacy`를 임시방편으로 붙일 때 정확히 무슨 역할을 하는지 확인했다면 훨씬 일찍 잡을 수 있었던 문제였다.
버전업과 플래그 하나를 바꿨더니 deploy 단계가 **121.4s에서 21.9s**로 떨어졌다. 아프다.
