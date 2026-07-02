## 들어가며

`yarn install`을 치면 터미널에 로그가 스크롤된다.
"Resolution step", "Fetch step", "Link step"이라는 문구가 순서대로 나타나고, 잠시 후 `.pnp.cjs`가 갱신된다.

`pnpm install`의 경우에도 형태는 다르지만 근본적으로 같은 흐름이다.
"resolved", "reused + downloaded", "added" 라는 문구가 순서대로 노출되고 `node_modules` 내 패키지가 추가된다.

매일 치는 명령어인데, 정작 내부에서 무슨 일이 일어나는지 제대로 설명할 수 없었다.

누군가에게 "Resolution이 뭔가요?" 라는 질문을 받았을 때 나는 어떻게 답변할 수 있을까?
일단은 "버전 확정하는 단계요" 라고 얼버무릴 수는 있겠지만.. 그게 왜 필요한지, 어떻게 동작하는지는 설명이 어렵다. Fetch와 Link의 차이도 마찬가지였다.

이 글은 그 질문에 제대로 답하기 위해 파고든 내용이다.
각 단계의 구현은 패키지 매니저마다 조금씩 다른데, 특히 Link 단계에서 pnpm과 Yarn Berry의 철학이 갈리기 때문에 두 방식을 비교하면 패키지 매니저가 왜 그렇게 설계됐는지가 더 선명하게 보인다.

| 단계 | 핵심 질문 | 결과물 |
|---|---|---|
| **Resolution** | 어떤 버전을 설치할까? | lock 파일 (버전 그래프 확정) |
| **Fetch** | 파일을 어디서 가져올까? | 글로벌 캐시 (integrity 기반 재사용) |
| **Link** | 프로젝트에 어떻게 연결할까? | node_modules 링크 or .pnp.cjs 맵 |

---

## Step 1 — Resolution: 버전 그래프를 확정하는 단계

패키지 매니저가 가장 먼저 해야 하는 일은 "어떤 버전을 설치할지"를 결정하는 것이다.

`package.json`에 적힌 의존성은 버전의 범위를 의미한다.

```yaml
# package.json
"react": "^18.0.0"
```

`^18.0.0`은 "18.x.x 중 최신 버전"이라는 의미이기 때문에, 이것만으로는 실제로 설치할 버전을 하나로 확정하지 못한다.
Resolution 단계는 이 범위 선언을 구체적인 버전 하나로 확정하는 과정이다.

```yaml
# yarn.lock (Resolution 결과)
react@^18.0.0:
  version: "18.3.1"
  resolved: "https://registry.yarnpkg.com/react/-/react-18.3.1.tgz"
  integrity: "sha512-..."
  dependencies:
    loose-envify: "^1.1.0"
```

lock 파일이 있으면 별도의 레지스트리 API 호출이 필요 없다.
lock 파일 안에는 이미 확정된 버전과 그 패키지의 의존성 목록에 대한 정보가 모두 담겨 있기 때문이다.
즉 lock 파일은 "이미 계산된 Resolution 결과물"이라고 이해하면 편하다. 패키지 매니저는 이것을 그대로 읽어 설치해야 할 라이브러리별 버전 그래프를 구성한다.

lock 파일이 없다면 이야기가 달라진다.
semver 범위에 맞는 **최신 버전을 레지스트리에서 조회**하고, 그 패키지의 의존성을 또 조회하고, 그 의존성의 의존성을 재귀적으로 탐색한다.
이 과정이 끝나면 전체 의존성 트리의 버전이 확정되고, 그 결과를 락파일로 저장한다.

즉 Resolution은 "무엇을 설치할지"를 결정하는 단계이며, 이 단계가 끝나기 전까지는 네트워크에서 패키지를 내려받지 않는다.

---

## Step 2 — Fetch: 캐시로 다운로드를 줄이는 단계

Resolution으로 설치할 버전 목록이 확정됐으므로 이제 실제 파일을 가져와야 한다.
Fetch 단계는 패키지 tarball을 글로벌 캐시로 내려받는 과정이다.

```
npm 레지스트리
   ↓ tarball 다운로드
글로벌 캐시
   pnpm: ~/.pnpm-store/v11/ (Content Addressable Store)
   yarn: .yarn/cache/*.zip
   ↓
프로젝트 node_modules 배치
```

