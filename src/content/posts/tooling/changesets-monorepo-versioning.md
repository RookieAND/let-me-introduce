> 버전 번호를 올리는 게 이렇게 복잡한 일일 줄 몰랐다. 그냥 숫자 하나 바꾸는 건데.

## 버전 관리가 방치되는 이유

gem-server와 gem-site는 여러 패키지가 공존하는 모노레포다.

각 패키지마다 독립적으로 버전을 관리해야 하는데, 기존에는 두 가지 문제가 있었다.

**언제 버전을 올릴지 기준이 없었다.** 팀마다 방식이 달라서 `package.json`의 `version` 필드가 오랫동안 그대로인 경우가 잦았다.
버전이 실제 코드 상태를 반영하지 못하면, 패키지를 사용하는 쪽에서 어떤 버전을 믿어야 할지 알 수 없다.

**CHANGELOG를 자동으로 쓸 수 없었다.** 어떤 PR에서 무엇이 바뀌었는지 파악하려면 git log를 일일이 뒤져야 했다.
릴리즈 시점마다 변경 이력을 수작업으로 정리해야 하다 보니 누락이 잦았고, 결국 CHANGELOG 자체를 관리하지 않는 상태가 됐다.

두 문제의 공통점은 "신경 쓰지 않아도 굴러간다는 것"이었다.
버전이 틀려도 당장 에러가 나지 않고, CHANGELOG가 없어도 배포는 된다.
그러다 보니 자연스럽게 방치됐다.

---

## 왜 Changesets였는가 — standard-version이 아닌

도구를 고르기 전에 선택지를 비교했다.

| 도구 | 방식 | 장점 | 단점 |
|------|------|------|------|
| **Changesets** | `.changeset/` 파일 | PR 단위 명시, 커밋 컨벤션 비의존 | 파일 작성 습관화 필요 |
| standard-version | git tag + CHANGELOG | 단일 패키지에 간단 | 모노레포 지원 약함, 2022년 개발 중단 |
| Lerna | 컨벤셔널 커밋 기반 | 자동화 원스톱 | Git 커밋 메시지 의존 |
| semantic-release | 커밋 메시지 분석 | 완전 자동 | Conventional Commits 강제 |
| 수동 | `package.json` 직접 수정 | 단순 | 실수 가능, CHANGELOG 없음 |

처음에는 standard-version을 유력한 후보로 올랐다.
커밋 메시지를 분석해 CHANGELOG와 버전 태그를 자동 생성해주는 방식이 단순하고 직관적이었기 때문이다.

그런데 이를 실제로 도입하려고 하니 두 가지 문제가 있었다.
하나는 단일 패키지를 염두에 두고 만들어진 도구라 모노레포에서 패키지별 독립 버전 관리가 어렵다는 것.
또 하나는 2022년에 개발이 멈추고 사실상 deprecated 상태라는 것이었다.

개인적으로 유지보수가 되지 않는 라이브러리에 데인 경험이 있다 보니, 새 도구를 도입하는데 이미 개발이 멈춘 것을 선택하고 싶진 않았다.

그래서 내가 Changesets를 선택한 결정적인 이유는 두 가지였다.

**커밋 컨벤션에 의존하지 않는다.** 기존에 Conventional Commits를 완전히 지키지 않는 커밋이 많았기 때문이다.
커밋 메시지 기반 도구를 도입하더라도 기존 히스토리가 CHANGELOG에서 빠지고, 팀 전체가 규약을 지키지 않으면 자동화 자체가 흔들린다.

**PR 단위로 버전 의도가 명확해진다.** `.changeset/` 파일이 있으면 버전 영향이 있는 PR, 없으면 영향 없는 PR임을 리뷰어가 즉시 파악할 수 있기 때문이다.
리뷰 단계에서 버전 범프 의도를 코드 변경과 함께 검토할 수 있다는 것도 장점이다.

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

## 그런데, 파일을 직접 써야 한다면

Changesets를 도입하고 나서 곧바로 한 가지 문제를 마주쳤다.

