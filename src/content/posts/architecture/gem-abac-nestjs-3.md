> 설계와 구현은 끝났다. 이제 기존 시스템을 갈아엎어야 한다. 사실 이 단계가 가장 긴장됐다. 이미 운영 중인 시스템에 손을 대는 거니까.

## 배포 전에 먼저 해결해야 했던 두 가지

본격적인 마이그레이션 작업을 시작하기 전에 두 가지를 먼저 해결해야 했는데, 그냥 배포하면 기존 사용자 접근이 전부 깨지기 때문이다.

---

## 리소스 생성 시 권한을 자동으로 부여하기 — CQRS CommandBus 활용

새 시스템에서 리소스를 생성하면 생성자에게 ADMIN 권한이 자동으로 부여되어야 한다.

처음에는 Service 로직에 직접 권한 부여 코드를 넣으려고 했다.
그런데 이렇게 하면 권한 부여 코드가 생성 Service마다 흩어지고, 새 Subject가 추가될 때마다 해당 Service를 수정해야 하는 구조가 된다.

그 시점에 CQRS의 `CommandBus`가 눈에 들어왔다.
GEM은 이미 CQRS 패턴을 일부 도입하고 있었는데, 사실 그때까지 `CommandBus`를 "이벤트 발행용 도구" 정도로만 쓰고 있었다.
그런데 이 구조를 보고 나서야 — 생성 Service는 커맨드만 발행하고, 권한 부여 로직은 핸들러 한 곳에 모아두면 된다는 걸 처음으로 제대로 이해했다. (이제까지 왜 이걸 안 썼지 싶었다)

리소스 생성 후 `AssignCreatorAdminCommand`를 발행하면, 이 커맨드를 처리하는 핸들러가 권한 부여를 전담한다.

```typescript
// Space 생성 Service
async createSpace(userId: string, dto: CreateSpaceDto) {
  const space = await this.spaceRepository.create({ ...dto, creatorId: userId });

  await this.commandBus.execute(
    new AssignCreatorAdminCommand({
      userId,
      subject: Subject.Space,
      resourceId: space.id,
      spaceId: space.id,
    })
  );

  return space;
}

// 커맨드 핸들러 (모든 Subject 생성에 공통 적용)
@CommandHandler(AssignCreatorAdminCommand)
class AssignCreatorAdminHandler implements ICommandHandler {
  async execute({ userId, subject, resourceId, spaceId }) {
    await this.resourcePermissionRepo.findOneAndUpdate(
      { userId, subject, resourceId },
      { $set: { level: Level.ADMIN, spaceId } },
      { upsert: true, new: true },
    );
  }
}
```

새 Subject가 추가될 때는 해당 Service에서 같은 커맨드를 발행하면 끝이고, 권한 부여 로직은 핸들러 한 곳에만 있으니 수정이 필요해도 거기만 건드리면 된다.
레코드가 이미 존재하더라도 upsert로 처리하기 때문에 중복 생성 없이 안전하다.

---

## LazyPermissionService — 마이그레이션 스크립트를 믿지 않기로 한 이유

새 시스템을 배포하면 기존 사용자들에게 ResourcePermission이 없어서 접근할 때마다 권한 없음으로 차단된다.

처음에는 마이그레이션 스크립트가 모든 사용자의 권한을 사전에 완벽하게 생성해둬야 한다고 생각했는데, 이론적으로는 맞는 말이었다.
그런데 실제로 해보니까, 기존 데이터 구조와 새 구조 사이에 1:1로 대응되지 않는 엣지 케이스가 반드시 있었다.
스크립트 실행 후에도 "이 사용자는 왜 접근이 안 되는가"를 개별적으로 추적해야 하는 상황이 생길 게 뻔했다.

그래서 Lazy 생성 전략을 도입했다.
ResourcePermission이 없는 사용자가 접근하면 스크립트에서 미처 처리하지 못한 케이스로 간주하고, 기존 SpaceUser 데이터를 기반으로 기본 권한을 자동으로 생성한다.

마이그레이션 스크립트의 완성도 요건 자체가 낮아지니까, 불완전한 스크립트와 Lazy 생성을 조합하는 쪽이 완벽한 스크립트 하나보다 실제로는 훨씬 안전하다는 걸 이 과정에서 배웠다.

