## pnpm의 핵심 특징

pnpm을 쓰다 보면 자연스럽게 드는 의문이 있다.
`node_modules`가 왜 이렇게 적은 용량을 차지하지? 같은 패키지를 여러 프로젝트에서 써도 디스크가 멀쩡한 이유가 뭐지?

답은 두 가지 구조에 있다.
**Content Addressable Store(CAS)** 와 **하드 링크·심볼릭 링크**의 조합이다.

모든 패키지를 CAS라는 글로벌 저장소에 한 번만 저장하고,
프로젝트의 `node_modules/.pnpm`에서는 CAS를 가리키는 하드 링크로,
최상위 `node_modules`에서는 `.pnpm`을 가리키는 심볼릭 링크로 연결한다.

동일한 라이브러리를 열 개 프로젝트에서 쓰더라도 디스크에는 딱 한 번만 저장된다.
그렇다면 CAS는 정확히 어떻게 파일을 저장하고, 하드 링크와 심볼릭 링크는 어떤 방식으로 연결되는 걸까.
하나씩 들여다봤다.

---

## Content Addressable Store (CAS)

CAS는 pnpm이 패키지를 보관하는 글로벌 저장소다.
OS마다 기본 위치가 다르다.

- **macOS**: `~/Library/pnpm/store`
- **Linux**: `~/.local/share/pnpm/store`
- **Windows**: `~/AppData/Local/pnpm/store`

이름에 Content Addressable이라는 말이 붙은 이유가 있다.
각 파일을 파일명이 아닌 **콘텐츠 해시**를 주소로 삼아 저장하기 때문이다.
구체적으로는 **SRI(Subresource Integrity) integrity 값을 HEX로 변환한 경로**를 쓴다.
앞 두 자리가 디렉토리 이름이 되고, 나머지가 파일 이름이 된다.

콘텐츠 해시로 경로를 결정하기 때문에 동일한 파일은 어느 패키지에서 왔든 같은 경로에 저장된다.
이게 중복 설치를 막는 핵심이다.

패키지마다 `-index.json` 파일도 별도로 저장된다.
이 인덱스 파일에는 패키지를 구성하는 각 파일의 integrity 값, 체크 시각, 파일 크기 등이 담긴다.
아래는 `cookie@0.7.1`에 대해 pnpm이 생성한 인덱스 파일의 실제 내용이다.

```json
{
  "name": "cookie",
  "version": "0.7.1",
  "requiresBuild": false,
  "files": {
    "LICENSE": {
      "checkedAt": 1731377987152,
      "integrity": "sha512-Scr4piRfVq7q+vQQBTpyWGusX5lDBTzo+GtrnyDcyNnVU8Xu2mkHXKKVHU+knl9ox1PB8G3VVpgjBzU0eBh8EA==",
      "mode": 420,
      "size": 1175
    },
    "index.js": {
      "checkedAt": 1731377987152,
      "integrity": "sha512-dLZUX8QxZ/pvnpr8vclSdv6OiouJOYdcZ2A5ND4K2Fv03AKVZ0J/L1Tv6V+ikdvIUH16d8MMZc/4grpa/Pm0PA==",
      "mode": 420,
      "size": 8103
    },
    "package.json": {
      "checkedAt": 1731377987153,
      "integrity": "sha512-28LYzZyC0XTKxEhj/Xb8irIN4LjExPS25v/FsbtaaZOi7WyNnE9bLUdufkuJNwGbW7veF1552mnfnbPWZ6pTXg==",
      "mode": 420,
      "size": 1092
    },
    "README.md": {
      "checkedAt": 1731377987153,
      "integrity": "sha512-j2+giYjKvB2Q9lI9PKLQnoliKuy/LpVOZyQaB29D09sOyjuxayjNAlnoUTBWMfjcQimaeKpADOBiOskLfFbCGA==",
      "mode": 420,
      "size": 11769
    }
  }
}
```

인덱스 파일이 있기 때문에 두 가지가 가능해진다.
lockfile의 integrity 값이 꼬이더라도 잘못된 참조를 차단할 수 있다.
Git 충돌 해결 과정에서 lockfile이 오염된 경우에도, 인덱스 파일을 통해 잘못된 패키지가 사용되는 걸 막는다.
동일한 파일 내용이 여러 패키지나 버전에서 공유되는 경우에도 콘텐츠 해시를 기준으로 재사용되기 때문에 중복이 없다.

---

## 의존성 설치 구조

CAS가 어떻게 파일을 저장하는지 알았으니, 이제 실제 설치 시 `node_modules`가 어떤 구조로 만들어지는지 보자.

`express@4.21.1`을 설치하면 아래와 같은 구조가 만들어진다.