여기서 핵심은 **글로벌 캐시를 활용한다는 점이다.**
두 패키지 매니저 모두 프로젝트별로 이를 다운로드하는 게 아니라, 한 번 받아둔 파일을 모든 프로젝트에서 재사용한다.

```yaml
# yarn.lock
react@npm:18.3.1:
  version: 18.3.1
  resolution: "react@npm:18.3.1"
  checksum: 10c0/f67e9c0b7b8fa6e7d3e946a1a3c9d7e2f3b4a5c6d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0

# pnpm-lock.yaml
packages:
  react@18.3.1:
    resolution:
      integrity: sha512-KcYjB+tq9lhkFFlBbLMRMkVF66pMhFHRw3EUFTA75kFSM5IeyaJxJiM9KRNxH+ORBQyO8aTjVbzhJGZKBJ/dw==
```

캐시 히트 여부는 integrity 값으로 판단한다.
보다 정확히는 lock 파일에 저장된 `sha512-...` 값과 글로벌 캐시에 있는 파일의 integrity를 비교하는데, 값이 일치하면 별도의 네트워크 요청 없이 캐시에 저장된 패키지를 바로 사용한다.
내용이 같으면 같은 파일이라는 보장이 되기 때문에, 버전이 같더라도 내용이 변조됐다면 캐시를 무시하고 다시 받는다.

```
~/.local/share/pnpm/store/v11/
└── files/
    ├── 00/
    │   └── 3f4a5b6c7d8e9f0a1b2c3d4e5f6...  ← react/index.js
    ├── 1a/
    │   └── b2c3d4e5f6a7b8c9d0e1f2a3b4c5...  ← react/package.json
    ├── 2b/
    │   └── c3d4e5f6a7b8c9d0e1f2a3b4c5d6...  ← lodash/chunk.js
    └── ...
```

pnpm의 글로벌 스토어는 Content Addressable Store 구조로, 파일 하나하나를 integrity 해시로 주소를 매긴다.
그렇기에 동일한 파일이 여러 패키지에 걸쳐 존재해도 디스크에는 단 하나만 저장된다.

```
.yarn/cache/
├── react-npm-18.3.1-f3a4b5c6d7-abc123def456.zip
│    ↑ 패키지명  ↑ 버전  ↑ 체크섬
└── lodash-npm-4.17.21-a1b2c3d4e5-def456abc123.zip
```

Yarn Berry는 `.yarn/cache/` 아래에 패키지별 `.zip` 파일을 보관한다는 점에서 pnpm과 차이가 있는데, 저장 단위 또한 단일 파일이 아닌 패키지 단위이며 로컬 환경에 한정되어 관리된다.

---

## Step 3 — Link: 패키지 매니저의 철학이 갈리는 단계

Fetch 단계가 끝나면 글로벌 캐시에 패키지 파일이 존재하게 된다.
Link 단계는 이렇게 생성된 캐시를 프로젝트에서 사용할 수 있도록 "연결"하는 과정인데, 이 단계에서 pnpm과 Yarn Berry의 구현이 완전히 갈린다.

### pnpm: 하드 링크 + 심볼릭 링크 트리

pnpm의 Link 단계는 두 종류의 링크를 조합한다.

```
CAS (~/.pnpm-store/)
  ↓ 하드 링크 (inode 공유, 디스크 용량 중복 없음)
node_modules/.pnpm/react@18.3.1/node_modules/react/
  ↓ 심볼릭 링크
node_modules/react → .pnpm/react@18.3.1/node_modules/react/
```

CAS의 각 파일은 `node_modules/.pnpm/` 아래 실제 경로로 **하드 링크**되기 때문에 각 프로젝트별 파일은 같은 inode를 가리키므로 디스크에 파일이 복제되지 않는다.

그 다음, `node_modules/react`는 `.pnpm/` 아래 경로를 가리키는 **심볼릭 링크**로 생성된다.
Node.js의 기본 Module Resolution 알고리즘은 심볼릭 링크를 그대로 따라가면 실제 파일에 도달하기 때문에, Node.js 탐색 알고리즘 자체는 전혀 변경되지 않는다.

이 구조의 장점은 기존의 npm 패키지와 높은 호환성을 가진다는 점이다.
기존의 툴체인, 번들러, 테스트 프레임워크 대부분이 `node_modules/` 디렉토리가 있다는 전제로 동작하기 때문이다. (pnp 미지원 라이브러리)