---

## 기존 SpaceUser → ResourcePermission 마이그레이션

기존 시스템에는 `SpaceUser` 컬렉션이 있었는데, `userId + spaceId + role` 구조로 저장된 이 데이터를 `ResourcePermission`으로 변환해야 했다.

마이그레이션 전략을 두 가지로 검토했다.

- **옵션 A: 일괄 마이그레이션** — 배포 전에 모든 SpaceUser를 ResourcePermission으로 변환하는 스크립트를 실행한다. 단순하지만 데이터가 많으면 배포 전 오랜 시간이 걸리고 실패 시 롤백도 복잡해진다.
- **옵션 B: 점진적 마이그레이션 (채택)** — 새 시스템 배포 후 기존 SpaceUser 데이터를 백그라운드에서 순차적으로 변환한다. 배포와 마이그레이션이 분리되어 안전하다. LazyPermissionService와 함께 쓰면 변환이 완료되지 않은 사용자도 첫 접근 시 자동 처리된다.

```typescript
async function migrateSpaceUsersToResourcePermissions() {
  const spaceUsers = await SpaceUser.find({});

  for (const spaceUser of spaceUsers) {
    const level = mapRoleToLevel(spaceUser.role); // MANAGER → ADMIN, etc.

    await ResourcePermission.upsert({
      userId: spaceUser.userId,
      subject: Subject.Space,
      resourceId: spaceUser.spaceId,
      spaceId: spaceUser.spaceId,
      level,
    });
  }
}
```

기존 역할과 새 Level이 1:1로 대응되지 않는 케이스가 있었기 때문에 역할(Role) → Level 매핑 테이블을 먼저 정의하는 게 핵심이었다.

예를 들어 기존 MANAGER 역할은 새 시스템의 ADMIN과 EDITOR 사이 어딘가에 해당했는데, 어느 쪽으로 맞출지는 기술적인 문제가 아니라 비즈니스 판단의 문제였다.
이런 결정 하나하나를 기획팀과 확인하면서 진행했고, 결국 매핑 테이블 완성에만 하루 이상을 썼다.

---

## PermissionCommandService — 권한 관리의 단일 창구

마이그레이션 스크립트가 실행된 이후, 일상적인 권한 부여/회수는 `PermissionCommandService`를 통해 이루어진다.

```typescript
// 권한 부여
async assignLevel({ userId, subject, resourceId, spaceId, level }) {
  await this.resourcePermissionRepo.findOneAndUpdate(
    { userId, subject, resourceId },
    { $set: { level, spaceId } },
    { upsert: true, new: true },
  );
  this.abilityClsService.invalidateAbility();
}

// 권한 회수
async revokeLevel({ userId, subject, resourceId }) {
  await this.resourcePermissionRepo.softDeleteOne({ userId, subject, resourceId });
  this.abilityClsService.invalidateAbility();
}
```

권한을 변경한 직후 해당 요청 내에서 Ability가 재빌드되도록 보장하는 게 `invalidateAbility()` 호출인데, 외부 관리자 권한을 즉시 회수해야 하는 케이스에서 이 한 줄이 없으면 같은 요청 내에서 캐시된 Ability가 여전히 유효한 상태로 남는다.

권한 삭제는 하드 딜리트가 아니라 소프트 딜리트인데, 권한 이력 추적과 빠른 롤백을 위해서다. 잘못 회수된 경우 `restoreMany`로 복구할 수 있다.

---

## 컨트롤러 Guard 교체 — Subject 단위로 점진적으로

기존 Guard를 한 번에 교체하면 회귀 테스트 범위가 너무 넓어지기 때문에 Subject 단위로 컨트롤러를 순서대로 교체했다.

```
Phase 5-1: RoleGuard에 Ability 빌드 통합 (기존 Guard + 새 Guard 공존)
Phase 5-2: Space 컨트롤러 → @CheckAbility 교체
Phase 5-3: Course 컨트롤러 → @CheckAbility 교체
Phase 5-4: Unit 컨트롤러 → @CheckAbility 교체
```

