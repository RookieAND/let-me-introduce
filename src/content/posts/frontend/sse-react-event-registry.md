## 기존 구조

프로젝트에서 SSE(Server-Sent Events)를 다루는 `useServerSentEvent` 훅이 있었다.
이 훅은 컴포넌트 내부에서 EventSource를 생성하고, URL과 이벤트별 핸들러를 `Record<EventName, Handler>` 형태로 받아 처리했다.

```typescript
// PendingPage.tsx (기존 코드)
export function PendingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessKey } = useParams();

  const onParticipantCountUpdate = useCallback((data) => {
    if (data.currentCount === data.maxCount) {
      router.push(`/gathering/${accessKey}/opinion/complete`);
    }
    queryClient.setQueryData(gatheringKeys.capacity(accessKey), { data });
  }, [accessKey, router, queryClient]);

  const onResultComplete = useCallback((data) => {
    if (data.status === "COMPLETED") {
      router.push(`/gathering/${accessKey}/opinion/result`);
    }
  }, [accessKey, router]);

  useServerSentEvent(`/gatherings/${accessKey}/subscribe`, {
    "participant-count": onParticipantCountUpdate,
    "gathering-full": onResultComplete,
  });
}
```

---

## 발생한 문제들

### 핸들러 객체 재생성 문제

이전 설계에서는 여러 이벤트를 한 번에 Hook에 넘겨 등록하는 패턴을 사용했다.
각 이벤트별로 실행할 핸들러 함수들을 객체 형태로 묶어서 `useServerSentEvent`에 전달하는 방식이었다.

문제는 이 핸들러 객체가 매 렌더마다 새로 생성되어 Hook 내 Connection 로직도 다시 실행된다는 점이다.
SSE 연결은 1회로 끝나야 하는데 컴포넌트의 렌더링 사이클에 의존하게 되는 구조로 되어버렸다.

`useMemo`로 감싸면 해결될 것 같지만, 문제는 여기서 끝나지 않는다.

```typescript
// useMemo로 객체를 메모이제이션
const handlers = useMemo(() => ({
  [EVENT.PARTICIPANT_COUNT]: handleParticipantCount,
  [EVENT.GATHERING_FULL]: handleGatheringFull,
}), [handleParticipantCount, handleGatheringFull]);

// 결국 각 핸들러도 useCallback으로 감싸야 함
const handleParticipantCount = useCallback((payload) => {
  // ...
}, [router, accessKey, queryClient]); // deps가 변경되면 결국 재연결 발생
```

모든 의존성을 deps에 넣어야 하고, 의존성이 변경되면 결국 재연결이 발생한다.
게다가 각 핸들러 함수들도 `useCallback`으로 감싸야 하는.. 그야말로 중첩된 메모이제이션을 써야 한다. (으악 이건 아니야)

### 중복 연결 발생 가능성

이전 설계에서는 Hook 내부에서 독립적인 EventSource를 생성하는 방식이었다.
해당 Hook을 여러 컴포넌트에서 호출하면, 같은 URL에 대해서도 별도의 EventSource 인스턴스가 생성되었다.

이로 인해 단일 Endpoint에 대해서 중복된 연결을 맺는 이슈가 발생한다.
서버는 단일 Endpoint에서 이벤트 타입별로 다른 데이터를 전송하는데, 클라이언트에서는 불필요한 연결을 맺게 된다.
이는 네트워크 자원 낭비와 서버 부하 증가로 이어지며, 같은 이벤트를 여러 번 받아서 중복 처리할 가능성도 존재한다.

### 단일 연결을 위한 강제 설계 제약

중복 연결 문제를 피하기 위해서는 최상단에 로직을 집중시켜야 했다.
Page 같은 최상위 컴포넌트에서 모든 이벤트 핸들러를 정의하고 단일 연결을 만드는 방식이다.

최상단에 로직을 집중시켜야 하기 때문에 각 컴포넌트나 Hook이 필요한 이벤트를 자유롭게 구독할 수 없다.
`useProceedRecommendResult` 같은 Hook에서 `onResultUpdate` 같은 콜백 함수를 return하고, 페이지 컴포넌트에서 이를 받아 `useServerSentEvent`에 수동으로 연결해야 했다.

