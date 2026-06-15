> 버전 번호를 올리는 게 이렇게 복잡한 일일 줄 몰랐다. 그냥 숫자 하나 바꾸는 건데.

## 왜 모노레포에서 버전 관리가 어려운가

gem-server와 gem-site는 여러 패키지가 공존하는 모노레포다.

각 패키지마다 독립적으로 버전을 관리해야 하는데, 기존에는 두 가지 문제가 있었다.

- **언제 버전을 올릴지 기준이 없다.** 팀마다 방식이 달라서 `package.json`의 `version` 필드가 오랫동안 그대로인 경우가 잦았다.
버전이 실제 코드 상태를 반영하지 못하면, 패키지를 사용하는 쪽에서 어떤 버전을 믿어야 할지 알 수 없다.
- **CHANGELOG를 자동으로 쓸 수 없다.** 어떤 PR에서 무엇이 바뀌었는지 파악하려면 git log를 일일이 뒤져야 했다.
릴리즈 시점마다 변경 이력을 수작업으로 정리해야 하다 보니 누락이 잦았고, 결국 CHANGELOG 자체를 관리하지 않는 상태가 됐다.

---

## Changesets가 하는 일

> PR 단위로 버전 범프 의도를 파일로 남기고, 릴리즈 시점에 CHANGELOG와 버전을 자동으로 갱신한다.

핵심 워크플로우는 세 단계다.

**1단계 — PR 작업 중 의도를 선언한다**

```bash
npx changeset
```

CLI가 어떤 패키지를 `major / minor / patch` 할지 묻고, `.changeset/{random-name}.md` 파일을 생성한다.

```markdown
---
"@gem-server/api": minor
"@gem-site/form": patch
---

신규 트리거 API 추가 및 스트리밍 응답 포함
```

이 파일을 PR에 함께 커밋한다.
`.changeset/` 파일의 유무 자체가 "이 PR이 버저닝 의도가 있는가"를 나타내는 신호가 된다.

**2단계 — CI가 Version Packages PR을 자동 생성한다**

`changesets/action`을 CI에 연결해두면 `main` 브랜치에 푸시될 때마다 대기 중인 `.changeset/` 파일들을 분석해 **Version Packages PR**을 자동으로 만든다.

여러 개의 `.changeset/` 파일이 쌓인 경우 모두 합산해 하나의 릴리즈 PR로 만든다.

이 PR에는 다음이 포함된다.

- 각 패키지의 `package.json` 버전 업데이트
- `CHANGELOG.md` 변경사항 추가
- `.changeset/` 파일 제거

**3단계 — PR을 Merge하면 배포된다**

Version Packages PR을 Merge하면 CI가 `changeset publish`를 실행해 실제 배포까지 처리한다.

---

## 기존 도구들과 비교

모노레포 버저닝 도구를 선택할 때 몇 가지를 비교했다.

| 도구 | 방식 | 장점 | 단점 |
|------|------|------|------|
| **Changesets** | `.changeset/` 파일 | PR 단위 명시, 커밋 컨벤션 비의존 | 파일 작성 습관화 필요 |
| Lerna | 컨벤셔널 커밋 기반 | 자동화 원스톱 | Git 커밋 메시지 의존 |
| semantic-release | 커밋 메시지 분석 | 완전 자동 | Conventional Commits 강제 |
| 수동 | `package.json` 직접 수정 | 단순 | 실수 가능, CHANGELOG 없음 |

Changesets를 선택한 결정적인 이유가 두 가지였다.

- **커밋 컨벤션에 의존하지 않는다.** 기존에 Conventional Commits를 완전히 지키지 않는 커밋도 많았다.
커밋 메시지 기반 도구는 기존 히스토리와 맞지 않는다.
- **PR 단위로 의도가 명확해진다.** `.changeset/` 파일이 있으면 버전 영향이 있는 PR, 없으면 영향 없는 PR로 리뷰어가 즉시 파악할 수 있다.
리뷰 단계에서 버전 범프 의도를 코드 변경과 함께 검토할 수 있다는 것도 장점이다.

---

## 사전 PoC: 실제 레포 대신 테스트 레포부터

실제 레포에 바로 도입하지 않고, 별도 테스트 레포에서 검증을 먼저 진행했다.