Phase 5-1이 가장 까다로웠는데, 기존 RoleGuard가 실행되면서 동시에 새 Ability도 빌드해야 했기 때문이다.
이 시점에는 ResourcePermission이 없는 사용자가 대부분이라 Ability가 빈 상태로 빌드됐다.
LazyPermissionService와 연계해서 첫 접근 시 자동 생성 로직을 먼저 붙이고 나서야 기존 Guard와 새 Guard를 안전하게 공존시킬 수 있었다.

각 단계마다 해당 Subject의 E2E 테스트를 돌려서 회귀가 없는지 확인하고 넘어갔기 때문에, 한 Subject에서 문제가 생기면 그 Subject만 롤백하면 됐다.

---

## 프론트엔드에서 Ability를 사용하는 방법 — React + CASL

백엔드 배포가 마무리되자, 이제 남은 문제는 서버에서 빌드된 Ability를 프론트에서 어떻게 활용할 것인가였다.

서버는 이미 사용자별 PolicyRule[]을 만들어두고 있다. 프론트가 이 규칙 배열을 받아서 그대로 `createMongoAbility`에 넣으면 클라이언트 Ability가 완성되는 구조다.
프론트는 규칙을 직접 계산하지 않는다.

### API 설계 — ability 엔드포인트

서버는 인증된 사용자의 PolicyRule[]을 반환하는 엔드포인트를 제공한다.
응답으로 내려오는 데이터는 2편에서 살펴본 `AbilityFactory.build()`가 생성한 규칙 배열 그대로다.

```typescript
// GET /auth/my/ability 응답 예시
[
  { effect: "Allow", subject: "Course", actions: ["Read", "Update"], resources: ["course-7"] },
  { effect: "Allow", subject: "Course", actions: ["Read"], resources: ["course-12"] },
  { effect: "Deny",  subject: "Course", actions: ["Delete"], resources: ["course-7"] },
]
```

### AbilitySettings 컴포넌트 — 앱 최상단에 Ability 주입

이 규칙 배열을 받아 Ability 인스턴스를 만들고 Context로 앱 전체에 주입하는 게 `AbilitySettings` 컴포넌트의 역할이다.

```typescript
// apps/form/src/App/Ui/AbilitySettings/AbilitySettings.tsx
export function AbilitySettings({ children }: AbilitySettingsProps) {
  const { data: ruleList = [] } = useQuery({
    ...authQueries.myAbilityInfo(),
    select: (response) => response.data,
  });

  const ability = useMemo<AppAbility>(
    () => createMongoAbility<AppAbility>(ruleList),
    [ruleList],
  );

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}
```

`useMemo`로 Ability 인스턴스를 감싼 이유는 `ruleList`가 바뀔 때만 재생성하기 위해서다.
로그인 상태나 권한이 변경되면 `ruleList`가 갱신되고, 그 시점에 새 Ability가 만들어진다.

### Can 컴포넌트 — createContextualCan 한 줄

실제로 작성한 코드는 한 줄이다.

```typescript
// apps/form/src/Entities/Permission/Ui/Can/Can.tsx
export const Can = createContextualCan(AbilityContext.Consumer);
```

`@casl/react`의 `createContextualCan`이 Context를 구독하는 `Can` 컴포넌트를 만들어준다.
이 컴포넌트는 `ability.can(action, subject)`의 결과가 `true`일 때만 자식을 렌더링한다.

### SubjectFactory — spaceId를 함께 전달해야 하는 이유

`Can` 컴포넌트의 `this` prop에는 단순한 ID가 아니라 CASL이 조건을 평가할 수 있는 객체가 필요하다.
2편에서 살펴봤듯이, Space ADMIN 상속 규칙은 `conditions: { spaceId }`로 생성되기 때문에 프론트에서도 `spaceId`를 함께 전달해야 매칭이 이루어진다.

```typescript
// apps/form/src/Entities/Permission/Model/SubjectFactory.ts
export const createCourseSubject = ({ courseId, spaceId }) =>
  caslSubject(SUBJECT.Course, { id: courseId, spaceId });

export const createSpaceSubject = ({ spaceId }) =>
  caslSubject(SUBJECT.Space, { id: spaceId });

export const createUnitSubject = ({ unitId, spaceId }) =>
  caslSubject(SUBJECT.Unit, { id: unitId, spaceId });
```

