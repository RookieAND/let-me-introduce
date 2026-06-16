## 문제: jest.fn()을 매번 손으로 썼다

NestJS 서비스 단위 테스트를 작성할 때마다 반복되는 패턴이 있었다.

```typescript
// 의존성마다 jest.fn() 수동 작성
const userRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  findByEmails: jest.fn(),
};
const emailService = {
  send: jest.fn(),
};
const service = new UserService(userRepo as any, emailService as any);
```

의존성이 3개만 넘어도 셋업 코드가 서비스 로직보다 길어졌다. `as any` 캐스팅 때문에 타입 안전성도 없었다. `UserRepository`에 메서드가 추가되면 테스트 파일을 직접 찾아가 수동으로 stub을 추가해야 했다.

---

## @suites: DI 메타데이터로 자동 생성

[@suites](https://suites.dev)는 NestJS의 DI 메타데이터를 읽어 생성자 파라미터를 자동 탐지하고, 모든 의존성을 타입 안전한 mock 객체로 교체해준다.

```typescript
// TestBed가 의존성 트리를 분석해 auto-mock 생성
const { unit, unitRef } = await TestBed.solitary(UserService).compile();
const repo: Mocked<UserRepository> = unitRef.get(UserRepository);

repo.findOne.mockResolvedValue(mockUser); // 타입 자동완성 + 체크
```

수동으로 열거하던 mock 객체 선언이 사라지고, `Mocked<T>` 타입으로 모든 메서드에 타입 안전하게 접근할 수 있다.

---

## 패키지 구성

```bash
npm install --save-dev @suites/unit @suites/di.nestjs @suites/doubles.jest
```

| 패키지 | 역할 |
|---|---|
| `@suites/unit` | TestBed 핵심 API |
| `@suites/di.nestjs` | NestJS DI 메타데이터 읽기 어댑터 |
| `@suites/doubles.jest` | Jest 통합 — `Mocked<T>` 타입 + mock 자동 생성 |

설치된 어댑터를 자동 감지하므로 별도 Jest 설정 수정이 필요 없다. 단, `tsconfig.json`에 `emitDecoratorMetadata: true`가 있어야 생성자 파라미터 타입 정보를 읽을 수 있다.

---

## 두 가지 격리 전략

### Solitary: 완전 격리

모든 의존성을 Auto-Mock으로 교체한다. 외부 I/O(DB, 메일, HTTP)가 많은 서비스에 적합하다.

```typescript
beforeEach(async () => {
  const { unit, unitRef } = await TestBed.solitary(UserService).compile();
  service = unit;
  userRepository = unitRef.get(UserRepository);
  emailService = unitRef.get(EmailService);
});

it('사용자를 조회한다', async () => {
  userRepository.findOne.mockResolvedValue({ id: '1', name: 'Alice' });

  const result = await service.findById('1');

  expect(userRepository.findOne).toHaveBeenCalledWith({ id: '1' });
  expect(result.name).toBe('Alice');
});
```

### Sociable: 부분 실제 구현

`.expose()`로 지정한 의존성은 실제 인스턴스를 사용하고, 나머지만 mock으로 교체한다. 클래스 간 협력이 올바른지 검증할 때 쓴다.

```typescript
beforeAll(async () => {
  const { unit, unitRef } = await TestBed.sociable(UserService)
    .expose(EmailValidator)   // 실제 검증 로직 사용
    .compile();

  service = unit;
  database = unitRef.get<DatabaseClient>('DATABASE');
});

it('유효하지 않은 이메일을 실제 검증 로직이 거부한다', async () => {
  await expect(service.createUser('not-an-email')).rejects.toThrow('Invalid email');
});
```

---

## Test Double 4가지 — 역할 구분

Suites가 생성하는 Auto-Mock은 상황에 따라 Stub 또는 Mock으로 사용된다.

| 유형 | 동작 | 사용 목적 |
|---|---|---|
| **Stub** | 하드코딩된 값 반환, 호출 기록 안 함 | 의존성이 반환할 값 제어 |
| **Mock** | 호출 기록 + 검증 가능 | 메서드가 올바르게 호출됐는지 검증 |
| **Spy** | 실제 구현을 감싸며 호출 기록 유지 | 동작 변경 없이 호출 관찰 |
| **Fake** | 간소화된 실제 동작 구현 | 실제 의존성이 무거울 때 경량 대체 |

핵심 구분: **Stub은 쿼리에 답하고(값 반환), Mock은 명령을 검증한다(호출 확인)**.

```typescript
// Stub — 상태 검증: 반환값을 지정하고 결과를 확인
repo.findById.mockResolvedValue({ id: '1', name: 'Alice' });
const result = await service.getUser('1');
expect(result.name).toBe('Alice');

// Mock — 행동 검증: 올바른 인자로 호출됐는지 확인
await service.activateUser('1');
expect(repo.save).toHaveBeenCalledWith(
  expect.objectContaining({ active: true })
);
```

---

## 주의: 생성자 주입만 자동 교체된다

Suites는 NestJS 생성자 주입으로 선언된 의존성만 자동 mock으로 교체할 수 있다.

```typescript
// ✅ 자동 교체 가능 — 생성자 주입
@Injectable()
class UserService {
  constructor(private userRepo: UserRepository) {}
}

// ❌ 자동 교체 불가 — 모듈 직접 임포트
import { sendEmail } from './email-utils';
```

모듈 직접 임포트는 `jest.mock()`을 별도로 사용해야 한다.

---

## 결과

수동 mock 방식에서 @suites로 전환한 뒤 달라진 것들이다.

- 셋업 코드가 **의존성 수에 무관하게 4줄 고정** (`TestBed.solitary().compile()` 패턴)
- `as any` 캐스팅 전면 제거 — `Mocked<T>`로 타입 자동완성이 동작
- 의존성이 추가·변경되어도 테스트 셋업 코드를 수정할 필요가 없음

테스트 셋업에 쓰던 시간을 실제 시나리오 설계에 쓸 수 있게 됐다.
