## 들어가며

native ESM과 importmap 을 탐구하다 보니 자연스럽게 브라우저가 모듈을 어떻게 미리 로드하는지도 궁금해졌다.
만약 번들러 없이 ESM을 사용하면 모듈 의존성 트리를 브라우저가 하나씩 fetch 해야 하는데, 이때 요청이 직렬로 이어지는 "폭포수(waterfall)" 문제가 생길 수 있다.
이전 글에서 importmap 을 통해 모듈 경로를 제어하는 방법은 어느 정도 파악했지만, 여전히 몇 가지 의문이 남았다.

> "파일을 미리 가져온다"는 행위가 `preload`와 `modulepreload` 사이에서 어떻게 다르게 동작하는가?

개인적으로는 브라우저가 단순히 힌트를 주는 것인지 아니면 실제로 다른 방식으로 처리하는지가 가장 궁금했다.
이 글은 `preload`와 `modulepreload`가 브라우저 내부에서 어떻게 동작하고, 무엇이 다른지를 정리한다.

---

## 브라우저의 리소스 로딩 타임라인

`preload`와 `modulepreload`의 차이를 이해하려면 먼저 브라우저가 ESM 모듈을 어떻게 로드하는지 알아야 한다.

`<script type="module" src="main.js">`를 HTML에서 만나면 브라우저는 다음과 같은 순서로 처리한다.

```javascript
HTML 파싱
  ↓
<script type="module" src="main.js"> 발견
  ↓ fetch main.js
main.js 파싱
  ↓
import './utils.js' 발견
  ↓ fetch utils.js  ← main.js 다운로드 완료 후에야 발견!
utils.js 파싱
  ↓
import './helper.js' 발견
  ↓ fetch helper.js ← utils.js 다운로드 완료 후에야 발견!
```

여기서 가장 큰 핵심은 마지막 화살표에 달린 주석이다.
브라우저는 파일을 받아 파싱하기 전까지는 그 파일이 무엇을 import하는지 알 수 없다. 즉, 의존성 트리를 탐색하는 과정이 완전히 직렬로 이루어진다!

물론 의존성이 얕으면 문제가 없다.
하지만 실제 애플리케이션에서 모듈 그래프가 3단계, 5단계로 깊어지면 각 단계마다 네트워크 왕복이 추가되고, 이 지연이 누적되어 초기 로딩 시간을 크게 늘린다.
이것이 바로 `preload`와 `modulepreload`가 해결하려는 문제 상황이다.

---

## preload 의 동작 방식

`preload`는 브라우저의 사전 로드 (preloading) 힌트 메커니즘이다.
HTML 파서가 `<link rel="preload">`를 만나면 해당 리소스를 즉시 높은 우선순위로 fetch하기 시작한다.
이후 실제 사용 시점에는 이미 캐시에 리소스가 있으므로 대기 시간이 줄어든다.

```html
<link rel="preload" href="/styles.css" as="style">
<link rel="preload" href="/font.woff2" as="font" crossorigin>
<link rel="preload" href="/hero.jpg" as="image">
<link rel="preload" href="/main.js" as="script">
```

참고로 위의 `link` 선언들은 모두 병렬로 fetch 가 시작된다.
즉 브라우저는 `preload` 를 통해 이 리소스들이 곧 필요해질 것이라는 힌트를 받고, 다른 작업을 처리하는 동안 백그라운드에서 미리 가져오는 작업을 거친다.

### as 속성과 MIME 타입 힌트

`preload` 에서 쓰이는 `as` 속성은 단순한 설명 이상의 역할을 하는데, 브라우저는 이 값을 바탕으로 세 가지를 결정하기 때문이다.

첫째, **Content-Type 검증**이다.
예를 들어 `as="script"`로 선언했는데 서버가 `text/css`를 응답하면 브라우저는 이 리소스를 사용하지 않는다.

둘째, **캐시 키 설정**이다.
`<link rel="preload" href="/main.js" as="script">`로 미리 가져온 파일은 나중에 `<script src="/main.js">`가 나타날 때 같은 캐시 항목을 재사용한다.
만약 `as` 속성이 틀리면 캐시 키가 달라져 이중 다운로드가 발생할 수 있다.