`spaceId`를 빠뜨리고 `{ id: courseId }`만 넘기면 Space ADMIN인데 접근이 안 되는 버그가 생긴다.
서버에서 만들어진 Ability의 조건과 프론트에서 넘기는 리소스 속성이 일치해야 평가가 제대로 이루어지기 때문이다.

### 실제 사용 패턴 — 선언적 UI 제어

```typescript
// apps/form/src/Features/Course/Ui/CourseDetailActionSelector/CourseDetailActionSelector.tsx
export function CourseDetailActionSelector({ courseId, title, description }) {
  const { spaceId } = useParams() as { spaceId: string };

  return (
    <HStack className="ml-auto">
      <Can I={COURSE_ACTION.Update} this={createCourseSubject({ courseId, spaceId })}>
        <PatchCourseFormDialog course={{ id: courseId, title, description }} />
      </Can>
      <Can I={COURSE_ACTION.Delete} this={createCourseSubject({ courseId, spaceId })}>
        <DeleteCourseConfirmDialog courseList={[{ id: courseId, title }]} />
      </Can>
    </HStack>
  );
}
```

컴포넌트 안에 조건 분기가 없다. `Can`으로 감싸기만 하면 Ability가 자동으로 평가해서 렌더링 여부를 결정한다.
권한 로직이 UI 코드에 섞이지 않기 때문에, 권한이 바뀌어도 이 컴포넌트를 건드릴 필요가 없다.

```typescript
// apps/form/src/Features/Space/Ui/SpaceDetailPermissionTabButton/SpaceDetailPermissionTabButton.tsx
export function SpaceDetailPermissionTabButton() {
  const { spaceId } = useParams() as { spaceId: string };

  return (
    <Can I={SPACE_ACTION.Setting} this={createSpaceSubject({ spaceId })}>
      <Tabs.Button value="permission">권한</Tabs.Button>
    </Can>
  );
}
```

Space `Setting` 권한이 있는 사용자에게만 "권한" 탭이 보이는 구조다.
서버 Guard가 API 접근을 막는 것과 별개로, 프론트에서도 버튼 자체를 숨김으로써 권한 없는 사용자가 UI에서 혼란을 겪지 않도록 한다.

### meetsMinPermissionLevel — CASL로 판단하기 어려운 케이스

CASL이 `can(action, subject)` 기반으로 동작하는 반면, 때로는 "이 사용자가 최소 EDITOR 이상인가"처럼 Level 자체를 비교해야 하는 상황이 생긴다.

```typescript
// apps/form/src/Entities/Permission/Model/meetsMinLevel.ts
export function meetsMinPermissionLevel(userLevel: Level, minLevel: Level): boolean {
  return LEVEL_PRIORITY[userLevel] >= LEVEL_PRIORITY[minLevel];
}
```

`LEVEL_PRIORITY`는 Level 이름을 숫자로 매핑한 상수다.

```typescript
const LEVEL_PRIORITY = {
  VIEWER: 1, MEMBER: 2, EDITOR: 3, ADMIN: 4,
};
```

CASL의 `can()`은 특정 Action에 대한 허용 여부를 평가하지만, 이 함수는 "등급 자체가 충분한가"를 평가한다.
두 도구가 다른 문제를 해결하기 때문에 함께 쓰인다.

---

## 테스트 전략 — 40케이스

테스트를 세 계층으로 설계했는데, CASL 핵심 로직은 단위 테스트로 완전히 커버하고 그 위에 통합/E2E를 쌓는 구조다.

**단위 테스트 — CASL 핵심 로직 검증**
- `AbilityFactory` (21케이스): Level별 허용 Action, PolicyOverride Allow/Deny 적용, 복합 Permission 병합, 와일드카드
- `expandLevelToRules` (7케이스): 각 Subject VIEWER→Read, EDITOR→CRUD, ADMIN 고유 Action
- `AbilityCheckService` (8케이스): assertCan, can, filterAccessible, ForbiddenException