```typescript
export const useProceedRecommendResult = () => {
  // 내부에서 SSE 관련 로직을 처리하고 싶지만, 콜백을 외부로 내보내야 함
  const onResultUpdate = useCallback(() => {
    if (!isProcessingRef.current) return;
    setTimeout(async () => {
      const { data: latestResult } = await fetchRecommendResult();
      if (latestResult?.status === RecommendationResultStatus.COMPLETED) {
        router.push(`/gathering/${accessKey}/opinion/result`);
        return;
      }
      // ...
    }, NAVIGATION_DELAY);
  }, [/* deps */]);

  return {
    proceed,
    isPending,
    onResultUpdate, // 어쩔 수 없이 해당 로직을 외부로 내보내서 수동 연결해야 함
  };
};

// PendingPage.tsx
function PendingPage() {
  const { proceed, isPending, onResultUpdate } = useProceedRecommendResult();

  // 최상단 Page에서 이를 수동으로 연결해야 함 (페이지 로직과 관련이 없음에도!)
  useServerSentEvent(url, {
    [EVENT.GATHERING_FULL]: onResultUpdate,
  });

  return <ShowResultButton onProceed={proceed} isPending={isPending} />;
}
```

굳이 이렇게 넘겨야 할 이유가 있을까. 설계 자체가 로직 응집을 방해하고 있었다.

---

## 설계 아이디어: EventRegistry + Singleton Provider

> EventSource를 Singleton으로 관리하고, 이벤트가 발생했을 때 등록된 핸들러를 일괄 실행해 재전파한다.

컨셉은 세 가지로 정리했다.

1. 여러 컴포넌트가 각자 필요한 이벤트 핸들러만 등록하고, 페이지 내 SSE 연결은 하나만 유지한다.
2. 서버에서 이벤트가 오면 이벤트 레지스트리가 해당 이벤트를 구독 중인 모든 핸들러에게 전파한다.
3. 각 컴포넌트에서는 이벤트 핸들러를 동적으로 추가 및 제거하여 구독하면 된다.

역할은 세 곳으로 나눴다.

- **EventRegistry**: 핸들러를 등록(`on`), 해제(`off`), 이벤트 발생 시 전파(`emit`)
- **ServerSentEventProvider**: EventSource를 생성하고 Context로 Registry 제공
- **useServerSentEventListener**: 특정 이벤트 타입에 핸들러를 등록하는 Hook

---

## 개발 과정

### 1. EventRegistry 구현

먼저, SSE 내 이벤트 타입별로 핸들러 Set을 관리하는 Registry 클래스를 만들었다.
JS Map과 Set을 조합하여 `Map<EventType, Set<Handler>>` 구조로 설계했다.

```typescript
export class EventRegistry {
  private eventRegistry: Map<EventType, Set<EventHandler<EventType>>> = new Map();

  on<TEvent extends EventType>(type: TEvent, handler: EventHandler<TEvent>) {
    const handlers = this.getHandler(type);
    handlers.add(handler);
  }

  off<TEvent extends EventType>(type: TEvent, handler: EventHandler<TEvent>) {
    const handlers = this.getHandler(type);
    handlers.delete(handler);
  }

  emit<TEvent extends EventType>(type: TEvent, payload: EventPayload[TEvent]) {
    const { data, success, error } = EVENT_SCHEMA[type].safeParse(payload);
    if (!success) {
      console.error(new Error(`Invalid payload for ${type}: ${error.message}`));
      return;
    }

    const handlers = this.getHandler(type);
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in handler for ${type}:`, error);
      }
    });
  }

  private getHandler<TEvent extends EventType>(type: TEvent) {
    if (!this.eventRegistry.has(type)) {
      this.eventRegistry.set(type, new Set());
    }
    return this.eventRegistry.get(type) as Set<EventHandler<EventType>>;
  }
}
```

이벤트 Emit 시 try-catch로 에러를 격리하여 특정 핸들러에서 발생한 에러가 다른 핸들러 실행을 막지 않도록 했다.
Zod로 각 이벤트별 payload를 검증하여 서버에서 잘못된 데이터가 오더라도 타입 안전성을 보장했다.

### 2. 타입과 스키마 구조

서버에서 정의한 이벤트 타입과 스키마를 별도로 분리하여 관리했다.

```typescript
// types.ts
export const EVENT = {
  PARTICIPANT_COUNT: "participant-count",
  GATHERING_FULL: "gathering-full",
} as const;