셋째, **요청 우선순위**다.
`as="font"`와 `as="image"`는 서로 다른 우선순위를 가진다. 브라우저는 이를 통해 중요한 리소스를 먼저 가져온다.

> `as` 속성을 생략하면 preload가 동작하긴 하지만, 브라우저가 리소스 타입을 알 수 없어 우선순위 결정과 캐시 매칭이 제대로 이루어지지 않는다. 항상 명시해야 한다.

### preload 의 한계: 모듈 의존성을 모른다

`preload`는 특정 파일 하나를 미리 가져오는 데 탁월하지만, 그 파일이 무엇을 import하는지는 전혀 신경 쓰지 않는다. 이것이 ESM 환경에서 `preload`의 근본적인 한계다.

```html
<!-- preload로 main.js를 미리 가져와도 -->
<link rel="preload" href="/main.js" as="script">

<!-- main.js 안의 import들은 여전히 waterfall -->
<!-- main.js를 파싱한 후에야 import './utils.js'를 발견 -->
<script type="module" src="/main.js"></script>
```

위 예시에서는 preload 를 통해 `main.js`를 미리 가져오는 데는 성공한다.
하지만 `main.js`를 파싱해서 `import './utils.js'`를 발견하는 순간, 다시 waterfall이 시작된다.
결국 preload는 첫 번째 파일의 대기 시간을 없앴을 뿐, 의존성 체인 전체를 해결하지는 못한다.

---

## modulepreload 의 동작 방식

`modulepreload`는 ESM을 위해 설계된 전용 힌트다. `preload`와 달리 파일을 단순히 fetch하는 데서 그치지 않는다.

```html
<!-- main.js와 그 의존성들을 한꺼번에 병렬 fetch -->
<link rel="modulepreload" href="/main.js">
<link rel="modulepreload" href="/utils.js">
<link rel="modulepreload" href="/helper.js">

<script type="module" src="/main.js"></script>
```

`modulepreload`는 아래 세 가지 작업을 동시에 수행한다.

1. **파일 fetch** — 네트워크에서 JS 파일을 다운로드한다.
2. **파싱** — 다운로드된 소스를 AST(추상 구문 트리)로 변환한다.
3. **컴파일** — AST를 바이트코드로 변환한다.

그 결과를 브라우저 내부의 **모듈 맵(Module Map)**에 캐싱한다.
이후 `<script type="module" src="/main.js">`가 실행될 때, 브라우저는 해당 URL을 모듈 맵에서 찾아 이미 처리된 모듈을 즉시 사용한다.
이때는 각 모듈에 대한 fetch도, 파싱도, 컴파일도 다시 하지 않는다. 다만 이미 평가 및 실행된 모듈을 반환할 뿐이다.

> `preload`는 파일을 HTTP 캐시에 저장하지만, `modulepreload`는 파싱·컴파일 결과까지 모듈 맵에 저장한다.
> 이 차이가 ESM 환경에서 `modulepreload`가 훨씬 효과적인 이유다.

### preload 와의 차이: 의존성 그래프 사전 처리

`modulepreload`의 진정한 힘은 바로 의존성 그래프 전체를 병렬로 처리할 수 있다는 점이다.

```html
<!-- 이렇게 하면 waterfall 없이 병렬 fetch -->
<link rel="modulepreload" href="/main.js">
<link rel="modulepreload" href="/utils.js">   <!-- main.js의 import -->
<link rel="modulepreload" href="/helper.js">  <!-- utils.js의 import -->
```

위 세 개의 선언은 모두 병렬로 fetch 가 시작된다.
브라우저가 `main.js`를 파싱해서 `import './utils.js'`를 발견하는 시점에 `utils.js`는 이미 모듈 맵에 올라와 있다.
이 덕분에 기존의 waterfall이 사라지고 필요한 모듈을 한번에 불러올 수 있다.

단, 여기에는 중요한 전제가 있다.
바로 **어떤 파일이 어떤 파일을 의존하는지는 개발자가 직접 선언해야 한다는 점이다!**

