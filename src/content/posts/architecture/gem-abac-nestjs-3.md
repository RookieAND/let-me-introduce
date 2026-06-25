> 설계와 구현은 끝났다. 이제 기존 시스템을 갈아엎어야 한다. 사실 이 단계가 가장 긴장됐다. 이미 운영 중인 시스템에 손을 대는 거니까.  

## 전환 전에 먼저 챙겨야 할 것들

본격적인 마이그레이션 작업 전에, 새 시스템에서 기존과 다르게 동작해야 하는 부분을 두 가지 먼저 짚고 넘어간다. 그냥 배포하면 기존 사용자 접근이 전부 깨진다.  

---

## 리소스 생성 시 권한을 자동으로 부여하기 — CQRS CommandBus

새 시스템에서 리소스를 생성하면 생성자에게 ADMIN 권한이 자동으로 부여되어야 한다.  

처음에는 Service 로직에 직접 권한 부여 코드를 넣으려고 했다.  

그런데 이렇게 하면 모든 생성 Service에 권한 부여 코드가 흩어진다. 새 Subject가 추가될 때마다 해당 Service를 수정해야 하는 구조가 된다.  

대신 CQRS의 `CommandBus`를 활용했다. 리소스 생성 후 `AssignCreatorAdminCommand`를 발행하면, 이 커맨드를 처리하는 핸들러가 권한 부여를 담당한다.  

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
    await this.resourcePermissionRepo.upsert({
      userId, subject, resourceId, spaceId, level: Level.ADMIN,
    });
  }
}
```

이 구조의 장점은 새 Subject가 추가될 때 해당 Service에서 동일한 커맨드를 발행하기만 하면 된다는 것이다. 권한 부여 로직은 핸들러 한 곳에만 있다.  

핸들러 내부에서는 `findOneAndUpdate + upsert` 패턴을 사용한다.  

```typescript
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

이미 다른 Level이 있는 상태에서 생성자가 리소스를 다시 만들어도 ADMIN으로 덮어쓰지 않고 upsert가 처리한다.  

---

## Space ADMIN 정적 상속 — 구현 상세

1편에서 "단 하나의 예외"라고 했던 Space ADMIN 상속의 실제 구현이다. DB에는 Space ResourcePermission 하나만 저장되고, Ability 빌드 시 하위 리소스 권한이 자동 생성된다.  

```typescript
const INHERITABLE_SUBJECTS = [Subject.Course, Subject.Unit, Subject.Submission, Subject.Template];

export function expandSpaceAdminInheritanceRules(perm: ResourcePermission): PolicyRule[] {
  const isSpaceAdmin = perm.subject === Subject.Space && perm.level === Level.ADMIN;
  if (!isSpaceAdmin) return [];

  return INHERITABLE_SUBJECTS.map(subject => ({
    effect: PolicyEffect.Allow,
    subject,
    actions: LEVEL_POLICY_MAP[subject][Level.ADMIN],
    resources: ['*'],
    conditions: { spaceId: perm.spaceId },  // 같은 Space 내 리소스만
  }));
}
```

`resources: ['*']`와 `conditions: { spaceId: perm.spaceId }` 조합이 핵심이다. "모든 리소스지만 같은 Space 안의 것만"으로 범위를 제한한다. Space ADMIN이 다른 Space의 Course에 접근할 수 없는 이유가 이 `spaceId` 조건 덕분이다.  

이 함수는 `AbilityFactory.build()` 내에서 `expandLevelToRules`와 함께 호출된다. DB에 저장된 ResourcePermission이 1건이어도 런타임에 하위 Subject 4개에 대한 PolicyRule이 생성된다.  

---

## LazyPermissionService — 기존 사용자의 첫 접근 처리

새 시스템을 배포하면 기존 사용자들에게 ResourcePermission이 없다. 접근할 때마다 권한 없음으로 차단된다.  

마이그레이션 스크립트가 모든 사용자의 권한을 사전에 완벽하게 생성해둬야 할까. 이론적으로는 맞는데, 실제로는 놓치는 케이스가 반드시 생긴다.  
기존 데이터 구조와 새 구조 사이에 1:1로 대응되지 않는 엣지 케이스가 있었고, 스크립트 실행 후에도 "이 사용자는 왜 접근이 안 되는가"를 개별적으로 추적해야 하는 상황이 발생할 게 예상됐다.  

