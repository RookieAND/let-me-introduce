> 처음에는 Guard 하나에서 모든 권한 검증을 끝내고 싶었다. 간단할 것 같았다. 그런데 구현하다 보니, Guard와 Service가 각각 다른 역할을 해야 한다는 게 보이기 시작했다.

1편에서 정의한 Level, PolicyRule, ResourcePermission, PolicyOverride — 이 개념들이 실제 코드에서 어떻게 동작하는지를 이 편에서 다룬다.
`expandLevelToRules`로 Level을 PolicyRule로 변환하는 과정, Ability를 빌드하는 `AbilityFactory`, Guard와 Service 두 계층의 검증 구조를 코드와 함께 따라간다.

## Guard 하나로 다 하려다 막힌 이유

Guard에서 완벽한 권한 검증을 하려면 "이 사용자가 이 특정 리소스에 접근 가능한가"까지 확인해야 한다.

문제는 그 확인을 위해 리소스 정보가 필요하다는 점이었다.

Guard는 컨트롤러보다 먼저 실행된다. 즉, Guard 시점에는 아직 Service 로직이 수행되지 않았고, 실제 리소스 객체도 없다. 그러니까 Guard에서 리소스를 꺼내려면 DB를 한 번 더 조회해야 한다는 얘기인데, Service에서도 어차피 같은 걸 조회할 텐데 이건 명백한 중복이다. (으악 이건 아니야)

결국 역할을 나눌 수밖에 없었다.

```
Guard (1차):  "이 사용자에게 이 Action에 대한 규칙 자체가 존재하는가?"
              → 규칙이 없으면 즉시 403. DB 조회 없이 빠른 차단.

Service (2차): "이 특정 리소스에 대해 실제로 접근이 가능한가?"
              → 리소스 객체를 넘겨 Condition까지 평가. 세밀한 검증.
```

대부분의 403은 "규칙 자체가 없어서" 발생한다. 1차에서 대부분을 걸러내고, 정말 리소스 조건까지 따져야 하는 케이스만 2차로 넘기는 구조다.

---

## ResourcePermission과 PolicyOverride를 왜 따로 저장했는가

처음엔 하나의 컬렉션으로 통합할 수도 있겠다고 생각했다. 그런데 두 데이터의 성격이 꽤 달랐다.

`ResourcePermission`은 사용자와 리소스 간의 권한 관계를 저장한다. 일반 사용자가 Space에 초대될 때, 과제에 접근 권한을 부여받을 때마다 레코드가 생긴다. UI를 통해 자동으로 생성되고, 변경 빈도가 높다.

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

`userId + subject + resourceId` 조합이 고유 키다. upsert로 처리한다.

반면 `PolicyOverride`는 유저별 예외 규칙을 저장한다. `rules` 배열 안에 CASL PolicyRule이 직접 담긴다. 이걸 생성하거나 수정하는 건 개발자가 직접 한다. 일반 UI에 노출되지 않는다.

성격이 다른 두 데이터를 하나로 합치면 조회 조건도 복잡해지고, 예외 규칙이 일반 권한과 섞여서 관리하기 어려워진다. 분리하는 게 맞다고 판단했다.

---

## expandLevelToRules — Level을 실제 권한 규칙으로 변환하는 핵심 함수

`AbilityFactory`를 실제로 채우는 함수가 `expandLevelToRules`다. ResourcePermission 배열을 받아서 각각을 PolicyRule로 변환한다.

```typescript
function expandLevelToRules(permissions: ResourcePermission[]): PolicyRule[] {
  return permissions.flatMap(({ subject, resourceId, level }) => {
    const allowedActions = LEVEL_POLICY_MAP[subject]?.[level] ?? [];

    return allowedActions.map((action) => ({
      effect: 'Allow',
      subject,
      actions: [action],
      resources: [resourceId],  // 특정 resourceId에 스코프된 권한
    }));
  });
}
```

이 한 줄이 핵심이었다.

`resources: [resourceId]` — "이 사용자는 Course라는 Subject에 EDITOR 권한이 있다"가 아니라, "이 사용자는 `course-7`이라는 특정 Course에 EDITOR 권한이 있다"로 변환된다. 리소스 스코프 권한은 이 변환에서 비롯된다.

덕분에 CASL Ability는 사용자별로 접근 가능한 특정 리소스 목록을 자연스럽게 담게 된다.
Guard에서 `ability.can('Update', 'Course')` 를 호출하면 "규칙이 존재하는가"만 확인하고, Service에서 `ability.can('Update', subject('Course', { id: 'course-7' }))` 를 호출하면 비로소 `$in` 조건 매칭이 일어나 `course-7` 접근 가능 여부가 판단된다.

Space ADMIN 정적 상속도 여기서 처리한다. Space ADMIN이면 하위 Course/Unit/Submission에도 ADMIN PolicyRule을 추가 생성한다.

---

## AbilityFactory — Allow 먼저, Deny는 나중에 등록해야 하는 이유

