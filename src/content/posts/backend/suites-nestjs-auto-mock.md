## 배경: 수동 Mock의 고통

NestJS 프로젝트에서 단위 테스트를 작성할 때 반복되는 패턴이 있었다. 의존성 주입 기반으로 설계된 Service를 테스트하려면 모든 의존성을 일일이 `jest.fn()`으로 Mock해야 했다.  

```typescript
// ❌ 수동 Mock 방식 — 매 테스트마다 반복
const userRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  findByEmails: jest.fn(),
  create: jest.fn(),
};
const emailService = {
  sendWelcomeEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
};

const service = new UserService(
  userRepo as any,    // as any 없이는 타입 에러
  emailService as any,
);
```

이 방식에는 세 가지 문제가 있다.  

**의존성이 추가될 때마다 셋업 코드를 수정해야 한다.** `UserService`에 의존성이 하나 추가되면 테스트 파일도 반드시 수정해야 한다. 이 사실을 놓치면 런타임에야 에러가 발생한다.  

**`as any` 캐스팅으로 타입 안전성이 사라진다.** Mock 객체가 실제 인터페이스와 달라도 컴파일 단계에서 잡히지 않는다. Stub을 잘못 설정해도 타입 에러가 나지 않는다.  

**의존성 트리가 복잡할수록 셋업 코드가 방대해진다.** Service A가 B, C, D에 의존하고, 각각 메서드가 수십 개라면 셋업 코드만으로도 파일이 길어진다.  

---

## @suites: Auto-Mock 테스팅 라이브러리

`@suites`는 NestJS DI(Dependency Injection) 메타데이터를 읽어 **생성자 파라미터를 자동으로 탐지하고, 모든 의존성을 타입 안전한 Mock 객체로 교체**해주는 라이브러리다.  

```typescript
// ✅ @suites 방식
const { unit, unitRef } = await TestBed.solitary(UserService).compile();
const userRepo: Mocked<UserRepository> = unitRef.get(UserRepository);

// 타입 안전하게 stub 설정
userRepo.findOne.mockResolvedValue(mockUser);

const result = await unit.findById('1');
```

핵심 패키지 구성:  
- `@suites/unit`: TestBed 핵심 API
- `@suites/di.nestjs`: NestJS DI 메타데이터 어댑터
- `@suites/doubles.jest`: Jest 기반 Mocked 타입 + mock 생성

설치된 어댑터(`@suites/di.nestjs`, `@suites/doubles.jest`)를 자동 감지하므로 별도 Jest 설정 수정이 불필요하다.  

---

## 두 가지 테스트 전략

@suites는 격리 수준에 따라 두 가지 전략을 제공한다.  

### Solitary — 완전 격리

모든 의존성을 Auto-Mock으로 교체한다. 단일 클래스 내부 로직만 검증할 때 사용한다.  

```typescript
describe('UserService', () => {
  let service: UserService;
  let userRepository: Mocked<UserRepository>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(UserService).compile();
    service = unit;
    userRepository = unitRef.get(UserRepository);
  });

  it('should find user by id', async () => {
    userRepository.findOne.mockResolvedValue({ id: '1', name: 'Alice' });

    const result = await service.findById('1');

    expect(userRepository.findOne).toHaveBeenCalledWith({ id: '1' });
    expect(result.name).toBe('Alice');
  });
});
```

### Sociable — 부분 실제 구현

`.expose()`로 지정한 의존성은 실제 구현을 사용하고, 나머지는 Auto-Mock으로 교체한다. 클래스 간 상호작용을 검증할 때 유용하다.  

```typescript
beforeAll(async () => {
  const { unit, unitRef } = await TestBed.sociable(UserService)
    .expose(EmailValidator)  // 실제 구현 사용
    .compile();

  service = unit;
  database = unitRef.get<DatabaseClient>('DATABASE');
});

it('유효하지 않은 이메일은 실제 검증 로직에서 거부된다', async () => {
  // EmailValidator는 실제 로직이 실행됨
  await expect(service.createUser('invalid')).rejects.toThrow('Invalid email');
});
```

---

## 전략 선택 기준

**Solitary**를 선택하는 경우:  
- 외부 I/O(DB, 외부 API)가 많아 Mock이 필수인 서비스
- 단일 클래스의 비즈니스 로직 자체를 격리해서 검증하고 싶을 때
- 빠른 실행 속도가 필요할 때

**Sociable**를 선택하는 경우:  
- 두 클래스 간의 계약(인터페이스)이 올바르게 동작하는지 검증하고 싶을 때
- 실제 구현을 일부 포함해 통합에 가까운 검증이 필요할 때

---

## 결론

@suites는 NestJS DI 환경에서 테스트 셋업 코드를 최소화하고 타입 안전성을 유지하며 단위 테스트를 작성할 수 있게 해준다.  

수동 Mock 방식에서 `as any` 캐스팅과 장황한 셋업 코드에 시달렸다면, @suites로 전환하면 테스트 코드가 훨씬 간결해진다. 의존성이 추가되어도 `TestBed`가 자동으로 감지하기 때문에 셋업 코드를 수정할 필요가 없다.  
