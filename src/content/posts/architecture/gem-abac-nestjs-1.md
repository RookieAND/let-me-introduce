> 처음에는 단순한 외부 관리자 권한 문제라고 생각했다. 요구사항을 뜯어보면서 "이거 기존 방식으로는 안 되겠다"는 걸 느꼈다.

## GEM 서비스가 어떻게 생겼는지 먼저 알아야 한다

권한 얘기를 하기 전에 GEM의 구조를 먼저 짚어야 한다.
어떤 Resource가 있고 어떻게 계층을 이루는지부터 잡아두지 않으면 이후 설계 이야기가 맥락 없이 느껴진다.

GEM은 **Space → Course → Unit** 이라는 계층 구조를 가진다.

- **Space**: 최상위 공간. 사업 단위 혹은 교육 프로그램 단위로 생성된다. 하위에 여러 Course를 포함한다.
- **Course**: 교육 과정. Space 내에서 구성되며, 하위에 여러 Unit을 포함한다.
- **Unit**: 학습 단위. Course 내의 개별 콘텐츠나 활동을 나타낸다.

이 외에 **Submission**(학습자가 제출한 결과물)과 **Template**(재사용 가능한 Unit 구성)도 권한 관리 대상이다.

계층 구조가 있기는 하지만 **권한은 각 Resource별로 독립적으로 관리된다.**
Space에 접근 권한이 있다고 해서 하위 Course에 자동으로 접근되지 않는다.
단 하나의 예외가 있는데, 이건 나중에 다룬다.

이 구조가 권한 문제를 복잡하게 만드는 핵심이다.
같은 Space 안에 있더라도 Course마다 허용된 사람과 허용된 행동이 달라야 했고,
단순한 역할 기반 제어로는 이 요구사항을 감당하기 어렵다는 걸 이 시점에 이미 어느 정도 예상하고 있었다.

---

## 도화선이 된 요구사항

합격자 EDU 초대 자동화 프로젝트가 시작되면서 이런 요구사항이 들어왔다.

> "외부 관리자(컨소시엄 관리자, 교강사)가 GEM에 직접 접근할 수 있어야 한다."

세부 조건은 이랬다.

- **컨소시엄 관리자**: 본인이 담당하는 Course만 관리 가능. 담당 기간이 끝나면 권한 즉시 회수.
- **교강사**: 담당 Course 조회는 가능하지만, 지원자 개인정보 마스킹 해제는 불가.

겉으로 보면 단순해 보이는데 뜯어보면 문제가 생긴다.
이 두 유형이 동시에 같은 Course에 배정될 수 있다.

같은 Course를 보지만 허용된 행동이 다르고, 열람 가능한 정보 범위도 다르다.
기존 권한 시스템에 맞춰보려고 했는데, 즉시 막혔다.

---

## 기존 RBAC의 구조적 한계

기존 GEM 서버는 RBAC 기반 권한 처리를 사용해왔다.

```
MANAGER 역할 → Space 전체에 관리 권한
VIEWER 역할  → Space 전체에 열람 권한
```

문제가 세 가지였다.

1. **리소스 단위 접근 제어가 불가능하다.** "컨소시엄 관리자는 Course A만 관리 가능, Course B는 접근조차 불가"를 표현할 방법이 없다. MANAGER 역할을 부여하면 Space 내 모든 리소스에 관리 권한이 일괄 적용된다.
2. **같은 역할이라도 허용 범위가 달라야 하는 케이스를 처리할 수 없다.** 컨소시엄 관리자와 교강사는 둘 다 외부에서 접근하는 관리자인데 마스킹 해제 권한이 달라야 한다.
3. **권한 변경 시 영향 범위를 예측하기 어렵다.** 외부 관리자에게 잘못된 권한이 부여되면 개인정보 보안 이슈로 직결된다.

---

## PBAC, 그리고 엄밀히는 무엇인가?

PBAC(Policy-Based Access Control)는 "누가 무엇을 어떤 조건에서 할 수 있는가"를 **Policy Rule** 로 선언하고, 런타임에 그 규칙을 평가해서 권한을 결정하는 방식이다.

