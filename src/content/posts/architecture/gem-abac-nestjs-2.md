> 처음에는 Guard 하나에서 모든 권한 검증을 끝내고 싶었다. 그런데 구현하다 보니, Guard와 Service가 각각 다른 역할을 해야 한다는 게 보이기 시작했다.

1편에서 정의한 개념들이 실제 코드에서 어떻게 동작하는지 단계별로 따라간다.
이번 글의 전체 흐름을 먼저 보여주면 아래와 같다.

| 단계 | 담당 | 핵심 동작 |
|---|---|---|
| 1 | `expandLevelToRules` | Level → PolicyRule[] 변환. `resources: [resourceId]`로 리소스를 스코프한다. |
| 2 | `expandSpaceAdminInheritanceRules` | Space ADMIN → 하위 Subject 와일드카드 규칙 생성 |
| 3 | `AbilityFactory.build()` | 세 소스 합산, Allow/Deny 순서 등록, Implicit Deny |
| 4 | `AbilityClsService` | nestjs-cls로 요청 범위 내 Ability 전파 |
| 5 | `LoadAbilityGuard` | 1차: 규칙 존재 여부 확인 → 없으면 즉시 403 |
| 6 | `WithXxxAccessGuard` | 2차: 특정 리소스 Condition까지 평가 |
| 7 | `AbilityCheckService` | Service 레이어에서 리소스 객체를 넘겨 최종 검증 |

---

## Guard 하나로 다 하려다 막힌 이유

Guard에서 완벽한 권한 검증을 하려면 "이 사용자가 이 특정 리소스에 접근 가능한가"까지 확인해야 한다.

그 확인을 위해서는 리소스 정보가 필요한데, Guard는 컨트롤러보다 먼저 실행된다.
즉, Guard 시점에는 아직 Service 로직이 수행되지 않았고 실제 리소스 객체도 없다.
Guard에서 리소스를 꺼내려면 DB를 한 번 더 조회해야 한다는 얘기인데, Service에서도 어차피 같은 걸 조회할 텐데 이건 명백한 중복이다.

이를 개선하기 위해 두 레이어의 역할을 나눌 수밖에 없었다.

```
Guard (1차):  "이 사용자에게 이 Action에 대한 규칙 자체가 존재하는가?"
              → 규칙이 없으면 즉시 403. DB 조회 없이 빠른 차단.

Service (2차): "이 특정 리소스에 대해 실제로 접근이 가능한가?"
              → 리소스 객체를 넘겨 Condition까지 평가. 세밀한 검증.
```

대부분의 403은 "규칙 자체가 없어서" 발생한다.
1차에서 대부분을 걸러내고 정말 리소스 조건까지 따져야 하는 케이스만 2차로 넘기는 구조다.

---

## ResourcePermission과 PolicyOverride를 왜 따로 저장했는가

처음엔 하나의 컬렉션으로 통합할 수도 있겠다고 생각했다. 그런데 두 데이터의 성격이 꽤 달랐다.

`ResourcePermission`은 사용자와 리소스 간의 권한 관계를 저장한다.
일반 사용자가 Space에 초대되거나 과제에 접근 권한을 부여받을 때마다 레코드가 생기고, UI를 통해 자동으로 만들어지는 구조인지라 변경도 잦다.

```typescript
@Schema()
class ResourcePermission {
  @Prop() userId: string;
  @Prop() subject: Subject;     // 'Course', 'Unit', ...
  @Prop() resourceId: string;   // 'course-7', 'unit-3', ...
  @Prop() spaceId: string;      // 빌드 범위 제한에 사용
  @Prop() level: Level;
}
```

`userId + subject + resourceId` 조합이 고유 키이기 때문에 동일 조합이 들어오면 upsert로 처리한다.

반면 `PolicyOverride`는 유저별 예외 규칙을 저장하는데, `rules` 배열 안에 CASL PolicyRule이 직접 담기고 생성과 수정은 개발자가 직접 하는 것으로 정책을 정했기에 일반 UI에는 노출되지 않는다.

성격이 다른 두 데이터를 하나로 합치면 조회 조건도 복잡해지고 예외 규칙이 일반 권한과 섞여서 관리하기 어려워지기 때문에 분리하는 게 맞다고 판단했다.

---

## expandLevelToRules — Level을 실제 권한 규칙으로 변환하는 핵심 함수

