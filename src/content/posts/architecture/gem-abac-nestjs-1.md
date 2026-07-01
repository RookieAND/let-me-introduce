> 처음에는 단순한 권한 추가 문제라고 생각했는데.. 요구사항을 뜯어보면서 "이거 좀 쉽지 않다"는 걸 느꼈다.

## 기존 서비스의 권한 구조

GEM은 **Space → Course → Unit** 이라는 계층 구조 위에서 동작한다.
Space는 사업 단위로 생성되는 최상위 공간이고, Course는 그 안의 교육 과정, Unit은 Course 안의 개별 콘텐츠다.
이 외에 Submission(지원 양식)과 Template(재사용 Unit 구성)도 권한 관리 대상이다.

이처럼 GEM 내 엔티티는 상호 계층 구조를 가지지만 권한은 각 리소스별로 독립적으로 관리된다.
이 말인 즉슨 Space에 권한이 있다고 해서 그 안의 Course에도 자동으로 접근되지 않는다는 의미이다.

이 자원들에 대한 접근 제어는 RBAC 기반이었다.

```
SUPER_ADMIN → 플랫폼 전체 관리 권한
MANAGER     → Space 단위 관리 권한
USER        → Space 단위 열람 권한
```

서비스 초기에는 내부 운영자와 일반 사용자만 있었기에 이 세 역할로 모든 케이스를 커버할 수 있었다.

---

## 도화선이 된 요구사항

그러다 이런 요구사항이 들어왔다.

> "외부 관리자가 서비스에 직접 접근해서 담당 Course의 지원자를 관리할 수 있어야 한다."

처음 이 요구사항을 들었을 때는 그렇게 크게 어렵지 않다고 생각했는데, 그 이유는 단순히 외부 관리자에게 접근 권한을 부여해서 해결한 경험이 있었기 때문이다.

그런데 조건을 하나씩 풀어보니 이야기가 달라졌다.
각 외부 관계자는 본인이 담당하는 Course에만 접근 가능해야 하고, 담당 기간이 끝나면 권한이 즉시 회수돼야 했다.
그리고 같은 Course를 담당하는 외부 관리자가 직급에 따라 접근 가능한 기능이 달라질 수 있다는 것도 추가적인 문제였다.
여기에 더해 같은 Course를 보면서도 허용된 행동이 다르고 열람 가능한 정보 범위도 달라야 했다.

일단 문제가 인입이 되었으니.. 이를 해결하기 위해 기존 권한 시스템에 요구 사항을 하나씩 맞춰보기 시작했다.

---

## 기존 RBAC의 구조적 한계

가장 먼저 막힌 건 "이 외부 관리자는 Course A만 접근 가능, Course B는 접근조차 불가"라는 조건이었다.
MANAGER 역할을 부여하면 Space 내 모든 리소스에 관리 권한이 일괄 적용되기에 리소스 단위로 접근을 끊을 방법이 없었다.

그다음 막혔던 구간은 같은 Course를 보더라도 허용된 행동이 달라야 한다는 조건이었다.
그래서 처음에는 역할을 쪼개는 방향을 생각해봤는데, 외부 관리자 유형이 늘어날수록 역할 수가 비례해서 폭발하는 구조여서 포기했다. (으악 이건 아니야)

거기다 외부 관리자에게 잘못된 권한이 부여되면 개인정보 보안 이슈로 직결되는데, 역할 하나를 바꿨을 때 어떤 리소스들이 영향을 받는지 추적하기 어렵다면 권한 실수의 영향 범위를 예측할 수가 없다.

RBAC의 전제인 "역할을 부여하면 그 역할의 권한을 전부 갖는다"는 구조 자체가 이 요구사항과 맞지 않았다.

---

## PBAC, 그리고 엄밀히는 무엇인가

팀 내에서 처음 떠올린 대안은 ABAC(Attribute-Based Access Control)였다.
리소스 속성과 사용자 속성을 조합해 접근을 결정하는 방식이라 세밀한 제어가 가능하고 요구사항을 모두 표현할 수 있었다.

그런데 ABAC 설계를 구체화하면서 두 가지 문제가 보였다.

하나는 권한을 부여하는 플로우 자체가 너무 복잡해진다는 것이고, 다른 하나는 UX 기획자 분의 우려도 있었다.
왜냐하면 주 사용층인 운영자들이 ABAC 방식의 권한 설정에 익숙하지 않기도 할 뿐더러, 각 자원별로 세밀하게 접근 가능한 기능을 하나씩 설정하는 플로우가 사용성을 저하시키지 않을까 하는 걱정을 하셨다.

