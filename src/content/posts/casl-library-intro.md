> CASL(Complex Ability Statement Language)은 TypeScript/JavaScript 에서 사용할 수 있는 권한 관리 라이브러리다. "누가 무엇을 할 수 있는가"를 선언적으로 정의하고, 런타임에 검증하는 구조다.

## 왜 CASL을 선택했는가?

GEM에 리소스 단위 권한 체계를 구축하면서 적합한 라이브러리를 탐색했다. 필요한 조건은 명확했다.

- **TypeScript 네이티브 지원**: 타입 안전하게 권한 규칙을 정의할 수 있어야 한다.
- **Condition 기반 평가**: "이 사용자가 이 특정 리소스에 접근할 수 있는가"를 리소스 속성 조건까지 검증할 수 있어야 한다.
- **NestJS 통합 용이**: Guard/Service 레이어에 자연스럽게 녹아들 수 있어야 한다.

CASL은 세 조건을 모두 만족했다. 특히 `can(action, subject(name, resource))` 패턴으로 리소스 객체의 속성까지 조건 평가가 가능하다는 점이 결정적이었다.

---

## 핵심 개념

### Ability — 권한의 컨테이너

`Ability`는 특정 사용자가 수행할 수 있는 행위의 집합이다. CASL에서 모든 권한 검증은 Ability 인스턴스를 통해 이루어진다.

```typescript
import { createMongoAbility } from '@casl/ability';

const ability = createMongoAbility([
  { action: 'read',   subject: 'Course' },
  { action: 'update', subject: 'Course', conditions: { id: 'course-7' } },
]);

ability.can('read',   'Course');                                     // true
ability.can('update', 'Course');                                     // true
ability.can('update', subject('Course', { id: 'course-7' }));   // true
ability.can('update', subject('Course', { id: 'course-8' }));   // false
```

### can / cannot — 권한 확인

`can(action, subject)` 은 특정 Action이 허용되는지 확인한다. `cannot` 은 반대다.

- 규칙이 없으면 기본적으로 `cannot` 이다.
- **Deny 규칙은 Allow 규칙보다 항상 우선한다.**

### subject() — 리소스 객체와 연결

CASL이 강력한 이유는 단순한 문자열이 아니라, 실제 리소스 객체를 넘겨 Condition을 평가할 수 있다는 것이다.

```typescript
import { subject } from '@casl/ability';

// 단순 subject 이름: 규칙 존재 여부만 확인
ability.can('update', 'Course');

// 실제 리소스 객체: Condition까지 평가
ability.can('update', subject('Course', { id: 'course-7', spaceId: 'space-1' }));
```

`subject('Course', resource)` 는 리소스 객체에 CASL이 인식할 수 있는 subject 타입 태그를 붙여준다.

### Conditions — 리소스 속성 기반 조건

MongoDB 쿼리 문법과 유사한 방식으로 Condition을 정의한다. 조건이 여러 개면 AND로 처리된다.

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

### Allow / Deny 규칙 병합

같은 Action/Subject 조합에 Allow와 Deny 규칙이 공존할 수 있다. `inverted: true` 로 Deny를 표현하며, Deny가 Allow보다 항상 우선한다.

```typescript
const ability = createMongoAbility([
  { action: 'delete', subject: 'Course' },                         // 전체 Course 삭제 허용
  { action: 'delete', subject: 'Course',
    inverted: true, conditions: { id: 'course-7' } },              // course-7만 삭제 차단
]);

ability.can('delete', subject('Course', { id: 'course-8' }));  // true
ability.can('delete', subject('Course', { id: 'course-7' }));  // false — Deny 우선
```

---

## TypeScript 통합

### 타입 안전한 Ability 정의

`MongoAbility` 에 Action과 Subject 유니온 타입을 제네릭으로 넘기면 타입 레벨 검증이 가능하다.

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

실제 GEM 서버에 적용한 상세 구현은 ABAC 시리즈(1편, 2편, 3편)에서 다룬다.

---

## Ref.
- [CASL 공식 문서](https://casl.js.org/v6/en)
- [CASL + NestJS 공식 가이드](https://casl.js.org/v6/en/package/casl-nestjs)
- [GitHub: stalniy/casl](https://github.com/stalniy/casl)