`.changeset/` 파일을 PR마다 직접 작성하는 습관이 팀에 정착하기가 어렵다는 것이었다.
도구 자체는 훌륭한데, 사람이 매번 `npx changeset`을 실행하고 파일을 커밋해야 한다는 점이 마찰을 만들었다.
한 번이라도 빠트리면 그 PR의 변경은 CHANGELOG에서 사라진다.

버전 관리가 방치됐던 이유가 "신경 쓰지 않아도 굴러가기 때문"이었는데,
사람의 행동에 의존하는 방식으로는 같은 문제가 반복될 것 같았다.

목표를 바꿨다. **개발자가 버전 관리에 아예 신경 쓰지 않아도 되는 구조**를 만들기로 했다.

---

## 자동화 플로우: 개발자가 신경 쓰지 않아도 되는 구조

세 개의 GitHub Actions workflow로 구성된다.

```
feature/* → develop PR 작성
    ↓ [pr-validation.yml]
    PR 제목 Conventional Commit 형식 검증

feature/* PR merge → develop
    ↓ [develop-changeset-automation.yml]
    커밋 분석 → .changeset/auto-pr-{N}.md 자동 생성
    chore: auto-generate changeset for PR #{N} 커밋으로 develop에 직접 push

develop → release/* → main PR merge
    ↓ [release-tagging.yml]
    추가 커밋 분석 → changeset 생성
    pnpm changeset version 실행
    chore(release): version packages 커밋으로 main에 직접 push
    develop에 cherry-pick으로 동기화
    Git 태그 + GitHub Release 생성
```

각 단계를 순서대로 살펴본다.

### 1단계 — PR 제목 강제: pr-validation

`feature/*` 브랜치에서 `develop`으로 PR을 열면 `pr-validation.yml`이 실행된다.
PR 제목이 Conventional Commit 형식인지 CI가 검증하고, 라벨이 하나 이상 있는지도 확인한다.

```yaml
# .github/workflows/pr-validation.yml
- name: Validate PR Title (Conventional Commit)
  run: |
    PR_TITLE="${{ github.event.pull_request.title }}"
    CONVENTIONAL_COMMIT_PATTERN="^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?: .+"

    if echo "$PR_TITLE" | grep -qE "$CONVENTIONAL_COMMIT_PATTERN"; then
      echo "✅ PR 제목이 Conventional Commit 규칙을 준수합니다."
    else
      echo "❌ PR 제목이 Conventional Commit 규칙을 위배합니다."
      exit 1
    fi
```

PR 제목을 Conventional Commit으로 강제하는 이유는 다음 단계에 있다.
2단계 workflow가 PR 제목의 커밋 타입을 분석해 버전 범프 타입을 결정하기 때문이다.
형식이 보장되지 않으면 자동화의 전제 자체가 무너진다.

### 2단계 — develop 자동 changeset 생성: develop-changeset-automation

`feature/*` PR이 `develop`에 머지되면 `develop-changeset-automation.yml`이 실행된다.
여기서 핵심은 세 가지다.

**변경된 패키지를 감지한다.**
`packages/`와 `apps/` 하위의 `package.json` 파일을 전부 순회하며,
PR에서 변경된 파일이 속한 패키지를 찾는다.

**커밋 타입으로 버전 범프를 결정한다.**

| 커밋 타입 | 버전 범프 |
|---|---|
| `<type>!:` 또는 `BREAKING CHANGE` | major |
| `feat:` | minor |
| `fix:` | patch |
| `refactor:`, `perf:` | patch |
| `chore:`, `docs:`, `style:`, `test:`, `ci:`, `build:` | 버전 업데이트 없음 |

여러 커밋이 섞여 있을 때는 가장 높은 범프 타입이 우선된다.
`feat:`과 `fix:`가 같은 PR에 있으면 `minor`가 선택된다.

**changeset 파일을 생성해 바로 commit으로 push한다.**

