## 기존 포스트에서 다루지 못한 것

[CASL/PBAC로 권한을 선언형으로 다시 설계하기](/posts/casl-abac-declarative-permissions)에서는 DB 제어를 걷어내고 `defineAbilityFor`로 권한을 코드에 선언하는 큰 그림을 정리했다.
글을 쓰면서 CASL 타입 시스템에 대한 설명이 자꾸 길어졌는데, 욕심 부리면 글이 산으로 가니까 이 두 가지를 별도 글로 분리했다.

1. `InferSubjects` / `MongoAbility` / `ForcedSubject` — CASL 타입 시스템의 역할
2. Route Guard + Service 두 단계 권한 체크가 왜 모두 필요한가

처음 CASL을 붙일 때는 "타입 정의는 대충 맞추면 되겠지"라고 생각했다.
그게 틀렸다.
`InferSubjects`에 잘못된 타입을 넣고 한참 헤맸고, 두 단계 권한 체크가 왜 필요한지도 실제로 부딪혀보고 나서야 납득이 됐다.

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

세 타입 유틸리티가 각자 다른 역할을 담당한다.
처음에는 이 셋이 왜 나뉘어 있는지 잘 와닿지 않았는데, 직접 써보고 나서 각 역할이 명확하게 이해됐다.

### InferSubjects

클래스(생성자)를 받아 `클래스 자체 | 인스턴스 | 문자열 리터럴` 세 형태를 모두 Subject로 인정하는 유틸리티 타입이다.

```typescript
type Subjects = InferSubjects<typeof Post | typeof User>;
// 결과: Post | User | 'Post' | 'User' | (typeof Post) | (typeof User)
```

CASL은 권한 정의 시 문자열(`'Post'`)로도, 클래스(`Post`)로도 Subject를 지정할 수 있다.
직접 권한 체계를 설계할 때는 보통 문자열(`'Post'`)로 정의하고, 실제 DB에서 조회한 Mongoose Document를 검증할 때는 Document 인스턴스 자체를 넘기게 된다.
`InferSubjects`는 이 두 방식이 타입 레벨에서 연결되도록 보장한다.

처음에 이 부분에서 헤맸던 건 클래스와 인스턴스 타입의 차이였다.

**주의**: `InferSubjects`는 클래스(생성자)만 받는다. 인스턴스 타입을 넘기면 타입 에러가 난다.

```typescript
type Subjects = InferSubjects<typeof Post | typeof User>; // ✅
type Subjects = InferSubjects<Post | User>;               // ❌
```

`Post`는 인스턴스 타입이고, `typeof Post`가 클래스(생성자 함수) 자체다.
`InferSubjects`는 내부적으로 생성자의 프로토타입을 따라가야 하기 때문에, 인스턴스 타입으로는 필요한 추론이 불가능하다.
처음에 `Post`를 그냥 넣었다가 타입 에러가 났는데, 오류 메시지만으로는 원인을 바로 파악하기 어려웠다.
`typeof Post`를 넣어야 한다는 걸 알고 나서는 오히려 설계 의도가 이해됐다.
CASL이 "이 클래스의 인스턴스라면 어떤 Subject인가"를 추론하려면 생성자 정보가 있어야 하기 때문이다.

### MongoAbility

`MongoAbility`는 기본 `PureAbility`를 MongoDB 쿼리 조건 문법(`{ field: value }`, `$in`, `$gt`)을 지원하도록 확장한 타입이다.

```typescript
// PureAbility: 기본 조건 없음
// MongoAbility: MongoDB-style conditions 지원

can('read', 'Post', { authorId: userId });
can('read', 'Post', { status: { $in: ['published', 'draft'] } }); // 확장 문법
```

MongoDB 쿼리 문법을 채택한 이유가 있다.
`accessibleBy(ability, 'read').ofType('Post')` 헬퍼를 쓰면 이 조건이 Mongoose 쿼리로 변환된다.
"이 사용자가 읽을 수 있는 Post 목록"을 뽑는 쿼리를 별도로 작성할 필요 없이 CASL 규칙에서 바로 추출할 수 있다.
목록 조회 API에서 접근 가능한 Document만 반환해야 하는 케이스에서 특히 유용하다.