```
node_modules/
├── express (심볼릭 링크) → .pnpm/express@4.21.1/node_modules/express/
│
└── .pnpm/
    ├── express@4.21.1/
    │   └── node_modules/
    │       ├── express (하드 링크) → <CAS/express>
    │       └── cookie (심볼릭 링크) → ../../cookie@0.7.1/node_modules/cookie/
    └── cookie@0.7.1/
        └── node_modules/
            └── cookie (하드 링크) → <CAS/cookie>
```

먼저 `express`와 그 의존성인 `cookie`를 CAS에서 하드 링크 형태로 `.pnpm` 하위에 생성한다.
그 다음, 최상위 `node_modules`에는 `express → .pnpm/express@4.21.1/...` 형태의 심볼릭 링크만 추가된다.
`express`가 의존하는 `cookie`는 `.pnpm/express@4.21.1/node_modules` 내부에 심볼릭 링크로 연결된다.

여기서 눈에 띄는 점이 있는데, 바로 최상위 `node_modules`에 `cookie`가 없다.
직접 설치하지 않은 패키지는 최상위에 노출되지 않는다! 
**유령 의존성(Phantom Dependency) 문제를 구조 자체로 방지**하는 이유가 여기에 있다.

---

## peerDependency 처리

피어 의존성이 있는 패키지를 설치하면 `.pnpm` 폴더명이 심상치 않아진다.

`styled-components`, `react`, `react-dom`을 함께 설치하면 이런 구조가 된다.

```
node_modules/
├── styled-components (심볼릭 링크) → .pnpm/styled-components@6.1.13_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/styled-components/
├── react (심볼릭 링크) → .pnpm/react@18.3.1/node_modules/react/
├── react-dom (심볼릭 링크) → .pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/
│
└── .pnpm/
    ├── styled-components@6.1.13_react-dom@18.3.1_react@18.3.1__react@18.3.1/
    │   └── node_modules/
    │       ├── styled-components (하드 링크)
    │       ├── react (심볼릭 링크) → ../../react@18.3.1/...
    │       └── react-dom (심볼릭 링크) → ../../react-dom@18.3.1_react@18.3.1/...
    ├── react-dom@18.3.1_react@18.3.1/
    │   └── node_modules/
    │       ├── react-dom (하드 링크)
    │       └── react (심볼릭 링크) → ../../react@18.3.1/...
    └── react@18.3.1/
        └── node_modules/
            └── react (하드 링크)
```

`styled-components@6.1.13_react-dom@18.3.1_react@18.3.1__react@18.3.1`.
처음 봤을 때 폴더명이 이렇게 긴 게 당황스러웠다.
피어 의존성의 버전 조합을 폴더명에 통째로 인코딩하기 때문이다.

왜 이런 방식을 택했는지는 순서를 따라가면 이해된다.

설치 시 pnpm은 먼저 각 패키지의 피어 의존성을 판별한다.
`styled-components`는 `react`와 `react-dom`을, `react-dom`은 `react`를 피어 의존성으로 요구한다.
판별이 끝나면 해소된 버전 조합을 폴더명에 인코딩한다.
`styled-components@6.1.13_react-dom@18.3.1_react@18.3.1__react@18.3.1` 형태로 폴더가 만들어지는 이유다.
최상위 `node_modules`에는 각 패키지를 가리키는 심볼릭 링크가 생성된다.
`.pnpm/styled-components.../node_modules` 안에서 `react`와 `react-dom`은 상위에서 설치된 버전을 가리키는 심볼릭 링크로 연결된다.

폴더명에 버전 조합을 담는 이유는 명확하다.
동일한 프로젝트 안에서도 피어 의존성 버전에 따라 서로 다른 종속성 세트가 필요할 수 있다.
버전 조합마다 별도 폴더를 두면 충돌 없이 여러 조합을 동시에 지원할 수 있다.

---

## CAS에서 파일을 찾는 과정

지금까지는 CAS가 어떻게 구성되는지를 봤다.
그렇다면 의존성 설치 시 pnpm은 CAS에서 파일을 어떻게 찾는 걸까?
`cookie@0.7.1`을 예시로 직접 따라가봤다.

1. `https://registry.npmjs.org/cookie/0.7.1`에서 패키지 메타데이터를 가져온다
2. 메타데이터에서 `dist.integrity` 값을 확인한다
   - `sha512-6DnInpx7SJ2AK3+CTUE/ZM0vWTUboZCegxhC2xiIydHR9jNuTAASBrfEpHhiGOZw/nX51bHt6YQl8jsGo4y/0w==`
3. 이 값을 Base64에서 HEX로 변환한다
   - `e839c89e9c7b489d802b7f824d413f64cd2f59351ba1909e831842db1888c9d1d1f6336e4c001206b7c4a4786218e670fe75f9d5b1ede98425f23b06a38cbfd3`