왜냐하면 브라우저는 `modulepreload` 힌트만 보고 의존성을 추론하지 않기 때문이다.
이 말인 즉슨 개발자가 의존성 트리 전체를 알고 있어야 이 최적화가 효과적이다. (그래서 일일히 등록을 해주어야 한다..)

실제로는 Vite 같은 번들러가 빌드 시점에 의존성을 분석하고 `<link rel="modulepreload">` 태그를 자동으로 생성해준다.
번들러를 사용하는 환경에서 Head 태그 내에 `modulepreload`가 생성되는 이유가 바로 이것이다.

### CORS 처리 방식의 차이

`preload`와 `modulepreload`는 CORS를 처리하는 방식도 다르다.

```html
<!-- preload: 크로스 오리진 리소스에는 crossorigin 명시 필요 -->
<link rel="preload" href="https://example.com/script.js" as="script" crossorigin>

<!-- modulepreload: 항상 CORS 모드 (crossorigin 생략 가능) -->
<link rel="modulepreload" href="https://example.com/module.js">
```

`preload`는 기본적으로 CORS 없이 동작하므로, 크로스 오리진 리소스를 가져올 때는 `crossorigin` 속성을 명시해야 한다.
이를 빠뜨리면 캐시 키 불일치가 생겨 리소스를 두 번 다운로드하는 문제가 발생한다.

반면 `modulepreload`는 ESM의 특성을 알고 있다는 점에서 차이가 있다.

---

## 언제 무엇을 써야 하는가

두 힌트의 사용 시나리오는 명확하게 구분된다.

**`preload`를 쓰는 경우:**
- CSS 파일, 웹 폰트, 이미지 등 비(非)모듈 리소스를 미리 가져올 때
- 번들러가 생성한 단일 JS 번들 파일을 미리 가져올 때

**`modulepreload`를 쓰는 경우:**
- 번들러 없이 native ESM을 사용할 때, 의존성 트리를 병렬 fetch하기 위해
- ESM 모듈 그래프 전체를 사전에 파싱·컴파일하여 실행 지연을 없애고 싶을 때

번들러를 사용하는 일반적인 환경에서는 판단이 조금 달라진다.
번들러는 여러 모듈을 하나(또는 몇 개)의 청크로 합쳐준다. 그렇기에 이미 의존성 트리가 단일 파일로 압축된 상황에서는 waterfall 문제 자체가 발생하지 않는다.
따라서 이 경우에는 `modulepreload`로 모듈 그래프를 선언하는 것보다, `preload`로 번들 파일 자체를 미리 가져오는 것이 더 단순하고 효과적이다.

물론 Vite가 코드 스플리팅을 통해 여러 청크를 생성한다면, Vite 자체가 각 청크에 대한 `<link rel="modulepreload">` 태그를 자동으로 삽입하기에 개발자가 직접 선언할 필요가 없다.

"번들러가 애플리케이션 구축에 필요한 모듈을 더 빠르게 가져오기 위해 물 밑에서 이런 작업을 하고 있구나" 라고 이해했다.

---

## 마치며

`preload`와 `modulepreload`는 둘 다 "미리 가져온다"는 목표를 공유하지만 동작하는 수준이 다르다.
`preload`는 HTTP 캐시에 파일을 채우는 범용 힌트고, `modulepreload`는 ESM 모듈 맵에 파싱·컴파일 결과까지 올려두는 모듈 전용 힌트다.

native ESM 환경에서 waterfall 문제를 해결하려면 `modulepreload`로 의존성 트리를 명시하는 것이 정답이다.
번들러 환경에서는 번들러가 이 작업을 대신 해주기 때문에 개발자가 직접 신경 쓸 일이 많지 않지만, 내부 동작을 이해하면 번들러가 생성하는 HTML을 해석하는 데 도움이 된다.

결국 이 두 힌트를 이해하는 것은 "브라우저가 리소스를 어떻게 인식하고 처리하는가"에 대한 이해와 맞닿아 있었다.
그 인식의 차이가 단순한 파일 다운로드와 모듈 사전 처리라는 결과의 차이를 만들어낸다는 점을 오늘 깨달았다.
