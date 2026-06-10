> 설계와 구현은 끝났다. 이제 기존 시스템을 갈아엎어야 한다. 사실 이 단계가 가장 긴장됐다. 이미 운영 중인 시스템에 손을 대는 거니까.

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

---

## LazyPermissionService — 권한이 없는 사용자의 첫 접근

새 시스템 도입 후 기존 사용자들이 접근할 때 ResourcePermission이 없을 수 있다. 이를 처리하기 위해 Lazy 생성 전략을 도입했다.

권한 체크에서 해당 리소스에 대한 ResourcePermission이 없는 사용자가 접근하면, 일정 조건 하에 기본 권한을 자동으로 생성한다.

이 전략 덕분에 마이그레이션 스크립트가 모든 기존 사용자의 권한을 사전에 완벽하게 생성하지 않아도 됐다. 놓친 케이스는 첫 접근 시 자동으로 처리된다.

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

---

## 컨트롤러 Guard 교체 — 점진적으로

기존 Guard를 한 번에 교체하면 회귀 테스트 범위가 너무 넓어진다. Subject 단위로 컨트롤러를 순서대로 교체했다.

```
Phase 5-1: RoleGuard에 Ability 빌드 통합 (기존 Guard + 새 Guard 공존)
Phase 5-2: Space 컨트롤러 → @CheckAbility 교체
Phase 5-3: Course 컨트롤러 → @CheckAbility 교체
Phase 5-4: Unit 컨트롤러 → @CheckAbility 교체
```

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

## 새 Subject 등록 5단계 가이드

이 시스템이 잘 설계됐다는 증거 중 하나는 새 Subject를 추가하는 과정이 5단계로 표준화됐다는 것이다.

```
1. packages/database 에서 Subject 상수에 새 Subject 추가
2. constant/action.constant.ts 에 Subject별 Action 상수 추가
3. interface/policy-rule.interface.ts 의 Action Union에 추가
4. constant/level-policy-map.constant.ts 에 Level별 허용 Action 매핑 추가
5. index.ts barrel export에 추가
```

이 5단계를 따르면 기존 `@CheckAbility`, `AbilityCheckService`, `AbilityBuildService` 등 모든 ABAC 인프라가 새 Subject를 자동으로 인식한다.

---

## 회고 — 잘한 것과 아쉬운 것

**잘한 것**

- Level 추상화와 PolicyOverride 분리가 잘 맞아떨어졌다. 운영팀은 드롭다운에서 Level만 선택하면 되고, 개발팀은 예외 케이스를 PolicyOverride로 처리한다.
- 2단계 검증 구조도 만족스럽다. Guard와 Service의 책임이 명확하게 나뉘었고, 각각 독립적으로 테스트하기도 좋다.
- DB에 Level만 저장하는 설계도 결과적으로 옳았다. 개발 과정에서 Level별 허용 Action을 여러 번 조정했는데, DB 마이그레이션 없이 코드 수정만으로 반영할 수 있었다.

**아쉬운 것**

- 매 요청마다 DB에서 ResourcePermission을 조회한다. Redis 캐싱을 처음부터 고려했으면 좋았을 것이다.
- PolicyOverride를 개발자가 직접 제어하는 구조인데, 비즈니스 예외가 생길 때마다 개발팀을 통해야 한다.
- "이게 진짜 ABAC인가"라는 질문도 여전히 남는다. Level이라는 추상화가 운영 편의성을 주는 대신 표현력을 일부 제한한다. 다만 그 제한을 PolicyOverride로 보완했고, 실제 비즈니스 요구사항은 모두 커버됐다. 완벽한 해법은 없고, 상황에 맞는 선택이 있을 뿐이다.

---

## Conclusion

3편에 걸쳐 GEM에 리소스 권한 체계를 도입한 과정을 정리했다. 외부 관리자 요구사항에서 출발해서, RBAC의 한계를 확인하고, CASL 기반 설계를 거쳐, 기존 시스템을 점진적으로 전환하는 것까지.

생각보다 고려할 게 많았지만, 각 결정마다 이유가 명확했다는 게 진행 과정에서 힘이 됐다.
