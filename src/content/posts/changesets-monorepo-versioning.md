> 버전 번호를 올리는 게 이렇게 복잡한 일일 줄 몰랐다. 그냥 숫자 하나 바꾸는 건데.

## 왜 모노레포에서 버전 관리가 어려운가

gem-server와 gem-site는 여러 패키지가 공존하는 모노레포다.

각 패키지마다 독립적으로 버전을 관리해야 하는데, 기존에는 두 가지 문제가 있었다.

- **언제 버전을 올릴지 기준이 없다.** 팀마다 방식이 달라서 `package.json`의 `version` 필드가 오랫동안 그대로인 경우가 잦았다.
- **CHANGELOG를 자동으로 쓸 수 없다.** 어떤 PR에서 무엇이 바뀌었는지 파악하려면 git log를 일일이 뒤져야 했다.

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

입자 연동 트리거 API 추가, 선설 응답 포함
```

이 파일을 PR에 함께 커밋한다.

**2단계 — CI가 Version Packages PR을 자동 생성한다**

`changesets/action`을 CI에 연결해두면 `main` 브랜치에 푸시될 때마다 대기 중인 `.changeset/` 파일들을 분석해 **Version Packages PR**을 자동으로 만든다.

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
| Lerna | 특정 전담 커밋 | 자동화 원스톱 | Git 주석 의존 |
| semantic-release | 커밋 메시지 분석 | 완전 자동 | Conventional Commits 강제 |
| 수동 | `package.json` 직접 수정 | 단순 | 실수 가능, CHANGELOG 없음 |

Changesets를 선택한 결정적인 이유가 두 가지였다.

- **커밋 컨벤션에 의존하지 않는다.** 기존에 Conventional Commits를 완전히 지키지 않는 커밋도 많았다. 커밋 메시지 기반 도구는 기존 히스토리와 맞지 않는다.
- **PR 단위로 의도가 명확해진다.** `.changeset/` 파일이 있으면 버전 영향이 있는 PR, 없으면 영향 없는 PR로 리뷰어가 즉시 파악할 수 있다.

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

`changesets/action`은 내부적으로 두 가지 모드로 작동한다.

- **Version Packages PR 없음** → 대기 중인 `.changeset/` 파일 분석 후 PR 자동 생성
- **Version Packages PR Merge됨** → `publish` 커맨드 실행

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

어떤 변경인지 한 줄이라도 적어두는 게 나중에 릴리즈 추적 시 큰 차이를 만든다.

**`major` 범프는 신중하게 선택해야 한다.**

내부 패키지라도 major를 올리면 이를 의존하는 다른 패키지의 peer dependency가 깨질 수 있다. 실제로 처음 도입 시 `major` 범프 습관이 생기면서 연쇄 범프가 발생한 적이 있었다.

---

## 도입 후 달라진 것

Changesets를 도입하고 나서 가장 크게 달라진 건 **릴리즈 추적 비용**이다.

이전에는 "이번 배포에 뭐가 포함됐지?" 를 알려면 git log를 뒤지거나 팀원에게 직접 물어봐야 했다. 이제는 `CHANGELOG.md` 한 파일이 그 역할을 대신한다.

결국 Changesets는 도구보다 **팀 내 버저닝 워크플로우 합의**에 가깝다. PR에 `.changeset/` 파일을 포함하는 습관이 정착되지 않으면 도구를 도입해도 의미가 없다.

`changesets/action`이 Version Packages PR을 계속 열어두고 있는 걸 팀이 인식하도록 PR Description 템플릿이나 CI 알림을 연결해두는 것도 좋은 방법이다.