솔직히 이건 UX 기획자 분의 말이 백번 맞다고 본다. ABAC의 표현력은 분명 매력적이었지만 그 복잡함을 운영자에게 그대로 전가하는 구조였다.

그래서 선택한 게 PBAC(Policy-Based Access Control)다.
이 설계방식은 "누가 무엇을 어떤 조건에서 할 수 있는가"를 **PolicyRule**로 선언하고 런타임에 그 규칙을 평가해서 권한을 결정하는 흐름으로 이어진다.
이러한 구조 덕에 RBAC보다 표현력이 높고 ABAC보다 운영 복잡도가 낮다고 판단했다.

근데 우리가 만든 게 운영자가 PolicyRule을 직접 정의하는 순수한 PBAC냐 하면 솔직히 그것도 아니다.
운영자가 PolicyRule을 직접 건드리게 하면 휴먼 에러 위험이 여전히 높다.

그래서 **미리 정의된 정책 집합 중 하나를 고르는 프리셋 추상화**를 중간에 뒀다. (AWS IAM Group 처럼!)
운영자는 드롭다운에서 등급을 선택하고, 시스템이 런타임에 PolicyRule로 변환해서 집행하는 구조다.
(그래도 PBAC라고 불러도 틀린 건 아니다 — 결국 PolicyRule이 접근을 제어하고, 핵심 문제도 Policy 선언으로 해결했으니까)

---

## CASL을 처음 봤을 때 눈에 띈 것들

권한 집행 레이어를 어떻게 만들지 고민할 때 여러 라이브러리를 훑어봤다.
그 중에서 CASL이 눈에 들어왔던 건 두 가지 이유에서다.

첫 번째는 **TypeScript 네이티브 지원과 `can(action, subject)` 문법의 직관성**이었다.
NestJS Guard와 Service 레이어에 자연스럽게 녹아드는 구조고,
`@CheckAbility` 같은 커스텀 데코레이터와 `applyDecorators`를 조합해서 Guard를 깔끔하게 묶어낼 수 있었다.
인터페이스가 깔끔하다는 건 미들웨어를 끼워 넣기도 수월하다는 뜻이기도 했다.

두 번째는 **Condition 기반 평가**다.
`can('Update', 'Course', { id: 'course-7' })` 처럼 특정 리소스 속성 조건까지 포함한 권한 체크가 가능하다.
이게 없었으면 "이 사용자가 이 Course를 수정할 수 있는가"를 매번 서비스 코드에서 수동으로 판단해야 했을 것이다.
권한 규칙이 코드에 선언되고, 서비스는 그냥 `assertCan` 한 줄만 호출하면 된다는 게 설계를 단순하게 유지할 수 있었던 이유다.

다른 라이브러리를 쓰지 않은 건 사실 단순하다.
CASL이 위 두 조건을 이미 충족했고, 그것만으로도 충분했다. (추가 의존성은 적을수록 좋다)

---

## 핵심 개념 네 가지 — Level · PolicyRule · ResourcePermission · PolicyOverride

설계 이야기로 들어가기 전에 이 시스템을 이루는 핵심 개념들을 먼저 잡아두자.
코드가 나오기 전에 이 개념들이 머릿속에 잡혀있어야 흐름이 끊기지 않는다.

구체적으로 권한 관리의 흐름을 정리해보자면 아래와 같다.

| 개념 | 역할 |
|---|---|
| **Level** | 운영자가 선택하는 권한 등급. ADMIN / EDITOR / MEMBER / VIEWER 네 가지이며 DB에 저장된다. |
| **ResourcePermission** | 누가, 어떤 리소스에, 어떤 Level을 가지는가를 기록하는 컬렉션. 대부분의 권한이 이 경로로 부여된다. |
| **PolicyRule** | Level이 런타임에 확장된 실제 권한 규칙. DB에는 저장되지 않는다. |
| **CASL** | PolicyRule을 받아 권한 평가를 수행하는 라이브러리. 리소스 속성 조건까지 포함해 평가한다. |
| **PolicyOverride** | Level로 표현할 수 없는 예외 케이스를 처리하는 커스텀 규칙. 개발자가 직접 제어한다. |

