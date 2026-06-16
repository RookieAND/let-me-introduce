## 기존 구조의 문제

프로젝트에서 SSE(Server-Sent Events)를 다루는 `useServerSentEvent` 훅이 있었다. URL과 이벤트별 핸들러를 `Record<EventName, Handler>` 형태로 받아 처리하는 구조였다.

```typescript
// PendingPage.tsx (기존 코드)
export function PendingPage() {
  const onParticipantCountUpdate = useCallback((data) => {
    if (data.currentCount === data.maxCount) {
      router.push(`/gathering/${accessKey}/opinion/complete`);
    }
    queryClient.setQueryData(gatheringKeys.capacity(accessKey), { data });
  }, [accessKey, router, queryClient]);

  useServerSentEvent(`/gatherings/${accessKey}/subscribe`, {
    "participant-count": onParticipantCountUpdate,
  });
}
```

세 가지 문제가 있었다.

**첫째, 핸들러 객체가 매 렌더마다 새로 생성된다.**

핸들러를 객체로 묶어 전달하면 렌더링마다 새 참조가 생겨 `useEffect`가 재실행되고, SSE 연결이 끊겼다가 다시 맺어진다.

`useMemo`로 감싸면 의존성 배열이 복잡해지고, 의존성이 바뀔 때마다 결국 재연결이 발생한다.

**둘째, 동일한 Endpoint에 중복 연결이 생긴다.** Hook 내부에서 독립적인 `EventSource`를 생성하기 때문에, 여러 컴포넌트가 같은 URL로 훅을 호출하면 별도의 Connection이 n개 생긴다.

**셋째, 단일 연결을 위해 로직을 최상단에 집중시켜야 한다.** 중복 연결을 피하려면 Page 같은 최상위 컴포넌트에서 모든 핸들러를 정의해야 한다. 각 컴포넌트나 훅이 필요한 이벤트를 자유롭게 구독할 수 없다.

---

## 설계 아이디어: EventRegistry + Singleton Provider

> EventSource를 Singleton으로 관리하고, 이벤트가 발생했을 때 등록된 핸들러를 일괄 실행해 재전파한다.

핵심 컨셉은 세 가지다.

- 여러 컴포넌트가 각자 필요한 이벤트 핸들러만 등록한다
- 페이지 내 SSE 연결은 하나만 유지한다
- 서버에서 이벤트가 오면 해당 이벤트를 구독 중인 모든 핸들러에게 전파한다

---

## EventRegistry 구현

이벤트 타입별로 핸들러 `Set`을 관리하는 Registry 클래스를 만들었다.

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

`emit` 시 try-catch로 에러를 격리했다. 한 핸들러에서 에러가 발생해도 다른 핸들러 실행을 막지 않는다.

---

## 타입과 스키마 구조

Zod 스키마를 기반으로 타입을 추론하게 설계했다.

```typescript
// types.ts
export const EVENT = {
  PARTICIPANT_COUNT: "participant-count",
  GATHERING_FULL: "gathering-full",
} as const;

export type EventType = (typeof EVENT)[keyof typeof EVENT];

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

새 이벤트를 추가할 때 Zod 스키마만 등록하면 `EventPayload` 타입이 자동으로 업데이트된다.

---

## ServerSentEventProvider

`EventSource`를 생성하고 Registry를 Context로 제공하는 Provider 컴포넌트다.

```typescript
export function ServerSentEventProvider({ url, withCredentials, children }) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventRegistry = useMemo(() => new EventRegistry(), []);

  useEffect(() => {
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
  }, [connectionUrl, withCredentials, eventRegistry]);

  return (
    <ServerSentEventContext.Provider value={eventRegistry}>
      {children}
    </ServerSentEventContext.Provider>
  );
}
```

`useMemo`로 EventRegistry 인스턴스를 생성해 Provider가 리렌더링되어도 동일 인스턴스를 유지한다.

---

## useServerSentEventListener 훅

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

마운트 시 핸들러를 등록하고, 언마운트 시 자동으로 제거한다. 핸들러를 인라인으로 작성해도 Registry에서 정확히 등록/해제되므로 불필요한 메모이제이션이 필요 없다.

---

## Provider 위치

최상단 Layout에서 Provider를 설정하고, 각 페이지 컴포넌트에서 이벤트를 구독한다.

```typescript
// layout.tsx
export default async function Layout({ children, params }) {
  const { accessKey } = await params;
  return (
    <ServerSentEventProvider url={`/gatherings/${accessKey}/subscribe`}>
      {children}
    </ServerSentEventProvider>
  );
}

// PendingPage.tsx
export function PendingPage() {
  const { accessKey } = useParams();

  useServerSentEventListener(EVENT.PARTICIPANT_COUNT, (payload) => {
    if (payload.currentCount === payload.maxCount) {
      router.push(`/gathering/${accessKey}/opinion/complete`);
    }
    queryClient.setQueryData(gatheringKeys.capacity(accessKey), { data: payload });
  });
}
```

기존 코드와 비교하면 `useCallback`이 사라지고, 핸들러를 객체로 묶을 필요도 없어졌다.

---

## 개발 중 만난 버그

**handlers: 0 버그.** 핸들러 등록 시 로그에는 `total: 1`로 찍히는데, `emit` 시에는 `handlers: 0`으로 나타났다. 원인은 `getHandler()` 메서드에서 Map에 Set을 저장하지 않고 그냥 반환만 했기 때문이다. 매번 새로운 Set이 생성되어 이전 등록이 사라졌다.

```typescript
// ❌ 잘못된 코드 — 매번 새 Set 생성
private getHandler(type: EventType) {
  return this.eventRegistry.get(type) ?? new Set();
}

// ✅ Map에 먼저 저장한 후 반환
private getHandler(type: EventType) {
  if (!this.eventRegistry.has(type)) {
    this.eventRegistry.set(type, new Set());
  }
  return this.eventRegistry.get(type)!;
}
```

**URL 구성 문제.** `new URL(path, base)` 동작 방식의 오해로 `/api/v1`이 누락됐다. base에 trailing slash가 없고 path에 leading slash가 있으면 base의 경로 부분이 무시된다.

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

## 달성한 것들

**단일 연결 보장.** Provider가 Endpoint별로 하나의 EventSource만 생성하고, 여러 컴포넌트가 이를 공유한다.

**타입 안전성.** Zod 스키마 기반으로 컴파일 타임과 런타임 모두에서 타입을 보장한다. 잘못된 데이터가 오더라도 Zod 검증 단계에서 걸러진다.

**에러 격리.** 한 핸들러에서 에러가 발생해도 다른 핸들러들은 계속 실행된다.

**단순한 사용성.** `useCallback`과 `useMemo` 없이 필요한 이벤트만 바로 구독하면 된다. 새 이벤트 타입을 추가할 때도 Zod 스키마만 정의하면 나머지는 자동으로 처리된다.