권한 조건과 DB 쿼리 조건이 동일한 문법으로 표현된다는 점이 `accessibleBy`를 처음 썼을 때 가장 인상적이었다.
권한 규칙 자체가 DB 쿼리 조건이 되는 구조다.
접근 가능한 목록을 조회할 때 권한 체크용 로직과 DB 쿼리를 따로 관리할 필요가 없어지는 것이다.

### ForcedSubject와 subject() 헬퍼

Mongoose Document는 클래스 인스턴스이므로 CASL이 Subject를 자동으로 인식한다.

그러나 `.lean()`으로 조회하거나 `populate`된 sub-document는 plain object이기 때문에 CASL이 어떤 Subject인지 알 수 없다.
이 케이스에서 `ability.can('update', post)` 를 호출하면 CASL이 Subject를 파악하지 못해 허용 여부를 올바르게 판단하지 못한다.

```typescript
// ❌ lean()으로 조회한 plain object
const post = await PostModel.findById(id).lean();
ability.can('update', post); // Subject를 인식하지 못함

// ✅ subject() 헬퍼로 Subject 정보 주입
import { subject } from '@casl/ability';
ability.can('update', subject('Post', post));
```

`.lean()` 은 Mongoose virtual 필드나 메서드가 붙지 않은 순수 POJO를 반환한다.
CASL은 Document 클래스 정보를 통해 Subject를 식별하는데, plain object에는 그 정보가 없다.
`subject('Post', post)` 가 수동으로 Subject 태그를 붙여주는 이유가 여기에 있다.

이 문제가 까다로운 이유는 에러 없이 조용히 실패한다는 점이다.
Subject를 인식하지 못해도 예외가 발생하지 않고, Condition 매칭이 이루어지지 않거나 허용 여부가 의도와 다르게 평가된다.
`.lean()` 을 쓰는 곳마다 `subject()` 헬퍼를 챙겨야 하는 게 번거롭지만, 빠뜨리면 권한 체크가 실질적으로 뚫릴 수 있다.

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

1단계만으로 부족한 이유가 명확하다.
타입 레벨 체크는 `{ authorId: user.id }` 같은 Condition을 무시한다.
Condition은 실제 인스턴스가 있어야만 평가되기 때문이다.
1단계에서는 "이 사람이 Post를 수정할 수 있는 역할인가"만 확인하고, 2단계에서 "이 특정 Post의 authorId가 본인인가"까지 판단하는 구조다.

처음에는 중복처럼 보였다.
"서비스에서 Condition까지 전부 체크하면 되는데, Guard가 왜 필요하지?" 싶었다.
뒤집어 생각해보면, Guard 없이 Service에서만 체크하면 권한이 없는 모든 요청이 DB 조회까지 다 거친다.
Guard가 DB 조회 전에 역할 수준 차단을 먼저 담당하는 것이다.
두 단계가 각각 다른 비용과 다른 정밀도로 나뉜다고 이해하고 나서야 납득이 됐다.

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

`PoliciesGuard`는 CLS에서 Ability를 꺼내 `@CheckPolicies` 메타데이터와 대조한다.
여기서는 `'Post'` 문자열을 넘기므로, 이 사용자가 Post에 대한 update 규칙 자체를 가지고 있는지만 확인한다.
Condition 매칭 없이 빠르게 통과시키거나 차단할 수 있는 게 1단계의 역할이다.
통과하지 못하면 Service 진입 전에 차단되므로 불필요한 DB 조회가 줄어든다.

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

Service에서는 실제 Document(`post`)를 넘겨 `{ authorId: user.id }` 같은 Condition까지 평가한다.
Mongoose Document를 직접 넘기면 CASL이 클래스 정보로 Subject를 자동 인식하므로 `subject()` 헬퍼가 필요 없다.

