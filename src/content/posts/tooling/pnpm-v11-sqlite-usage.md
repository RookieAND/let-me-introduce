## 들어가며

pnpm v10 까지의 CAS 는 `~/.pnpm-store/v10/index/` 디렉토리 아래에 패키지마다 `.mpk` (MessagePack) 인덱스 파일을 하나씩 두는 구조였다. 

그런데 이번에 pnpm v11 버전 업데이트를 위해 릴리즈 노트를 훑다가 예상치 못한 변경 사항을 발견했다. 

스토어 버전이 `v10`에서 `v11`로 올라갔고, 인덱스 구조가 완전히 바뀌었다는 것이었다. 
그리고 그 과정에서 수백만 개의 작은 `.mpk` 파일 대신, 단일 SQLite 데이터베이스 하나로 교체됐다고 했다. 

왜 SQLite 를 선택했으며 구조를 이렇게 바꿨는지, 내부 구조는 어떻게 생겼는지도 몹시 궁금해졌다.

이 글은 pnpm v11에서 CAS 인덱스가 SQLite로 전환된 배경과 구체적인 구조, 그리고 함께 도입된 최적화들을 탐구한 기록이다.

---

## 기존 방식의 한계: MessagePack 인덱스 파일 수백만 개

먼저 pnpm v10 까지의 Content Addressible Store 구조를 먼저 살펴보자.

```
~/.pnpm-store/v10/
└── index/
    ├── e8/
    │   └── 39c89e9c7b489d802b7f824d413f64cd2f59351ba1909e831842db1888c9d1d-index.mpk
    ├── f3/
    │   └── 36d0bc....-index.mpk
    └── ... (패키지당 1개 → 수백만 개 파일)
```

기존에는 각 패키지마다 **integrity 해시를 파일명으로 사용하는 `.mpk` 파일**이 하나씩 생성된다. 
이때 해시의 앞 두 글자를 디렉토리명으로 사용하는 건 Git의 objects 디렉토리와 동일한 패턴이다.

`.mpk`는 MessagePack 포맷의 파일이다. JSON과 동일한 데이터 구조를 바이너리로 인코딩하는 직렬화 포맷으로, 같은 데이터를 더 적은 바이트로 표현하기 때문에 텍스트 기반 JSON보다 파일 크기가 작고 파싱도 빠르다.

여기까지 보았을 때 폴더 구조 자체는 직관적이지만 실제 운영 환경에서는 문제가 생긴다. 

기본적으로 글로벌 패키지 캐시가 쌓이면 index 디렉토리 아래에 수백만 개의 파일이 생긴다. 
이때문에 파일 수가 늘어날수록 디렉토리 탐색에 드는 syscall 비용이 선형적으로 증가한다. 

무엇보다 특정 파일을 조회하려면 OS가 해당 디렉토리의 inode 캐시를 뒤져야 하는데, 
파일 수가 너무 많으면 inode 캐시 압박이 생기고 파일시스템 전반의 성능이 저하된다.

한 마디로 파일 하나를 읽는 것은 빠르지만,
수백만 개의 파일이 담긴 디렉토리에서 파일 하나를 찾는 것은 다른 이야기라는 말이다.
개발자가 흔히 접하는 macOS의 HFS+나 APFS, Linux의 ext4 모두 이 문제에서 자유롭지 않다. 

특히 CI 환경처럼 캐시를 오래 유지하는 경우, 인덱스 디렉토리의 크기가 수십만 개 이상으로 불어나면 `pnpm install` 자체의 속도가 느려지는 현상이 발생한다.

---

## es-toolkit을 찾기까지: v10과 v11의 절차

`pnpm install`을 실행하면 pnpm은 lockfile을 읽고 필요한 패키지가 스토어에 있는지 확인한다.
이때 v10과 v11이 거치는 절차가 다르다. es-toolkit@1.46.1을 예시로 살펴보자.

v10은 lockfile에서 읽은 integrity를 먼저 hex로 변환해야 했다.

