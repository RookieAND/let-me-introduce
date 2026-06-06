## 테스트 코드, 참 낯설다

지금껏 프론트엔드를 개발하면서 부끄럽지만 테스트의 필요성을 딱히 느끼지 못했다. 개발 사이클이 빠르고 코드가 자주 변경되는 환경에서는 테스트 코드에 대해 "언감생심"을 가지기 쉽다.

하지만 최근 Vitest, Storybook 같은 테스팅 도구가 성숙해지면서 프론트엔드 테스트도 현실적으로 다가왔다. 이 글은 내가 테스트 코드에 대해 가졌던 의문을 정리하고, 학습한 내용을 기반으로 결론을 내린 기록이다.

---

## 프론트엔드 테스트 코드가 주는 이점

### 피드백 사이클이 빨라진다

테스트 코드 없이 개발하면 `[코드 수정] → [HMR 후 대기] → [페이지 이동] → [요소와 상호작용] → [결과 확인]`이라는 사이클이 반복된다. 기능 하나 수정한 후 버튼 클릭하고 스크롤 내려보고… 이 과정이 쌓이면 꽤 많은 시간을 잡아먹는다.

테스트 코드를 작성하면 "코드"로서 즉각적인 확인이 가능해진다. 피드백 사이클 감소는 결과적으로 생산성 향상으로 이어진다.

### 외부 의존성에 얽힌 기능 테스트가 수월해진다

A/B 테스트를 진행하거나, 외부 API가 툭하면 끊기는 경우, 복잡한 인터랙션을 기반으로 동작하는 기능을 매번 수동으로 테스트하기가 귀찮다. 외부 의존성을 적절히 Mocking함으로써 오롯이 "검증하고 싶은" 영역에만 집중할 수 있다.

### 테스트 코드 자체가 스펙이 된다

잘 작성된 테스트 코드는 해당 컴포넌트나 기능이 사용자와 어떻게 상호작용하는지에 대한 명세가 된다. 스타트업처럼 문서를 잘 관리하기 어려운 환경에서, 테스트 코드는 기능이 바뀔 때마다 함께 유지보수해야 하기 때문에 신뢰할 수 있는 스펙 역할을 한다.

### 라이브러리 업데이트, 리팩토링 시 안전망이 된다

라이브러리 버전을 올릴 때, 기능을 수정할 때 손으로 마이그레이션 테스트를 하는 건 한계가 있다. 꼼꼼한 테스트 코드가 있다면 이상 여부를 빠르게 확인하고, 보다 신뢰성 있는 배포를 진행할 수 있다.

---

## 테스트하기 좋은 코드란?

### 의존성을 직접 호출하지 않는 것

테스트에 가장 큰 걸림돌은 외부 의존성을 Mocking하는 과정에서의 신뢰도 하락과 코드 복잡도 증가다. 이를 해결하려면 **비즈니스 로직과 외부 의존성의 분리**가 핵심이다.

```typescript
// ❌ sessionStorage에 강하게 결합된 코드
export function getUserSettings(): Record<string, any> {
  const rawSettings = sessionStorage.getItem("userSettings") ?? "{}";
  return JSON.parse(rawSettings);
}

// 테스트 시 sessionStorage를 반드시 Mocking해야 함
```

```typescript
// ✅ 의존성을 외부에서 주입받는 구조
export interface Storage {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
}

export class UserSettingsManager {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  getUserSettings(): Record<string, any> {
    const rawSettings = this.storage.get("userSettings") ?? "{}";
    return JSON.parse(rawSettings);
  }
}
```

```typescript
// 테스트: MockStorage로 실제 브라우저 API 없이 테스트 가능
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get(key: string) { return this.store[key] || null; }
  set(key: string, value: string) { this.store[key] = value; }
}

describe("UserSettingsManager", () => {
  let settingsManager: UserSettingsManager;

  beforeEach(() => {
    const mockStorage = new MockStorage();
    settingsManager = new UserSettingsManager(mockStorage);
  });

  it("should get user settings", () => {
    // sessionStorage 없이 순수하게 로직만 테스트
    ...
  });
});
```

저장소가 `sessionStorage`에서 다른 저장소로 변경되어도 핵심 로직을 수정할 필요가 없어진다. 이것이 테스트하기 좋은 코드의 본질이다.

### 제어하기 어려운 요소를 외부로 밀어내기

- 실행할 때마다 결과가 다른 함수(`Date.now()`, `Math.random()`)
- 함수 외부 영역에 의존하는 코드(Browser API, 전역 변수)
- 외부 서비스에 의존하는 코드(PG사 라이브러리, 외부 API)

이런 요소들은 직접 호출하는 대신 **외부에서 주입받도록** 설계해야 한다. 불가피하다면 의존하는 코드가 가장 적은 영역까지 밀어내는 것이 좋다.

---

## 언제 테스트를 작성하는가

**Funnel Test나 복잡한 의존성이 겹친 기능**에서 테스트를 많이 작성하는 게 효과적이다. 피드백 사이클이 긴 경우일수록 테스트로 방어하는 효과가 크다.

**유닛 테스트보다 페이지 단위의 통합 테스트**가 사용자 관점의 가치가 더 크다. 사용자 레벨에서 어떤 의미가 있는지를 생각하면, 결국 사용자의 동작을 테스트하는 코드가 많아진다.

**테스트하기 너무 손쉬운 케이스**나 하루 이틀 뒤에 사라지는 컴포넌트에는 오히려 테스트를 잘 작성하지 않는다. 테스트 코드를 작성하는 시간과 노력 또한 비용임을 잊지 말자.

---

## 결론

테스트 코드를 하나의 테크스펙으로 바라보는 관점이 가장 와닿았다. 화면 개발을 시작하기 전에 시안을 캡처하고 설계를 문서화하지만, 시간이 지나면서 문서와 실제 구현 내용이 달라지는 경우가 많다. 테스트 코드가 내가 구현하고자 하는 기능의 명세 역할을 한다면 별도의 구두 논의 없이 의도를 전달할 수 있다.

테스트를 잘 짜려면 결국 **코드를 잘 짜야 한다**. 테스트 코드 작성이 쉬운 코드란, 의존성이 분리되고 순수 함수의 조합으로 이루어진 코드다. 테스트를 어렵게 만드는 코드는 이미 설계 문제를 안고 있을 가능성이 높다.
