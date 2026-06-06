## pnpm의 핵심 특징

pnpm이 npm, yarn과 가장 크게 다른 점은 **가상 저장소(CAS)**와 **하드 링크·심볼릭 링크** 조합이다.

- 모든 패키지를 Content Addressable Store(CAS)라는 중앙 저장소에 한 번만 저장한다
- 프로젝트의 `node_modules/.pnpm`에는 CAS를 가리키는 하드 링크를 둔다
- 최상위 `node_modules`의 패키지들은 `.pnpm` 내부를 가리키는 심볼릭 링크다

이 구조 덕분에 동일한 라이브러리를 여러 프로젝트에서 설치해도 디스크에는 한 번만 저장된다.

---

## Content Addressable Store (CAS)

CAS는 pnpm이 패키지를 보관하는 글로벌 저장소다.

- **macOS**: `~/Library/pnpm/store`
- **Linux**: `~/.local/share/pnpm/store`
- **Windows**: `~/AppData/Local/pnpm/store`

각 파일은 **SRI(Subresource Integrity) integrity 값을 HEX로 변환한 경로**로 저장된다. 앞 두 자리가 디렉토리 이름이고, 나머지가 파일 이름이 된다.

패키지마다 `-index.json` 파일도 별도로 저장된다. 이 인덱스 파일에는 패키지를 구성하는 각 파일의 integrity 값과 메타데이터가 담긴다.

```json
{
  "name": "cookie",
  "version": "0.7.1",
  "requiresBuild": false,
  "files": {
    "index.js": {
      "integrity": "sha512-...",
      "mode": 420,
      "size": 8103
    }
  }
}
```

인덱스 파일 덕분에 lockfile의 integrity 값이 꼬이더라도 잘못된 참조를 차단할 수 있다.

---

## 의존성 설치 구조

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

**단계별 과정:**

1. `express`와 의존성 `cookie`를 CAS에서 하드 링크 형태로 `.pnpm` 하위에 생성
2. 최상위 `node_modules`에 `express → .pnpm/express@4.21.1/...` 심볼릭 링크 추가
3. `express`가 의존하는 `cookie`는 `.pnpm/express@4.21.1/node_modules` 내부에 심볼릭 링크로 연결

이 구조는 **유령 의존성(Phantom Dependency)을 방지**한다. 직접 설치하지 않은 패키지는 최상위 `node_modules`에 노출되지 않는다.

---

## peerDependency 처리

피어 의존성의 경우 **버전 조합에 따라 별도 폴더를 생성**한다.

`styled-components`, `react`, `react-dom`을 설치하면 이런 구조가 된다.

```
.pnpm/
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

폴더명이 `styled-components@6.1.13_react-dom@18.3.1_react@18.3.1__react@18.3.1`처럼 길어지는 이유가 바로 피어 의존성 버전 조합을 폴더명에 인코딩하기 때문이다.

이 방식 덕분에 동일한 프로젝트 내에서도 피어 의존성 버전에 따라 다른 종속성 세트를 가질 수 있다.

---

## CAS에서 파일을 찾는 과정

`cookie@0.7.1`의 인덱스 파일을 찾는 과정을 예시로 보자.

1. `https://registry.npmjs.org/cookie/0.7.1`에서 메타데이터를 가져온다
2. 메타데이터에서 `dist.integrity` 값을 확인한다
3. 이 값을 Base64에서 HEX로 변환한다
4. HEX의 앞 두 자리를 디렉토리 명으로, 나머지를 파일명으로 조합해 인덱스 파일 경로를 만든다
5. 인덱스 파일 내 각 파일의 integrity 값으로 실제 파일을 찾는다

---

## pnpm workspace

모노레포에서 pnpm workspace를 사용하면 내부 패키지 간 의존성을 심볼릭 링크로 연결한다.

```
apps/
└── accumulation/
    └── node_modules/
        └── @gem-server/
            ├── database (심볼릭 링크) → ../../../packages/database
            └── kafka (심볼릭 링크) → ../../../packages/kafka
packages/
├── database
└── kafka
```

별도의 패키지로 설치하는 게 아니라 패키지 폴더 자체를 링크한다. 따라서 `packages/database`를 수정하면 `apps/accumulation`에 즉시 반영된다.

## pnpm deploy

특정 애플리케이션을 독립적으로 배포할 때 `pnpm deploy` 명령어를 사용한다.

```bash
pnpm --filter=@gem-server/accumulation deploy ./deploy/accumulation
```

- 대상 패키지의 모든 의존성(workspace 의존성 포함)을 독립된 `node_modules`에 설치한다
- 심볼릭 링크 대신 실제 의존성 파일들이 `.pnpm` 디렉토리에 복사된다
- 내부 패키지가 마치 외부 의존성인 것처럼 취급된다

Docker 이미지를 만들 때 workspace 심볼릭 링크 없이 자급자족하는 의존성 구조가 필요한 경우에 유용하다.