4. HEX의 앞 두 자리를 디렉토리 명으로, 나머지와 `-index.json`을 합쳐 파일명으로 조합한다
   - 앞 두 자리가 `e8`이면 경로는 `e8/{나머지 문자열}-index.json`
5. 인덱스 파일에서 패키지를 구성하는 각 파일의 integrity 값을 확인한다
6. 각 파일 별 integrity 값으로 1 ~ 4번 과정을 반복해 실제 파일을 찾는다

인덱스 파일이 중간 허브 역할을 한다.
패키지 전체의 integrity를 먼저 검증하고, 개별 파일을 하나씩 찾아가는 구조다.

---

## inode가 다른 경우 — Copy-on-Write의 함정

탐구하면서 이상한 점을 하나 발견했다.

CAS에 저장된 `cookie@0.7.1`의 `index.js` inode는 `11724488`이었다.
그런데 `.pnpm`에 저장된 같은 파일의 inode는 `11725189`였다.

분명 하드 링크를 기반으로 CAS와 프로젝트 내 `.pnpm`을 연결한다고 했는데, 왜 inode가 다를까? 하드 링크라면 같은 inode를 공유해야 한다.

이유는 `package-import-method` 옵션에 있었다.
옵션이 `auto` 혹은 `clone`인 경우, pnpm은 OS의 Copy-on-Write를 지원하면 하드 링크 대신 COW를 사용한다.
macOS의 APFS는 COW를 지원하기 때문에 실제 파일 복사본이 생성된다.
복사본은 하드 링크가 아니므로 inode가 달라진다.

Linux에서는 COW를 지원하지 않는 파일시스템이 많아 하드 링크로 동작한다.
macOS에서는 APFS 덕분에 COW 방식으로 복제본이 만들어진다.

Docker 환경에서도 같은 맥락의 문제가 생긴다.

> [!IMPORTANT]
> Docker 빌드 환경에서는 레이어 간 파일 시스템 경계를 하드 링크가 넘을 수 없다. `--mount=type=cache`로 pnpm store를 캐시하더라도 `package-import-method`가 기본값(`hardlink`)이면 파일 복사에 실패한다. `pnpm install` 시 `--config.package-import-method=copy`를 지정해야 한다.

---

## pnpm workspace

여기까지는 단일 프로젝트 기준으로 살펴봤다.
모노레포에서 pnpm workspace를 사용하면 내부 패키지 간 의존성도 심볼릭 링크로 연결된다.

```
gem-server/
├── apps/
│   └── accumulation/
│       └── node_modules/
│           └── @gem-server/
│               ├── apm-node (심볼릭 링크) → ../../../packages/apm-node
│               ├── configuration (심볼릭 링크) → ../../../packages/configuration
│               ├── database (심볼릭 링크) → ../../../packages/database
│               ├── elastic-search (심볼릭 링크) → ../../../packages/elastic-search
│               ├── kafka (심볼릭 링크) → ../../../packages/kafka
│               ├── logger (심볼릭 링크) → ../../../packages/logger
│               └── swagger (심볼릭 링크) → ../../../packages/swagger
└── packages/
    ├── apm-node
    ├── configuration
    ├── database
    ├── elastic-search
    ├── kafka
    ├── logger
    └── swagger
```

별도의 패키지로 설치하는 게 아니라 패키지 폴더 자체를 링크한다.
`packages/database`를 수정하면 `apps/accumulation`에 즉시 반영된다.

---

## pnpm deploy

workspace 구조는 로컬 개발에서는 편하지만, 배포 시에는 문제가 된다.
심볼릭 링크는 링크가 가리키는 원본 폴더가 있어야 동작하는데, Docker 이미지로 묶으면 그 경로가 사라진다.

`pnpm deploy` 명령어가 이 문제를 해결한다.

```bash
pnpm --filter=@gem-server/accumulation deploy ./deploy/accumulation
```

이 명령어는 대상 패키지의 모든 의존성을 독립된 `node_modules`에 다시 설치한다.
workspace 의존성도 포함이다.
심볼릭 링크 대신 실제 의존성 파일들이 `.pnpm` 디렉토리에 복사되고, 내부 패키지는 외부 의존성처럼 취급된다.
배포 디렉토리 하나만으로 자급자족하는 구조가 된다.

---

## Ref.

- [Motivation | pnpm](https://pnpm.io/motivation)
- [Symlinked `node_modules` structure | pnpm](https://pnpm.io/symlinked-node-modules-structure)
- [How peers are resolved | pnpm](https://pnpm.io/how-peers-are-resolved)
- [Flat node_modules is not the only way | pnpm](https://pnpm.io/blog/2020/05/27/flat-node-modules-is-not-the-only-way)
- [Some questions about the architecture of pnpm?](https://github.com/orgs/pnpm/discussions/6654)
- [Why pnpm's content addressable store contain it's package metadata?](https://github.com/orgs/pnpm/discussions/8747)
