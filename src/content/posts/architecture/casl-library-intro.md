> CASL(Complex Ability Statement Language)은 TypeScript/JavaScript 에서 사용할 수 있는 권한 관리 라이브러리다.
"누가 무엇을 할 수 있는가"를 선언적으로 정의하고, 런타임에 검증하는 구조다.

GEM 서비스에 리소스 단위 권한 체계를 도입하기로 결정했을 때, 가장 먼저 한 일이 라이브러리 탐색이었다.
권한 평가 엔진을 처음부터 만들면 유연하겠지만, 그 복잡도가 생각보다 크다.
특히 "이 사용자가 이 특정 리소스에 접근 가능한가"처럼 리소스 속성 조건까지 평가해야 하는 케이스를 고려하면 더욱 그렇다.

탐색 끝에 선택한 게 CASL이다.
이 글은 PBAC 시리즈(1~3편)에서 사용한 CASL의 핵심 개념을 별도로 정리한 레퍼런스다.
시리즈를 읽기 전에 CASL이 무엇인지 먼저 감을 잡고 싶다면 이 글부터 읽는 게 순서가 맞다.

---

## 왜 CASL을 선택했는가?

GEM에 리소스 단위 권한 체계를 구축하면서 어떤 라이브러리가 필요한지 먼저 정리했다.
단순히 역할(Role)에 따라 접근을 막는 수준이 아니라, 특정 리소스에 대한 조건 평가까지 커버해야 했다.
"이 사용자가 Course를 수정할 수 있는가"에서 그치는 게 아니라, "이 사용자가 `course-7`을 수정할 수 있는가"를 판단해야 하는 케이스가 있었다.
필요한 조건은 세 가지였다.

- **TypeScript 네이티브 지원**: 타입 안전하게 권한 규칙을 정의할 수 있어야 한다. 문자열로 action과 subject를 넘기다 보면 오타나 잘못된 조합을 컴파일 타임에 잡아낼 수 없다.
- **Condition 기반 평가**: "이 사용자가 Course를 수정할 수 있는가"에서 그치지 않고, "이 사용자가 `course-7`을 수정할 수 있는가"처럼 리소스 속성 조건까지 포함해 검증할 수 있어야 한다.
- **NestJS 통합 용이**: Guard/Service 레이어에 자연스럽게 녹아들 수 있어야 한다. 복잡한 설정이나 별도 컨텍스트 관리를 요구하는 라이브러리는 부담이 크다.

CASL은 세 조건을 모두 만족했다.
그 중에서도 결정적이었던 건 Condition 기반 평가다.
`can('update', subject('Course', { id: 'course-7' }))` 패턴으로 리소스 객체의 속성값까지 조건에 넣어 평가할 수 있다는 점이, 기존에 서비스 레이어에서 수동으로 처리하던 접근 제어 로직을 선언형으로 바꿔주었다.

---

## CASL이 지향하는 것: ABAC

CASL의 공식 문서 첫 줄에는 이런 문장이 있다.

> CASL implements Attribute Based Access Control (ABAC)

ABAC는 Attribute Based Access Control의 약자다.
역할(Role) 중심이 아니라 속성(Attribute) 중심으로 접근 제어를 정의한다는 뜻이다.

기존 RBAC(Role Based Access Control)는 "관리자 역할을 가진 사용자는 게시글을 삭제할 수 있다"처럼 역할에 권한을 묶는다.
ABAC는 한 발 더 나아간다.
"이 사용자는 자신이 작성한 게시글만 삭제할 수 있다"처럼, 리소스의 속성까지 조건으로 넣는다.

실제로 GEM의 권한 요구사항은 순수 RBAC로는 표현이 안 됐다.
역할이 있더라도 "자신의 리소스인가", "특정 Space에 속하는가" 같은 속성 조건이 항상 따라붙었다.
CASL의 ABAC 구조가 필요했던 이유가 여기에 있다.

---

## 핵심 용어: Action, Subject, Fields, Conditions

CASL에서 권한 규칙은 4가지 요소로 구성된다.
이 용어를 명확히 잡아두지 않으면 나중에 개념이 뒤섞인다.

1. **Action**: 사용자가 수행하는 행위. `read`, `update`, `delete` 같은 동사다. 예약어 `manage`는 모든 Action을 의미한다.
2. **Subject**: 행위의 대상이 되는 도메인 엔티티. `Course`, `Space`, `User` 같은 명사다. 예약어 `all`은 모든 Subject를 의미한다.
3. **Fields**: Subject의 특정 필드에만 Action을 제한할 때 사용한다. 예를 들어 `title`과 `description`만 수정 가능하게 한다.
4. **Conditions**: Subject의 속성 조건. `authorId`가 현재 사용자인 경우만 허용하는 식이다.