CASL은 뒤에 등록된 Rule이 우선한다. PolicyOverride Deny가 Level Allow보다 항상 이겨야 하므로, 등록 순서를 전략적으로 설계했다.

```typescript
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

Allow를 먼저 전부 등록하고 Deny를 나중에 등록한다. PolicyOverride Deny가 마지막에 등록되므로 어떤 Allow 규칙도 덮어쓴다.

여기서 짚고 넘어갈 부분이 있다. `resources: ['course-7']`는 그대로 CASL에 전달할 수 없다. MongoDB 조건 형식으로 변환이 필요하다.

```typescript
private buildConditions({ rule }: { rule: PolicyRule }): CaslCondition | undefined {
  if (!rule.resources || rule.resources.includes('*')) {
    return rule.conditions;  // 와일드카드면 조건 없이
  }
  return { id: { $in: rule.resources } };  // ID 목록 → MongoDB $in 조건
}
```

이 변환이 1차/2차 검증의 차이를 만든다. Guard 1차에서 `ability.can('Update', 'Course')` (문자열)를 넘기면 id 조건 매칭이 일어나지 않는다. Service 2차에서 `ability.can('Update', subject('Course', { id: 'course-7' }))` 처럼 실제 객체를 넘겨야 `$in` 조건이 평가된다.

---

## Guard에서 Service로 Ability를 넘기는 방법을 고민하다 만난 nestjs-cls

실제로 사용자의 Ability를 빌드하는 서비스를 만들면서, 한 가지 문제가 생겼다.

Guard에서 빌드한 Ability를 Service까지 어떻게 전달하느냐였다. Guard는 NestJS의 DI 컨텍스트 안에 있지만, 요청마다 생성된 Ability 객체를 Service에 넘길 방법이 마땅치 않았다. 요청 객체에 직접 붙이는 방법도 생각해봤는데, 타입이 지저분해지고 Provider 간 결합이 생긴다. (젠장 어렵다)

그때 발견한 게 `nestjs-cls`였다. AsyncLocalStorage 기반이라 요청마다 독립된 저장소가 생기고, 요청 간 오염이 없다. Guard에서 저장하면 Service에서 꺼낼 수 있다. 이게 딱 필요한 거였다.

```typescript
@Injectable()
class AbilityBuildService {
  async buildForUser(userId: string): Promise<AppAbility> {
    const permissions = await this.resourcePermissionRepo.findByUserId(userId);
    const overrides   = await this.policyOverrideRepo.findByUserId(userId);
    return this.abilityFactory.buildAbility({ permissions, overrides });
  }

  // Space 범위로 한정한 권한 빌드
  async buildForSpace({ userId, spaceId }): Promise<AppAbility> {
    const permissions = await this.resourcePermissionRepo.findByUserIdAndSpaceId(userId, spaceId);
    const overrides   = await this.policyOverrideRepo.findByUserIdAndSpaceId(userId, spaceId);
    return this.abilityFactory.buildAbility({ permissions, overrides });
  }
}
```

`buildForSpace`를 별도로 둔 이유가 있다. 특정 Space 내 요청이면 굳이 다른 Space의 권한까지 모두 로드할 필요가 없다.

캐싱도 검토했다. 매 요청마다 DB에서 ResourcePermission을 조회하는 구조라서 성능 걱정이 들긴 했다. 그런데 결국 캐싱 없이 매 요청마다 빌드하는 방식으로 결정했다.

이유가 두 가지였다. 외부 관리자의 권한이 수동으로 회수될 수 있는 케이스가 있어서 캐시 무효화 전략이 생각보다 복잡해진다는 점, 그리고 현재 사용자 규모에서는 DB 조회 비용이 허용 범위 안이라는 점. 규모가 커지면 Redis 캐싱이 자연스러운 다음 단계겠지만, 지금은 단순함을 유지하는 쪽이 맞다고 판단했다.

`AbilityClsService`는 CLS에 Ability를 넣고 꺼내는 역할만 한다.

```typescript
@Injectable()
class AbilityClsService {
  async setupForRequest(userId: string): Promise<void> {
    const ability = await this.abilityBuildService.buildForUser(userId);
    this.cls.set('ability', ability);
    this.cls.set('userId', userId);
  }

  getAbility(): AppAbility { return this.cls.get('ability'); }
  getUserId(): string       { return this.cls.get('userId'); }
}
```

이 방식 덕분에 Service에서 `this.abilityClsService.getAbility()` 한 줄로 현재 요청의 Ability를 가져올 수 있다.

---

## Guard — @WithCourseAccess 데코레이터로 3개 Guard를 한 번에

실제 컨트롤러에서는 Guard를 직접 등록하지 않는다. Subject별 전용 데코레이터가 Guard 3개를 한 번에 적용한다.

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
export function WithCourseAccess(options: WithCourseAccessOptions) {
  return applyDecorators(
    SetMetadata(RESOLVE_USER_KEY, { allowGuest: false }),
    SetMetadata(LOAD_ABILITY_KEY, true),
    SetMetadata(WITH_COURSE_ACCESS_KEY, options),
    UseGuards(ResolveUserGuard, LoadAbilityGuard, WithCourseAccessGuard),
  );
}
```