```typescript
it('EDITOR는 course-7을 삭제할 수 있고, course-8은 삭제할 수 없다', () => {
  const ability = abilityFactory.buildAbility({
    permissions: [{
      userId: 'user-a', subject: Subject.Course,
      resourceId: 'course-7', spaceId: 'space-1', level: Level.EDITOR,
    }],
  });

  expect(ability.can(CourseAction.Delete, subject(Subject.Course, { id: 'course-7' }))).toBe(true);
  expect(ability.can(CourseAction.Delete, subject(Subject.Course, { id: 'course-8' }))).toBe(false);
});
```

Deny Override 케이스를 테스트하는 게 특히 중요했는데, EDITOR 권한이 있어도 PolicyOverride Deny가 걸리면 실제로 차단되어야 한다는 걸 명시적으로 검증해야 하기 때문이다.

**통합 테스트 (7케이스)** — 실제 DB에 ResourcePermission을 넣고 buildForUser가 올바른 Ability를 만드는지 확인한다.

**E2E 테스트 (5케이스)** — 권한 없는 사용자 403 차단, Deny Override 적용, Subject 교차 검증 등.

---

## 회고 — 잘한 것과 아쉬운 것

**잘한 것**

- Level 추상화와 PolicyOverride 분리가 잘 맞아떨어졌다. 운영팀은 드롭다운에서 Level만 선택하면 되고, 개발팀은 예외 케이스를 PolicyOverride로 처리한다.
- 2단계 검증 구조도 만족스럽다. Guard와 Service의 책임이 명확하게 나뉘었고, 각각 독립적으로 테스트하기도 좋다.
- DB에 Level만 저장하는 설계도 결과적으로 옳았다. 개발 과정에서 Level별 허용 Action을 여러 번 조정했는데, DB 마이그레이션 없이 코드 수정만으로 반영할 수 있었다.
- 새 Subject를 추가하는 과정이 5단계로 표준화됐다는 것도 이 설계가 잘 됐다는 증거다.

```
1. packages/database 에서 Subject 상수에 새 Subject 추가
2. constant/action.constant.ts 에 Subject별 Action 상수 추가
3. interface/policy-rule.interface.ts 의 Action Union에 추가
4. constant/level-policy-map.constant.ts 에 Level별 허용 Action 매핑 추가
5. index.ts barrel export에 추가
```

이 5단계를 따르면 기존 `@CheckAbility`, `AbilityCheckService`, `AbilityBuildService` 등 모든 PBAC 인프라가 새 Subject를 자동으로 인식한다.

**아쉬운 것**

- 매 요청마다 DB에서 ResourcePermission을 조회한다. Redis 캐싱을 처음부터 고려했으면 좋았을 것이다.
- PolicyOverride를 개발자가 직접 제어하는 구조인데, 비즈니스 예외가 생길 때마다 개발팀을 통해야 한다.
- "이게 진짜 PBAC인가"라는 질문도 여전히 남는다. Level이라는 추상화가 운영 편의성을 주는 대신 표현력을 일부 제한한다. 다만 그 제한을 PolicyOverride로 보완했고, 실제 비즈니스 요구사항은 모두 커버됐다. 완벽한 해법은 없고, 상황에 맞는 선택이 있을 뿐이다.

---

## 마치며: 설계를 믿고 배포 버튼을 누르기까지

3편에 걸쳐 GEM에 리소스 권한 체계를 도입한 과정을 정리했다.
외부 관리자 요구사항에서 출발해서, RBAC의 한계를 확인하고, CASL 기반 설계를 거쳐, 기존 시스템을 점진적으로 전환하고, 프론트엔드까지 연결하는 것까지.

처음에는 권한 시스템이 그냥 "사용자에게 역할 붙이는 것" 정도로만 생각했다.
막상 파고들어 보니 — 어떤 단위로 권한을 나눌 것인가, 예외는 어디에 저장할 것인가, 기존 사용자를 어떻게 처리할 것인가, 프론트에서 어떻게 선언적으로 제어할 것인가 — 결정 하나하나가 전부 비즈니스 판단이 섞인 문제였다.

설계와 구현이 다 끝나고 나서 처음으로 프로덕션에 배포 버튼을 누르던 날이 기억난다.
LazyPermissionService가 없었으면 그 버튼을 훨씬 늦게 눌렀을 것이다. (혹은 더 많이 긴장했을 것이다)
각 결정마다 이유가 명확했다는 게 그 과정에서 버팀목이 됐다.