`AbilityFactory`를 실제로 채우는 함수가 `expandLevelToRules`다. ResourcePermission 하나를 받아서 PolicyRule로 변환한다.

```typescript
// apps/operation/src/lib/casl/utils/expand-level-to-rules.util.ts
export function expandLevelToRules({ subject, resourceId, level }) {
  if (subject === Subject.All) return [];

  const actions = LEVEL_POLICY_MAP[subject][level];

  if (!actions || actions.length === 0) return [];

  return [{
    effect: PolicyEffect.Allow,
    subject,
    actions,
    resources: [resourceId],  // ← 특정 리소스 ID로 스코프
  }];
}
```

`resources: [resourceId]`가 이 함수의 핵심이었다.

"이 사용자는 Course라는 Subject에 EDITOR 권한이 있다"가 아니라, "이 사용자는 `course-7`이라는 특정 Course에 EDITOR 권한이 있다"로 변환된다. 리소스 스코프 권한은 이 변환에서 비롯된다.

덕분에 CASL Ability는 사용자별로 접근 가능한 특정 리소스 목록을 자연스럽게 담게 된다.

`Subject.All` 가드도 눈에 띄는데, SUPER_ADMIN처럼 `subject: 'all'`로 전역 권한을 가진 경우에는 이 함수를 거치지 않도록 분기하여 별도 경로에서 처리한다.

`expandLevelToRules`와 쌍을 이루는 `expandSpaceAdminInheritanceRules`도 함께 살펴보자.

```typescript
// apps/operation/src/lib/casl/utils/expand-space-admin-inheritance.util.ts
const INHERITABLE_SUBJECTS = [Subject.Course, Subject.Unit, Subject.Submission, Subject.Template];

export function expandSpaceAdminInheritanceRules(perm: ResourcePermission): PolicyRule[] {
  const isSpaceAdmin = perm.subject === Subject.Space && perm.level === Level.ADMIN;
  if (!isSpaceAdmin) return [];

  return INHERITABLE_SUBJECTS.map(subject => ({
    effect: PolicyEffect.Allow,
    subject,
    actions: LEVEL_POLICY_MAP[subject][Level.ADMIN],
    resources: ['*'],
    conditions: { spaceId: perm.spaceId },  // ← 같은 Space 내 리소스만
  }));
}
```

`resources: ['*']`와 `conditions: { spaceId: perm.spaceId }` 조합이 핵심이다.
"모든 리소스지만 같은 Space 안의 것만"으로 범위를 제한하기 때문에, Space ADMIN이 다른 Space의 Course에 접근할 수 없는 이유가 바로 이 `spaceId` 조건 덕분이다.

---

## AbilityFactory — Allow 먼저, Deny는 나중에 등록해야 하는 이유

CASL은 뒤에 등록된 Rule이 우선한다. PolicyOverride Deny가 Level Allow보다 항상 이겨야 하므로 등록 순서를 전략적으로 설계했다.

```typescript
// apps/operation/src/lib/casl/factory/ability.factory.ts
private createFromRules({ rules }: { rules: PolicyRule[] }): AppAbility {
  const builder = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Allow 전부 먼저
  for (const rule of rules.filter(r => r.effect === 'Allow')) {
    builder.can(rule.actions, rule.subject, this.buildConditions({ rule }));
  }
  // Deny 나중 → 최우선 적용
  for (const rule of rules.filter(r => r.effect === 'Deny')) {
    builder.cannot(rule.actions, rule.subject, this.buildConditions({ rule }));
  }

  return builder.build();
}
```

Allow를 먼저 전부 등록하고 Deny를 나중에 등록하기 때문에 PolicyOverride Deny가 마지막에 등록되어 어떤 Allow 규칙보다도 우선한다.

전체 우선순위를 정리하면 이렇다.

| 순서 | 출처 | 우선순위 | 의미 |
|---|---|---|---|
| 1 | PolicyOverride Deny | **최우선** | 어떤 Allow도 덮어쓴다. 최종 차단. |
| 2 | PolicyOverride Allow | 높음 | Level Deny를 덮어쓸 수 있다. 예외적 허용. |
| 3 | ResourcePermission Deny | 보통 | Level 내부의 명시적 거부. |
| 4 | ResourcePermission Allow | 낮음 | Level에서 확장된 기본 허용. |
| 5 | Implicit Deny | 기본값 | **어떤 Rule도 매칭되지 않으면 자동으로 거부.** |