운영자는 **Level** 하나만 선택한다 → **ResourcePermission**에 저장된다 → 런타임에 **PolicyRule[]** 로 확장된다 → CASL이 평가한다.
Level로 표현하기 어려운 예외는 **PolicyOverride**로 처리한다.

### Level — 운영자가 선택하는 권한 등급

운영자가 사용자에게 부여하는 권한의 등급으로, 아래와 같이 네 가지 고정값을 가진다.

| Level | 등급 | 의미 |
|---|---|---|
| ADMIN | 4 | 모든 Action + 멤버 초대·설정 관리. 소유자 수준 |
| EDITOR | 3 | CRUD 전반 가능. 설정·초대 불가 |
| MEMBER | 2 | 조회 + 제한적 기능. Subject별로 허용 범위가 다르다 |
| VIEWER | 1 | 읽기 전용 |

포함 관계는 `ADMIN ⊃ EDITOR ⊃ MEMBER ⊃ VIEWER`다.

중요한 건 같은 Level이라도 Subject마다 허용되는 Action이 다르다는 점이다.
Course EDITOR와 Unit EDITOR가 할 수 있는 행동이 완전히 같지 않다.
이 매핑은 코드 상수 `LEVEL_POLICY_MAP`에서 관리하며 DB에는 이 Level 값만 저장된다.
실제 허용 Action 목록은 런타임에 코드 상수에서 확장하는 구조다.

### PolicyRule — CASL이 실제로 평가하는 단위

"어떤 Subject의, 어떤 Resource에, 어떤 Action을, 허용/거부한다"를 표현하는 단위로, CASL이 실제로 평가하는 게 바로 이 구조다.

```json
{
  "effect": "Allow",
  "subject": "Course",
  "actions": ["Read", "Update", "Clone", "CreateUnit"],
  "resources": ["course-7"]
}
```

이 PolicyRule 자체는 DB에 저장되지 않는다. Level만 DB에 저장되고, 런타임에 이 배열로 확장되는 구조이기 때문이다.
이 확장을 처리하는 `expandLevelToRules` 구현은 2편에서 다룬다.

### ResourcePermission — Level 기반 권한을 저장하는 곳

"누가, 어떤 Resource에, 어떤 Level을 가지는가"를 저장하는 컬렉션으로 대부분의 권한이 이 경로로 부여된다.

```json
{
  "userId": "user-a",
  "subject": "Course",
  "resourceId": "course-7",
  "spaceId": "space-1",
  "level": "EDITOR"
}
```

`userId + subject + resourceId` 조합이 고유 키다.
한 사람이 Course A는 EDITOR, Course B는 VIEWER이면 ResourcePermission이 2건 존재하고,
런타임에 각각의 PolicyRule[]로 합산된다.

### PolicyOverride — Level로 표현할 수 없는 예외를 위해

Level 네 개로 표현하지 못하는 케이스를 처리하기 위한 커스텀 규칙이 PolicyOverride다.

```json
{
  "userId": "user-a",
  "spaceId": "space-1",
  "rules": [
    { "effect": "Allow", "subject": "Unit", "actions": ["ExportSubmissionAnswerCsv"], "resources": ["*"] },
    { "effect": "Deny",  "subject": "Course", "actions": ["Delete"], "resources": ["course-7"] }
  ]
}
```

이 부분만큼은 진짜 PBAC 의 기본 토대를 그대로 반영하려고 했다. 어떤 예외 처리가 오더라도 맞출 수 있도록 말이다.
PolicyOverride는 개발자가 직접 제어하는 것으로 정책을 결정했기에 일반 UI에서는 생성/수정이 불가하다.

---

## Subject / Action 상수 설계

`enum` 대신 `as const` 패턴을 선택했는데, TypeScript의 `enum`은 양방향 매핑으로 인한 Tree-Shaking 문제와 명목적 타이핑으로 인한 호환성 문제가 있기 때문이다.
`as const`는 string literal union 타입으로 추론되어 타입 안전하면서도 가볍다.

```typescript
export const Subject = {
  Space:      'Space',
  Course:     'Course',
  Unit:       'Unit',
  Submission: 'Submission',
  Template:   'Template',
} as const;

export type Subject = (typeof Subject)[keyof typeof Subject];
```