```typescript
// crypto/integrity/src/index.ts
// 1단계: base64 → hex 변환
export function parseIntegrity(integrity: string): ParsedIntegrity {
  const match = integrity.match(INTEGRITY_REGEX)
  const hexDigest = Buffer.from(match[2], 'base64').toString('hex')
  return { algorithm: match[1], hexDigest }
}
// sha512-5eNtXOs3tbfxXOj04tjj...== → e5e36d5ceb37b5b7f15ce8f4e2d8e3b1...

// store/cafs/src/getFilePathInCafs.ts
// 2단계: hex로 .mpk 파일 경로 구성
export function getIndexFilePathInCafs(storeDir, integrity, pkgId): string {
  const { hexDigest } = parseIntegrity(integrity)
  const hex = hexDigest.substring(0, 64)
  return path.join(storeDir,
    `index/${hex.slice(0, 2)}/${hex.slice(2)}-${pkgId.replace(/[\\/:*?"<>|]/g, '+')}.mpk`
  )
}
// → ~/.pnpm-store/v10/index/e5/e36d5ceb...830cd9a-registry.npmjs.org+es-toolkit@1.46.1.mpk

// store/pkg-finder/src/index.ts
// 3단계: .mpk 읽기 + 역직렬화
const { files: indexFiles } = await readMsgpackFile<PackageFilesIndex>(pkgIndexFilePath)

// reviewing/dependencies-hierarchy/src/readManifestFromCafs.ts
// 4단계: package.json content hash 추출 → files/에서 별도 읽기
const pkgJsonEntry = pkgIndex.files.get('package.json')
const filePath = getFilePathByModeInCafs(storeDir, pkgJsonEntry.digest, pkgJsonEntry.mode)
// → ~/.pnpm-store/v10/files/9a/3f2c1b...
const manifest = loadJsonFileSync<DependencyManifest>(filePath)
// → { name: 'es-toolkit', version: '1.46.1', bin: {}, engines: {...} }

// 5단계: indexFiles 순회 → node_modules/ 하드링크
```

변환 한 번, 파일 읽기 두 번이다.

v11은 lockfile의 integrity를 그대로 SQLite key로 쓴다.

```javascript
// 1단계: integrity + pkgId로 key 조립 (변환 없음)
const key = 'sha512-5eNtXOs3tbfxXOj04tjjseeWkRWaoCjdEI+96DgwzZoe6c9juL49pXlzAFTI72aWC9Y8p7168g6XIKjh7k6pyQ==\tes-toolkit@1.46.1'

// 2단계: SQLite 조회 한 번
db.prepare('SELECT data FROM package_index WHERE key = ?').get(key)

// 3단계: BLOB 역직렬화 → 메타데이터 + 파일 목록 동시에
// bundledManifest: { name: 'es-toolkit', version: '1.46.1', bin: {}, engines: {...} }
// files: [ { name: 'package.json', digest: '...', mode: 0o644 }, ... ]

// 4단계: files/ → node_modules/ 하드링크
```

조회 한 번에 메타데이터와 파일 목록이 같이 나온다.
v10이 파일 시스템을 두 번 건드렸다면, v11은 SQLite 한 번으로 끝낸다.

이후 섹션들은 이 차이를 만드는 각각의 설계 결정을 들여다본다.

---

## SQLite 기반 스토어의 구조

pnpm v11에서는 인덱스 디렉토리 전체가 단일 SQLite 파일로 교체된다.  
패키지를 구성하는 파일 및 index 파일 모두 하나의 DB 에 일괄 저장되어 관리된다.

```
~/.pnpm-store/v11/
└── index.db   ← 단일 SQLite 데이터베이스
```

이 덕에 수백만 개의 파일이 하나의 DB 파일로 통합된다.  
SQLite 입장에서는 하나의 파일을 열고 B-tree 인덱스를 통해 O(log n) 조회를 수행한다. 파일 수 자체가 줄어드니 inode 캐시 압박도 사라진다.

### 번들 매니페스트

이 구조에서 우리가 주목할 부분이 있는데, 그것은 바로 **번들 매니페스트 (bundled manifest)** 다.  
기존에는 의존성 설치 중 각 패키지의 `name`, `version`, `bin`, `engines` 등을 알기 위해 CAS의 `files/` 디렉토리에서 `package.json`을 직접 읽어야 했다. 

```
~/.pnpm-store/v10/
├── files/
│   ├── 9a/
│   │   └── 3f2c1b...e4  ← react의 package.json (content hash로 저장)
│   └── ...
└── index/
    └── e8/
        └── 39c89e9c...-registry.npmjs.org+react@18.3.1.mpk
```

먼저 `.mpk` 인덱스 파일 (과거에는 index.json 이었다) 을 열면 react를 구성하는 파일들의 content hash 목록이 나온다.  
그 중 `package.json`의 hash를 꺼내서 `files/` 디렉토리에서 직접 읽어야 `name`, `version` 같은 메타데이터를 알 수 있었다.

```json
{
  "name": "react",
  "version": "18.3.1",
  "bin": {},
  "engines": { "node": ">=0.10.0" },
  "scripts": {}
}
```

하지만 pnpm v11에서는 패키지 구성에 필요한 정보를 `index.db`에 미리 저장해둔다.  
위 JSON 구조가 MessagePack 으로 직렬화되어 `index.db` 에 BLOB으로 저장된다.  

이 덕에 설치 과정에서 `files/` 디렉토리에서 `package.json`을 별도로 읽는 과정을 완전히 생략할 수 있다.

> 번들 매니페스트는 "패키지를 열어보지 않고도 패키지를 안다"는 아이디어다.  
최초 fetch 시점에 필요한 메타데이터를 추출해 DB에 저장해두면, 이후 설치에서는 DB 조회 한 번으로 충분하다.
> 

### WAL 모드

`index.db`는 WAL(Write-Ahead Logging) 모드로 운용된다.

```sql
PRAGMA journal_mode=WAL;
```

SQLite 기본 모드 (journal mode) 는 쓰기 시 전체 DB 파일에 배타적 잠금을 건다.  
따라서 동시에 여러 프로세스가 접근하면 잠금 충돌이 발생한다. 

다만 WAL 모드에서는 읽기와 쓰기를 분리해서, 읽기 트랜잭션은 쓰기가 진행 중이어도 이전 스냅샷을 볼 수 있다.  

`pnpm install` 은 내부적으로 패키지들을 병렬로 처리하고, 이때 WAL 모드를 활용하여 작업을 수행한다.   

install 시 여러 패키지 fetch가 동시에 진행되면서 각자 `index.db`에 결과를 기록해야 하는데,   
WAL 모드 덕분에 이 과정에서 잠금 없이 동시 쓰기가 가능하기 때문에 필수적으로 활용되는 기능이다.

---

## hex digest 최적화: base64 변환 제거

pnpm v10 에서는 `.mpk` 인덱스 파일 경로를 구성할 때마다 추가적으로 반복하던 연산이 하나 있었다.  

`pnpm-lock.yaml`의 integrity 값은 `sha512-5eNtXOs3...==` 형식의 base64 문자열이다.  
pnpm v10 은 이 문자열을 먼저 HEX 로 변환한 후 일치하는 파일 경로에 패키지 구성 파일을 저장해두었다.

```javascript
// v10: es-toolkit@1.46.1 인덱스 조회
// pnpm-lock.yaml에서 읽은 integrity (base64)
// sha512-5eNtXOs3tbfxXOj04tjjseeWkRWaoCjdEI+96DgwzZoe6c9juL49pXlzAFTI72aWC9Y8p7168g6XIKjh7k6pyQ==

// base64 → hex 변환
const { hexDigest } = parseIntegrity(integrity)
// hexDigest: e5e36d5ceb37b5b7f15ce8f4e2d8e3b1e79691159aa028dd108fbde83830cd9a...

// 앞 두 글자로 디렉토리, 나머지로 파일명 구성
// ~/.pnpm-store/v10/index/e5/e36d5ceb...830cd9a-registry.npmjs.org+es-toolkit@1.46.1.mpk
```

그런데 v11은 이러한 경로 변환 자체가 무의미하다. `pnpm-lock.yaml`에서 읽은 integrity 문자열을 변환 없이 SQLite key로 그대로 사용하기 때문이다.
기존에는 패키지 구성 파일의 integrity 를 전부 HEX 로 변환한 후 디렉토리에 개별적으로 저장했던 방식이 SQLite 로 변환되면서 엄청난 속도 향상이 이루어졌다.

```javascript
// v11: es-toolkit@1.46.1 인덱스 조회
// 변환 없이 integrity를 key로 직접 사용
db.prepare('SELECT data FROM package_index WHERE key = ?')
  .get('sha512-5eNtXOs3tbfxXOj04tjjseeWkRWaoCjdEI+96DgwzZoe6c9juL49pXlzAFTI72aWC9Y8p7168g6XIKjh7k6pyQ==\tes-toolkit@1.46.1')
```

실제 pnpm 내부에 위치한 SQLite (index.dbv) 에서 꺼낸 key를 lockfile 과 나란히 놓으면 그대로 일치함을 알 수 있다.

```
# pnpm-lock.yaml
es-toolkit@1.47.0:
  resolution: {integrity: sha512-n1GuoD0WEQZMBk5tttoZSqwgyLx01oqa5XsBmCHwPyNe1S9jPBEmtR2pSgp2kJuWE3ciFZ6yRHmY4pM4C3OOkw==}

# index.db key
sha512-n1GuoD0WEQZMBk5tttoZSqwgyLx01oqa5XsBmCHwPyNe1S9jPBEmtR2pSgp2kJuWE3ciFZ6yRHmY4pM4C3OOkw==	es-toolkit@1.47.0
```

pnpm v11 에서는 과거처럼 lockfile 을 읽고 SQLite를 조회하는 전체 흐름에서 HEX 변환 단계가 완전히 사라진 것이다.

---

## 소스 코드를 열었더니: `node:sqlite`

글을 쓰면서 한 가지 빠뜨린 게 있다고 느꼈다.  
pnpm이 SQLite를 쓴다는 건 알겠는데 과연 내부적으로는 어떤 드라이버를 쓰는 걸까?  

현재 사내에서는 `better-sqlite3` 같은 C++ 바인딩 라이브러리를 사용했기에 "당연히 이거지 않을까?" 라고 생각하면서 소스 코드를 열었다.

```tsx
// store/index/src/index.ts
const req = createRequire(import.meta.url)
const { DatabaseSync } = req('node:sqlite') as typeof DatabaseSyncType
```

그러나 실제 구현을 위해 사용한 모듈은 바로 Built-In 모듈인 `node:sqlite`였다.  
그렇다, 앞에 접두사를 보면 알 수 있지만 바로 Node.js 내장 모듈이다!  Node 에서 공식적으로 SQLite 를 사용할 수 있도록 모듈을 추가한 거다!  

이는 Node.js 22.5.0에서 실험적으로 도입된 빌트인 SQLite 지원으로, 외부 패키지나 C++ 네이티브 바인딩 없이 Node.js 자체에서 SQLite를 쓸 수 있다고 한다.

그러고 보니 pnpm v11의 `package.json`에는 `"node": ">=22.13"`이 명시되어 있었다!  
단순히 최신 Node.js 기능을 쓰고 싶어서 요구사항을 올린 게 아니었다. `node:sqlite`를 안정적으로 사용할 수 있는 최소 버전이 바로 여기였던 것이다.

### 실제 스키마

pnpm v11 소스 코드에서 실제 `CREATE TABLE` 쿼리를 확인했다.

```sql
CREATE TABLE IF NOT EXISTS package_index (
  key   TEXT PRIMARY KEY,
  data  BLOB NOT NULL
) WITHOUT ROWID
```

핵심 구조를 보니 앞서 추측했던 스키마와 사뭇 달랐다.  

먼저 `manifest`, `files` 컬럼이 따로 나뉜 게 아니라 `package_index` 테이블 하나에 key-value 구조로 저장된다.  
`key`는 `"{integrity}\t{pkgId}"` 형식의 탭 구분 복합 키고, `data`는 msgpackr로 직렬화된 BLOB으로 파일 목록과 번들 매니페스트가 함께 담긴다.

추가로 `WITHOUT ROWID`도 눈에 띈다.  

SQLite는 기본적으로 모든 테이블에 자동 증가 rowid를 만드는데, 텍스트 기반 PRIMARY KEY만 쓰는 경우 rowid는 쓸모없는 오버헤드다.  
따라서 `WITHOUT ROWID`를 붙이면 rowid 없이 PRIMARY KEY를 직접 B-Tree로 구성해 조회를 더 빠르게 만든다.

PRAGMA 설정도 WAL 하나가 전부가 아니었다.

```sql
PRAGMA busy_timeout       = 5000
PRAGMA journal_mode       = WAL
PRAGMA synchronous        = NORMAL
PRAGMA mmap_size          = 536870912   -- 512MB memory map
PRAGMA cache_size         = -32000      -- ~32MB page cache
PRAGMA temp_store         = MEMORY
PRAGMA wal_autocheckpoint = 10000
```

위 설정에서는 512MB mmap과 32MB 페이지 캐시가 눈에 띈다. install 중 수천 개의 패키지를 조회할 때 DB 전체를 OS 파일 캐시에 올려두는 전략이다.

### 배치 쓰기

pnpm v11 은 fetch 단계에서 패키지 인덱스를 기록할 때 매번 개별 트랜잭션을 열지 않는다.  
그 대신 `queueWrites()` + `process.nextTick()`으로 쓰기를 모아서 단일 트랜잭션으로 플러시하는 방식을 쓴다.  

병렬 fetch가 진행되는 동안 각각의 쓰기가 큐에 쌓이고, 이벤트 루프 다음 틱에서 `BEGIN IMMEDIATE ... COMMIT`으로 한번에 처리된다.  
왜 이렇게 배치로 처리할까 싶었는데, SQLite는 트랜잭션당 오버헤드가 있기 때문에 배치로 처리해 쓰기 횟수 자체를 줄이는 게 더 이득이라고 판단했나보다.

### v10 → v11: 기존 캐시는 어떻게 되는가

pnpm v11 소스 코드를 보면서 하나 더 확인하고 싶었다. 만약 버전을 v10에서 v11로 올리면 기존에 쌓인 캐시는 어떻게 처리되는가?

결론은 생각보다 단순했는데, 그냥 쓰이지 않고 일괄적으로 버려진다.

스토어 경로 자체가 `v10/`에서 `v11/`로 바뀌기 때문에, 기존 `.mpk` 인덱스를 SQLite로 자동 변환하는 마이그레이션 코드가 없다. v11 첫 실행 시 인덱스에 없는 패키지는 그냥 재다운로드한다. CI에서 스토어 캐시를 사용하고 있다면 캐시 경로를 v11에 맞게 업데이트해야 한다. 그러지 않으면 v11로 올린 직후 캐시 히트가 전혀 없는 상황이 된다.

---

## 성능 개선 수치

pnpm 팀이 공개한 벤치마크에 따르면 v11의 SQLite 기반 스토어는 v10 대비 다음과 같은 개선을 보인다.

- **캐시 히트 시 install 속도**: 최대 약 2배 향상
- **스토어 디렉토리 파일 수**: 수백만 개 → 1개 (`index.db`)
- **번들 매니페스트 조회**: `.zip` 파싱 생략으로 I/O 감소

특히 CI 환경에서 효과가 크다. 캐시를 복원한 후 실행하는 install에서 인덱스 탐색 비용이 대폭 줄어들기 때문이다. 로컬 환경에서도 글로벌 스토어가 오래 누적된 경우라면 체감할 수 있는 수준이다.

> SQLite는 "작은 데이터베이스"가 아니다. 
단일 파일로 수십 GB 규모의 데이터를 효율적으로 다룰 수 있는, 매우 성숙한 스토리지 엔진이다. 
pnpm이 CAS 인덱스에 SQLite를 선택한 것은 그 특성을 정확히 활용한 결정이다.
> 

---

## 마치며

pnpm v11의 SQLite 전환은 단순한 구현 변경이 아니다. "수백만 개의 작은 파일"이라는 근본적인 병목을 "하나의 잘 설계된 데이터베이스"로 대체한 아키텍처 결정이다.

WAL 모드로 병렬 쓰기를 허용하고, 번들 매니페스트로 불필요한 파일 파싱을 제거하고, integrity를 그대로 SQLite key로 써서 base64 변환 비용을 없앤다. 각각은 작은 최적화지만, 이 결정들이 모여 install 속도를 실질적으로 높인다.

패키지 매니저를 쓰는 입장에서는 그냥 빨라진 install을 경험할 뿐이다. 하지만 그 안에서 어떤 설계 결정이 내려졌는지를 알면, 평범한 `pnpm install` 명령어가 다르게 보이기 시작한다.