근데 우리가 만든 게 운영자가 PolicyRule을 직접 정의하는 형태냐 하면 솔직히 조금 다르다.
우리 시스템에는 **Level이라는 프리셋 추상화가 중간에 존재한다.**

운영자는 드롭다운에서 Level을 선택하고, 시스템이 런타임에 CASL PolicyRule로 변환해서 집행한다.

엄밀히 말하면 **Level 프리셋 기반 PBAC**다. PolicyRule을 직접 건드리는 대신, 미리 정의된 정책 집합 중 하나를 고르는 구조다. (물론 PBAC라고 불러도 틀린 건 아니다 — 결국 PolicyRule이 접근을 제어하고, 핵심 문제도 Policy 선언으로 해결했으니까)

왜 직접 PolicyRule 대신 Level 추상화를 뒀느냐.
운영자가 개별 PolicyRule을 직접 건드리게 하면 휴먼 에러 위험이 너무 높다.
Level이라는 프리셋을 두고, Level로 표현하기 어려운 예외 케이스만 PolicyOverride로 처리하는 구조가 현실적이었다.

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
권한 규칙이 코드에 선언되고, 서비스는 그냥 `assertCan` 한 줄만 호출하면 된다는 게
설계를 단순하게 유지할 수 있었던 이유다.

다른 라이브러리를 쓰지 않은 건 사실 단순하다.
CASL이 위 두 조건을 이미 충족했고, 그것만으로도 충분했다. (추가 의존성은 적을수록 좋다)

---

## 핵심 개념 네 가지 — Level · PolicyRule · ResourcePermission · PolicyOverride

설계 이야기로 들어가기 전에, 이 시스템을 이루는 핵심 개념들을 먼저 잡아두자.
코드가 나오기 전에 이 개념들이 머릿속에 잡혀있어야 흐름이 끊기지 않는다.

### Level — 운영자가 선택하는 권한 등급

운영자가 사용자에게 부여하는 권한의 등급이다. 네 가지 고정값을 가진다.

| Level | 등급 | 의미 |
|-------|------|------|
| ADMIN | 4 | 모든 Action + 멤버 초대·설정 관리. 소유자 수준 |
| EDITOR | 3 | CRUD 전반 가능. 설정·초대 불가 |
| MEMBER | 2 | 조회 + 제한적 기능. Subject별로 허용 범위가 다르다 |
| VIEWER | 1 | 읽기 전용 |

포함 관계는 `ADMIN ⊃ EDITOR ⊃ MEMBER ⊃ VIEWER`다.

중요한 건, 같은 Level이라도 Subject마다 허용되는 Action이 다르다.
Course EDITOR와 Unit EDITOR가 할 수 있는 행동이 완전히 같지 않다.
이 매핑은 코드 상수 `LEVEL_POLICY_MAP`에서 관리한다.

DB에는 이 Level 값만 저장된다. 실제 허용 Action 목록은 런타임에 코드 상수에서 확장한다.

### PolicyRule — CASL이 실제로 평가하는 단위

"어떤 Subject의, 어떤 Resource에, 어떤 Action을, 허용/거부한다"를 표현하는 단위이고, CASL이 실제로 평가하는 게 이 구조다.

```json
{
  "effect": "Allow",
  "subject": "Course",
  "actions": ["Read", "Update", "Clone", "CreateUnit"],
  "resources": ["course-7"]
}
```

DB에는 저장되지 않는다.
Level이 DB에 저장되고, 런타임에 이 PolicyRule 배열로 확장된다.
이 확장을 처리하는 `expandLevelToRules` 구현은 2편에서 다룬다.

### ResourcePermission — Level 기반 권한을 저장하는 곳

"누가, 어떤 Resource에, 어떤 Level을 가지는가"를 저장하는 컬렉션이다.
대부분의 권한이 이 경로로 부여된다.

```json
{
  "userId": "user-a",
  "subject": "Course",
  "resourceId": "course-7",
  "spaceId": "space-1",
  "level": "EDITOR"
}
```

| 필드 | 설명 |
|------|------|
| `userId` | 권한을 부여받은 사용자 |
| `subject` | 어떤 종류의 Resource인지 (Course, Unit, ...) |
| `resourceId` | 어떤 구체적 Resource인지 (course-7, ...) |
| `spaceId` | 어떤 Space 내에서의 권한인지 (범위 조회용) |
| `level` | 어떤 등급인지 (VIEWER ~ ADMIN) |