이때 Subject 별로 Action을 따로 정의한 이유가 있다.
Space에는 `Invite`, `Setting`, `CreateCourse` 같은 고유 Action이 있고, Unit에는 `Clone`, `LinkSubmission`이 있다.
만약 이를 하나의 공통 Action 집합으로 합치면 "Course에 Invite Action을 사용" 하는 실수를 타입 레벨에서 막기 어려워진다.

```typescript
const BaseAction = {
  Create: 'Create', Read: 'Read', Update: 'Update', Delete: 'Delete',
} as const;

export const SpaceAction = {
  ...BaseAction,
  Invite:           'Invite',
  Setting:          'Setting',
  CreateCourse:     'CreateCourse',
  CreateSubmission: 'CreateSubmission',
} as const;

export const CourseAction = {
  ...BaseAction,
  Setting:    'Setting',
  Clone:      'Clone',
  Restore:    'Restore',
  CreateUnit: 'CreateUnit',
} as const;

export const UnitAction = {
  ...BaseAction,
  Clone:                        'Clone',
  LinkSubmission:               'LinkSubmission',
  UnlinkSubmission:             'UnlinkSubmission',
  Setting:                      'Setting',
  ReadSubmissionAnswer:         'ReadSubmissionAnswer',
  UpdateSubmissionAnswer:       'UpdateSubmissionAnswer',
  DeleteSubmissionAnswer:       'DeleteSubmissionAnswer',
  ChangeSubmissionAnswerStatus: 'ChangeSubmissionAnswerStatus',
  RevealSubmissionAnswer:       'RevealSubmissionAnswer',
  ExportSubmissionAnswerCsv:    'ExportSubmissionAnswerCsv',
} as const;
```

여기서 Unit의 Action 목록이 꽤 많다는 걸 눈치챘을 것이다.
`ReadSubmissionAnswer`, `RevealSubmissionAnswer` 같은 SubmissionAnswer 관련 Action들이 Unit에 포함되어 있다.
이건 설계 원칙에서 비롯된 결과인데 바로 다음 섹션에서 이유를 설명한다.

---

## Action 설계 원칙

Subject가 "어떤 자원인가"를 정한다면 Action은 "그 자원에 무엇을 할 수 있는가"를 정한다.
이 Action을 설계하면서 개인적으로는 크게 두 가지 원칙을 세웠다.

### Create-to-Parent 원칙

리소스 생성 Action은 해당 리소스가 아닌 **부모 Subject**에 귀속된다.

| 생성 대상 | Action 위치 | 이유 |
|---|---|---|
| Course | `SpaceAction.CreateCourse` | Space에서 코스를 만든다 |
| Unit | `CourseAction.CreateUnit` | Course에서 유닛을 만든다 |
| Submission | `SpaceAction.CreateSubmission` | Space에서 지원서를 만든다 |

리소스 생성 시점에는 해당 리소스가 아직 존재하지 않기 때문에 부모에서 판단하는 것이 자연스럽다.
AWS IAM에서 `s3:CreateBucket`이 Bucket이 아닌 S3 서비스에 귀속되는 것과 같은 원리다.

### Context-Centric 원칙

SubmissionAnswer(지원서 응답) 관련 Action은 **접근 컨텍스트인 Unit**에 귀속된다.

```typescript
// SubmissionAnswer를 독립 Subject로 두지 않는다.
// SA 조회/수정/삭제/상태변경/열람/CSV 내보내기 모두 UnitAction.* 으로 정의된다.
UnitAction.ReadSubmissionAnswer
UnitAction.UpdateSubmissionAnswer
UnitAction.RevealSubmissionAnswer    // 개인정보 마스킹 해제
UnitAction.ExportSubmissionAnswerCsv
```

Unit에 대한 권한이 SA 접근 권한을 결정하는 구조이기 때문인데, SA를 별도 Subject로 분리하면 오히려 권한 체계가 복잡해진다.

이 두 원칙 덕분에 Subject별 Action 집합이 각 Subject의 역할을 명확하게 반영하게 됐다.
Unit EDITOR가 SubmissionAnswer 관련 Action을 여럿 포함하는 이유도, Course EDITOR는 그렇지 않은 이유도 여기에 있다.

---

## Level과 LEVEL_POLICY_MAP 설계

