## CustomEvent란?

기본적으로 정의된 이벤트 외에 **사용자 정의 이벤트를 정의하여 발생시키도록 하는 인터페이스**다.  
이벤트를 Trigger하고 이를 감지하여 변화를 관측한다는 점에서 **Observer Pattern**을 구현하기 위한 수단으로 쓰인다.  

`CustomEvent`는 `Event` 인터페이스를 상속받기 때문에 이벤트를 생성하고 발행하는 구조는 기존과 동일하다 (`addEventListener`, `removeEventListener`, `dispatchEvent`).  

---

## 왜 필요했나

사이드 프로젝트에서 TMap SDK를 Class로 정의해 사용하고 있었다. 이 인스턴스를 Context API를 통해 `ref` 객체로 하위 컴포넌트들에게 주입했다.  

문제는 **TMapModule 내부 속성이 변경됐을 때 이를 컴포넌트에 알릴 수단이 없었다**.  
컴포넌트의 변화를 TMapModule에 알리는 단방향 흐름만 있었기 때문에, 모듈 내 변경 사항을 컴포넌트가 인지하려면 역방향 통신이 필요했다.  

Class 내부에서 `dispatchEvent`로 커스텀 이벤트를 발행하고, 컴포넌트에서 이를 구독하는 방식으로 해결했다.  

---

## 구현 방법

### 이벤트 발행

```javascript
window.dispatchEvent(
  new CustomEvent('markers:create', { detail: createdMarker }),
);

window.dispatchEvent(
  new CustomEvent('markers:remove', { detail: removedMarker }),
);
```

`detail` 속성으로 이벤트와 함께 전달할 데이터를 담는다.  

### 이벤트 수신 (기본)

```javascript
useEffect(() => {
  window.addEventListener('marker:create', (event) => {
    setMarkers([...markers, event.detail]);
  });

  return () => {
    window.removeEventListener('marker:create', (event) => {
      setMarkers([...markers, event.detail]);
    });
  };
}, []);
```

> [!WARNING]  
> cleanup 함수의 인라인 화살표 함수는 등록 시점의 함수와 다른 참조이므로 `removeEventListener`가 실제로 리스너를 제거하지 못한다. 이벤트 리스너는 반드시 동일한 함수 참조로 해제해야 한다.  

### useEventListener 커스텀 훅 제작

```typescript
import { useEffect } from 'react';

export const useEventListeners = <T extends keyof WindowEventMap>(
  eventName: T,
  handler: (event: WindowEventMap[T]) => void,
  options?: boolean | AddEventListenerOptions,
): void => {
  useEffect(() => {
    window.addEventListener(eventName, handler, options);
    return () => {
      window.removeEventListener(eventName, handler, options);
    };
  }, [eventName, handler, options]);
};
```

사용 시:  

```javascript
const CourseView = () => {
  const [markers, setMarkers] = useState([]);

  useEventListeners('marker:create', (event) => {
    setMarkers([...markers, event.detail]);
  });

  // ...
};
```

---

## TypeScript 타입 확장

TypeScript에서 `WindowEventMap` 인터페이스에 새롭게 정의한 이벤트 정보가 없어 타입 에러가 발생한다.  
`global` 네임스페이스에 커스텀 이벤트 인터페이스를 정의해 `WindowEventMap`에 상속시키면 해결된다.  

```typescript
declare global {
  interface CustomEventMap {
    'marker:create': CustomEvent<MarkerType>;
    'marker:remove': CustomEvent<MarkerType>;
  }

  interface WindowEventMap extends CustomEventMap {}
}
```

이렇게 하면 `addEventListener('marker:create', handler)`의 `handler` 타입도 자동으로 `(event: CustomEvent<MarkerType>) => void`로 추론된다.  

---

## 주의사항

이벤트 리스너가 많이 부착되는 것은 좋은 현상이 아니다. 과도한 이벤트 리스너는 메모리 누수와 성능 문제를 일으킬 수 있다.  

변경 사항을 발행하는 주체와 이를 수신하는 주체를 명확히 정리해두지 않으면 추후 추적이 어렵다.  
어떤 이벤트가 어디서 발행되고 어디서 구독되는지 문서화하거나 타입으로 명확히 정의하는 것이 좋다.  