pnpm은 그 전제를 그대로 지키면서 디스크 용량 중복만 제거한다는 점에서 호환성이 좋다는 평을 받는다.

### Yarn Berry: .pnp.cjs 맵 등록으로 대체

Yarn Berry의 PnP (Plug'n'Play) 방식은 Link 단계의 개념 자체를 바꾼다.

```
.yarn/cache/react-npm-18.3.1-abc.zip  (Fetch 결과)
   ↓ 파일 복사 없음, 링크 생성 없음
.pnp.cjs에 경로 등록만 함
```

`pnpm`과 다르게 설치된 패키지를 보관하는 `node_modules` 폴더 자체가 생성되지 않는다.
Link 단계가 "파일을 배치하는 작업"이 아닌 "맵에 경로를 기록하는 작업"으로 대체되기 때문이다.

```js
// .pnp.cjs (발췌)
const RAW_RUNTIME_STATE = {
  packageRegistryData: [
    [null, [                    // null = 현재 프로젝트
      ["my-app", {
        packageLocation: "./",
        packageDependencies: [
          ["react", "npm:18.3.1"],
        ]
      }]
    ]],
    ["react", [                 // 패키지명
      ["npm:18.3.1", {          // 버전
        packageLocation:
          "./.yarn/cache/react-npm-18.3.1-abc123.zip/node_modules/react/",
        packageDependencies: [
          ["loose-envify", "npm:1.4.0"]
        ]
      }]
    ]]
  ]
};
```

`.pnp.cjs` 파일에 "react를 require하면 `.yarn/cache/react-npm-18.3.1-abc.zip` 안의 어떤 경로를 사용해라"는 정보가 기록된다.
Node.js는 `--require .pnp.cjs` 옵션으로 이 맵을 로드해서 require 호출을 가로채 `.pnp.cjs`가 지정한 경로로 연결하는데, 디스크에 파일을 배치하는 I/O가 없기 때문에 Link 단계가 거의 즉각적으로 완료된다.

### 두 방식의 트레이드오프

두 접근의 차이는 "기존 생태계와의 호환성"과 "설치 속도·Zero-Install 가능성" 사이의 트레이드오프다.

| 항목 | pnpm | Yarn Berry PnP |
|---|---|---|
| node_modules 존재 | 있음 (링크 구조) | 없음 |
| 기존 도구 호환성 | 매우 높음 | 설정 필요한 경우 있음 |
| Link 단계 속도 | 빠름 | 더 빠름 (Zero-Link) |
| Zero-Install | 불가 | 가능 (cache를 git에 커밋) |

pnpm은 기존 툴체인과의 마찰을 최소화하면서 디스크 효율을 높인다.
Yarn Berry PnP는 `node_modules`라는 개념 자체를 제거해서 더 빠른 Link와 Zero-Install을 가능하게 한다.
어느 쪽이 옳다기보다, 각 팀이 중시하는 가치가 다른 것이다.

> Link 단계는 단순한 "파일 복사"가 아니다. 패키지 매니저가 Module Resolution을 어떻게 설계하느냐에 따라, 링크 생성이 될 수도 있고 맵 등록이 될 수도 있다.

---

## 마치며

사실 `install` 명령어는 그냥 패키지를 내려받는 단순한 작업이라고만 생각했는데, 들여다보니 세 단계가 각각 다른 문제를 풀고 있었다.

Resolution은 "어떤 버전을"을 결정하는 문제다. lock 파일이 왜 필요한지, CI에서 `npm install`이 왜 예상치 못한 버전을 설치할 수 있는지가 여기서 나온다.
Fetch는 "어디서 가져올지"를 결정하는 문제다. 두 번째 install이 빠른 이유, integrity가 왜 중요한지가 여기서 나온다.
Link는 "어떻게 연결할지"를 결정하는 문제인데, 이 질문에 대한 답이 pnpm과 Yarn Berry에서 완전히 갈린다는 게 가장 흥미로웠다. `node_modules`가 당연한 게 아니라 선택이었다는 것도.

이제 `pnpm install` 로그에서 "resolved 42 packages"라는 문구를 보면 "락파일 읽어서 버전 그래프 구성했구나"가 바로 그려진다. 예전에는 그냥 스크롤되는 숫자였는데.