`LoadAbilityGuard`가 1차를 담당한다. Ability를 빌드해 CLS에 저장하고, 해당 Action에 대한 규칙이 아예 없으면 즉시 403을 반환한다. DB 리소스 조회 없이 빠른 차단이 이 지점에서 일어난다.

`WithCourseAccessGuard`가 2차를 담당한다. request에서 courseId를 추출하고, Course를 DB에서 조회한 뒤 `assertCan`으로 리소스 Condition까지 평가한다.

request params에 resource ID가 있는 엔드포인트 — GET/DELETE처럼 기존 리소스를 대상으로 하는 경우 — 는 Guard 단계에서 2차 검증까지 끝낼 수 있다. Service의 `assertCan`은 이런 경우에도 Defense-in-depth 목적으로 유지하거나, Guard가 없는 내부 Service 호출에서 쓴다.

타입 안전성도 챙겼다. `SubjectActionMap` 타입 덕분에 잘못된 action-subject 조합은 컴파일 에러가 난다.

```typescript
// 컴파일 에러 — UnitAction.Clone은 CourseAccess에 쓸 수 없다
@WithCourseAccess({ action: UnitAction.Clone, source: 'params', key: 'id' })
```

Deny 규칙도 여기서 처리한다. `assertCan`이 false이면 `ForbiddenException`이 자동으로 발생한다.

---

## AbilityCheckService — 리소스 객체를 받아 Condition까지 평가하는 2차 검증

Service 레이어에서 사용한다. 이 시점에는 실제 리소스 객체가 있다.

```typescript
@Injectable()
class AbilityCheckService {
  assertCan({ action, subject, resource }) {
    const ability = this.abilityClsService.getAbility();
    if (!ability.can(action, subject(subject, resource))) {
      throw new ForbiddenException();
    }
  }

  can({ action, subject, resource }): boolean { ... }

  filterAccessible({ action, subject, resources }) {
    const ability = this.abilityClsService.getAbility();
    return resources.filter(resource =>
      ability.can(action, subject(subject, resource))
    );
  }
}
```

`subject(subject, resource)` 이 부분이 CASL의 핵심이다.

단순히 `'Course'` 문자열이 아니라 실제 리소스 객체(`{ id: 'course-7', spaceId: 'space-1' }`)를 넘긴다. CASL은 이 객체의 속성값을 PolicyRule의 Condition과 비교해서 접근 가능 여부를 판단한다.

실제 사용 예시:

```typescript
@Injectable()
class CourseService {
  async updateCourse(courseId: string, dto: UpdateCourseDto) {
    const course = await this.courseRepository.findById(courseId);

    this.abilityCheck.assertCan({
      action:   CourseAction.Update,
      subject:  Subject.Course,
      resource: { id: course.id, spaceId: course.spaceId },
    });

    return this.courseRepository.update(courseId, dto);
  }
}
```

`getAccessConditions`는 목록 조회에 더 적합하다. `filterAccessible`이 "이미 로드한 리소스를 필터링"하는 것과 달리, CASL 조건을 MongoDB 필터 쿼리로 변환해서 DB에서부터 접근 가능한 것만 가져온다.

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

전체를 로드한 뒤 필터링하면 접근 불가한 문서도 DB에서 읽는다. 외부 관리자처럼 접근 가능한 리소스가 제한적인 케이스에서 이 차이가 크다.

한 가지 주의사항이 있다. `assertCan`에 Mongoose Document를 직접 넘기면 안 된다.

```typescript
// ❌ Mongoose Document 직접 전달
this.abilityCheck.assertCan({ resource: course });

// ✅ plain object로 변환 후 전달
this.abilityCheck.assertCan({ resource: course.toObject() });
```

Mongoose Document를 그대로 넘기면 getter/virtual이 CASL의 `$in` 조건 매칭에 간섭할 수 있다. `.toObject()` 후 plain object 변환이 필수다. 처음에 이걸 몰랐다가 조건 매칭이 이상하게 동작하는 걸 보고 한참 헤맸다. ~~(부끄럽다)~~

---

## 마치며: Guard 하나로 끝낼 수 있을 거라 생각했던 시절

처음엔 Guard 하나에서 모든 걸 처리하면 구조가 단순해질 거라고 생각했다. 권한 검증을 한 곳에서만 하면 추적도 쉽고, 책임도 명확해진다고 봤다.

그런데 실제로 구현해보니, Guard는 "이 사람이 이 작업을 할 자격이 있는가"를 보는 곳이고, Service는 "이 특정 대상에 대해 실제로 허용되는가"를 보는 곳이라는 게 자연스럽게 분리됐다. 역할이 원래부터 달랐던 거다.

2단계로 나누고 나니 오히려 구조가 더 명확해졌다. Guard는 빠른 차단에 집중하고, Service는 리소스 레벨의 세밀한 판단에 집중한다.

3편에서는 이 시스템을 프로덕션에 녹여내는 과정을 다룬다.