`cannot().because()`로 지정한 메시지가 `relevantRuleFor().reason`으로 꺼내져 ForbiddenException 메시지에 실린다.
권한 거부 이유를 클라이언트에게 전달해야 하는 케이스에서 유용하다.
"접근 권한이 없습니다"처럼 뭉뚱그리는 대신, 어떤 조건 때문에 막혔는지 구체적인 메시지를 줄 수 있다.

---

## 트러블슈팅 — 자주 겪는 4가지

### 1. Mongoose Document인데 Subject를 못 찾는다

```typescript
// 원인: lean() 또는 populate된 sub-document는 plain object
const post = await PostModel.findById(id).lean();

// 해결
ability.can('update', subject('Post', post));
```

`.lean()` 쿼리는 Mongoose Document가 아닌 순수 POJO를 반환하기 때문에 클래스 정보가 없다.
`populate`된 sub-document도 마찬가지다.
`subject()` 헬퍼로 Subject 정보를 수동으로 붙여줘야 한다.
에러 없이 조용히 Condition이 무시되므로, 권한 체크가 동작하지 않는다는 걸 알아채기 전까지 찾기 어렵다.

### 2. accessibleBy가 항상 빈 결과를 반환한다

```typescript
// 원인: ability에 해당 Subject의 read 권한이 없음
// accessibleBy는 { $and: [{ _id: null }] } 쿼리를 만들어 의도적으로 빈 결과 반환

// 디버깅
console.log(ability.rulesFor('read', 'Post'));
// 빈 배열이면 Factory에서 규칙이 누락된 것
```

권한이 없을 때 전체를 반환하는 게 아니라 의도적으로 빈 결과를 반환하도록 설계된 동작이다.
실수로 권한 규칙을 누락시킨 상황에서 "분명히 권한이 있는데 왜 빈 목록이 나오지?"로 헤매기 쉬운 케이스다.
`rulesFor`로 실제 규칙이 등록되어 있는지부터 확인하자.
빈 배열이라면 AbilityFactory에서 해당 Subject에 대한 규칙을 생성하는 코드가 빠진 것이다.

### 3. 타입 레벨 체크는 통과하는데 인스턴스 체크에서 막힌다

의도된 동작이다.
타입 레벨은 규칙 존재 여부만 확인하고, 인스턴스 레벨은 `{ authorId: user.id }` 같은 Condition을 실제로 평가한다.
1단계에서 통과했다는 건 규칙 자체는 존재한다는 뜻이고, 2단계에서 막혔다는 건 Condition이 맞지 않는다는 뜻이다.
버그가 아니라 설계 의도대로 동작하는 것이다.

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

`InferSubjects`는 생성자를 받아야 한다.
`Post`는 인스턴스 타입이고, `typeof Post`가 클래스 자체다.
인터페이스 기반으로 Subject를 정의하고 싶다면 `PureAbility`를 직접 쓰고 타입을 수동으로 선언하는 방법도 있다.

---

## 마치며

CASL 타입 시스템이 처음에는 낯설었다.
`InferSubjects`, `MongoAbility`, `ForcedSubject`가 각각 무슨 역할인지, 왜 이렇게 나뉘어 있는지가 바로 와닿지 않았다.

실제로 써보면서 이해한 핵심은 하나다.
CASL은 런타임에 "어떤 Subject인가"를 결정하고, 타입 시스템은 그 결정이 가능한 조합인지를 컴파일 타임에 검증한다.
그 연결고리가 `InferSubjects`이고, plain object에서 연결이 끊어지는 게 `subject()` 헬퍼가 필요한 이유다.

두 단계 검증도 처음에는 중복처럼 보였는데, Guard와 Service의 역할이 다르다는 걸 이해하고 나서야 자연스럽게 느껴졌다.
Guard는 빠른 차단, Service는 세밀한 판단이다.
그리고 그 사이에서 `.lean()` 을 쓰는 곳마다 `subject()` 헬퍼를 빠뜨리지 않는 것이 생각보다 중요하다.