```bash
# .changeset/auto-pr-{PR_NUMBER}.md 생성
echo "---" > $CHANGESET_FILE
for pkg in $PACKAGES; do
  echo "\"$pkg\": $BUMP_TYPE" >> $CHANGESET_FILE
done
echo "---" >> $CHANGESET_FILE
echo "$PR_TITLE (#$PR_NUMBER)" >> $CHANGESET_FILE

# PR 없이 바로 develop에 직접 push
git commit -m "chore: auto-generate changeset for PR #$PR_NUMBER"
git push origin develop
```

기존 Changesets 워크플로우가 개발자가 직접 파일을 작성하고 PR에 포함시키는 방식이었다면,
이 workflow는 PR이 머지된 직후 CI가 자동으로 파일을 생성해 develop에 밀어넣는다.
개발자가 할 일은 PR 제목을 Conventional Commit 형식으로 작성하는 것뿐이다.

### 3단계 — release 머지 시 버전 업데이트와 태그: release-tagging

`release/*` 또는 `hotfix/*` 브랜치가 `main`에 머지되면 `release-tagging.yml`이 실행된다.
이 workflow가 전체 자동화의 완성이다. 다섯 가지 작업을 순서대로 처리한다.

**① 분기점 이후 추가 커밋 분석**

release 브랜치가 develop에서 분기한 시점을 `git merge-base`로 찾아,
그 이후 커밋들 중 changeset 파일이 없는 것들을 대상으로 changeset을 자동 생성한다.
develop-changeset-automation이 처리하지 못한 커밋들을 여기서 보완하는 것이다.

**② `pnpm changeset version` 실행**

쌓여 있는 `.changeset/` 파일들을 모두 소비해 `package.json` 버전과 `CHANGELOG.md`를 갱신한다.

**③ main에 직접 commit**

Version Packages PR을 별도로 만들지 않는다.
`chore(release): version packages` 커밋 하나를 만들어 main에 바로 push한다.

이 부분이 공식 `changesets/action`의 방식과 가장 크게 다르다.
공식 action은 버전 업데이트를 담은 PR을 자동 생성하고 사람이 머지하는 흐름인데,
여기서는 그 단계를 제거하고 CI가 직접 commit한다.

**④ develop에 cherry-pick으로 동기화**

main에 생긴 버전 커밋을 develop으로 cherry-pick한다.
`package.json`과 `CHANGELOG.md`는 main 버전을 사용하고, `.changeset/` 파일들은 이미 소비됐으므로 제거한다.

**⑤ Git 태그와 GitHub Release 생성**

`apps/` 하위 패키지의 `package.json`을 읽어 `{패키지명}@{버전}` 형식의 태그를 생성하고,
해당 버전의 `CHANGELOG.md` 내용을 GitHub Release notes로 작성한다.

---

## 커밋 하나가 버전을 결정하는 방식

전체 플로우를 한 줄로 요약하면 이렇다.

> PR 제목이 Conventional Commit이면, 나머지는 CI가 알아서 한다.

개발자가 직접 신경 써야 하는 것은 PR 제목 형식 하나뿐이다.
`feat:` → minor, `fix:` → patch, `BREAKING CHANGE` → major.
`chore:`, `docs:` 같은 타입은 버전 업데이트 없이 넘어간다.

한 가지 명심해야 할 점은 `major` 범프다.
내부 패키지라도 `major`를 올리면 이를 의존하는 다른 패키지의 peer dependency가 깨질 수 있다.
실제로 처음 도입 시 `major` 범프 습관이 생기면서 연쇄 범프가 발생한 적이 있었다. (생각보다 파급 범위가 넓었다)
`BREAKING CHANGE`는 명백한 호환성 파괴가 있을 때만 사용하는 것이 좋다.

---

## 사전 PoC: 실제 레포 대신 테스트 레포부터

실제 레포에 바로 도입하지 않고, 별도 테스트 레포에서 검증을 먼저 진행했다.

새 도구를 실제 레포에 바로 붙였다가 기대치가 충족되지 않으면 롤백이 까다롭기 때문이다.
CI를 연결하고 `.changeset/` 파일을 쌓기 시작하면, 중간에 철회하려면 커밋 이력과 설정 파일을 모두 되돌려야 한다.
사전 PoC를 통해 동작을 완전히 이해한 뒤 도입하면 이런 리스크를 줄일 수 있다.

