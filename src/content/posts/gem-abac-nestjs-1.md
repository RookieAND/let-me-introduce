> 처음에는 단순한 외부 관리자 권한 문제라고 생각했다. 요구사항을 뜯어보면서 "이거 기존 방식으로는 안 되겠다"는 걸 느꼈다.

## GEM 서비스의 계층 구조

들어가기 전에 GEM의 기본 구조를 먼저 짚고 가자. 권한 얘기를 하려면 어떤 Resource가 있는지 알아야 하기 때문이다.

GEM은 **Space → Course → Unit** 이라는 계층 구조를 가진다.

- **Space**: 최상위 공간. 사업 단위 혹은 교육 프로그램 단위로 생성된다. 하위에 여러 Course를 포함한다.
- **Course**: 교육 과정. Space 내에서 구성되며, 하위에 여러 Unit을 포함한다.
- **Unit**: 학습 단위. Course 내의 개별 콘텐츠나 활동을 나타낸다.

이 외에 **Submission**(학습자가 제출한 결과물)과 **Template**(재사용 가능한 Unit 구성)도 권한 관리 대상이다.

계층 구조가 있기는 하지만 **권한은 각 Resource별로 독립적으로 관리된다.** Space에 접근 권한이 있다고 해서 하위 Course에 자동으로 접근되지 않는다. 단 하나의 예외가 있는데, 이건 나중에 다룬다.

---

## 도화선이 된 요구사항

합격자 EDU 초대 자동화 프로젝트가 시작되면서 이런 요구사항이 들어왔다.

> "외부 관리자(컨소시엄 관리자, 교강사)가 GEM에 직접 접근할 수 있어야 한다."

세부 조건은 이랬다.

- **컨소시엄 관리자**: 본인이 담당하는 Course만 관리 가능. 담당 기간이 끝나면 권한 즉시 회수.
- **교강사**: 담당 Course 조회는 가능하지만, 지원자 개인정보 마스킹 해제는 불가.

겉으로 보면 단순해 보이는데 뜯어보면 문제가 생긴다. 이 두 유형이 동시에 같은 Course에 배정될 수 있다.

같은 Course를 보지만 허용된 행동이 다르고, 열람 가능한 정보 범위도 다르다. 기존 권한 시스템에 맞춰보려고 했는데, 즉시 막혔다.

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

## ABAC, 그리고 엄밀히는 무엇인가?

ABAC(Attribute-Based Access Control)는 사용자·리소스·환경의 **속성(Attribute)** 을 동적으로 평가해서 권한을 결정하는 방식이다.

근데 우리가 만든 게 순수 ABAC냐 하면 솔직히 조금 다르다. 순수 ABAC는 속성값을 동적으로 조합해서 평가하는데, 우리 시스템에는 **Level이라는 역할 추상화가 중간에 존재한다.**

운영자는 드롭다운에서 Level을 선택하고, 시스템이 런타임에 CASL PolicyRule로 변환해서 ABAC 방식으로 집행한다.

엄밀히 말하면 **리소스 스코프 RBAC + ABAC 집행 레이어의 하이브리드**다. (물론 ABAC라고 불러도 틀린 건 아니다 — CASL은 ABAC 패턴을 구현하고, 핵심 문제도 ABAC 방식으로 해결했으니까)

왜 순수 ABAC 대신 Level 추상화를 뒀느냐. 운영자가 개별 PolicyRule을 직접 건드리게 하면 휴먼 에러 위험이 너무 높다. Level이라는 프리셋을 두고, Level로 표현하기 어려운 예외 케이스만 PolicyOverride로 처리하는 구조가 현실적이었다.

---

## CASL을 선택한 이유

1. **TypeScript를 네이티브로 지원하고 `can(action, subject)` 문법이 직관적이다.** NestJS Guard와 Service 레이어에 자연스럽게 녹아드는 구조고, 인터페이스가 깔끔해서 미들웨어를 끼워 넣기도 수월하다.
2. **Condition 기반 평가를 지원한다.** `can('Update', 'Course', { id: 'course-7' })` 처럼 특정 리소스 속성 조건까지 포함한 권한 체크가 가능하다. 이게 없었으면 "이 사용자가 이 Course를 수정할 수 있는가"를 매번 서비스 코드에서 수동으로 판단해야 했을 것이다.

---

## 핵심 설계 원칙

1. **DB에는 Level만 저장한다.** 실제 허용 Action 목록은 코드 상수(`LEVEL_POLICY_MAP`)에서 관리한다. Level 체계가 바뀌어도 DB 마이그레이션 없이 코드 수정만으로 전체에 반영된다.
2. **권한 부여 경로는 두 가지다.** ResourcePermission(Level 기반)과 PolicyOverride(비즈니스 예외).
3. **API 요청은 2단계로 검증한다.** (2편에서 상세 설명)

---

## Subject / Action 상수 설계

`enum` 대신 `as const` 패턴을 선택했다.

> `enum` 대신 `as const` 패턴을 선택했다.

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

Subject별로 Action을 따로 정의한 이유가 있다. Space에는 `Invite`, `Setting` 같은 고유 Action이 있고, Unit에는 `Clone`, `LinkSubmission`이 있다. 하나의 공통 Action 집합으로 합치면 "Course에 Invite Action을 사용"하는 실수를 타입 레벨에서 막기 어려워진다.

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

DB에는 `level: "EDITOR"` 만 저장되고, 런타임에 이 상수에서 실제 PolicyRule을 생성한다. Level 체계를 바꿔야 할 때 이 파일만 수정하면 전체에 반영된다.

**Space ADMIN 정적 상속 — 설계 예외**: Space ADMIN은 하위 Course/Unit/Submission 전체에 자동 접근된다. Space를 관리하는 ADMIN이 그 안의 Course를 하나하나 수동으로 권한 부여받아야 한다면 ADMIN의 의미가 없다.

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

이 부분만큼은 진짜 ABAC다. PolicyOverride는 개발자가 직접 제어하는 것으로 정책을 결정했다. 일반 UI에서는 생성/수정이 불가하다.

---

## Conclusion

결국 설계의 핵심은 "어떻게 하면 운영자가 쉽게 쓸 수 있으면서도 리소스 단위 세밀한 권한 제어가 가능한가"였다.

Level 추상화로 운영 편의성을 챙기고, PolicyOverride로 예외 표현력을 확보하고, CASL로 집행 레이어를 담당하는 구조가 그 답이었다.

2편에서는 실제 API 요청이 들어왔을 때 이 권한 체계가 어떻게 검증되는지를 다룬다.
