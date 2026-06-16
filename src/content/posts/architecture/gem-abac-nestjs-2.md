> 처음에는 Guard 하나에서 모든 권한 검증을 끝내고 싶었다. 간단할 것 같았다. 그런데 구현하다 보니, Guard와 Service가 각각 다른 역할을 해야 한다는 게 보이기 시작했다.

## 왜 검증을 두 단계로 나눴는가

Guard에서 완벽한 권한 검증을 하려면 "이 사용자가 이 특정 리소스에 접근 가능한가"까지 확인해야 한다.

그런데 이걸 Guard에서 하려면 리소스 정보(DB에서 조회)가 필요하다.

Guard는 컨트롤러보다 먼저 실행된다.

즉, Guard 시점에는 아직 Service 로직이 수행되지 않았고, 실제 리소스 객체도 없다.

매번 Guard에서 DB를 한 번 더 조회해서 리소스를 가져오는 건 불필요한 중복 조회다.

그래서 역할을 나눴다.

```
Guard (1차):  "이 사용자에게 이 Action에 대한 규칙 자체가 존재하는가?"
              → 규칙이 없으면 즉시 403. DB 조회 없이 빠른 차단.

Service (2차): "이 특정 리소스에 대해 실제로 접근이 가능한가?"
              → 리소스 객체를 넘겨 Condition까지 평가. 세밀한 검증.
```

대부분의 403은 "규칙 자체가 없어서" 발생한다. 1차에서 대부분을 걸러내고, 정말 리소스 조건까지 따져야 하는 케이스만 2차로 넘긴다.

---

## 데이터 레이어 설계

### ResourcePermission

사용자와 리소스 간의 권한 관계를 저장하는 컬렉션이다.

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

### PolicyOverride

유저별 예외 규칙을 저장한다. `rules` 배열 안에 CASL PolicyRule이 직접 담긴다. 이걸 생성하거나 수정하는 건 개발자가 직접 한다. 일반 UI에 노출되지 않는다.

---

## expandLevelToRules — Level을 실제 권한 규칙으로 변환

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

핵심은 `resources: [resourceId]` 다.

"이 사용자는 Course라는 Subject에 EDITOR 권한이 있다"가 아니라, "이 사용자는 `course-7`이라는 특정 Course에 EDITOR 권한이 있다"로 변환된다. 이 한 줄이 리소스 스코프 권한의 핵심이다.

Space ADMIN 정적 상속도 여기서 처리한다. Space ADMIN이면 하위 Course/Unit/Submission에도 ADMIN PolicyRule을 추가 생성한다.

---

## AbilityFactory — Allow 먼저, Deny는 나중에

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

`resources: ['course-7']`는 그대로 CASL에 전달할 수 없다. MongoDB 조건 형식으로 변환이 필요하다.

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

## AbilityBuildService + AbilityClsService

실제로 사용자의 Ability를 빌드하는 서비스다.

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

매 요청마다 DB에서 ResourcePermission을 조회한다. 캐싱을 검토했는데 결국 지금은 캐싱 없이 매 요청마다 빌드하는 방식으로 갔다. 이유가 있다.

- 외부 관리자의 권한이 수동으로 회수될 수 있는 케이스가 있어서 캐시 무효화 전략이 복잡해진다.
- 현재 사용자 규모에서는 DB 조회 비용이 허용 범위 안이었다.

규모가 커지면 Redis 캐싱이 자연스러운 다음 단계다.

Guard에서 빌드한 Ability를 Service까지 전달하는 데 `nestjs-cls` (AsyncLocalStorage 기반)를 사용했다. 요청마다 독립된 저장소가 생기므로 요청 간 오염이 없다.

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

## Guard (1차 검증) — @WithCourseAccess 데코레이터

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

`WithCourseAccessGuard` 내부에서는 request에서 courseId를 추출하고, Course를 DB에서 조회한 뒤 `assertCan`을 호출한다. 즉 Guard에서 이미 리소스를 로드하고 Condition 매칭까지 처리한다.

타입 안전성도 챙겼다. `SubjectActionMap` 타입 덕분에 잘못된 action-subject 조합은 컴파일 에러가 난다.

```typescript
// 컴파일 에러 — UnitAction.Clone은 CourseAccess에 쓸 수 없다
@WithCourseAccess({ action: UnitAction.Clone, source: 'params', key: 'id' })
```

Deny 규칙도 여기서 처리한다. `assertCan`이 false이면 `ForbiddenException`이 자동으로 발생한다.

---

## AbilityCheckService (2차 검증) — 리소스 Condition까지 평가

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

Mongoose Document를 그대로 넘기면 getter/virtual이 CASL의 `$in` 조건 매칭에 간섭할 수 있다. `.toObject()` 후 plain object 변환이 필수다.

---

## Conclusion

1차 검증은 빠른 차단, 2차 검증은 세밀한 판단.

역할을 나누고 나니 각 레이어의 책임이 명확해졌다. Guard는 "이 사람이 이 작업을 할 자격이 있는가"를 보고, Service는 "이 특정 대상에 대해 실제로 허용되는가"를 본다.

3편에서는 이 시스템을 프로덕션에 녹여내는 과정을 다룬다.