테스트 레포에서 검증한 항목들은 다음과 같다.

- `.changeset/` 파일 생성 후 `changeset version` 실행 시 CHANGELOG 포맷
- `major`/`minor`/`patch` 범프 전략 차이
- GitHub Actions와의 CI 통합 흐름
- snapshot 버전 — `0.0.0-{timestamp}-{hash}` 포맷으로 PR 단위 스냅샷 배포
- `changeset pre` 모드를 사용한 alpha/beta 릴리스

---

## 놓치기 쉬운 부분

**`fetch-depth: 0`은 반드시 설정해야 한다.**

```yaml
- uses: actions/checkout@v6
  with:
    fetch-depth: 0  # 전체 git 히스토리 필요
```

기본값(`fetch-depth: 1`)은 shallow clone이다.
`git merge-base`로 분기점을 찾거나 어떤 커밋에서 changeset 파일이 추가됐는지 분석하는 작업이 모두 실패한다.

**`.changeset/` 파일 본문을 비우면 CHANGELOG에 빈 항목이 생긴다.**

```markdown
---
"@gem-server/api": minor
---

<!-- 비워두면 CHANGELOG에 빈 항목 -->
```

버전은 올라가는데 "무엇이 바뀌었는지"가 없는 릴리즈가 만들어진다.
자동 생성되는 changeset 파일은 PR 제목을 description으로 사용하기 때문에,
PR 제목이 충분히 구체적이지 않으면 CHANGELOG가 의미를 잃는다.
나중에 특정 버전으로 되돌아가야 하거나 배포 이력을 추적해야 할 때, 빈 CHANGELOG는 아무 도움이 되지 않는다.

---

## 현재 남은 문제와 앞으로

자동화가 잘 돌아가고 있지만, 아직 해결되지 않은 부분이 있다.

**cherry-pick 충돌 위험.** main의 버전 커밋을 develop에 cherry-pick할 때 `package.json`과 `CHANGELOG.md`에서 충돌이 날 수 있다.
현재는 충돌 발생 시 main 버전을 theirs 전략으로 강제 적용한 뒤 계속 진행하는 방식으로 처리하고 있다.
이 방식은 develop의 변경이 덮어씌워질 수 있어 완전히 안전하지 않다.
develop에서 이미 다음 버전 작업이 진행 중이라면 버전 숫자 충돌이 발생한다.

**Conventional Commits 미준수 시 patch 폴백.** PR 제목이 Conventional Commit 형식이 아니면 자동으로 `patch`로 처리된다.
pr-validation이 형식을 강제하고 있지만, validation을 우회하거나 직접 머지하는 경우에는 의도치 않은 버전 범프가 생길 수 있다.

**자동 생성된 CHANGELOG의 품질.** PR 제목을 description으로 사용하기 때문에, 제목이 구체적이지 않으면 CHANGELOG가 그대로 불친절해진다.
"feat: 기능 추가" 같은 제목이 그대로 CHANGELOG에 남으면 나중에 특정 버전으로 추적하기 어려워진다.

이 중 cherry-pick 충돌 문제가 가장 근본적이다.
장기적으로는 develop과 main 간의 버전 동기화 전략을 재설계하는 방향을 검토하고 있다.

---

## 도입 후 달라진 것

Changesets를 도입하고 나서 가장 크게 달라진 건 **릴리즈 추적 비용**이다.

이전에는 "이번 배포에 뭐가 포함됐지?"를 알려면 git log를 뒤지거나 팀원에게 직접 물어봐야 했다.
이제는 `CHANGELOG.md` 한 파일이 그 역할을 대신한다.

결국 Changesets는 도구보다 **팀 내 버저닝 워크플로우 합의**에 가깝다.
PR에 `.changeset/` 파일을 포함하는 습관이 정착되지 않으면 도구를 도입해도 의미가 없다.
자동화가 그 습관의 필요성을 없애줬다는 게 지금 구조의 핵심이다.