대신 Lazy 생성 전략을 도입했다. 권한 체크에서 ResourcePermission이 없는 사용자가 접근하면, 일정 조건 하에 기본 권한을 자동으로 생성한다.  

놓친 케이스는 첫 접근 시 자동으로 처리된다. 마이그레이션 스크립트의 완성도 요건이 낮아진다.  
사전에 완벽한 마이그레이션 스크립트를 만드는 것보다, 불완전한 스크립트와 Lazy 생성을 조합하는 쪽이 실제로는 훨씬 안전하다는 걸 이 과정에서 배웠다.  

---

## 기존 SpaceUser → ResourcePermission 마이그레이션

기존 시스템에는 `SpaceUser` 컬렉션이 있었다. `userId + spaceId + role` 구조였다. 이걸 `ResourcePermission`으로 변환해야 했다.  

마이그레이션 전략을 두 가지로 검토했다.  

- **옵션 A: 일괄 마이그레이션** — 배포 전에 모든 SpaceUser를 ResourcePermission으로 변환하는 스크립트를 실행한다. 단순하지만 데이터가 많으면 배포 전 오랜 시간이 걸리고, 실패하면 롤백이 복잡하다.
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

역할(Role) → Level 매핑 테이블을 먼저 정의하는 게 핵심이었다. 기존 역할과 새 Level이 1:1로 대응되지 않는 케이스가 있어서 이 매핑을 정하는 데 시간이 꽤 걸렸다.  
예를 들어 기존 MANAGER 역할은 새 시스템의 ADMIN과 EDITOR 사이 어딘가였는데, 어느 쪽으로 올릴지를 결정하는 게 기술적인 문제가 아니라 비즈니스 판단의 문제였다.  
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

중요한 게 `invalidateAbility()` 호출이다. 권한을 변경한 직후 해당 요청 내에서 Ability가 재빌드되도록 보장한다. 외부 관리자 권한을 즉시 회수해야 하는 케이스에서 이 한 줄이 없으면 같은 요청 내에서 캐시된 Ability가 여전히 유효한 상태로 남는다.  

권한 삭제는 하드 딜리트가 아니라 소프트 딜리트다. 권한 이력 추적과 빠른 롤백을 위해서다. 잘못 회수된 경우 `restoreMany`로 복구할 수 있다.  

---

## 컨트롤러 Guard 교체 — Subject 단위로 점진적으로

기존 Guard를 한 번에 교체하면 회귀 테스트 범위가 너무 넓어진다. Subject 단위로 컨트롤러를 순서대로 교체했다.  

```
Phase 5-1: RoleGuard에 Ability 빌드 통합 (기존 Guard + 새 Guard 공존)
Phase 5-2: Space 컨트롤러 → @CheckAbility 교체
Phase 5-3: Course 컨트롤러 → @CheckAbility 교체
Phase 5-4: Unit 컨트롤러 → @CheckAbility 교체
```

Phase 5-1이 가장 까다로웠다. 기존 RoleGuard가 실행되면서 동시에 새 Ability도 빌드해야 하는데, 이 시점에 ResourcePermission이 없는 사용자가 대부분이라 Ability가 빈 상태로 빌드됐다. LazyPermissionService와 연계해서 첫 접근 시 자동 생성 로직을 먼저 붙이고 나서야 기존 Guard와 새 Guard를 안전하게 공존시킬 수 있었다.  

각 단계마다 해당 Subject의 E2E 테스트를 돌려서 회귀가 없는지 확인하고 넘어갔다. 한 Subject에서 문제가 생기면 그 Subject만 롤백하면 됐다.  

---

## 테스트 전략 — 40케이스

테스트를 세 계층으로 설계했다.  

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

Deny Override 케이스를 테스트하는 게 특히 중요했다. EDITOR 권한이 있어도 PolicyOverride로 Delete가 Deny 되면 안 된다는 걸 명시적으로 검증한다.  

**통합 테스트 (7케이스)** — 실제 DB에 ResourcePermission을 넣고, buildForUser가 올바른 Ability를 만드는지 확인한다.  

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

## Conclusion

3편에 걸쳐 GEM에 리소스 권한 체계를 도입한 과정을 정리했다. 외부 관리자 요구사항에서 출발해서, RBAC의 한계를 확인하고, CASL 기반 설계를 거쳐, 기존 시스템을 점진적으로 전환하는 것까지.  

생각보다 고려할 게 많았지만, 각 결정마다 이유가 명확했다는 게 진행 과정에서 힘이 됐다.  