export type EventType = (typeof EVENT)[keyof typeof EVENT];
```

```typescript
// schemas.ts
export const EVENT_SCHEMA = {
  [EVENT.PARTICIPANT_COUNT]: participantCountSchema,
  [EVENT.GATHERING_FULL]: gatheringFullSchema,
} as const;

// Zod 스키마로부터 타입 자동 추론
export type EventPayload = {
  [K in EventType]: z.infer<(typeof EVENT_SCHEMA)[K]>;
};

export type EventHandler<TEvent extends EventType> =
  (payload: EventPayload[TEvent]) => void;
```

스키마 실제 정의는 `src/schemas/sse/` 디렉토리에 위치하도록 했다.

```typescript
// participantCount.schema.ts
export const participantCountSchema = z.object({
  maxCount: z.number().min(0),
  currentCount: z.number().min(0),
});
```

`z.infer`로 Schema를 실제 타입으로 변환하여 각 이벤트별 Payload에 매핑시켰다.
새로운 이벤트 타입을 추가할 때도 스키마만 정의하면 `EventPayload` 타입이 자동으로 업데이트된다.

### 3. ServerSentEventProvider 구현

EventSource를 생성하고 Registry를 Context로 제공하는 Provider 컴포넌트다.
Provider에서는 초기 렌더링에 EventSource를 생성하고 사전 정의된 이벤트를 Subscribe한다.
Registry도 생성하여 특정 이벤트를 수신했을 때 이를 Registry에서 Emit하도록 한다.

```typescript
export function ServerSentEventProvider({ url, withCredentials, enabled = true, children }) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventRegistry = useMemo(() => new EventRegistry(), []);

  const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
  const connectionUrl = new URL(cleanUrl, BASE_API_URL).toString();

  useEffect(() => {
    if (!enabled) return;

    const eventSource = new EventSource(connectionUrl, { withCredentials });
    eventSourceRef.current = eventSource;

    Object.values(EVENT).forEach((eventType) => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          eventRegistry.emit(eventType, payload);
        } catch (error) {
          console.error(`Failed to parse event data for ${eventType}:`, error);
        }
      });
    });

    return () => {
      eventSource.close();
      eventRegistry.clear();
      eventSourceRef.current = null;
    };
  }, [connectionUrl, withCredentials, enabled, eventRegistry]);

  return (
    <ServerSentEventContext.Provider value={eventRegistry}>
      {children}
    </ServerSentEventContext.Provider>
  );
}
```

`useMemo`로 EventRegistry 인스턴스를 생성하여 Provider가 리렌더링되어도 유지하도록 했다.
cleanup 시 EventSource 종료와 Registry 초기화를 함께 수행하도록 묶었다.

### 4. useServerSentEventListener 구현

```typescript
export function useServerSentEventListener<TEvent extends EventType>(
  eventType: TEvent,
  handler: EventHandler<TEvent>,
) {
  const eventRegistry = useServerSentEventRegistry();

  useEffect(() => {
    eventRegistry.on(eventType, handler);
    return () => {
      eventRegistry.off(eventType, handler);
    };
  }, [eventRegistry, eventType, handler]);
}
```

컴포넌트에서 SSE 내 특정 유형의 이벤트를 구독하는 Hook이다.
마운트 시 핸들러를 등록하고, 언마운트 시 핸들러를 자동으로 제거한다.
각 이벤트별 Payload를 사전에 지정했기에 핸들러 인자 타입도 자동으로 추론된다.

### 5. Provider 위치 결정

초기에는 각 페이지에서 Provider로 감쌌으나, 페이지 레벨의 `layout.tsx`에서 사용하도록 올렸다.
Layout은 Server Component로 유지하면서 `await params`으로 accessKey를 받아 Client Component인 Provider에 전달한다.

```typescript
// app/gathering/[accessKey]/opinion/pending/layout.tsx
export default async function Layout({ children, params }) {
  const { accessKey } = await params;
  return (
    <ServerSentEventProvider url={`/gatherings/${accessKey}/subscribe`}>
      {children}
    </ServerSentEventProvider>
  );
}
```

### 개발 중 만난 버그

**handlers: 0 버그.** 핸들러 등록 시 로그에는 `total: 1`로 찍히는데, `emit` 시에는 `handlers: 0`으로 나타나는 문제가 있었다.
`getHandler()` 메서드에서 Map에 Set을 저장하지 않고 그냥 반환만 했기 때문이다.
매번 새로운 Set이 생성되어 이전 등록이 사라졌기에 Map에 먼저 저장한 후 반환하도록 수정했다.

```typescript
// ❌ 잘못된 코드
private getHandler(type: EventType) {
  return this.eventRegistry.get(type) ?? new Set(); // 매번 새 Set 생성
}