```typescript
export const Level = {
  VIEWER: 'VIEWER',
  MEMBER: 'MEMBER',
  EDITOR: 'EDITOR',
  ADMIN:  'ADMIN',
} as const;

const LEVEL_POLICY_MAP = {
  [Subject.Course]: {
    [Level.VIEWER]: [CourseAction.Read],
    [Level.MEMBER]: [CourseAction.Read, CourseAction.Update],
    [Level.EDITOR]: [
      CourseAction.Read, CourseAction.Update,
      CourseAction.Clone, CourseAction.CreateUnit,
    ],
    [Level.ADMIN]: [
      CourseAction.Read, CourseAction.Update, CourseAction.Delete,
      CourseAction.Clone, CourseAction.Setting, CourseAction.Restore,
      CourseAction.CreateUnit,
    ],
  },
  // Space, Unit, Submission, Template도 동일 구조
};
```

DB에는 `level: "EDITOR"` 만 저장되고, 런타임에 이 상수에서 실제 PolicyRule을 생성한다.
Level 체계를 바꿔야 할 때 이 파일만 수정하면 전체에 반영되기 때문에 DB 마이그레이션이 필요 없다는 게 이 설계의 핵심이었다.

**Space ADMIN 정적 상속 — 설계 예외**: Space ADMIN은 하위 Course/Unit/Submission/Template 전체에 자동 접근된다.
Space를 관리하는 ADMIN이 그 안의 Course를 하나하나 수동으로 권한 부여받아야 한다면 ADMIN의 의미가 없다.

---

## DB에는 Level만, Action 목록은 코드에: 세 가지 설계 결정의 이유

첫 번째는 **DB에는 Level만 저장한다는 것이다.**
실제 허용 Action 목록은 코드 상수(`LEVEL_POLICY_MAP`)에서 관리하기 때문에 Level 체계가 바뀌어도 코드 수정만으로 전체에 반영된다.
DB를 스키마 변경 없이 두면서도 권한 로직을 유연하게 관리할 수 있다는 게 핵심이었다.

두 번째는 **권한 부여 경로를 두 가지로 분리**한 것이다.
ResourcePermission(Level 기반)과 PolicyOverride(비즈니스 예외)가 그것이다.
Level 하나로 모든 케이스를 커버하려다 보면 예외를 처리하기 위해 Level 외 다른 플래그를 추가하게 되기 때문에 예외는 예외답게 별도 경로로 두는 게 더 깔끔하다고 판단했다.

세 번째는 **API 요청을 2단계로 검증**하는 것이다.
Guard에서 규칙 존재 여부를, Service에서 실제 리소스 Condition을 검증하는 방식인데, 이 구현의 세부 내용은 2편에서 설명한다.

한 가지 더 짚어두자. 생성자 소유권을 Condition(`createdUserId`)으로 처리하지 않고 ResourcePermission으로 처리한 이유다.
Condition으로 처리하면 소유권 이전 시 기존 Condition을 갱신해야 해서 구조가 복잡해지고, 특정 권한만 부분 회수하는 것도 불가능해진다.
결정적으로는 권한의 출처를 추적하기 어려워지는데, ResourcePermission에 기록하면 "이 사용자가 이 리소스에 어떤 경로로 권한을 얻었는가"가 항상 명확하기 때문이다.

---

## 마치며: 설계가 머릿속에서 맞아떨어지는 걸 처음 느낀 순간

처음 이 권한 문제를 마주했을 때는 RBAC를 조금 손보면 될 것 같았다.
역할 몇 개 추가하고 조건 분기 몇 군데 추가하면 끝날 줄 알았다.

하지만 요구 사항을 뜯어보니 기존 방식으로 쉽게 풀 수 있는 문제가 아니었다.
같은 Space 안에서도 Course마다 각기 다른 권한으로 접근하고, 같은 역할을 가진 두 사람이 서로 다른 행동을 할 수 있어야 했다. RBAC의 "역할을 부여하면 그 역할의 권한을 전부 갖는다"는 전제 자체가 이 요구사항과 맞지 않았다.

그래서 Level 프리셋 기반으로 운영 편의성을 챙기고, PolicyOverride로 예외 표현력을 확보하고, CASL로 집행 레이어를 담당하는 구조를 잡았다.

이 구조를 처음 종이에 그려봤을 때 "아, 이건 되겠다"는 느낌이 왔다! 실제로 팀 내에서 Confirm 도 받았다.
물론 그 느낌이 실제 구현에서도 유지됐는지는 2편에서 마저 작성하겠다.