새 도구에 대한 기대치가 충족되지 않을 경우 롤백이 어렵기 때문이다.
실제 레포에 CI를 연결하고 `.changeset/` 파일을 쌓기 시작하면, 중간에 철회하려면 커밋 이력과 설정 파일을 모두 되돌려야 한다.
사전 PoC를 통해 동작을 완전히 이해한 뒤 도입하면 이런 리스크를 줄일 수 있다.

테스트 레포에서 검증한 항목들은 다음과 같다.

- `.changeset/` 파일 생성 후 `changeset version` 실행 시 CHANGELOG 포맷
- `major`/`minor`/`patch` 범프 전략 차이
- GitHub Actions와의 CI 통합 흐름
- snapshot 버전 — `0.0.0-{timestamp}-{hash}` 포맷으로 PR 단위 스냅샷 배포
- `changeset pre` 모드를 사용한 alpha/beta 릴리스

---

## GitHub Actions 통합

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 전체 git 히스토리 필요 — 없으면 changeset 분석 실패
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4

      - name: Install
        run: pnpm install

      - name: Create Release Pull Request
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          commit: "chore: version packages"
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`fetch-depth: 0`은 반드시 설정해야 한다.
기본값(`fetch-depth: 1`)은 shallow clone이라 `changesets/action`이 git 히스토리를 읽어 어떤 changeset 파일이 새로 추가됐는지 분석할 수 없다.

`changesets/action`은 내부적으로 두 가지 모드로 작동한다.

- **Version Packages PR 없음** → 대기 중인 `.changeset/` 파일 분석 후 PR 자동 생성.
main에 새로운 커밋이 푸시될 때마다 내용을 갱신한다.
- **Version Packages PR Merge됨** → `publish` 커맨드 실행.
이 시점에 패키지 버전이 확정되고 CHANGELOG가 완성된 상태이므로 npm 배포가 일어난다.

---

## snapshot 버전 — PR 단위 스냅샷 배포

일반 릴리즈가 아닌 PR별로 테스트용 버전이 필요할 때 사용한다.

```bash
npx changeset version --snapshot
# -> @gem-server/api@0.0.0-20260610120300-abc1234 형태로 버전 생성
```

PR 파이프라인에서 snapshot 배포를 자동화하면 스테이징 환경에 바로 설치해 검증할 수 있다.

---

## 놓치기 쉬운 부분

**`.changeset/` 파일 본문을 비우면 CHANGELOG에 빈 항목이 생긴다.**

```markdown
---
"@gem-server/api": minor
---

<!-- 비워두면 CHANGELOG에 빈 항목 -->
```

버전은 올라가는데 "무엇이 바뀌었는지"가 없는 릴리즈가 만들어진다.
나중에 특정 버전으로 되돌아가야 하거나 배포 이력을 추적해야 할 때, 빈 CHANGELOG는 아무 도움이 되지 않는다.
어떤 변경인지 한 줄이라도 적어두는 게 나중에 릴리즈 추적 시 큰 차이를 만든다.

**`major` 범프는 신중하게 선택해야 한다.**

내부 패키지라도 `major`를 올리면 이를 의존하는 다른 패키지의 peer dependency가 깨질 수 있다.
실제로 처음 도입 시 `major` 범프 습관이 생기면서 연쇄 범프가 발생한 적이 있었다. (생각보다 파급 범위가 넓었다)
대부분의 변경은 `minor`(하위 호환 기능 추가) 또는 `patch`(버그 수정)로 표현할 수 있다.
`major`는 명백한 breaking change가 있을 때만 선택하는 것이 좋다.

---

## 도입 후 달라진 것

Changesets를 도입하고 나서 가장 크게 달라진 건 **릴리즈 추적 비용**이다.

이전에는 "이번 배포에 뭐가 포함됐지?"를 알려면 git log를 뒤지거나 팀원에게 직접 물어봐야 했다.
이제는 `CHANGELOG.md` 한 파일이 그 역할을 대신한다.

결국 Changesets는 도구보다 **팀 내 버저닝 워크플로우 합의**에 가깝다.
PR에 `.changeset/` 파일을 포함하는 습관이 정착되지 않으면 도구를 도입해도 의미가 없다.

`changesets/action`이 Version Packages PR을 계속 열어두고 있는 걸 팀이 인식하도록 PR Description 템플릿이나 CI 알림을 연결해두는 것도 좋은 방법이다.
