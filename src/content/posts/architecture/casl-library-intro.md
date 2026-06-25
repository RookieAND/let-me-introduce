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

## 핵심 개념

CASL을 처음 도입했을 때는 공식 문서만 빠르게 훑고 바로 코드를 쓰기 시작했다.  
그런데 실제로 NestJS에 붙여보면서 헷갈리는 부분이 꽤 있었다.  
`Ability`, `subject()`, Condition, Allow/Deny 병합이 각각 어떤 역할인지, 왜 이렇게 나뉘어 있는지를 직접 부딪히면서 이해했다.  

### Ability — 권한의 컨테이너

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
ability.can('update', subject('Course', { id: 'course-7' }));  // true
ability.can('update', subject('Course', { id: 'course-8' }));  // false
```

두 번째 규칙처럼 Condition이 붙어 있어도, `can('update', 'Course')` 는 Condition을 무시하고 true를 반환한다.  
`subject()` 헬퍼로 실제 리소스 객체를 감싸 넘겨야 비로소 Condition 매칭이 일어난다.  
처음에는 이 동작이 의아했다. Condition이 있는 규칙인데 왜 조건 없이 호출하면 그냥 true가 나오지?  
생각해보면 합리적인 설계인게 Guard 레이어에서는 아직 리소스를 DB에서 꺼내기 전이다.  
리소스 객체 없이 "이 사용자에게 update 권한 자체는 있는가"를 먼저 체크하는 용도로 쓰이기 때문에, Condition을 무시하는 게 의도된 동작이다.  

### can / cannot — 권한 확인

`can(action, subject)` 은 특정 Action이 허용되는지 확인한다.  
`cannot` 은 그 반대다.  

주의할 점이 두 가지 있다.  

- 규칙이 없으면 기본적으로 `cannot` 이다. 명시적으로 Allow 규칙을 추가해야만 허용된다.
- **Deny 규칙은 Allow 규칙보다 항상 우선한다.**

두 번째 원칙이 실무에서 의외로 함정이 된다.  
"Course 전체 수정은 허용하되, `course-7`만 금지하고 싶다"는 요구사항을 구현하려면, Allow를 먼저 등록하고 Deny를 나중에 등록해야 한다.  
CASL은 뒤에 등록된 규칙일수록 평가 우선순위가 높다.  
이 순서가 뒤집히면 Deny가 Allow보다 먼저 평가되어 의도한 대로 동작하지 않는다.  
GEM에서는 이 원칙을 `AbilityFactory` 설계에 직접 반영했다. 상세 구현은 PBAC 시리즈 2편에서 다룬다.  

### subject() — 리소스 객체와 연결

CASL이 강력한 이유 중 하나는 단순한 문자열 대신 실제 리소스 객체를 넘겨 Condition을 평가할 수 있다는 점이다.  

```typescript
import { subject } from '@casl/ability';

// 단순 subject 이름: 규칙 존재 여부만 확인
ability.can('update', 'Course');

