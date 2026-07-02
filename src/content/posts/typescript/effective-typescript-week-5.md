# 이펙티브 타입스크립트 5주차 스터디

## 일관성 있는 별칭 사용하기

별칭을 여러 개 만들면 제어 흐름이 복잡해진다.

```typescript
const borough = { name: 'Brooklyn', location: [40.688, -73.979] };
const loc = borough.location; // 별칭

loc[0] = 0; // borough.location[0]도 바뀐다
```

객체 속성에 타입 가드를 적용할 때 별칭이 문제를 일으킬 수 있다.

```typescript
interface Coordinate {
  x: number;
  y: number;
}

interface BoundingBox {
  x: [number, number];
  y: [number, number];
}

interface Polygon {
  exterior: Coordinate[];
  holes: Coordinate[][];
  bbox?: BoundingBox;
}

function isPointInPolygon(polygon: Polygon, pt: Coordinate) {
  const { bbox } = polygon;
  if (bbox) {
    // bbox는 BoundingBox로 좁혀짐
    const { x, y } = bbox;
    if (pt.x < x[0] || pt.x > x[1] || pt.y < y[0] || pt.y > y[1]) {
      return false;
    }
  }
}
```

비구조화로 별칭을 일관성 있게 사용하면 코드가 명확해진다.

---

## 비동기 코드에는 async 함수 사용하기

콜백보다 프로미스가, 프로미스보다 `async`/`await`가 더 명확하다.

```typescript
// 콜백 방식 — 실수하기 쉽다
function fetchWithCallback(url: string, cb: (text: string) => void): void {
  fetch(url).then((res) => res.text()).then(cb);
}

// async/await — 의도가 명확하다
async function fetchWithAsync(url: string): Promise<string> {
  const res = await fetch(url);
  return res.text();
}
```

`async` 함수는 항상 비동기로 실행된다.
이미 캐시된 값을 동기적으로 반환하려는 시도가 의도치 않은 동기-비동기 혼용을 만든다.

```typescript
// 위험한 패턴
function fetchWithCache(url: string, callback: (text: string) => void): void {
  if (url in cache) {
    callback(cache[url]); // 동기 실행
    return;
  }
  fetchURL(url, (text) => {
    cache[url] = text;
    callback(text); // 비동기 실행
  });
}
```

```typescript
// 안전한 패턴
const cache: { [url: string]: string } = {};

async function fetchWithCache(url: string): Promise<string> {
  if (url in cache) {
    return cache[url]; // 여전히 비동기로 실행됨
  }
  const text = await fetchURL(url);
  cache[url] = text;
  return text;
}
```

---

## 타입 추론에 문맥이 어떻게 사용되는지 이해하기

`let`은 넓게, `const`는 좁게 추론된다.

```typescript
type Language = 'Javascript' | 'Typescript' | 'Python';

function setLanguage(language: Language) { /* ... */ }

let lang = 'Javascript'; // type: string
setLanguage(lang); // 오류 — string은 Language에 할당 불가

const lang2 = 'Javascript'; // type: 'Javascript'
setLanguage(lang2); // 정상
```

### 튜플 타입의 문맥 이슈

```typescript
function panTo(where: [number, number]) { /* ... */ }

const loc = [10, 20]; // number[]로 추론됨
panTo(loc); // 오류

const loc2 = [10, 20] as const; // readonly [10, 20]
panTo(loc2); // 오류 — readonly는 [number, number]에 할당 불가

// 함수 시그니처에서 readonly를 허용하면 해결됨
function panTo(where: readonly [number, number]) { /* ... */ }
panTo(loc2); // 정상
```

---

## 유효한 상태만 표현하는 타입 지향하기

잘못된 타입 설계는 불가능한 상태를 허용한다.

```typescript
// 나쁜 설계 — isLoading과 error가 동시에 true일 수 있다
interface State {
  pageText: string;
  isLoading: boolean;
  error?: string;
}
```

유니온으로 유효한 상태만 표현한다.

```typescript
// 좋은 설계
interface RequestPending {
  state: 'pending';
}

interface RequestError {
  state: 'error';
  error: string;
}

interface RequestSuccess {
  state: 'ok';
  pageText: string;
}

type RequestState = RequestPending | RequestError | RequestSuccess;

interface State {
  currentPage: string;
  requests: { [page: string]: RequestState };
}
```

불가능한 상태를 표현할 수 없으니 구현도 단순해진다.

---

## 매개변수 타입은 넓게, 반환 타입은 좁게

입력은 관대하게 받고 출력은 정확하게 반환하는 설계가 사용하기 편하다.

```typescript
type LngLat =
  | { lng: number; lat: number }
  | { lon: number; lat: number }
  | [number, number];

type LngLatBounds =
  | { northeast: LngLat; southwest: LngLat }
  | [LngLat, LngLat]
  | [number, number, number, number];

// 매개변수는 넓게
declare function setCamera(camera: CameraOptions): void;
declare function viewportForBounds(bounds: LngLatBounds): CameraOptions;
```

반환 타입을 넓게 하면 호출하는 쪽에서 타입 좁히기를 반복해야 한다.
반환 타입은 가능한 구체적으로 정의하는 것이 좋다.