`userId + subject + resourceId` 조합이 고유 키다.
한 사람이 Course A는 EDITOR, Course B는 VIEWER이면 ResourcePermission이 2건 존재하고,
런타임에 각각의 PolicyRule[]로 합산된다.

### PolicyOverride — Level로 표현할 수 없는 예외를 위해

Level 네 개로 표현하지 못하는 케이스가 반드시 생긴다.
그 예외만 처리하는 커스텀 규칙이 PolicyOverride다.
상세 내용은 아래 PolicyOverride 섹션에서 다룬다.

---

흐름을 정리하면 이렇다.
운영자는 **Level** 하나만 선택한다 → **ResourcePermission**에 저장된다 → 런타임에 **PolicyRule[]** 로 확장된다 → CASL이 평가한다.
Level로 표현하기 어려운 예외는 **PolicyOverride**로 처리한다.

---

## DB에는 Level만, Action 목록은 코드에: 세 가지 설계 결정의 이유

이 설계에서 의식적으로 내린 결정이 세 가지 있다.
각각 이유가 있어서 짚어두고 싶다.

첫 번째는 **DB에는 Level만 저장한다는 것**이다.
실제 허용 Action 목록은 코드 상수(`LEVEL_POLICY_MAP`)에서 관리한다.
Level 체계가 바뀌어도 DB 마이그레이션 없이 코드 수정만으로 전체에 반영된다.
DB를 스키마 변경 없이 두면서도 권한 로직을 유연하게 관리할 수 있다는 게 핵심이었다.

두 번째는 **권한 부여 경로를 두 가지로 분리**한 것이다.
ResourcePermission(Level 기반)과 PolicyOverride(비즈니스 예외)가 그것이다.
Level 하나로 모든 케이스를 커버하려다 보면 Level 체계가 점점 복잡해지거나, 예외를 처리하기 위해 Level 외 다른 플래그를 추가하게 된다.
예외는 예외답게 별도 경로로 두는 게 더 깔끔하다고 판단했다.

세 번째는 **API 요청을 2단계로 검증**하는 것이다.
Guard에서 규칙 존재 여부를, Service에서 실제 리소스 Condition을 검증한다.
이 구현의 세부 내용은 2편에서 설명한다.

---

## Subject / Action 상수 설계

`enum` 대신 `as const` 패턴을 선택했다.

- TypeScript의 `enum`은 양방향 매핑으로 인한 Tree-Shaking 문제, 명목적 타이핑으로 인한 호환성 문제가 있다.
- `as const`는 string literal union 타입으로 추론되어 타입 안전하면서도 가볍다.

```typescript
export const Subject = {
  Space: 'Space',
  Course: 'Course',
  Unit: 'Unit',
  Submission: 'Submission',
  Template: 'Template',
} as const;

export type Subject = (typeof Subject)[keyof typeof Subject];

const BaseAction = {
  Create: 'Create', Read: 'Read', Update: 'Update', Delete: 'Delete',
} as const;

// Subject별로 Action을 따로 정의한다
export const SpaceAction  = { ...BaseAction, Invite: 'Invite',  Setting: 'Setting' } as const;
export const CourseAction = { ...BaseAction, Setting: 'Setting' } as const;
export const UnitAction   = { ...BaseAction, Clone: 'Clone', LinkSubmission: 'LinkSubmission' } as const;
```

Subject별로 Action을 따로 정의한 이유가 있다.
Space에는 `Invite`, `Setting` 같은 고유 Action이 있고, Unit에는 `Clone`, `LinkSubmission`이 있다.
하나의 공통 Action 집합으로 합치면 "Course에 Invite Action을 사용"하는 실수를 타입 레벨에서 막기 어려워진다.

---

## Level과 LEVEL_POLICY_MAP 설계