// ✅ Map에 먼저 저장한 후 반환
private getHandler(type: EventType) {
  if (!this.eventRegistry.has(type)) {
    this.eventRegistry.set(type, new Set());
  }
  return this.eventRegistry.get(type)!;
}
```

**URL 구성 문제.** `/api/v1`이 누락되어 잘못된 URL이 생성되었다.
`new URL(path, base)` 동작 방식의 오해 및 무지로 인한 이슈였다. (젠장 어렵다)
base에 trailing slash가 없고 path에 leading slash가 있으면 base의 경로 부분이 무시된다.

> [!WARNING]
> `new URL(path, base)`에서 `path`가 `/`로 시작하면 `base`의 경로 전체가 무시된다. `base`는 반드시 trailing slash로 끝내고, `path`의 leading slash는 제거해야 의도한 URL이 완성된다.

```typescript
// ❌ 문제 상황
new URL("/gatherings/123", "https://api.com/api/v1")
// → https://api.com/gatherings/123

// ✅ 해결
const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/`; // trailing slash
const cleanUrl = url.startsWith("/") ? url.slice(1) : url; // leading slash 제거
new URL(cleanUrl, BASE_API_URL);
// → https://api.com/api/v1/gatherings/123
```

---

## 개선 결과

```typescript
// app/gathering/[accessKey]/opinion/pending/layout.tsx
export default async function Layout({ children, params }) {
  const { accessKey } = await params;
  return (
    <ServerSentEventProvider url={`/gatherings/${accessKey}/subscribe`}>
      {children}
    </ServerSentEventProvider>
  );
}

// src/pageComponents/gathering/opinion/pending/PendingPage.tsx
export function PendingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessKey } = useParams();

  useServerSentEventListener(EVENT.PARTICIPANT_COUNT, (payload) => {
    if (payload.currentCount === payload.maxCount) {
      router.push(`/gathering/${accessKey}/opinion/complete`);
    }
    queryClient.setQueryData(gatheringKeys.capacity(accessKey), { data: payload });
  });
}
```

페이지 내 Layout에서 Provider를 설정하고, 페이지 컴포넌트에서 이벤트를 구독한다.
기존 코드와 비교하면 `useCallback`이 사라지고, 핸들러를 객체로 묶을 필요도 없어졌다.
이제 각 컴포넌트에서 필요한 이벤트만 구독하면 되기에 컴포넌트 간 의존성 관리도 단순해졌다.

---

## 달성한 것들

이번 리팩토링을 통해 SSE 시스템의 여러 문제를 해결하고 확장 가능한 구조를 만들 수 있었다.

### 단일 연결 보장

- AS-IS: 기존에는 여러 컴포넌트에서 Hook을 호출하면 각각 EventSource가 생성되어 중복 연결이 발생했다.
- TO-BE: 이제는 Provider가 Endpoint별로 하나의 EventSource만 생성하고, 여러 컴포넌트가 이를 공유한다.

### 타입 안전성