Implicit Deny가 특히 중요한데, 명시적으로 Deny를 등록하지 않아도 Allow Rule이 없는 접근은 자동으로 거부된다. 이 원칙 덕분에 ResourcePermission이 없는 리소스에는 별도 차단 로직 없이도 접근이 불가하다.

`resources` 필드는 `buildConditions`에서 CASL 조건으로 변환된다.

```typescript
private buildConditions({ rule }: { rule: PolicyRule }): CaslCondition | undefined {
  if (!rule.resources || rule.resources.includes('*')) {
    return rule.conditions;  // 와일드카드면 conditions 그대로
  }
  // ID 목록 → MongoDB $in 조건
  return { ...rule.conditions, id: { $in: rule.resources } };
}
```

이 변환이 1차/2차 검증의 차이를 만든다.
Guard 1차에서 `ability.can('Update', 'Course')` (문자열)를 넘기면 id 조건 매칭이 일어나지 않는다.
Service 2차에서 `ability.can('Update', subject('Course', { id: 'course-7' }))` 처럼 실제 객체를 넘겨야 `$in` 조건이 평가된다.

---

## Guard에서 Service로 Ability를 넘기는 방법 — nestjs-cls

Guard에서 빌드한 Ability를 Service까지 어떻게 전달하느냐가 문제였다.
Guard는 NestJS의 DI 컨텍스트 안에 있지만, 요청마다 생성된 Ability 객체를 Service에 넘길 방법이 마땅치 않았다. 요청 객체에 직접 붙이는 방법도 생각해봤는데, 타입이 지저분해지고 Provider 간 결합이 생긴다.

그때 발견한 게 `nestjs-cls`였다. AsyncLocalStorage 기반이라 요청마다 독립된 저장소가 생기고 요청 간 오염이 없어서 Guard에서 저장하면 Service에서 꺼낼 수 있었다. 이게 딱 내가 필요하다고 생각했던 부분이었다!

```typescript
// apps/operation/src/lib/casl/service/ability-build.service.ts
@Injectable()
class AbilityBuildService {
  async buildForUser(userId: string): Promise<AppAbility> {
    const [permissions, overrides] = await Promise.all([
      this.resourcePermissionRepository.findMany({ userId }),
      this.policyOverrideRepository.findMany({ userId }),
    ]);

    const overrideRules = overrides.flatMap((override) =>
      override.rules.map((rule) => ({
        effect: rule.effect,
        subject: rule.subject,
        actions: rule.actions,
        resources: rule.resources,
      }) as PolicyRule),
    );

    return this.abilityFactory.build({ permissions, overrides: overrideRules });
  }
}
```

`Promise.all`로 ResourcePermission + PolicyOverride를 동시에 조회하는데, 두 데이터 간에 의존성이 없어 직렬로 조회할 이유가 없기 때문이다.

```typescript
// apps/operation/src/lib/casl/service/ability-cls.service.ts
@Injectable()
class AbilityClsService {
  async setupForRequest(userId: string): Promise<AppAbility> {
    const ability = await this.abilityBuildService.buildForUser(userId);
    this.cls.set(CLS_ABILITY_KEY, ability);
    this.cls.set(CLS_USER_ID_KEY, userId);
    return ability;
  }

  getAbility(): AppAbility | undefined { return this.cls.get(CLS_ABILITY_KEY); }
  getUserId(): string | undefined       { return this.cls.get(CLS_USER_ID_KEY); }

  invalidateAbility(): void {
    this.cls.set(CLS_ABILITY_KEY, undefined);
    this.cls.set(CLS_USER_ID_KEY, undefined);
  }
}
```

권한을 변경한 직후 같은 요청 내에서 Ability가 Rebuild 되도록 보장하는 게 `invalidateAbility()`다.
외부 관리자의 권한을 즉시 회수해야 하는 케이스에서 이 한 줄이 없으면, 같은 요청 내에서 수정 전 Ability가 여전히 유효한 상태로 남는다.

매 요청마다 DB에서 ResourcePermission을 조회하는 구조라서 성능 걱정이 들어 캐싱도 검토했다. 하지만 결국 당장은 캐싱 없이 매 요청마다 빌드하는 방식으로 결정했다.

외부 관리자의 권한이 수동으로 회수될 수 있어서 캐시 무효화 전략이 생각보다 복잡해진다는 점과 현재 사용자 규모에서는 DB 조회 비용이 허용 범위 안이라는 점, 총 두 가지 이유에서였다.
규모가 커지면 Redis 캐싱이 자연스러운 다음 단계겠지만 지금은 단순함을 유지하는 쪽이 맞다고 판단했다.