```typescript
export const Level = {
  VIEWER: 'VIEWER',  // 등급 1: 조회만
  MEMBER: 'MEMBER',  // 등급 2: 조회 + 제한적 기능
  EDITOR: 'EDITOR',  // 등급 3: CRUD 전반
  ADMIN:  'ADMIN',   // 등급 4: 모든 Action + 설정/멤버 관리
} as const;

const LEVEL_POLICY_MAP = {
  [Subject.Course]: {
    [Level.VIEWER]: [CourseAction.Read],
    [Level.EDITOR]: [
      CourseAction.Create, CourseAction.Read,
      CourseAction.Update, CourseAction.Delete,
    ],
    [Level.ADMIN]: [
      CourseAction.Create, CourseAction.Read, CourseAction.Update,
      CourseAction.Delete, CourseAction.Setting,
    ],
  },
  // Space, Unit, Submission, Template도 동일 구조
};
```

이 매핑이 코드에 있다는 게 핵심이다.

DB에는 `level: "EDITOR"` 만 저장되고, 런타임에 이 상수에서 실제 PolicyRule을 생성한다.
Level 체계를 바꿔야 할 때 이 파일만 수정하면 전체에 반영된다.

**Space ADMIN 정적 상속 — 설계 예외**: Space ADMIN은 하위 Course/Unit/Submission 전체에 자동 접근된다.
Space를 관리하는 ADMIN이 그 안의 Course를 하나하나 수동으로 권한 부여받아야 한다면 ADMIN의 의미가 없다.

---

## PolicyOverride — Level로 표현할 수 없는 예외

Level 체계로 처리하기 어려운 케이스가 있다.

- 외부 심사위원 → 지원서 CSV export는 가능하지만, 그 외 Action은 불가
- 특정 유저 → Course-7 삭제 차단 (다른 Course는 EDITOR 권한 그대로 유지)

```json
{
  "userId": "user-a",
  "spaceId": "space-1",
  "rules": [
    { "effect": "Allow", "subject": "Unit",   "actions": ["ExportSubmissionAnswerCsv"], "resources": ["*"] },
    { "effect": "Deny",  "subject": "Course", "actions": ["Delete"],                  "resources": ["course-7"] }
  ]
}
```

이 부분만큼은 진짜 PBAC다.
PolicyOverride는 개발자가 직접 제어하는 것으로 정책을 결정했다.
일반 UI에서는 생성/수정이 불가하다.

---

## AbilityFactory — 두 경로가 만나는 곳

ResourcePermission에서 오는 Level 기반 권한과 PolicyOverride에서 오는 커스텀 규칙,
이 두 경로가 합쳐지는 지점이 `AbilityFactory`다.

```typescript
class AbilityFactory {
  buildAbility({
    permissions,  // ResourcePermission[] — Level 기반
    overrides,    // PolicyOverride — 커스텀 규칙
  }): AppAbility {
    const levelRules    = this.expandLevelToRules(permissions);
    const overrideRules = overrides?.rules ?? [];
    return this.createFromRules([...levelRules, ...overrideRules]);
  }
}
```

`expandLevelToRules`가 각 ResourcePermission을 받아서 Level에 맞는 PolicyRule 배열로 변환한다.
이 구현의 세부 내용은 2편에서 다룬다.

---

## 마치며: 설계가 머릿속에서 맞아떨어지는 걸 처음 느낀 순간

처음 이 권한 문제를 마주했을 때는 RBAC를 조금 손보면 될 것 같았다.
역할 몇 개 추가하고, 조건 분기 몇 군데 추가하면 끝날 줄 알았다.

뜯어보니 그게 아니었다.
같은 Space 안에서도 Course마다 다른 사람이 다른 권한으로 접근하고,
같은 역할을 가진 두 사람이 서로 다른 행동을 할 수 있어야 했다.
RBAC의 "역할을 부여하면 그 역할의 권한을 전부 갖는다"는 전제 자체가 이 요구사항과 맞지 않았다.

그래서 Level 프리셋 기반으로 운영 편의성을 챙기고,
PolicyOverride로 예외 표현력을 확보하고,
CASL로 집행 레이어를 담당하는 구조를 잡았다.

이 구조를 처음 종이에 그려봤을 때 "아, 이건 되겠다"는 느낌이 왔다.
물론 그 느낌이 실제 구현에서도 유지됐는지는 2편에서 확인할 수 있다.