Zod 스키마를 기반으로 타입을 추론하여 컴파일 타임과 런타임 모두에서 타입 안전성을 보장한다.
서버에서 잘못된 데이터가 오더라도 Zod 검증 단계에서 걸러지고, 에러 로그가 남아 디버깅이 쉬워진다.

```typescript
useServerSentEventListener(EVENT.PARTICIPANT_COUNT, (payload) => {
  payload.currentCount  // ✅ 타입 추론됨
  payload.invalidField  // ❌ 컴파일 에러
});
```

### 에러 격리

Registry의 `emit` 메서드에서 각 핸들러를 try-catch로 감싸기 때문에, 한 핸들러에서 에러가 발생해도 다른 핸들러들은 계속 실행된다.
한 컴포넌트의 버그가 다른 컴포넌트의 동작에 영향을 주지 않는다.

```typescript
// 컴포넌트 A: 에러 발생
useServerSentEventListener(EVENT.PARTICIPANT_COUNT, (payload) => {
  throw new Error("Something went wrong");
});

// 컴포넌트 B: 정상 실행됨
useServerSentEventListener(EVENT.PARTICIPANT_COUNT, (payload) => {
  console.log("여전히 실행됨:", payload); // ✅ 정상 실행
});
```

### 단순한 사용성

- AS-IS: 기존 코드는 `useCallback`과 `useMemo`로 핸들러와 핸들러 객체를 감싸야 했고, 의존성 배열 관리가 복잡했다.
- TO-BE: 새로운 구조에서는 SSE 연결이 필요한 컴포넌트에서 바로 이벤트를 구독하면 된다.

핸들러 함수를 인라인으로 작성할 수 있고, 리렌더링마다 새로운 함수가 생성되어도 Registry에서 정확히 등록/해제되기 때문에 문제가 없다.

### 확장 가능한 구조

새로운 이벤트 타입을 추가하는 과정이 단순하다. Zod 스키마만 정의하면 나머지는 자동으로 처리된다.

```typescript
// 1. 스키마 정의
export const orderStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(["pending", "completed", "cancelled"]),
});

// 2. EVENT에 추가
export const EVENT = { ..., ORDER_STATUS: "order-status" } as const;

// 3. EVENT_SCHEMA에 추가
export const EVENT_SCHEMA = { ..., [EVENT.ORDER_STATUS]: orderStatusSchema } as const;

// 4. 바로 사용 가능 (타입 자동 추론)
useServerSentEventListener(EVENT.ORDER_STATUS, (payload) => {
  payload.orderId  // ✅ string 타입
  payload.status   // ✅ "pending" | "completed" | "cancelled" 타입
});
```

---

## 향후 개선 방향

현재 프로젝트의 요구사항을 충족하지만, 더 복잡한 상황을 고려하면 멀티 Endpoint 지원이 필요할 수 있다.
지금은 단일 Endpoint만 고려했지만, 사용자별 알림(`/users/:userId/notifications`)과 모임별 이벤트(`/gatherings/:accessKey/subscribe`)를 동시에 받아야 할 수 있다.

이를 위해서는 두 가지 방식을 고려할 수 있다.

**Provider 중첩 방식.** 각 Endpoint마다 Provider를 중첩한다.
현재 구조는 이 방식으로 쉽게 확장할 수 있다.

```typescript
<UserNotificationProvider userId={userId}>
  <GatheringEventProvider accessKey={accessKey}>
    {children}
  </GatheringEventProvider>
</UserNotificationProvider>
```

**Registry 확장 방식.** Registry가 Endpoint별로 EventSource를 관리하도록 확장한다.

```typescript
// Registry 내부에서 Map<Endpoint, EventSource> 관리
const registry = useServerSentEventRegistry();
registry.subscribe(endpoint1, eventType, handler);
registry.subscribe(endpoint2, eventType, handler);
```

완벽한 해법은 없고, 상황에 맞는 선택이 있을 뿐이다.
단일 서버 환경에서는 현재 구조로도 충분하지만, 구독해야 할 Endpoint가 늘어나는 시점에는 전환을 고려해야 한다.