---

## Guard — @WithCourseAccess 데코레이터로 3개 Guard를 한 번에

실제 컨트롤러에서는 Guard를 직접 등록하지 않고 Subject별 전용 데코레이터가 Guard 3개를 한 번에 적용한다.

```typescript
@Get(':id')
@WithCourseAccess({ action: CourseAction.Read, source: 'params', key: 'id' })
async getCourse(@Param('id') id: string) { ... }

@Delete(':id')
@WithCourseAccess({ action: CourseAction.Delete, source: 'params', key: 'id' })
async deleteCourse(@Param('id') id: string) { ... }
```

`@WithCourseAccess` 하나가 `ResolveUserGuard → LoadAbilityGuard → WithCourseAccessGuard` 순으로 3개 Guard를 묶어서 적용한다.

```typescript
// apps/operation/src/lib/casl/guard/with-course-accessible/with-course-access.decorator.ts
export function WithCourseAccess(options: WithCourseAccessOptions) {
  return applyDecorators(
    SetMetadata(RESOLVE_USER_KEY, { allowGuest: false }),
    SetMetadata(LOAD_ABILITY_KEY, true),
    SetMetadata(WITH_COURSE_ACCESS_KEY, options),
    UseGuards(ResolveUserGuard, LoadAbilityGuard, WithCourseAccessGuard),
  );
}
```

`LoadAbilityGuard`가 1차를 담당하는데, Ability를 빌드해 CLS에 저장하고 해당 Action에 대한 규칙이 아예 없으면 즉시 403을 반환한다. DB 리소스 조회 없이 빠른 차단이 이 지점에서 일어난다.

`WithCourseAccessGuard`가 2차를 담당하여 request에서 courseId를 추출하고 Course를 DB에서 조회한 뒤 `assertCan`으로 리소스 Condition까지 평가한다.

courseId가 단일 값이면 한 번에 처리하지만, 배열로 넘어오는 경우에는 전부 접근 가능해야 한다는 조건으로 검증한다.

```typescript
// 배열 케이스: 접근 가능한 것만 필터링 후 개수 비교
private async assertManyAccessible(idList: string[], action) {
  const courses = await this.courseRepository.findMany({ id: { $in: idList } });

  const accessible = this.abilityCheckService.filterAccessible({
    action, subject: Subject.Course, resources: courses,
  });

  if (accessible.length !== courses.length) {
    throw new ForbiddenException(...);
  }
}
```

배열 중 하나라도 접근 불가능하면 403이 발생한다.

`SubjectActionMap` 타입 덕분에 잘못된 action-subject 조합은 컴파일 에러가 나서 실행 흐름 외에 타입 안전성도 함께 챙길 수 있다.

```typescript
// 컴파일 에러 — UnitAction.Clone은 CourseAccess에 쓸 수 없다
@WithCourseAccess({ action: UnitAction.Clone, source: 'params', key: 'id' })
```

---

## AbilityCheckService — 리소스 객체를 받아 Condition까지 평가하는 2차 검증

Service 레이어에서 사용하는 시점에는 실제 리소스 객체가 이미 존재한다.

```typescript
@Injectable()
class AbilityCheckService {
  // ability가 없으면 throw, can이 false이면 throw
  assertCan<S extends Subject>({ action, subject, resource }) {
    const ability = this.getAbilityOrThrow();
    if (!ability.can(action, caslSubject(subject, resource))) {
      throw new ForbiddenException(`${subject}(${resource.id})에 대한 ${String(action)} 권한이 없습니다.`);
    }
  }

  // ability가 없으면 false 반환 (throw 안 함)
  can<S extends Subject>({ action, subject, resource }): boolean {
    const ability = this.abilityClsService.getAbility();
    if (!ability) return false;
    return ability.can(action, caslSubject(subject, resource));
  }

  filterAccessible<S extends Subject, T extends { id: string }>({ action, subject, resources }) {
    const ability = this.abilityClsService.getAbility();
    if (!ability) return [];
    return resources.filter(resource => ability.can(action, caslSubject(subject, resource)));
  }

  getAccessConditions<S extends Subject>({ action, subject }) {
    const ability = this.abilityClsService.getAbility();
    if (!ability) return { $expr: { $eq: [0, 1] } }; // ← 아무것도 못 찾게
    return accessibleBy(ability, action).ofType(subject);
  }
}
```

