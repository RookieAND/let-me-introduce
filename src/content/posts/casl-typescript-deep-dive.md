## 기존 포스트에서 다루지 못한 것

[CASL/ABAC로 권한을 선언형으로 다시 설계하기](/posts/casl-abac-declarative-permissions)에서는 DB 제어를 걷어내고 `defineAbilityFor`로 권한을 코드에 선언하는 큰 그림을 정리했다. 이 글은 그 안에서 설명을 미뤘던 두 가지를 다룬다.

1. `InferSubjects` / `MongoAbility` / `ForcedSubject` — CASL 타입 시스템의 역할
2. Route Guard + Service 두 단계 권한 체크가 왜 모두 필요한가

---

## CASL 타입 시스템

전형적인 타입 정의부터 시작한다.

```typescript
import {
  AbilityBuilder,
  createMongoAbility,
  InferSubjects,
  MongoAbility,
} from '@casl/ability';
import { Post } from './post.schema';
import { User } from './user.schema';

type Subjects = InferSubjects<typeof Post | typeof User> | 'all';
type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';

export type AppAbility = MongoAbility<[Actions, Subjects]>;
```

### InferSubjects

클래스(생성자)를 받아 `클래스 자체 | 인스턴스 | 문자열 리터럴` 세 형태를 모두 Subject로 인정하는 유틸리티 타입이다.

```typescript
type Subjects = InferSubjects<typeof Post | typeof User>;
// 결과: Post | User | 'Post' | 'User' | (typeof Post) | (typeof User)
```

CASL은 권한 정의 시 문자열(`'Post'`)로도, 클래스(`Post`)로도 Subject를 지정할 수 있다. `InferSubjects`는 이 두 방식이 타입 레벨에서 연결되도록 보장한다.

**주의**: `InferSubjects`는 클래스(생성자)만 받는다. 인스턴스 타입을 넘기면 타입 에러가 난다.

```typescript
type Subjects = InferSubjects<typeof Post | typeof User>; // ✅
type Subjects = InferSubjects<Post | User>;               // ❌
```

### MongoAbility

`MongoAbility`는 기본 `PureAbility`를 MongoDB 쿼리 조건 문법(`{ field: value }`, `$in`, `$gt`)을 지원하도록 확장한 타입이다.

```typescript
// PureAbility: 기본 조건 없음
// MongoAbility: MongoDB-style conditions 지원

can('read', 'Post', { authorId: userId });
can('read', 'Post', { status: { $in: ['published', 'draft'] } }); // 확장 문법
```

`accessibleBy(ability, 'read').ofType('Post')` 헬퍼를 쓰면 이 조건이 Mongoose 쿼리로 변환된다.

### ForcedSubject와 subject() 헬퍼

Mongoose Document는 클래스 인스턴스이므로 CASL이 Subject를 자동으로 인식한다. 그러나 `.lean()`으로 조회하거나 `populate`된 sub-document는 plain object이기 때문에 CASL이 어떤 Subject인지 알 수 없다.

```typescript
// ❌ lean()으로 조회한 plain object
const post = await PostModel.findById(id).lean();
ability.can('update', post); // Subject를 인식하지 못함

// ✅ subject() 헬퍼로 Subject 정보 주입
import { subject } from '@casl/ability';
ability.can('update', subject('Post', post));
```

---

## 두 단계 권한 체크

타입 레벨 체크 하나만으로는 부족하다.

```
[1단계] Route Guard (타입 레벨)
  └─ "이 사용자가 Post를 update할 역할인가?"
  └─ DB 조회 없이 빠른 사전 차단
  └─ ability.can('update', 'Post')

[2단계] Service (인스턴스 레벨)
  └─ "이 사용자가 이 특정 Post를 update할 수 있는가?"
  └─ 실제 Document 조회 후 Condition 적용
  └─ ability.can('update', post)  ← post는 Mongoose Document
```

1단계만으로는 부족한 이유: 타입 레벨 체크는 `{ authorId: user.id }` 같은 조건(Condition)을 무시한다. 조건은 실제 인스턴스가 있어야만 평가된다.

### Controller — 1단계

```typescript
@Patch(':id')
@UseGuards(PoliciesGuard)
@CheckPolicies((ability: AppAbility) => ability.can('update', 'Post'))
async update(
  @Param('id') id: string,
  @Body() dto: UpdatePostDto,
  @CurrentUser() user: User,
) {
  const ability = this.caslAbilityFactory.createForUser(user);
  return this.postService.update(id, dto, ability);
}
```

`PoliciesGuard`는 CLS에서 Ability를 꺼내 `@CheckPolicies` 메타데이터와 대조한다. 통과하지 못하면 Service 진입 전에 차단된다.

### Service — 2단계

```typescript
async update(id: string, dto: UpdatePostDto, ability: AppAbility) {
  const post = await this.postModel.findById(id);

  if (!post) throw new NotFoundException();

  // 실제 Document로 Condition 평가
  if (ability.cannot('update', post)) {
    throw new ForbiddenException(
      ability.relevantRuleFor('update', post)?.reason
    );
  }

  Object.assign(post, dto);
  return post.save();
}
```

`cannot().because()`로 지정한 메시지가 `relevantRuleFor().reason`으로 꺼내져 ForbiddenException 메시지에 실린다.

---

## 트러블슈팅 — 자주 겪는 4가지

### 1. Mongoose Document인데 Subject를 못 찾는다

```typescript
// 원인: lean() 또는 populate된 sub-document는 plain object
const post = await PostModel.findById(id).lean();

// 해결
ability.can('update', subject('Post', post));
```

### 2. accessibleBy가 항상 빈 결과를 반환한다

```typescript
// 원인: ability에 해당 Subject의 read 권한이 없음
// accessibleBy는 { $and: [{ _id: null }] } 쿼리를 만들어 의도적으로 빈 결과 반환

// 디버깅
console.log(ability.rulesFor('read', 'Post'));
// 빈 배열이면 Factory에서 규칙이 누락된 것
```

### 3. 타입 레벨 체크는 통과하는데 인스턴스 체크에서 막힌다

의도된 동작이다. 타입 레벨은 규칙 존재 여부만 확인하고, 인스턴스 레벨은 `{ authorId: user.id }` 같은 Condition을 실제로 평가한다.

```typescript
// 디버깅
console.log(ability.rulesFor('update', post));
// 적용된 규칙 목록과 조건 확인
```

### 4. InferSubjects에 인터페이스를 넣으면 타입 에러

```typescript
type Subjects = InferSubjects<typeof Post | typeof User>; // ✅ 클래스
type Subjects = InferSubjects<Post | User>;               // ❌ 인스턴스 타입
```

---

## 체크리스트

- `MongooseAbility` 대신 `MongoAbility` 사용 확인
- `.lean()` 사용 시 `subject()` 헬퍼 적용 여부
- Route Guard는 타입 레벨, Service는 인스턴스 레벨 체크로 분리
- `accessibleBy` 빈 결과 → `ability.rulesFor()`로 디버깅
- `CaslModule`이 해당 모듈에 import 되어 있는지 확인
