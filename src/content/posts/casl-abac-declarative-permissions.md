## 배경: 권한이 터지던 날들

goorm의 교육 플랫폼에는 강사, 수강생, 조교, 운영자, 슈퍼관리자 등 수십 가지 역할이 공존한다. 역할마다 접근 가능한 리소스가 달랐고, 같은 리소스라도 읽기만 되는 경우와 수정·삭제까지 되는 경우가 제각각이었다.

초창기엔 이 모든 것을 DB에 수동으로 관리했다. `permission` 테이블에 역할-리소스-액션 조합을 하드코딩하고, 컨트롤러 진입 전 해당 행이 있는지 확인하는 미들웨어를 달았다.

문제는 **변경마다 CS가 터졌다**는 것이다.

- "A 강사가 왜 B 수강생의 제출물을 볼 수 없나요?"
- "운영자인데 왜 이 기능에 접근이 안 되나요?"

매번 DB를 직접 열어 행을 확인하고 수정했다. 개발팀 의존도가 높았고, 실수가 잦았다. 권한 로직이 DB 데이터 속에 숨어 있으니 코드만 봐선 의도를 파악할 수 없었다.

---

## ABAC 모델을 선택한 이유

RBAC(Role-Based)에서 ABAC(Attribute-Based)로 전환하기로 했다.

ABAC의 핵심은 **"누가 무엇에 어떤 행동을 할 수 있는가"를 코드로 선언**하는 것이다. DB가 아닌 코드가 단일 진실의 원천이 된다.

Node.js 생태계에서 가장 성숙한 ABAC 라이브러리인 [CASL](https://casl.js.org)을 선택했다. `defineAbilityFor(user)` 한 번으로 해당 유저의 전체 권한 집합을 `Ability` 객체로 만들 수 있다.

```typescript
// Before: DB 쿼리로 권한 확인
const perm = await db.permission.findFirst({
  where: { role: user.role, resource: 'submission', action: 'read' },
});
if (!perm) throw new ForbiddenException();

// After: CASL Ability로 선언
if (ability.cannot('read', subject('Submission', submission))) {
  throw new ForbiddenException();
}
```

---

## Ability 정의 구조

CASL의 `AbilityBuilder`로 역할별 권한을 선언적으로 정의한다.

```typescript
export function defineAbilityFor(user: RequestUser) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (user.role === 'SUPER_ADMIN') {
    can('manage', 'all');
    return build();
  }

  if (user.role === 'INSTRUCTOR') {
    can('read', 'Course');
    can('update', 'Course', { instructorId: user.id });
    can('read', 'Submission', { courseId: { $in: user.courseIds } });
    cannot('delete', 'Submission');
  }

  if (user.role === 'STUDENT') {
    can('read', 'Course', { isPublished: true });
    can('create', 'Submission', { studentId: user.id });
    can('read', 'Submission', { studentId: user.id });
  }

  return build();
}
```

`{ instructorId: user.id }` 처럼 **조건부 권한**이 핵심이다. "강사는 자신이 담당한 강좌만 수정할 수 있다"는 규칙을 코드 한 줄로 표현한다.

---

## nestjs-cls로 Ability 전파하기

Ability를 만든 뒤, 컨트롤러·서비스 어디서든 꺼내 쓸 수 있어야 한다. 매번 DI로 주입하면 서비스 시그니처가 오염된다. `AsyncLocalStorage` 기반의 [nestjs-cls](https://papooch.github.io/nestjs-cls/)를 선택한 이유다.

```typescript
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = await this.verifyToken(req);
    const ability = defineAbilityFor(user);

    this.cls.set('user', user);
    this.cls.set('ability', ability);

    next();
  }
}
```

이제 서비스 계층에서 별도 주입 없이 꺼내 쓸 수 있다.

```typescript
@Injectable()
export class SubmissionService {
  constructor(private readonly cls: ClsService) {}

  async findOne(id: string) {
    const ability = this.cls.get<AppAbility>('ability');
    const submission = await this.repo.findOneOrFail(id);

    if (ability.cannot('read', subject('Submission', submission))) {
      throw new ForbiddenException();
    }

    return submission;
  }
}
```

---

## 가드로 컨트롤러 레벨 보호

서비스 레벨 검사와 별개로, 컨트롤러 진입 자체를 막는 가드도 만들었다. 데코레이터 기반으로 선언하면 컨트롤러 코드가 깔끔해진다.

```typescript
@UseGuards(AbilityGuard)
@CheckAbility({ action: 'read', subject: 'Course' })
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.courseService.findOne(id);
}
```

`AbilityGuard`는 CLS에서 Ability를 꺼내고, `@CheckAbility` 메타데이터와 대조해 통과 여부를 결정한다.

---

## 결과

3개월 운영 결과는 다음과 같다.

- CS 발생 빈도 **주 2~3건 → 거의 0건**
- 신규 역할 추가 시 `defineAbilityFor` 파일 수정만으로 완결
- 권한 로직이 단일 파일에 집결 → 온보딩 시간 단축

가장 큰 수확은 **"권한을 왜 이렇게 설계했는가"가 코드로 남는다**는 것이다. DB 행을 보며 의도를 추측할 필요가 없어졌다.