`assertCan`과 `can`은 다르게 동작한다. `assertCan`은 ability 자체가 없어도 throw하지만 `can`은 ability가 없으면 `false`를 반환하기 때문에, 조건부 분기가 필요한 상황에서는 `can`을 쓴다.

ability가 없을 때 빈 조건 `{}`을 반환하면 DB에서 모든 결과가 나오는 심각한 버그가 생기기 때문에, `getAccessConditions`의 fallback은 `{ $expr: { $eq: [0, 1] } }`으로 "항상 false인 조건"을 반환하여 아무것도 나오지 않도록 막는다.

`filterAccessible`이 "이미 로드한 리소스를 필터링"한다면 `getAccessConditions`는 CASL 조건을 MongoDB 필터 쿼리로 변환해서 DB에서부터 접근 가능한 것만 가져오기 때문에 목록 조회에 더 적합하다.

```typescript
async findAll(spaceId: string) {
  const filter = this.abilityCheck.getAccessConditions({
    action: CourseAction.Read,
    subject: Subject.Course,
  });
  return this.courseRepo.findAll({
    $and: [{ spaceId }, filter ?? {}],
  });
}
```

전체를 로드한 뒤 필터링하면 접근 불가한 문서도 DB에서 읽게 되는데, 외부 관리자처럼 접근 가능한 리소스가 제한적인 케이스에서 이 차이가 크다.

`assertCan`에는 Mongoose Document가 아닌 plain object를 넘겨야 한다.

```typescript
// ❌ Mongoose Document 직접 전달
this.abilityCheck.assertCan({ resource: course });

// ✅ plain object로 변환 후 전달
this.abilityCheck.assertCan({ resource: course.toObject() });
```

Mongoose Document를 그대로 넘기면 getter/virtual이 CASL의 `$in` 조건 매칭에 간섭할 수 있다. 처음에 이걸 몰랐다가 조건 매칭이 이상하게 동작하는 걸 보고 한참 헤맸다. ~~(부끄럽다)~~

---

## SubmissionAnswer 동적 검증 — CASL로 처리하지 않는 이유

SubmissionAnswer는 `spaceId`를 보유하지 않는데다 Submission의 `unitId`도 optional이라 Unit ↔ Submission 관계가 동적으로 변한다.

그래서 Ability 빌드 시점에 "이 Unit에 연결된 Submission의 답변에 접근 가능하다"는 규칙을 고정할 수 없다.
Ability 빌드 시 Unit마다 연결된 Submission을 조회하면 DB 쿼리가 폭발하고, link/unlink 시 Ability 캐시 무효화가 필요해 복잡도가 크게 올라가기 때문이다.

때문에 서비스 레이어에서 요청 시점에 동적으로 검증한다.

```
GET /units/:unitId/submissions/:submissionId/answers

Guard → Unit 권한 확인 (ability.can(action, 'Unit', { id: unitId }))
      ↓ 통과
Service → findOneByUnitId({ unitId })
        → submissionId 일치 확인
        → 일치하면 answers 조회
```

Unit 권한자가 해당 Unit에 LINKED된 Submission의 답변에 접근하는 흐름인데, "접근 경로가 Unit을 통한다"는 사실 자체를 서비스에서 검증하는 방식이다.
Space ADMIN도 해당 Space의 모든 Unit에 대한 권한을 가지므로 이 경로를 통해 SubmissionAnswer에 자연스럽게 접근할 수 있다.

---

## 마치며: Guard 하나로 끝낼 수 있을 거라 생각했던 시절

처음엔 Guard 하나에서 모든 걸 처리하면 구조가 단순해질 거라고 생각했는데, 권한 검증을 한 곳에서만 하면 추적도 쉽고 책임도 명확해진다고 봤기 때문이다.

그런데 실제로 구현해보니, Guard는 "이 사람이 이 작업을 할 자격이 있는가"를 보는 곳이고 Service는 "이 특정 대상에 대해 실제로 허용되는가"를 보는 곳이라는 게 자연스럽게 분리됐다. 역할이 원래부터 달랐던 거다.

2단계로 나누고 나니 Guard는 빠른 차단에, Service는 리소스 레벨의 세밀한 판단에 집중하는 구조가 오히려 더 명확해졌다.

3편에서는 프론트엔드 React에서 이 권한 체계를 어떻게 활용하는지를 다룬다.