// 실제 리소스 객체: Condition까지 평가
ability.can('update', subject('Course', { id: 'course-7', spaceId: 'space-1' }));
```

`subject('Course', resource)` 는 리소스 객체에 CASL이 인식할 수 있는 subject 타입 태그를 붙여준다.  
plain object는 어떤 Subject인지 CASL이 자동으로 알 수 없기 때문에, 이 헬퍼로 Subject 정보를 명시적으로 주입해야 Condition 매칭이 동작한다.  

특히 Mongoose의 `.lean()` 으로 조회한 Document나 `populate` 된 sub-document는 plain object가 되므로 이 헬퍼가 필수다.  
`.lean()` 쿼리는 Mongoose virtual 필드나 메서드가 없는 순수 POJO를 반환하기 때문에, CASL이 클래스 정보를 통해 Subject를 식별하는 과정이 작동하지 않는다.  
Mongoose Document 인스턴스를 직접 넘길 때는 자동으로 인식되지만, `.lean()` 결과물에는 그 정보가 없다.  
이 차이를 모르고 지나치면 Condition이 항상 무시되거나 의도와 다른 결과가 나오는데, 에러 없이 조용히 실패하기 때문에 원인을 찾기가 쉽지 않다.  

### Conditions — 리소스 속성 기반 조건

MongoDB 쿼리 문법과 유사한 방식으로 Condition을 정의한다.  
조건이 여러 개면 AND로 처리된다.  

```typescript
const ability = createMongoAbility([
  {
    action: 'update',
    subject: 'Course',
    conditions: {
      id: 'course-7',      // id 가 course-7 인 리소스만 허용
      spaceId: 'space-1',  // spaceId 가 space-1 인 리소스만 허용
    },
  },
]);
```

`$in`, `$ne`, `$gt` 같은 MongoDB 연산자도 사용 가능하다.  

CASL이 MongoDB 쿼리 문법을 채택한 데는 이유가 있다.  
Mongoose를 사용하면 `accessibleBy(ability, 'read').ofType('Course')` 헬퍼가 이 조건을 실제 Mongoose 쿼리로 변환해준다.  
"이 사용자가 읽을 수 있는 Course 목록"을 DB에서 바로 뽑아낼 수 있는 이유가 여기에 있다.  
접근 제어 조건이 DB 쿼리 조건과 동일한 문법이기 때문에 별도로 쿼리를 관리할 필요가 없어지는 것이다.  
목록 조회 API에서 접근 가능한 Document만 반환해야 할 때 이 구조가 특히 편하다.  

### Allow / Deny 규칙 병합

같은 Action/Subject 조합에 Allow와 Deny 규칙이 공존할 수 있다.  
`inverted: true` 로 Deny를 표현하며, Deny가 Allow보다 항상 우선한다.  

```typescript
const ability = createMongoAbility([
  { action: 'delete', subject: 'Course' },                         // 전체 Course 삭제 허용
  { action: 'delete', subject: 'Course',
    inverted: true, conditions: { id: 'course-7' } },              // course-7만 삭제 차단
]);

ability.can('delete', subject('Course', { id: 'course-8' }));  // true
ability.can('delete', subject('Course', { id: 'course-7' }));  // false — Deny 우선
```

GEM에서는 이 구조로 외부 관리자의 특정 리소스 접근을 차단하는 PolicyOverride를 구현했다.  
Level 기반 Allow가 먼저 등록되고, PolicyOverride Deny가 나중에 등록되어 어떤 Allow 규칙도 덮어쓰게 했다.  

Allow/Deny 병합에서 핵심은 **규칙 등록 순서가 곧 우선순위**라는 것이다.  
Allow를 먼저 전부 등록하고, Deny는 마지막에 등록해야 의도한 대로 Deny가 Allow를 덮어쓴다.  
순서가 잘못되면 Allow가 Deny보다 늦게 등록되어 오히려 Deny를 무력화하는 상황이 생긴다.  

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
`AppAbility` 타입 정의 자체가 권한 시스템의 "스펙"이 되는 것이다.  
어떤 Action이 어떤 Subject에 적용 가능한지가 타입 수준에서 명시되고, 그 범위를 벗어나는 코드는 컴파일 에러로 차단된다.  

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
권한이 없는 요청인데도 DB 조회가 일어나는 건 낭비다!  
따라서 Guard에서 역할 수준의 사전 차단을 먼저 하고, 통과한 요청에 대해서만 Service에서 실제 리소스를 조회해 Condition까지 확인하는 구조가 합리적이다.

왜 두 단계로 나눠야 하는지, Guard에서 전부 처리하면 안 되는지에 대한 상세 설명은 PBAC 시리즈 2편에서 다룬다.  
실제 GEM 서버에 적용한 상세 구현도 그쪽에서 확인할 수 있다.  

---

## Ref.
- [CASL 공식 문서](https://casl.js.org/v6/en)
- [CASL + NestJS 공식 가이드](https://casl.js.org/v6/en/package/casl-nestjs)
- [GitHub: stalniy/casl](https://github.com/stalniy/casl)