그리고 이 4가지 요소의 조합이 **Rule**이 된다.
Rule들의 집합이 **Ability**고, `Ability`가 CASL에서 모든 권한 검증의 진입점이다.

```typescript
import { createMongoAbility } from '@casl/ability';

const ability = createMongoAbility([
  // Action만: Course 읽기 허용
  { action: 'read', subject: 'Course' },

  // Action + Conditions: authorId가 일치하는 Course만 수정 허용
  { action: 'update', subject: 'Course', conditions: { authorId: 1 } },

  // Action + Fields + Conditions: 허용된 필드와 조건 모두 충족 시에만
  { action: 'update', subject: 'Course', fields: ['title', 'description'], conditions: { authorId: 1 } },
]);
```

---

## 규칙을 정의하는 세 가지 방법

CASL은 규칙을 정의하는 방법을 세 가지 제공한다.

### defineAbility — 빠른 프로토타이핑

`can`/`cannot` DSL로 즉시 `MongoAbility` 인스턴스를 만드는 함수다.
테스트나 예제에서 빠르게 쓰기 좋다.

```typescript
import { defineAbility } from '@casl/ability';

const ability = defineAbility((can, cannot) => {
  can('read', 'Post');
  cannot('delete', 'Post', { published: true });
});
```

공식 문서는 이 방식을 단위 테스트나 학습 목적에만 권장한다.
콜백 안에 조건 분기를 넣다 보면 인지 복잡도가 빠르게 올라가기 때문이다.

### AbilityBuilder — 조건부 규칙 정의

사용자의 역할이나 상태에 따라 규칙이 달라질 때 쓴다.
조건 분기를 깔끔하게 넣을 수 있다.

```typescript
import { AbilityBuilder, createMongoAbility } from '@casl/ability';

export function defineAbilityFor(user: User) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (user.isAdmin) {
    can('manage', 'all');
  } else {
    can('read', 'all');
    can('update', 'Course', { authorId: user.id });
  }

  cannot('delete', 'Course', { published: true });

  return build();
}
```

### JSON 객체 — DB에서 가져온 규칙

GEM처럼 권한 규칙이 DB에 저장되는 경우의 방식이다.
API 응답으로 받은 규칙 배열을 그대로 `createMongoAbility`에 넘긴다.

```typescript
import { createMongoAbility } from '@casl/ability';

const rules = [
  { action: 'read', subject: 'Course' },
  { action: 'update', subject: 'Course', conditions: { authorId: 1 } },
  { action: 'delete', subject: 'Course', inverted: true }, // Deny 규칙
];

const ability = createMongoAbility(rules);
```

`inverted: true`는 Deny 규칙이다.
`cannot` DSL과 동일한 효과를 낸다.
동적 권한 시스템에서는 이 방식이 가장 자연스럽다.

---

## Ability — 권한의 컨테이너

`Ability`는 특정 사용자가 수행할 수 있는 행위의 집합이다.
CASL에서 모든 권한 검증은 이 Ability 인스턴스를 통해 이루어진다.

권한 규칙 배열을 인자로 넘겨 생성하고, 이후 `.can()` / `.cannot()` 으로 허용 여부를 확인한다.
"컨테이너"라는 이름처럼, 한 사용자가 가진 모든 권한 규칙이 이 객체 하나에 담기는 구조다.

```typescript
import { createMongoAbility } from '@casl/ability';

const ability = createMongoAbility([
  { action: 'read',   subject: 'Course' },
  { action: 'update', subject: 'Course', conditions: { id: 'course-7' } },
]);

ability.can('read',   'Course');                                    // true
ability.can('update', 'Course');                                    // true
ability.can('update', subject('Course', { id: 'course-7' }));      // true
ability.can('update', subject('Course', { id: 'course-8' }));      // false
```

두 번째 규칙처럼 Condition이 붙어 있어도, `can('update', 'Course')` 는 Condition을 무시하고 true를 반환한다.
`subject()` 헬퍼로 실제 리소스 객체를 감싸 넘겨야 비로소 Condition 매칭이 일어난다.

처음에는 이 동작이 의아했다. Condition이 있는 규칙인데 왜 조건 없이 호출하면 그냥 true가 나오지?
생각해보면 합리적인 설계인데, Guard 레이어에서는 아직 리소스를 DB에서 꺼내기 전이다.
리소스 객체 없이 "이 사용자에게 update 권한 자체는 있는가"를 먼저 체크하는 용도로 쓰이기 때문에, Condition을 무시하는 게 의도된 동작이다.

---

## Conditions 심화 — MongoDB 쿼리로 속성 조건 정의

CASL의 Conditions는 MongoDB 쿼리 문법을 기반으로 한다.
[ucast](https://github.com/stalniy/ucast) 라이브러리를 통해 MongoDB 쿼리 연산자를 그대로 조건에 쓸 수 있다.

Mongoose를 사용하면 `accessibleBy(ability, 'read').ofType('Course')` 헬퍼가 이 조건을 실제 Mongoose 쿼리로 변환해준다.
"이 사용자가 읽을 수 있는 Course 목록"을 DB에서 바로 뽑아낼 수 있는 이유가 여기에 있다.
접근 제어 조건이 DB 쿼리 조건과 동일한 문법이기 때문에 별도로 쿼리를 관리할 필요가 없어지는 것이다.

지원되는 주요 연산자를 정리하면 이렇다.

```typescript
const ability = createMongoAbility([
  // $in: 특정 값 목록 중 하나인 경우
  { action: 'read', subject: 'Course', conditions: { status: { $in: ['published', 'review'] } } },

  // $lte / $gte: 날짜·숫자 범위 비교
  { action: 'read', subject: 'Course', conditions: { createdAt: { $lte: new Date() } } },

  // $ne: 특정 값이 아닌 경우
  { action: 'read', subject: 'Course', conditions: { status: { $ne: 'deleted' } } },

  // $exists: 해당 필드 존재 여부
  { action: 'read', subject: 'Course', conditions: { deletedAt: { $exists: false } } },

  // $regex: 정규식 매칭 (문자열 전용)
  { action: 'read', subject: 'User', conditions: { email: { $regex: /@goorm\.io$/i } } },

  // dot notation: 중첩 필드 접근
  { action: 'read', subject: 'Course', conditions: { 'space.isoCode': 'KR' } },
]);
```

조건이 여러 개면 AND 로직으로 처리된다.
같은 action/subject 쌍으로 여러 규칙을 등록하면 OR 로직으로 합쳐진다.

```typescript
const ability = createMongoAbility([
  // 이 두 규칙은 OR: 둘 중 하나만 만족해도 읽을 수 있다
  { action: 'read', subject: 'Course', conditions: { published: true } },
  { action: 'read', subject: 'Course', conditions: { sharedWith: userId } },
]);
```

논리 연산자(`$and`, `$or`, `$not`, `$nor`)는 의도적으로 지원하지 않는다.
같은 효과를 `can`/`cannot` 규칙 조합으로 표현할 수 있기 때문이다.

---

## Fields — 필드 레벨 접근 제어

Conditions까지 쓰면 "이 사용자가 이 리소스에 접근할 수 있는가"를 판단할 수 있다.
그런데 "이 사용자가 이 리소스의 어떤 필드를 수정할 수 있는가"까지 제어하고 싶을 때가 있다.

"작성자는 title과 description만 수정 가능하고, 관리자만 published를 바꿀 수 있다"는 식의 요구사항이다.

CASL은 `fields` 배열로 이 케이스를 처리한다.

```typescript
const ability = defineAbility((can) => {
  can('update', 'Article', ['title', 'description'], { authorId: user.id });

  if (user.isModerator) {
    can('update', 'Article', ['published']);
  }
});
```

`can(action, subject, fields, conditions)` 순서다.
fields가 지정된 규칙은 해당 필드에 대해서만 action이 허용된다.
fields가 없으면 모든 필드에 접근 가능한 것으로 처리된다.

권한을 확인할 때는 세 번째 인자로 필드명을 넘긴다.

```typescript
ability.can('update', 'Article', 'published');      // moderator: true, 일반 user: false
ability.can('update', ownArticle, 'title');         // true (조건 일치 + 필드 허용)
ability.can('update', anotherArticle, 'title');     // false (조건 불일치)
```

`permittedFieldsOf` 헬퍼를 쓰면 사용자가 접근 가능한 필드 목록을 뽑아낼 수 있다.

```typescript
import { permittedFieldsOf } from '@casl/ability/extra';

const ALL_FIELDS = ['title', 'description', 'authorId', 'published'];
const fields = permittedFieldsOf(ability, 'update', ownArticle, {
  fieldsFrom: rule => rule.fields || ALL_FIELDS,
});
// ['title', 'description']
```

이 목록을 es-toolkit `pick`과 조합하면 사용자가 요청한 body에서 허용된 필드만 추려 DB 업데이트에 사용할 수 있다.

---

## Subject 타입 감지: 왜 subject()가 필요한가

Conditions 평가에서 빠지기 쉬운 함정 하나를 짚고 넘어가자.

CASL이 `ability.can('update', course)` 를 호출할 때, 이 `course` 객체가 어떤 Subject인지 어떻게 알까?

기본 동작은 `object.constructor.modelName` → `object.constructor.name` 순서로 Subject 타입을 감지한다.
`new Course()` 처럼 클래스 인스턴스라면 자동으로 인식된다.

그런데 Mongoose의 `.lean()` 으로 조회한 결과물은 plain object다.
`constructor.name`이 `Object`가 되어 CASL이 어떤 Subject인지 인식하지 못한다.
Condition이 항상 무시되거나 의도와 다른 결과가 나오는데, **에러 없이 조용히 실패하기 때문에 원인을 찾기가 쉽지 않다.**

`subject()` 헬퍼가 이 문제를 해결한다.

```typescript
import { subject } from '@casl/ability';

// ❌ plain object — CASL이 Subject 타입을 인식 못함, Condition 무시
const course = await CourseModel.findById(id).lean();
ability.can('update', course); // Condition 평가 안 됨

// ✅ subject()로 타입 명시
ability.can('update', subject('Course', course)); // Condition 정상 평가
```

`subject('Course', resource)` 는 리소스 객체에 `__caslSubjectType__` 프로퍼티를 추가해준다.
CASL이 Subject 타입 감지 과정에서 이 프로퍼티를 우선 확인하는 방식이다.

plain object는 어떤 Subject인지 CASL이 자동으로 알 수 없기 때문에, 이 헬퍼로 Subject 정보를 명시적으로 주입해야 Condition 매칭이 동작한다.

---

## Allow / Deny 규칙 병합

같은 Action/Subject 조합에 Allow와 Deny 규칙이 공존할 수 있다.
`inverted: true` 로 Deny를 표현하며, **Deny가 Allow보다 항상 우선한다.**

```typescript
const ability = createMongoAbility([
  { action: 'delete', subject: 'Course' },                              // 전체 Course 삭제 허용
  { action: 'delete', subject: 'Course',
    inverted: true, conditions: { id: 'course-7' } },                   // course-7만 삭제 차단
]);

ability.can('delete', subject('Course', { id: 'course-8' }));           // true
ability.can('delete', subject('Course', { id: 'course-7' }));           // false — Deny 우선
```

GEM에서는 이 구조로 외부 관리자의 특정 리소스 접근을 차단하는 PolicyOverride를 구현했다.
Level 기반 Allow가 먼저 등록되고, PolicyOverride Deny가 나중에 등록되어 어떤 Allow 규칙도 덮어쓰게 했다.

Allow/Deny 병합에서 핵심은 **규칙 등록 순서가 곧 우선순위**라는 것이다.
Allow를 먼저 전부 등록하고, Deny는 마지막에 등록해야 의도한 대로 Deny가 Allow를 덮어쓴다.
순서가 잘못되면 Allow가 Deny보다 늦게 등록되어 오히려 Deny를 무력화하는 상황이 생긴다.
GEM에서는 이 원칙을 `AbilityFactory` 설계에 직접 반영했다. 상세 구현은 PBAC 시리즈 2편에서 다룬다.

---

## Action Alias — 여러 Action을 하나로

"이 사용자가 Course를 modify할 수 있는가"를 체크할 때, `update`와 `delete` 모두 허용된 경우에만 true가 되어야 한다면 어떻게 할까?

`createAliasResolver`로 여러 Action을 하나의 Alias로 묶을 수 있다.

```typescript
import { defineAbility, createAliasResolver } from '@casl/ability';

const resolveAction = createAliasResolver({
  modify: ['update', 'delete'],
});

const ability = defineAbility((can) => {
  can('modify', 'Post');
}, { resolveAction });

ability.can('modify', 'Post'); // true
ability.can('update', 'Post'); // true
ability.can('delete', 'Post'); // true
```

`modify`를 부여하면 `update`와 `delete` 모두 허용되며 Alias는 재귀적으로 중첩도 된다.

```typescript
const resolveAction = createAliasResolver({
  modify: ['update', 'delete'],
  access: ['read', 'modify'], // modify의 하위 action들까지 포함
});
```

주의할 점은 Alias 로 설정된 Action 의 경우 **반대 방향으로는 동작하지 않는다**는 것이다.
`update`와 `delete` 각각을 허용했다고 해서 `modify`가 자동으로 true가 되지는 않는다.
즉 Alias는 정의 시점에 한 방향으로만 해석된다.

---

## TypeScript 통합

### 타입 안전한 Ability 정의

`MongoAbility` 에 Action과 Subject 유니온 타입을 제네릭으로 넘기면 타입 레벨 검증이 가능하다.
컴파일 타임에 잘못된 Action이나 Subject 조합을 잡아낼 수 있어서, 오타나 실수를 런타임 에러 전에 발견할 수 있다.

```typescript
import { MongoAbility, createMongoAbility } from '@casl/ability';

type Actions  = 'create' | 'read' | 'update' | 'delete';
type Subjects = 'Course' | 'Unit' | 'Space';

type AppAbility = MongoAbility<[Actions, Subjects]>;

const ability: AppAbility = createMongoAbility([
  { action: 'read', subject: 'Course' },
]);

ability.can('read',  'Course');   // ✅
ability.can('fly',   'Course');   // ❌ 컴파일 에러 — 'fly' 는 Actions 에 없음
ability.can('read',  'Invoice');  // ❌ 컴파일 에러 — 'Invoice' 는 Subjects 에 없음
```

권한 시스템에서 잘못된 Action이나 Subject 조합이 런타임에 조용히 통과하면 보안 이슈로 이어질 수 있다.
새 Action이나 Subject가 추가될 때 누락된 부분을 컴파일러가 먼저 알려준다는 게 실무에서 체감되는 이점이다.
`AppAbility` 타입 정의 자체가 권한 시스템의 "스펙"이 된다.

### Action-Subject 쌍을 더 엄밀하게

더 나아가, 특정 Action이 특정 Subject에만 적용 가능하도록 타입 수준에서 제한할 수도 있다.

```typescript
type Abilities =
  | ['read', 'User']
  | ['create' | 'read' | 'update' | 'delete', 'Course' | 'Space'];

type AppAbility = MongoAbility<Abilities>;

const ability = createMongoAbility<AppAbility>([]);

ability.can('read',   'User');    // ✅
ability.can('create', 'User');    // ❌ 컴파일 에러 — User는 read만 허용
```

### RawRuleOf — DB에서 규칙을 가져올 때

DB에 저장된 규칙을 `AppAbility` 타입과 맞춰 쓰고 싶을 때 `RawRuleOf<AppAbility>` 를 쓴다.

```typescript
import { RawRuleOf } from '@casl/ability';

const rules: RawRuleOf<AppAbility>[] = await getPolicyRulesFromDb();
const ability = createMongoAbility<AppAbility>(rules);
```

---

## NestJS에서 사용하기

NestJS에서 CASL을 통합하는 일반적인 패턴은 세 레이어다.

```typescript
// 1. AbilityFactory — DB 권한 데이터 → CASL Ability 변환
@Injectable()
class AbilityFactory {
  buildAbility(rules: PolicyRule[]): AppAbility {
    return createMongoAbility(rules);
  }
}

// 2. Guard (1차 검증) — 규칙 존재 여부만 빠르게 확인
@Injectable()
class AbilityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ability = this.getAbility();
    const { action, subject } = this.getMetadata(context);
    return ability.can(action, subject);
  }
}

// 3. Service (2차 검증) — 실제 리소스 Condition까지 평가
class CourseService {
  async updateCourse(id: string, dto: UpdateDto) {
    const course = await this.courseRepo.findById(id);
    if (!ability.can('update', subject('Course', course))) {
      throw new ForbiddenException();
    }
    return this.courseRepo.update(id, dto);
  }
}
```

Guard에서는 "이 사용자에게 이 Action에 대한 규칙이 존재하는가"만 확인한다.
리소스 조회 없이 빠르게 차단할 수 있는 1차 방어선이다.
Service에서는 실제 리소스를 조회한 뒤 `subject('Course', course)` 형태로 넘겨 Condition까지 평가한다.

왜 굳이 두 단계로 나누는가 하면, Guard에서 Condition까지 전부 평가하려면 리소스를 먼저 조회해야 하기 때문이다.
권한이 없는 요청인데도 DB 조회가 일어나는 건 낭비다.
따라서 Guard에서 역할 수준의 사전 차단을 먼저 하고, 통과한 요청에 대해서만 Service에서 실제 리소스를 조회해 Condition까지 확인하는 구조가 합리적이다.

왜 두 단계로 나눠야 하는지, Guard에서 전부 처리하면 안 되는지에 대한 상세 설명은 PBAC 시리즈 2편에서 다룬다.
실제 GEM 서버에 적용한 상세 구현도 그쪽에서 확인할 수 있다.

---

## Ref.
- [CASL 공식 문서](https://casl.js.org/v7/en)
- [CASL + NestJS 공식 가이드](https://casl.js.org/v7/en/package/casl-nestjs)
- [GitHub: stalniy/casl](https://github.com/stalniy/casl)
